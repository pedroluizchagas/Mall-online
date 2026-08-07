-- ============================================================
-- LOGISTICA · 3/3 — Matching, agrupamento, score e aceite
-- Referência: docs/31-logistica-de-entrega.md §2, §3, §4, §5, §6
--
-- Todo o motor de decisão vive aqui, em SQL, por três razões:
--   1. o dado está no banco — evita round-trips do Edge para ranquear;
--   2. o aceite precisa ser transacional (dois entregadores podem
--      aceitar a mesma rota no mesmo instante);
--   3. o pg_cron chama direto, sem depender da Edge Function estar de pé.
--
-- A Edge Function dispatch-order orquestra; estas funções decidem.
-- Idempotente.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Distância Haversine em metros
--    Fase 1 não usa API de rotas (docs/31 §5): distância geodésica
--    × fator viário. Substituída por OSRM na Fase 2 — o resto do
--    motor não muda, só esta função.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION distancia_m(
  lat1 NUMERIC, lng1 NUMERIC, lat2 NUMERIC, lng2 NUMERIC
) RETURNS NUMERIC
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN NULL
    ELSE 6371000 * 2 * asin(sqrt(
        power(sin(radians(lat2 - lat1) / 2), 2)
      + cos(radians(lat1)) * cos(radians(lat2))
      * power(sin(radians(lng2 - lng1) / 2), 2)
    ))
  END;
$$;

-- Distância de deslocamento real: geodésica × fator viário.
-- 1,3 é a razão típica rua/reta em malha urbana regular como Divinópolis.
CREATE OR REPLACE FUNCTION distancia_viaria_m(
  lat1 NUMERIC, lng1 NUMERIC, lat2 NUMERIC, lng2 NUMERIC
) RETURNS NUMERIC
LANGUAGE sql IMMUTABLE
AS $$
  SELECT distancia_m(lat1, lng1, lat2, lng2) * 1.3;
$$;

-- ------------------------------------------------------------
-- 2. Parâmetros de logística (configuráveis sem deploy)
--    docs/31 §6: tarifas e limites são parâmetros, não constantes.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS logistica_config (
  chave      TEXT PRIMARY KEY,
  valor      NUMERIC NOT NULL,
  descricao  TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO logistica_config (chave, valor, descricao) VALUES
  ('frete_base_a_pe',        400, 'Base do frete a pé, em centavos'),
  ('frete_base_bicicleta',   400, 'Base do frete de bicicleta, em centavos'),
  ('frete_base_moto',        600, 'Base do frete de moto, em centavos'),
  ('frete_base_carro',       900, 'Base do frete de carro, em centavos'),
  ('frete_base_utilitario', 1800, 'Base do frete de utilitário, em centavos'),
  ('frete_tarifa_km',        120, 'Centavos por km acima da franquia'),
  ('frete_franquia_km',        2, 'Km inclusos na base'),
  ('frete_adicional_refrigerado', 200, 'Adicional de carga refrigerada'),
  ('frete_adicional_porte_g',     300, 'Adicional de carga G/XG'),
  ('ganho_adicional_por_drop',    250, 'Adicional por drop extra na rota'),
  ('agrupamento_raio_m',          800, 'Distância máxima entre drops (docs/31 §4.2)'),
  ('agrupamento_desvio_max_pct',   15, 'Desvio máximo de rota vs entregas separadas'),
  ('agrupamento_desvio_max_pct_quente', 10, 'Idem, alimentação quente'),
  ('oferta_ttl_segundos',          45, 'Janela de resposta da oferta (docs/31 §3.1)'),
  ('oferta_max_ciclos',             3, 'Ciclos dirigidos antes do broadcast'),
  ('oferta_broadcast_raio_km',      5, 'Raio do broadcast final'),
  ('sla_ultimo_drop_min',          45, 'Minutos entre fim do preparo e último drop'),
  ('handling_por_parada_s',       240, 'Segundos de handling por parada'),
  ('velocidade_media_kmh',         25, 'Velocidade média urbana para ETA')
ON CONFLICT (chave) DO NOTHING;

CREATE OR REPLACE FUNCTION cfg(p_chave TEXT)
RETURNS NUMERIC
LANGUAGE sql STABLE
AS $$
  SELECT valor FROM logistica_config WHERE chave = p_chave;
$$;

ALTER TABLE logistica_config ENABLE ROW LEVEL SECURITY;

-- Leitura liberada a qualquer autenticado (os apps precisam para exibir
-- estimativas); escrita só admin.
DROP POLICY IF EXISTS logistica_config_select ON logistica_config;
CREATE POLICY logistica_config_select ON logistica_config
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS logistica_config_admin ON logistica_config;
CREATE POLICY logistica_config_admin ON logistica_config
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ------------------------------------------------------------
-- 3. Elegibilidade entregador × rota (docs/31 §2)
--    As cinco condições da regra, na ordem em que descartam mais
--    candidatos (barato primeiro).
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION courier_elegivel(
  p_courier_id UUID,
  p_porte cargo_size,
  p_peso_g INTEGER,
  p_volume_ml INTEGER,
  p_refrigerada BOOLEAN,
  p_distancia_total_m NUMERIC,
  p_paradas SMALLINT
) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  c        RECORD;
  cap      RECORD;
  v_peso   INTEGER;
  v_volume INTEGER;
  v_raio   NUMERIC;
BEGIN
  SELECT id, veiculo, bag_termica, status, online,
         capacidade_peso_g, capacidade_volume_ml, raio_max_km
    INTO c
  FROM couriers WHERE id = p_courier_id;

  IF c.id IS NULL OR c.veiculo IS NULL THEN RETURN false; END IF;
  IF c.status <> 'aprovado' OR NOT c.online THEN RETURN false; END IF;

  -- (1) porte aceito pelo modal
  IF NOT veiculo_aceita_porte(c.veiculo, p_porte) THEN RETURN false; END IF;

  SELECT * INTO cap FROM capacidade_do_veiculo(c.veiculo);

  -- Capacidade declarada pelo entregador (baú/mochila extra) tem
  -- precedência sobre o default do modal.
  v_peso   := COALESCE(c.capacidade_peso_g,    cap.peso_g);
  v_volume := COALESCE(c.capacidade_volume_ml, cap.volume_ml);
  v_raio   := LEAST(COALESCE(c.raio_max_km, cap.raio_km), cap.raio_km);

  -- (2) capacidade de peso e volume
  IF p_peso_g > v_peso OR p_volume_ml > v_volume THEN RETURN false; END IF;

  -- (3) flags: carga refrigerada exige bag térmica
  IF p_refrigerada AND NOT c.bag_termica THEN RETURN false; END IF;

  -- (4) raio operacional do modal
  IF p_distancia_total_m IS NOT NULL
     AND p_distancia_total_m > v_raio * 1000 THEN
    RETURN false;
  END IF;

  -- (5) limite de paradas do modal
  IF p_paradas > cap.max_paradas THEN RETURN false; END IF;

  -- (5b) anti-afogamento: já tem oferta pendente?
  IF EXISTS (
    SELECT 1 FROM dispatch_offers
    WHERE courier_id = p_courier_id AND resposta IS NULL AND expira_em > now()
  ) THEN
    RETURN false;
  END IF;

  -- (5c) já está numa rota em execução?
  IF EXISTS (
    SELECT 1 FROM delivery_routes
    WHERE courier_id = p_courier_id
      AND status IN ('aceita', 'em_andamento')
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- ------------------------------------------------------------
-- 4. Score de ranqueamento (docs/31 §3.1)
--    40% proximidade · 20% adequação do veículo · 15% aceitação
--    · 15% avaliação · 10% ociosidade. Retorna 0..1.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION score_courier(
  p_courier_id UUID,
  p_distancia_ate_coleta_m NUMERIC,
  p_porte cargo_size
) RETURNS NUMERIC
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  c            RECORD;
  s_prox       NUMERIC;
  s_veiculo    NUMERIC;
  s_aceitacao  NUMERIC;
  s_avaliacao  NUMERIC;
  s_ocioso     NUMERIC;
  v_min_ocioso NUMERIC;
BEGIN
  SELECT veiculo, taxa_aceitacao, avaliacao_media, ultima_entrega_em
    INTO c
  FROM couriers WHERE id = p_courier_id;

  IF c.veiculo IS NULL THEN RETURN 0; END IF;

  -- Proximidade: 1.0 na porta da loja, decaindo a 0 em 8 km.
  s_prox := GREATEST(0, 1 - (COALESCE(p_distancia_ate_coleta_m, 8000) / 8000.0));

  -- Adequação do veículo: premia o MENOR veículo que dá conta.
  -- Mandar um carro buscar um açaí é elegível, mas é desperdício de frota:
  -- o carro pode ser o único capaz de pegar a compra de mercado seguinte.
  s_veiculo := CASE
    WHEN p_porte = 'P'  AND c.veiculo IN ('a_pe','bicicleta') THEN 1.0
    WHEN p_porte = 'P'  AND c.veiculo = 'moto'                THEN 0.8
    WHEN p_porte = 'P'  AND c.veiculo = 'carro'               THEN 0.4
    WHEN p_porte = 'M'  AND c.veiculo = 'moto'                THEN 1.0
    WHEN p_porte = 'M'  AND c.veiculo = 'carro'               THEN 0.7
    WHEN p_porte = 'G'  AND c.veiculo = 'carro'               THEN 1.0
    WHEN p_porte = 'XG' AND c.veiculo = 'utilitario'          THEN 1.0
    ELSE 0.5
  END;

  s_aceitacao := COALESCE(c.taxa_aceitacao, 1.0);

  -- Entregador novo (sem avaliação) entra com 0.8: não é penalizado por
  -- não ter histórico, mas não passa na frente de quem já provou serviço.
  s_avaliacao := COALESCE(c.avaliacao_media / 5.0, 0.8);

  -- Ociosidade: quem está parado há mais tempo sobe. Satura em 30 min,
  -- para não deixar um entregador esquecido a manhã inteira.
  v_min_ocioso := EXTRACT(EPOCH FROM (now() - COALESCE(c.ultima_entrega_em, now() - INTERVAL '30 min'))) / 60.0;
  s_ocioso := LEAST(1.0, v_min_ocioso / 30.0);

  RETURN ROUND(
      0.40 * s_prox
    + 0.20 * s_veiculo
    + 0.15 * s_aceitacao
    + 0.15 * s_avaliacao
    + 0.10 * s_ocioso
  , 4);
END;
$$;

-- ------------------------------------------------------------
-- 5. Candidatos a agrupamento (docs/31 §4 — cenários A e B)
--    Retorna pedidos que podem entrar na mesma rota do pedido base.
--    Cenário C (multi-loja) fica para a Fase 2: aqui a coleta é única.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION candidatos_agrupamento(p_order_id UUID)
RETURNS TABLE (order_id UUID, distancia_drop_m NUMERIC)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  base   RECORD;
  v_raio NUMERIC;
BEGIN
  SELECT o.id, o.store_id, o.entrega_lat, o.entrega_lng,
         o.carga_fragil, o.carga_refrigerada
    INTO base
  FROM orders o WHERE o.id = p_order_id;

  -- Pedido sem geocodificação nunca agrupa (docs/31 §10): sem lat/lng
  -- não há como garantir a proximidade prometida ao consumidor.
  IF base.id IS NULL OR base.entrega_lat IS NULL THEN RETURN; END IF;

  v_raio := cfg('agrupamento_raio_m');

  RETURN QUERY
  SELECT o.id, distancia_m(base.entrega_lat, base.entrega_lng,
                           o.entrega_lat, o.entrega_lng)
  FROM orders o
  WHERE o.id <> base.id
    AND o.store_id = base.store_id              -- cenário A/B: coleta única
    AND o.status IN ('em_preparo', 'aguardando_entregador')
    AND o.entrega_lat IS NOT NULL
    -- ainda não está em nenhuma rota viva
    AND NOT EXISTS (
      SELECT 1 FROM route_stops rs
      JOIN delivery_routes r ON r.id = rs.route_id
      WHERE rs.order_id = o.id
        AND r.status <> 'cancelada'
    )
    -- carga frágil não vira pilha de rota longa
    AND (NOT base.carga_fragil OR NOT o.carga_fragil)
    AND distancia_m(base.entrega_lat, base.entrega_lng,
                    o.entrega_lat, o.entrega_lng) <= v_raio
  ORDER BY 2
  LIMIT 4;   -- teto de segurança; o limite real vem do modal (§4.3)
END;
$$;

-- ------------------------------------------------------------
-- 6. Sequenciamento das paradas (docs/31 §5)
--    Vizinho-mais-próximo a partir da loja. Para ≤ 5 drops o
--    resultado coincide com o ótimo na prática urbana; a
--    enumeração exata entra junto com OSRM na Fase 2.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION sequenciar_drops(
  p_origem_lat NUMERIC, p_origem_lng NUMERIC, p_order_ids UUID[]
) RETURNS TABLE (order_id UUID, ordem SMALLINT, distancia_perna_m NUMERIC)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_restantes UUID[] := p_order_ids;
  v_lat       NUMERIC := p_origem_lat;
  v_lng       NUMERIC := p_origem_lng;
  v_ordem     SMALLINT := 0;
  v_proximo   RECORD;
BEGIN
  WHILE array_length(v_restantes, 1) > 0 LOOP
    SELECT o.id, o.entrega_lat, o.entrega_lng,
           distancia_viaria_m(v_lat, v_lng, o.entrega_lat, o.entrega_lng) AS d
      INTO v_proximo
    FROM orders o
    WHERE o.id = ANY(v_restantes)
    ORDER BY d NULLS LAST
    LIMIT 1;

    EXIT WHEN v_proximo.id IS NULL;

    order_id          := v_proximo.id;
    ordem             := v_ordem;
    distancia_perna_m := v_proximo.d;
    RETURN NEXT;

    v_lat       := v_proximo.entrega_lat;
    v_lng       := v_proximo.entrega_lng;
    v_ordem     := v_ordem + 1;
    v_restantes := array_remove(v_restantes, v_proximo.id);
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- 7. Frete e ganho da rota (docs/31 §6)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION calcular_frete(
  p_veiculo vehicle_type,
  p_distancia_m NUMERIC,
  p_refrigerada BOOLEAN,
  p_porte cargo_size
) RETURNS INTEGER
LANGUAGE sql STABLE
AS $$
  SELECT (
      cfg('frete_base_' || p_veiculo::TEXT)
    + GREATEST(0, (COALESCE(p_distancia_m, 0) / 1000.0) - cfg('frete_franquia_km'))
      * cfg('frete_tarifa_km')
    + CASE WHEN p_refrigerada THEN cfg('frete_adicional_refrigerado') ELSE 0 END
    + CASE WHEN p_porte IN ('G','XG') THEN cfg('frete_adicional_porte_g') ELSE 0 END
  )::INTEGER;
$$;

CREATE OR REPLACE FUNCTION calcular_ganho_rota(
  p_veiculo vehicle_type, p_distancia_m NUMERIC, p_drops SMALLINT
) RETURNS INTEGER
LANGUAGE sql STABLE
AS $$
  SELECT (
      cfg('frete_base_' || p_veiculo::TEXT)
    + (COALESCE(p_distancia_m, 0) / 1000.0) * cfg('frete_tarifa_km')
    + GREATEST(0, p_drops - 1) * cfg('ganho_adicional_por_drop')
  )::INTEGER;
$$;

-- ------------------------------------------------------------
-- 8. Montagem da rota (chamada pela Edge Function dispatch-order)
--    Cria a rota planejada com as paradas já sequenciadas.
--    Retorna o route_id, ou NULL se o pedido já estiver em rota.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION montar_rota(p_order_id UUID, p_agrupar BOOLEAN DEFAULT true)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base        RECORD;
  loja        RECORD;
  v_route_id  UUID;
  v_ids       UUID[];
  v_peso      INTEGER := 0;
  v_volume    INTEGER := 0;
  v_refrig    BOOLEAN := false;
  v_fragil    BOOLEAN := false;
  v_porte     cargo_size;
  v_dist      NUMERIC := 0;
  v_ordem     SMALLINT := 0;
  r           RECORD;
BEGIN
  SELECT o.id, o.store_id, o.tenant_id, o.entrega_lat, o.entrega_lng,
         o.carga_porte, o.carga_peso_g, o.carga_volume_ml,
         o.carga_refrigerada, o.carga_fragil
    INTO base
  FROM orders o WHERE o.id = p_order_id;

  IF base.id IS NULL THEN RETURN NULL; END IF;

  -- Idempotência: o pg_cron pode reprocessar a fila enquanto a Edge
  -- Function ainda está no ar. Se já existe rota viva, devolve ela.
  SELECT r2.id INTO v_route_id
  FROM route_stops rs
  JOIN delivery_routes r2 ON r2.id = rs.route_id
  WHERE rs.order_id = p_order_id AND r2.status <> 'cancelada'
  LIMIT 1;
  IF v_route_id IS NOT NULL THEN RETURN v_route_id; END IF;

  SELECT s.id, s.endereco,
         NULLIF(s.endereco->>'latitude','')::NUMERIC  AS lat,
         NULLIF(s.endereco->>'longitude','')::NUMERIC AS lng
    INTO loja
  FROM stores s WHERE s.id = base.store_id;

  v_ids := ARRAY[base.id];

  -- Agrupamento (cenários A e B). Só entra quem cabe junto: o teto de
  -- drops é o do menor veículo que ainda atende a carga somada, resolvido
  -- na elegibilidade — aqui aplicamos o teto conservador de 3 drops, que
  -- é o limite da moto (espinha dorsal da frota, docs/31 §4.3).
  IF p_agrupar AND base.entrega_lat IS NOT NULL THEN
    SELECT array_agg(c.order_id) INTO v_ids
    FROM (
      SELECT ca.order_id FROM candidatos_agrupamento(p_order_id) ca LIMIT 2
    ) c;
    v_ids := array_prepend(base.id, COALESCE(v_ids, ARRAY[]::UUID[]));
  END IF;

  -- Carga somada da rota
  SELECT COALESCE(SUM(o.carga_peso_g), 0), COALESCE(SUM(o.carga_volume_ml), 0),
         COALESCE(bool_or(o.carga_refrigerada), false),
         COALESCE(bool_or(o.carga_fragil), false)
    INTO v_peso, v_volume, v_refrig, v_fragil
  FROM orders o WHERE o.id = ANY(v_ids);

  v_porte := CASE
    WHEN v_peso <=  4000 AND v_volume <=  20000 THEN 'P'
    WHEN v_peso <= 10000 AND v_volume <=  45000 THEN 'M'
    WHEN v_peso <= 25000 AND v_volume <= 120000 THEN 'G'
    ELSE 'XG'
  END::cargo_size;

  INSERT INTO delivery_routes (
    tenant_id, status, drops, coletas, carga_peso_g, carga_volume_ml,
    carga_porte, carga_refrigerada, carga_fragil
  ) VALUES (
    base.tenant_id, 'planejada', array_length(v_ids, 1)::SMALLINT, 1,
    v_peso, v_volume, v_porte, v_refrig, v_fragil
  ) RETURNING id INTO v_route_id;

  -- Parada 0: a coleta na loja (única na Fase 1)
  INSERT INTO route_stops (route_id, ordem, tipo, order_id, store_id, lat, lng, endereco)
  VALUES (
    v_route_id, 0, 'coleta', base.id, loja.id, loja.lat, loja.lng,
    COALESCE(loja.endereco->>'rua', '') || ', ' || COALESCE(loja.endereco->>'numero', '')
  );

  -- Drops sequenciados a partir da loja
  v_ordem := 1;
  FOR r IN SELECT * FROM sequenciar_drops(loja.lat, loja.lng, v_ids) LOOP
    INSERT INTO route_stops (route_id, ordem, tipo, order_id, store_id, lat, lng, endereco)
    SELECT v_route_id, v_ordem, 'entrega', o.id, base.store_id,
           o.entrega_lat, o.entrega_lng,
           COALESCE(o.endereco_entrega->>'rua', '') || ', ' ||
           COALESCE(o.endereco_entrega->>'numero', '')
    FROM orders o WHERE o.id = r.order_id;

    v_dist  := v_dist + COALESCE(r.distancia_perna_m, 0);
    v_ordem := v_ordem + 1;
  END LOOP;

  UPDATE delivery_routes SET
    distancia_total_m  = v_dist::INTEGER,
    duracao_estimada_s = (
      (v_dist / 1000.0) / cfg('velocidade_media_kmh') * 3600
      + array_length(v_ids, 1) * cfg('handling_por_parada_s')
    )::INTEGER
  WHERE id = v_route_id;

  -- Pedidos passam a aguardar entregador
  UPDATE orders SET status = 'aguardando_entregador'
  WHERE id = ANY(v_ids) AND status = 'em_preparo';

  RETURN v_route_id;
END;
$$;

-- ------------------------------------------------------------
-- 9. Ranking de candidatos para uma rota
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION ranquear_couriers(p_route_id UUID, p_limite INTEGER DEFAULT 5)
RETURNS TABLE (courier_id UUID, score NUMERIC, proprio BOOLEAN)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  rota    RECORD;
  coleta  RECORD;
BEGIN
  SELECT r.id, r.tenant_id, r.carga_porte, r.carga_peso_g, r.carga_volume_ml,
         r.carga_refrigerada, r.distancia_total_m, r.drops, r.coletas
    INTO rota
  FROM delivery_routes r WHERE r.id = p_route_id;

  IF rota.id IS NULL THEN RETURN; END IF;

  SELECT rs.lat, rs.lng INTO coleta
  FROM route_stops rs
  WHERE rs.route_id = p_route_id AND rs.tipo = 'coleta'
  ORDER BY rs.ordem LIMIT 1;

  RETURN QUERY
  SELECT
    c.id,
    score_courier(
      c.id,
      distancia_viaria_m(cl.latitude, cl.longitude, coleta.lat, coleta.lng),
      rota.carga_porte
    ),
    -- Entregador próprio do lojista tem prioridade absoluta (docs/31 §3.1):
    -- ordenado antes do score, não somado a ele.
    -- COALESCE: 'proprio' com tenant_id NULL daria NULL, e DESC implica
    -- NULLS FIRST — o indefinido saltaria para o topo do ranking.
    COALESCE(c.tipo = 'proprio' AND c.tenant_id = rota.tenant_id, false)
  FROM couriers c
  LEFT JOIN courier_locations cl ON cl.courier_id = c.id
  WHERE c.online = true
    AND c.status = 'aprovado'
    -- Entregador próprio de OUTRO lojista nunca entra no pool
    AND (c.tipo = 'autonomo' OR c.tenant_id = rota.tenant_id)
    AND courier_elegivel(
      c.id, rota.carga_porte, rota.carga_peso_g, rota.carga_volume_ml,
      rota.carga_refrigerada, rota.distancia_total_m,
      (rota.drops + rota.coletas)::SMALLINT
    )
  ORDER BY 3 DESC NULLS LAST, 2 DESC NULLS LAST
  LIMIT p_limite;
END;
$$;

-- ------------------------------------------------------------
-- 10. Emitir oferta ao próximo candidato
--     Retorna o courier_id ofertado, ou NULL se acabaram os
--     candidatos desta rodada.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION ofertar_rota(p_route_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rota     RECORD;
  cand     RECORD;
  v_ttl    INTEGER;
  v_ciclo  SMALLINT;
BEGIN
  SELECT id, status, ciclos_oferta INTO rota
  FROM delivery_routes WHERE id = p_route_id FOR UPDATE;

  IF rota.id IS NULL OR rota.status NOT IN ('planejada', 'oferecida') THEN
    RETURN NULL;
  END IF;

  v_ttl   := cfg('oferta_ttl_segundos')::INTEGER;
  v_ciclo := rota.ciclos_oferta;

  -- Após N ciclos dirigidos, broadcast: oferta simultânea a todos os
  -- elegíveis. Antes disso, um por vez, do melhor score para baixo.
  IF v_ciclo < cfg('oferta_max_ciclos') THEN
    -- Ranqueia fundo e só então descarta quem já recebeu oferta desta rota.
    -- Ranquear com LIMIT 1 e filtrar depois travaria a cascata no primeiro
    -- candidato: ele já teria oferta, o filtro zeraria o resultado, e o
    -- segundo colocado nunca seria alcançado.
    SELECT rc.courier_id, rc.score INTO cand
    FROM ranquear_couriers(p_route_id, 20) rc
    WHERE NOT EXISTS (
      SELECT 1 FROM dispatch_offers d
      WHERE d.route_id = p_route_id AND d.courier_id = rc.courier_id
    )
    LIMIT 1;   -- ranquear_couriers já devolve ordenado por prioridade/score

    IF cand.courier_id IS NULL THEN
      -- Sem candidato novo: pula direto para o broadcast
      UPDATE delivery_routes
         SET ciclos_oferta = cfg('oferta_max_ciclos')::SMALLINT
       WHERE id = p_route_id;
      RETURN NULL;
    END IF;

    INSERT INTO dispatch_offers (route_id, courier_id, ciclo, expira_em, score)
    VALUES (p_route_id, cand.courier_id, v_ciclo,
            now() + make_interval(secs => v_ttl), cand.score);

    UPDATE delivery_routes
       SET status = 'oferecida', ciclos_oferta = v_ciclo + 1
     WHERE id = p_route_id;

    RETURN cand.courier_id;
  END IF;

  -- Broadcast final
  INSERT INTO dispatch_offers (route_id, courier_id, ciclo, expira_em, score)
  SELECT p_route_id, rc.courier_id, v_ciclo,
         now() + make_interval(secs => v_ttl * 2), rc.score
  FROM ranquear_couriers(p_route_id, 20) rc
  WHERE NOT EXISTS (
    SELECT 1 FROM dispatch_offers d
    WHERE d.route_id = p_route_id AND d.courier_id = rc.courier_id
      AND d.resposta IS NULL
  );

  UPDATE delivery_routes
     SET status = 'oferecida', ciclos_oferta = v_ciclo + 1
   WHERE id = p_route_id;

  RETURN NULL;
END;
$$;

-- ------------------------------------------------------------
-- 11. Aceite da oferta — transacional
--     Dois entregadores podem tocar "aceitar" no mesmo instante
--     (o broadcast torna isso provável, não raro). O FOR UPDATE na
--     rota serializa: o segundo encontra status <> 'oferecida' e
--     recebe a recusa explícita, sem criar assignment duplicado.
-- ------------------------------------------------------------

-- OUT param chamado rota_id, e não route_id: um OUT param homônimo de coluna
-- torna toda referência não-qualificada a route_id ambígua dentro do corpo
-- (plpgsql.variable_conflict = error é o default), abortando em runtime.
CREATE OR REPLACE FUNCTION aceitar_oferta_despacho(p_offer_id UUID)
RETURNS TABLE (ok BOOLEAN, rota_id UUID, motivo TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  oferta      RECORD;
  rota        RECORD;
  v_courier   UUID;
  v_ganho     INTEGER;
  v_veiculo   vehicle_type;
  v_drops     SMALLINT;
  v_por_drop  INTEGER;
  r           RECORD;
BEGIN
  SELECT o.id, o.route_id, o.courier_id, o.expira_em, o.resposta
    INTO oferta
  FROM dispatch_offers o WHERE o.id = p_offer_id;

  IF oferta.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'oferta_inexistente'; RETURN;
  END IF;

  -- Só o dono da oferta aceita. my_courier_id() é NULL quando a função
  -- roda via service_role — nesse caso a checagem é do chamador.
  v_courier := my_courier_id();
  IF v_courier IS NOT NULL AND v_courier <> oferta.courier_id THEN
    RETURN QUERY SELECT false, NULL::UUID, 'oferta_de_outro_entregador'; RETURN;
  END IF;

  IF oferta.resposta IS NOT NULL THEN
    RETURN QUERY SELECT false, oferta.route_id, 'oferta_ja_respondida'; RETURN;
  END IF;

  IF oferta.expira_em <= now() THEN
    UPDATE dispatch_offers
       SET resposta = 'expirada', respondido_em = now()
     WHERE id = p_offer_id;
    RETURN QUERY SELECT false, oferta.route_id, 'oferta_expirada'; RETURN;
  END IF;

  -- Serializa a corrida pela rota
  SELECT r2.id, r2.status, r2.distancia_total_m, r2.drops
    INTO rota
  FROM delivery_routes r2 WHERE r2.id = oferta.route_id FOR UPDATE;

  IF rota.status <> 'oferecida' AND rota.status <> 'planejada' THEN
    UPDATE dispatch_offers
       SET resposta = 'expirada', respondido_em = now()
     WHERE id = p_offer_id;
    RETURN QUERY SELECT false, oferta.route_id, 'rota_ja_atribuida'; RETURN;
  END IF;

  SELECT c.veiculo INTO v_veiculo FROM couriers c WHERE c.id = oferta.courier_id;
  v_drops := GREATEST(rota.drops, 1);
  v_ganho := calcular_ganho_rota(v_veiculo, rota.distancia_total_m, v_drops);

  UPDATE delivery_routes SET
    courier_id  = oferta.courier_id,
    status      = 'aceita',
    ganho_total = v_ganho,
    aceita_em   = now()
  WHERE id = oferta.route_id;

  UPDATE dispatch_offers
     SET resposta = 'aceita', respondido_em = now()
   WHERE id = p_offer_id;

  -- Demais ofertas vivas da mesma rota morrem aqui
  UPDATE dispatch_offers
     SET resposta = 'expirada', respondido_em = now()
   WHERE route_id = oferta.route_id AND id <> p_offer_id AND resposta IS NULL;

  -- Rateio do ganho por pedido: é este valor que vira transfer Pagar.me
  -- (estágio 2, docs/06). Um assignment por pedido — contrato preservado.
  v_por_drop := (v_ganho / v_drops)::INTEGER;

  FOR r IN
    SELECT rs.order_id FROM route_stops rs
    WHERE rs.route_id = oferta.route_id AND rs.tipo = 'entrega'
  LOOP
    INSERT INTO delivery_assignments (
      order_id, courier_id, tenant_id, route_id, status,
      valor_entrega, codigo_confirmacao
    )
    SELECT r.order_id, oferta.courier_id, o.tenant_id, oferta.route_id,
           'aceita', v_por_drop,
           upper(substr(md5(random()::text || r.order_id::text), 1, 4))
    FROM orders o WHERE o.id = r.order_id
    ON CONFLICT (order_id) DO UPDATE
      SET courier_id = EXCLUDED.courier_id,
          route_id   = EXCLUDED.route_id,
          status     = 'aceita',
          aceito_em  = now();

    UPDATE orders SET status = 'saiu_para_entrega' WHERE id = r.order_id;
  END LOOP;

  UPDATE delivery_assignments
     SET aceito_em = now()
   WHERE route_id = oferta.route_id AND aceito_em IS NULL;

  RETURN QUERY SELECT true, oferta.route_id, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION aceitar_oferta_despacho(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 12. Recusa explícita
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION recusar_oferta_despacho(p_offer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_courier UUID;
  v_dono    UUID;
  v_route   UUID;
BEGIN
  SELECT courier_id, route_id INTO v_dono, v_route
  FROM dispatch_offers WHERE id = p_offer_id AND resposta IS NULL;

  IF v_dono IS NULL THEN RETURN false; END IF;

  v_courier := my_courier_id();
  IF v_courier IS NOT NULL AND v_courier <> v_dono THEN RETURN false; END IF;

  UPDATE dispatch_offers
     SET resposta = 'recusada', respondido_em = now()
   WHERE id = p_offer_id;

  -- Devolve a rota à fila; o pg_cron reoferece na próxima varredura
  UPDATE delivery_routes SET status = 'planejada'
   WHERE id = v_route AND status = 'oferecida'
     AND NOT EXISTS (
       SELECT 1 FROM dispatch_offers d
       WHERE d.route_id = v_route AND d.resposta IS NULL AND d.expira_em > now()
     );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION recusar_oferta_despacho(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 13. Fila de despacho — alvo do pg_cron (a cada 30s)
--     Faz três coisas: expira ofertas vencidas, devolve as rotas
--     órfãs à fila e emite a próxima oferta de cada uma.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION processar_fila_despacho()
RETURNS TABLE (rotas_processadas INTEGER, ofertas_expiradas INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expiradas INTEGER := 0;
  v_rotas     INTEGER := 0;
  r           RECORD;
BEGIN
  -- (1) expirar ofertas vencidas
  WITH exp AS (
    UPDATE dispatch_offers
       SET resposta = 'expirada', respondido_em = now()
     WHERE resposta IS NULL AND expira_em <= now()
    RETURNING route_id
  )
  SELECT count(*) INTO v_expiradas FROM exp;

  -- (2) rotas 'oferecida' sem nenhuma oferta viva voltam à fila
  UPDATE delivery_routes r
     SET status = 'planejada'
   WHERE r.status = 'oferecida'
     AND NOT EXISTS (
       SELECT 1 FROM dispatch_offers d
       WHERE d.route_id = r.id AND d.resposta IS NULL AND d.expira_em > now()
     );

  -- (3) ofertar as rotas planejadas, mais antigas primeiro
  FOR r IN
    SELECT id FROM delivery_routes
    WHERE status = 'planejada'
    ORDER BY criado_em
    LIMIT 50
  LOOP
    PERFORM ofertar_rota(r.id);
    v_rotas := v_rotas + 1;
  END LOOP;

  RETURN QUERY SELECT v_rotas, v_expiradas;
END;
$$;

COMMENT ON FUNCTION processar_fila_despacho IS
  'Alvo do pg_cron a cada 30s (docs/31 §3.2). Expira ofertas e reoferece rotas.';

-- ------------------------------------------------------------
-- 14. Agendamento pg_cron
--     Ativado apenas se a extensão existir no projeto — em local dev
--     sem pg_cron a migration não quebra.
-- ------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('despacho-logistica')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'despacho-logistica');
    PERFORM cron.schedule(
      'despacho-logistica',
      '30 seconds',
      'SELECT processar_fila_despacho()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron não configurado — agendar despacho manualmente (docs/31 §3.2)';
END $$;

-- ============================================================
-- DOWN (referência)
-- ============================================================
-- SELECT cron.unschedule('despacho-logistica');
-- DROP FUNCTION IF EXISTS processar_fila_despacho, recusar_oferta_despacho,
--   aceitar_oferta_despacho, ofertar_rota, ranquear_couriers, montar_rota,
--   calcular_ganho_rota, calcular_frete, sequenciar_drops,
--   candidatos_agrupamento, score_courier, courier_elegivel, cfg,
--   distancia_viaria_m, distancia_m;
-- DROP TABLE IF EXISTS logistica_config;
