-- ============================================================
-- MIGRATION 020 (Templates · Fase 5b1) — Agenda de services
-- Tabelas: service_staff, service_blocks
-- Estende orders com tipo + agendamento_inicio_at/fim_at + staff_id
-- Referência: docs/dashboard-templates/04-templates-por-nicho.md (TEMPLATE 5)
-- ============================================================

-- ── service_staff: profissionais que atendem na loja ─────────
CREATE TABLE IF NOT EXISTS service_staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  foto_url    TEXT,
  cor         TEXT,                       -- hex pra cor do calendário (#RRGGBB)
  ativo       BOOLEAN NOT NULL DEFAULT true,
  ordem       SMALLINT NOT NULL DEFAULT 0,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ss_store ON service_staff(store_id);
CREATE INDEX IF NOT EXISTS idx_ss_tenant ON service_staff(tenant_id);

COMMENT ON TABLE service_staff IS
  'Profissionais que atendem em uma loja services. Cada serviço por enquanto pode ser atendido por qualquer staff (atribuição staff×serviço fica para iteração futura).';

-- ── service_blocks: bloqueios de horário (folga, almoço) ─────
CREATE TABLE IF NOT EXISTS service_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id    UUID REFERENCES service_staff(id) ON DELETE CASCADE,  -- NULL = bloqueia loja toda
  inicio_at   TIMESTAMPTZ NOT NULL,
  fim_at      TIMESTAMPTZ NOT NULL,
  motivo      TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fim_at > inicio_at)
);
CREATE INDEX IF NOT EXISTS idx_sb_store_intervalo
  ON service_blocks(store_id, inicio_at, fim_at);
CREATE INDEX IF NOT EXISTS idx_sb_staff ON service_blocks(staff_id) WHERE staff_id IS NOT NULL;

COMMENT ON TABLE service_blocks IS
  'Bloqueios manuais de horário. staff_id NULL = loja inteira (ex: feriado). staff_id preenchido = só aquele profissional (ex: folga).';

-- ── orders: campos novos para agendamento ────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'entrega'
    CHECK (tipo IN ('entrega', 'agendamento')),
  ADD COLUMN IF NOT EXISTS agendamento_inicio_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agendamento_fim_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES service_staff(id);

CREATE INDEX IF NOT EXISTS idx_orders_agendamento_inicio
  ON orders(agendamento_inicio_at)
  WHERE tipo = 'agendamento';

COMMENT ON COLUMN orders.tipo IS
  'entrega = pedido tradicional com entregador. agendamento = serviço com horário (sem entrega).';

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE service_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY ss_select_tenant ON service_staff FOR SELECT
  TO authenticated USING (tenant_id = my_tenant_id());
CREATE POLICY ss_insert_tenant ON service_staff FOR INSERT
  TO authenticated WITH CHECK (tenant_id = my_tenant_id());
CREATE POLICY ss_update_tenant ON service_staff FOR UPDATE
  TO authenticated USING (tenant_id = my_tenant_id())
  WITH CHECK (tenant_id = my_tenant_id());
CREATE POLICY ss_delete_tenant ON service_staff FOR DELETE
  TO authenticated USING (tenant_id = my_tenant_id());
CREATE POLICY ss_select_admin ON service_staff FOR SELECT
  TO authenticated USING (is_admin());
CREATE POLICY ss_select_publico ON service_staff FOR SELECT
  TO authenticated USING (ativo = true);

CREATE POLICY sb_select_tenant ON service_blocks FOR SELECT
  TO authenticated USING (tenant_id = my_tenant_id());
CREATE POLICY sb_insert_tenant ON service_blocks FOR INSERT
  TO authenticated WITH CHECK (tenant_id = my_tenant_id());
CREATE POLICY sb_update_tenant ON service_blocks FOR UPDATE
  TO authenticated USING (tenant_id = my_tenant_id())
  WITH CHECK (tenant_id = my_tenant_id());
CREATE POLICY sb_delete_tenant ON service_blocks FOR DELETE
  TO authenticated USING (tenant_id = my_tenant_id());
CREATE POLICY sb_select_admin ON service_blocks FOR SELECT
  TO authenticated USING (is_admin());

-- ============================================================
-- ROLLBACK (não usar em produção sem confirmação):
--   ALTER TABLE orders DROP COLUMN IF EXISTS staff_id;
--   ALTER TABLE orders DROP COLUMN IF EXISTS agendamento_fim_at;
--   ALTER TABLE orders DROP COLUMN IF EXISTS agendamento_inicio_at;
--   ALTER TABLE orders DROP COLUMN IF EXISTS tipo;
--   DROP TABLE IF EXISTS service_blocks;
--   DROP TABLE IF EXISTS service_staff;
-- ============================================================
