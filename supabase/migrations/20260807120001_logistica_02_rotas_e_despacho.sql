-- ============================================================
-- LOGISTICA · 2/3 — Rotas, paradas e ofertas de despacho
-- Referência: docs/31-logistica-de-entrega.md §3, §4 e §7
--
-- A rota passa a ser a UNIDADE OPERACIONAL (N pedidos, N+1 paradas).
-- delivery_assignments continua sendo a UNIDADE FINANCEIRA — segue
-- 1 por pedido (order_id UNIQUE) e 1 transfer Pagar.me por pedido,
-- exatamente como em docs/06 e docs/30. Nada muda no split.
--
-- Mudança de contrato: antes o assignment nascia já com entregador
-- (o lojista escolhia). Agora existe dispatch_offers e o assignment
-- só é criado NO ACEITE — o que preserva o histórico de recusas,
-- insumo do score de ranqueamento (§3.2).
--
-- Helpers RLS my_tenant_id() / my_courier_id() / my_consumer_id() /
-- is_admin() vêm de migration_006. Idempotente.
-- ============================================================

-- ------------------------------------------------------------
-- 1. ENUMs
-- ------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE route_status AS ENUM (
    'planejada',    -- montada pelo motor, ainda sem oferta enviada
    'oferecida',    -- oferta pendente com algum entregador
    'aceita',       -- entregador aceitou; assignments criados
    'em_andamento', -- primeira coleta confirmada
    'concluida',
    'cancelada'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE stop_type AS ENUM ('coleta', 'entrega');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE stop_status AS ENUM ('pendente', 'no_local', 'concluida', 'falhou');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE offer_response AS ENUM ('aceita', 'recusada', 'expirada');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------
-- 2. delivery_routes — a rota
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS delivery_routes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL enquanto planejada/oferecida: ninguém aceitou ainda
  courier_id          UUID REFERENCES couriers(id) ON DELETE SET NULL,
  -- Tenant da(s) loja(s). Em rota multi-loja (cenário C, Fase 2) guarda o
  -- tenant da primeira coleta; a RLS do lojista usa route_stops, não este
  -- campo, justamente para não quebrar quando a rota cruzar tenants.
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  status              route_status NOT NULL DEFAULT 'planejada',

  -- Snapshot do dimensionamento no momento do planejamento
  drops               SMALLINT NOT NULL DEFAULT 1 CHECK (drops >= 1),
  coletas             SMALLINT NOT NULL DEFAULT 1 CHECK (coletas >= 1),
  carga_peso_g        INTEGER  NOT NULL DEFAULT 0,
  carga_volume_ml     INTEGER  NOT NULL DEFAULT 0,
  carga_porte         cargo_size,
  carga_refrigerada   BOOLEAN  NOT NULL DEFAULT false,
  carga_fragil        BOOLEAN  NOT NULL DEFAULT false,

  -- Haversine × 1,3 na Fase 1; distância real de rua na Fase 2 (OSRM)
  distancia_total_m   INTEGER,
  duracao_estimada_s  INTEGER,

  -- Remuneração do entregador pela rota inteira, em centavos.
  -- O rateio por pedido (que vira transfer) fica em delivery_assignments.
  ganho_total         INTEGER NOT NULL DEFAULT 0,

  -- Quantas rodadas de oferta já foram feitas (§3.1: 3 ciclos → broadcast)
  ciclos_oferta       SMALLINT NOT NULL DEFAULT 0,

  criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  aceita_em           TIMESTAMPTZ,
  concluida_em        TIMESTAMPTZ,

  -- Rota aceita sem entregador é estado impossível
  CONSTRAINT rota_aceita_tem_courier
    CHECK (status IN ('planejada','oferecida','cancelada') OR courier_id IS NOT NULL)
);

-- Fila do motor de despacho: rotas aguardando entregador, mais antigas primeiro
CREATE INDEX IF NOT EXISTS idx_routes_fila
  ON delivery_routes(status, criado_em)
  WHERE status IN ('planejada', 'oferecida');

-- "Minhas rotas" no app do entregador
CREATE INDEX IF NOT EXISTS idx_routes_courier
  ON delivery_routes(courier_id, status);

CREATE INDEX IF NOT EXISTS idx_routes_tenant
  ON delivery_routes(tenant_id, criado_em DESC);

-- ------------------------------------------------------------
-- 3. route_stops — as paradas em sequência
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS route_stops (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id      UUID NOT NULL REFERENCES delivery_routes(id) ON DELETE CASCADE,

  -- Sequência de execução: coletas primeiro, depois entregas (§5)
  ordem         SMALLINT NOT NULL CHECK (ordem >= 0),
  tipo          stop_type NOT NULL,

  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  lat           NUMERIC(10,7),
  lng           NUMERIC(10,7),
  endereco      TEXT,

  status        stop_status NOT NULL DEFAULT 'pendente',
  eta           TIMESTAMPTZ,
  concluida_em  TIMESTAMPTZ,

  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Uma parada por (pedido, tipo) na rota: não existe coletar duas vezes
  -- o mesmo pedido. Em agrupamento cenário A (mesmo endereço, dois pedidos)
  -- são dois stops de entrega distintos, um por pedido — cada um tem sua
  -- confirmação e seu código.
  CONSTRAINT route_stops_unico UNIQUE (route_id, order_id, tipo)
);

-- Leitura da rota na ordem de execução (tela "Em rota")
CREATE INDEX IF NOT EXISTS idx_route_stops_ordem
  ON route_stops(route_id, ordem);

-- Consumidor consultando a parada do próprio pedido
CREATE INDEX IF NOT EXISTS idx_route_stops_order
  ON route_stops(order_id);

CREATE INDEX IF NOT EXISTS idx_route_stops_store
  ON route_stops(store_id) WHERE tipo = 'coleta';

-- ------------------------------------------------------------
-- 4. dispatch_offers — histórico de ofertas
--    Existe para (a) permitir cascata com expiração e (b) alimentar
--    couriers.taxa_aceitacao, peso de 15% no score (§3.1).
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dispatch_offers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id       UUID NOT NULL REFERENCES delivery_routes(id) ON DELETE CASCADE,
  courier_id     UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,

  -- Score que colocou este entregador no topo — guardado para debug do
  -- motor e para calibrar os pesos com dados reais na Fase 2
  score          NUMERIC(6,4),
  -- Rodada da cascata: 0,1,2 = oferta dirigida; 3+ = broadcast
  ciclo          SMALLINT NOT NULL DEFAULT 0,

  enviado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em      TIMESTAMPTZ NOT NULL,
  respondido_em  TIMESTAMPTZ,
  resposta       offer_response,

  CONSTRAINT oferta_respondida_tem_data
    CHECK ((resposta IS NULL) = (respondido_em IS NULL))
);

-- O entregador não recebe nova oferta enquanto tem uma pendente (anti-afogamento).
-- Índice parcial serve tanto a essa checagem quanto à listagem no app.
CREATE INDEX IF NOT EXISTS idx_offers_pendentes_courier
  ON dispatch_offers(courier_id, expira_em)
  WHERE resposta IS NULL;

-- Varredura do pg_cron: ofertas vencidas a expirar
CREATE INDEX IF NOT EXISTS idx_offers_expiracao
  ON dispatch_offers(expira_em)
  WHERE resposta IS NULL;

CREATE INDEX IF NOT EXISTS idx_offers_route
  ON dispatch_offers(route_id, enviado_em DESC);

-- ------------------------------------------------------------
-- 5. delivery_assignments vira filho da rota
--    order_id UNIQUE é MANTIDO: 1 assignment por pedido, 1 transfer
--    por pedido. A rota agrupa vários assignments.
-- ------------------------------------------------------------

ALTER TABLE delivery_assignments
  ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES delivery_routes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_route
  ON delivery_assignments(route_id);

-- ------------------------------------------------------------
-- 6. atualizado_em automático
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_routes_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS routes_touch ON delivery_routes;
CREATE TRIGGER routes_touch
  BEFORE UPDATE ON delivery_routes
  FOR EACH ROW EXECUTE FUNCTION trg_routes_touch();

-- ------------------------------------------------------------
-- 7. Taxa de aceitação — mantida a cada resposta de oferta
--    Média móvel sobre as últimas 20 ofertas: recuperável em poucas
--    corridas, não pune para sempre quem recusou num dia ruim.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_offers_taxa_aceitacao()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_taxa NUMERIC;
BEGIN
  IF NEW.resposta IS NULL OR NEW.resposta IS NOT DISTINCT FROM OLD.resposta THEN
    RETURN NEW;
  END IF;

  SELECT AVG(CASE WHEN o.resposta = 'aceita' THEN 1.0 ELSE 0.0 END)
    INTO v_taxa
  FROM (
    SELECT resposta FROM dispatch_offers
    WHERE courier_id = NEW.courier_id AND resposta IS NOT NULL
    ORDER BY respondido_em DESC LIMIT 20
  ) o;

  UPDATE couriers
     SET taxa_aceitacao = COALESCE(v_taxa, 1.0)
   WHERE id = NEW.courier_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS offers_taxa_aceitacao ON dispatch_offers;
CREATE TRIGGER offers_taxa_aceitacao
  AFTER UPDATE OF resposta ON dispatch_offers
  FOR EACH ROW EXECUTE FUNCTION trg_offers_taxa_aceitacao();

-- ------------------------------------------------------------
-- 8. RLS
--    entregador  → só as próprias rotas/paradas/ofertas
--    lojista     → rotas que tocam pedidos do seu tenant
--    consumidor  → só a parada do próprio pedido
--    admin       → tudo
-- ------------------------------------------------------------

ALTER TABLE delivery_routes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_offers  ENABLE ROW LEVEL SECURITY;

-- ---- delivery_routes ----

-- Entregador: a rota que já é dele + as que tem oferta pendente para ele
-- (precisa ler para decidir aceitar).
DROP POLICY IF EXISTS routes_select_courier ON delivery_routes;
CREATE POLICY routes_select_courier ON delivery_routes
  FOR SELECT TO authenticated
  USING (
    courier_id = my_courier_id()
    OR EXISTS (
      SELECT 1 FROM dispatch_offers d
      WHERE d.route_id = delivery_routes.id
        AND d.courier_id = my_courier_id()
        AND d.resposta IS NULL
        AND d.expira_em > now()
    )
  );

-- Lojista: qualquer rota que carregue um pedido do seu tenant. Via
-- route_stops (não via tenant_id da rota) para funcionar em rota multi-loja.
DROP POLICY IF EXISTS routes_select_lojista ON delivery_routes;
CREATE POLICY routes_select_lojista ON delivery_routes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM route_stops rs
      JOIN orders o ON o.id = rs.order_id
      WHERE rs.route_id = delivery_routes.id
        AND o.tenant_id = my_tenant_id()
    )
  );

-- Aceite da oferta: o entregador escreve courier_id/status na rota.
-- A transição válida é garantida por aceitar_oferta_despacho (migration 3),
-- que roda como SECURITY DEFINER; esta policy cobre o caminho direto.
DROP POLICY IF EXISTS routes_update_courier ON delivery_routes;
CREATE POLICY routes_update_courier ON delivery_routes
  FOR UPDATE TO authenticated
  USING (courier_id = my_courier_id())
  WITH CHECK (courier_id = my_courier_id());

DROP POLICY IF EXISTS routes_admin ON delivery_routes;
CREATE POLICY routes_admin ON delivery_routes
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ---- route_stops ----

DROP POLICY IF EXISTS stops_select_courier ON route_stops;
CREATE POLICY stops_select_courier ON route_stops
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_routes r
      WHERE r.id = route_stops.route_id
        AND (
          r.courier_id = my_courier_id()
          OR EXISTS (
            SELECT 1 FROM dispatch_offers d
            WHERE d.route_id = r.id
              AND d.courier_id = my_courier_id()
              AND d.resposta IS NULL
              AND d.expira_em > now()
          )
        )
    )
  );

DROP POLICY IF EXISTS stops_select_lojista ON route_stops;
CREATE POLICY stops_select_lojista ON route_stops
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = route_stops.order_id AND o.tenant_id = my_tenant_id()
    )
  );

-- Consumidor: apenas a parada de ENTREGA do próprio pedido. Não vê as
-- coletas nem os drops dos outros pedidos da rota — é o que sustenta a
-- promessa de docs/31 §4.3 (rastreio individual em rota agrupada).
DROP POLICY IF EXISTS stops_select_consumidor ON route_stops;
CREATE POLICY stops_select_consumidor ON route_stops
  FOR SELECT TO authenticated
  USING (
    tipo = 'entrega'
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = route_stops.order_id AND o.consumer_id = my_consumer_id()
    )
  );

-- Entregador atualiza o status da parada (chegou, concluiu)
DROP POLICY IF EXISTS stops_update_courier ON route_stops;
CREATE POLICY stops_update_courier ON route_stops
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_routes r
      WHERE r.id = route_stops.route_id AND r.courier_id = my_courier_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_routes r
      WHERE r.id = route_stops.route_id AND r.courier_id = my_courier_id()
    )
  );

DROP POLICY IF EXISTS stops_admin ON route_stops;
CREATE POLICY stops_admin ON route_stops
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ---- dispatch_offers ----

-- O entregador vê apenas as ofertas feitas a ele. Não existe leitura
-- cruzada: quem mais recebeu a oferta é informação do motor.
DROP POLICY IF EXISTS offers_select_courier ON dispatch_offers;
CREATE POLICY offers_select_courier ON dispatch_offers
  FOR SELECT TO authenticated
  USING (courier_id = my_courier_id());

-- Responder (aceitar/recusar) é UPDATE da própria oferta
DROP POLICY IF EXISTS offers_update_courier ON dispatch_offers;
CREATE POLICY offers_update_courier ON dispatch_offers
  FOR UPDATE TO authenticated
  USING (courier_id = my_courier_id() AND resposta IS NULL)
  WITH CHECK (courier_id = my_courier_id());

DROP POLICY IF EXISTS offers_select_lojista ON dispatch_offers;
CREATE POLICY offers_select_lojista ON dispatch_offers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM route_stops rs
      JOIN orders o ON o.id = rs.order_id
      WHERE rs.route_id = dispatch_offers.route_id
        AND o.tenant_id = my_tenant_id()
    )
  );

DROP POLICY IF EXISTS offers_admin ON dispatch_offers;
CREATE POLICY offers_admin ON dispatch_offers
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ------------------------------------------------------------
-- 9. Realtime — o app do entregador escuta ofertas novas
--    (mesmo padrão de migration_010 para delivery_assignments)
-- ------------------------------------------------------------

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE dispatch_offers;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE delivery_routes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE route_stops;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- DOWN (referência)
-- ============================================================
-- ALTER TABLE delivery_assignments DROP COLUMN IF EXISTS route_id;
-- DROP TABLE IF EXISTS dispatch_offers, route_stops, delivery_routes;
-- DROP TYPE IF EXISTS offer_response, stop_status, stop_type, route_status;
