-- ============================================================
-- PR 2.2 — Convites de entregador (link com token)
-- Referência: docs/dashboard-redesign/04-novas-paginas.md §4.1
-- Helpers RLS my_tenant_id() vêm de migration_006.
--
-- couriers.status é ENUM (pendente|aprovado|reprovado|suspenso) — não
-- existe boolean "ativo". A migration_006 só permite couriers_update
-- ao próprio entregador e ao admin; aqui adicionamos a policy do
-- lojista para que a Server Action consiga ativar/desativar
-- entregadores do próprio tenant.
-- ============================================================

CREATE TABLE IF NOT EXISTS courier_invites (
  token                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome                  TEXT NOT NULL CHECK (length(nome) BETWEEN 2 AND 120),
  telefone              TEXT NOT NULL CHECK (length(telefone) BETWEEN 8 AND 20),
  email                 TEXT CHECK (email IS NULL OR length(email) <= 200),
  expira_em             TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  usado_em              TIMESTAMPTZ,
  usado_por_courier_id  UUID REFERENCES couriers(id) ON DELETE SET NULL,
  criada_em             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courier_invites_tenant_data
  ON courier_invites(tenant_id, criada_em DESC);
CREATE INDEX IF NOT EXISTS idx_courier_invites_telefone
  ON courier_invites(tenant_id, telefone);
CREATE INDEX IF NOT EXISTS idx_courier_invites_pendentes
  ON courier_invites(tenant_id) WHERE usado_em IS NULL;

ALTER TABLE courier_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_le_convites ON courier_invites
  FOR SELECT TO authenticated
  USING (tenant_id = my_tenant_id());

CREATE POLICY tenant_cria_convite ON courier_invites
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = my_tenant_id());

CREATE POLICY tenant_deleta_convite ON courier_invites
  FOR DELETE TO authenticated
  USING (tenant_id = my_tenant_id());

-- Convidado lê convite por token (página pública /convite/[token]).
-- Segurança vem da aleatoriedade do UUID — equivalente a senha.
CREATE POLICY publico_le_convite_por_token ON courier_invites
  FOR SELECT TO anon
  USING (true);

-- ------------------------------------------------------------
-- Permitir que o lojista atualize entregadores do próprio tenant
-- (necessário para alternar status aprovado/suspenso).
-- ------------------------------------------------------------
CREATE POLICY couriers_update_lojista ON couriers
  FOR UPDATE TO authenticated
  USING (tenant_id = my_tenant_id())
  WITH CHECK (tenant_id = my_tenant_id());
