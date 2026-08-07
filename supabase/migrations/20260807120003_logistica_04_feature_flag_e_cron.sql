-- ============================================================
-- LOGISTICA · 4/4 — Feature flag por tenant e agendamento do despacho
-- Referência: docs/31-logistica-de-entrega.md §8 (implantação)
--
-- O despacho automático entra por tenant, não de uma vez: lojistas-piloto
-- de segmentos distintos (alimentação, mercado, farmácia) medem por duas
-- semanas antes do rollout geral. Enquanto a flag está desligada o lojista
-- segue atribuindo entregador manualmente — o fallback permanente.
--
-- A checagem vive em montar_rota, não na Edge Function: assim nenhum
-- caminho de chamada (webhook, cron, retentativa do admin, chamada direta
-- da RPC) consegue despachar um tenant que não optou.
-- Idempotente.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Flag por tenant — default OFF (opt-in)
-- ------------------------------------------------------------

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS logistica_automatica BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS logistica_agrupamento BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN tenants.logistica_automatica IS
  'Liga o despacho automático para o tenant (docs/31 §8). OFF = atribuição manual.';
COMMENT ON COLUMN tenants.logistica_agrupamento IS
  'Permite agrupar pedidos em rota. Só tem efeito com logistica_automatica ligada.';

CREATE INDEX IF NOT EXISTS idx_tenants_logistica
  ON tenants(id) WHERE logistica_automatica = true;

-- ------------------------------------------------------------
-- 2. montar_rota passa a respeitar a flag
--    Substitui a versão da migration 20260807120002. O corpo é o mesmo,
--    com o gate do tenant logo após carregar o pedido e o agrupamento
--    condicionado também à flag de agrupamento.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION montar_rota(p_order_id UUID, p_agrupar BOOLEAN DEFAULT true)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base          RECORD;
  loja          RECORD;
  v_route_id    UUID;
  v_ids         UUID[];
  v_peso        INTEGER := 0;
  v_volume      INTEGER := 0;
  v_refrig      BOOLEAN := false;
  v_fragil      BOOLEAN := false;
  v_porte       cargo_size;
  v_dist        NUMERIC := 0;
  v_ordem       SMALLINT := 0;
  v_flag        BOOLEAN;
  v_flag_agrupa BOOLEAN;
  r             RECORD;
BEGIN
  SELECT o.id, o.store_id, o.tenant_id, o.entrega_lat, o.entrega_lng,
         o.carga_porte, o.carga_peso_g, o.carga_volume_ml,
         o.carga_refrigerada, o.carga_fragil
    INTO base
  FROM orders o WHERE o.id = p_order_id;

  IF base.id IS NULL THEN RETURN NULL; END IF;

  -- Gate do rollout: tenant sem opt-in não é despachado automaticamente.
  SELECT t.logistica_automatica, t.logistica_agrupamento
    INTO v_flag, v_flag_agrupa
  FROM tenants t WHERE t.id = base.tenant_id;

  IF NOT COALESCE(v_flag, false) THEN RETURN NULL; END IF;

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

  -- Agrupamento (cenários A e B), sujeito à flag do tenant e ao pedido
  -- ter geocodificação — sem lat/lng vira entrega individual (docs/31 §10).
  IF p_agrupar AND COALESCE(v_flag_agrupa, true) AND base.entrega_lat IS NOT NULL THEN
    SELECT array_agg(c.order_id) INTO v_ids
    FROM (
      SELECT ca.order_id FROM candidatos_agrupamento(p_order_id) ca LIMIT 2
    ) c;
    v_ids := array_prepend(base.id, COALESCE(v_ids, ARRAY[]::UUID[]));
  END IF;

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

  INSERT INTO route_stops (route_id, ordem, tipo, order_id, store_id, lat, lng, endereco)
  VALUES (
    v_route_id, 0, 'coleta', base.id, loja.id, loja.lat, loja.lng,
    COALESCE(loja.endereco->>'rua', '') || ', ' || COALESCE(loja.endereco->>'numero', '')
  );

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

  UPDATE orders SET status = 'aguardando_entregador'
  WHERE id = ANY(v_ids) AND status = 'em_preparo';

  RETURN v_route_id;
END;
$$;

-- ------------------------------------------------------------
-- 3. Fila do cron restrita a tenants com a flag ligada
--    Evita que uma rota criada antes de a flag ser desligada continue
--    sendo reofertada indefinidamente.
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
  WITH exp AS (
    UPDATE dispatch_offers
       SET resposta = 'expirada', respondido_em = now()
     WHERE resposta IS NULL AND expira_em <= now()
    RETURNING route_id
  )
  SELECT count(*) INTO v_expiradas FROM exp;

  UPDATE delivery_routes r2
     SET status = 'planejada'
   WHERE r2.status = 'oferecida'
     AND NOT EXISTS (
       SELECT 1 FROM dispatch_offers d
       WHERE d.route_id = r2.id AND d.resposta IS NULL AND d.expira_em > now()
     );

  FOR r IN
    SELECT r2.id
    FROM delivery_routes r2
    JOIN tenants t ON t.id = r2.tenant_id
    WHERE r2.status = 'planejada'
      AND t.logistica_automatica = true
    ORDER BY r2.criado_em
    LIMIT 50
  LOOP
    PERFORM ofertar_rota(r.id);
    v_rotas := v_rotas + 1;
  END LOOP;

  RETURN QUERY SELECT v_rotas, v_expiradas;
END;
$$;

-- ------------------------------------------------------------
-- 4. pg_cron — extensão e agendamento
--    No Supabase a extensão precisa estar liberada para o projeto. O bloco
--    tenta habilitar e agendar; se não for possível, a migration continua e
--    o agendamento fica como passo manual documentado em docs/31 §3.2.
-- ------------------------------------------------------------

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron indisponível neste projeto (%). Habilitar no painel do Supabase.', SQLERRM;
END $$;

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
    RAISE NOTICE 'despacho-logistica agendado a cada 30s';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Falha ao agendar despacho-logistica (%). Agendar manualmente.', SQLERRM;
END $$;

-- ============================================================
-- DOWN (referência)
-- ============================================================
-- SELECT cron.unschedule('despacho-logistica');
-- ALTER TABLE tenants
--   DROP COLUMN IF EXISTS logistica_automatica,
--   DROP COLUMN IF EXISTS logistica_agrupamento;
