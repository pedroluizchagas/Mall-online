-- ============================================================
-- PR 2.5 — Tickets de suporte (lojista → equipe Mallevo)
-- Referência: docs/dashboard-redesign/04-novas-paginas.md §4.5
-- Helper RLS my_tenant_id() vem de migration_006.
-- Comunicação one-way no MVP: lojista cria, atualiza próprio
-- status (resolvido/reaberto); resposta da equipe Mallevo ficará
-- num PR futuro (channel admin).
-- ============================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  autor_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assunto       TEXT NOT NULL CHECK (length(assunto) BETWEEN 3 AND 200),
  mensagem      TEXT NOT NULL CHECK (length(mensagem) BETWEEN 10 AND 4000),
  prioridade    TEXT NOT NULL DEFAULT 'normal'
                CHECK (prioridade IN ('baixa','normal','alta','critica')),
  status        TEXT NOT NULL DEFAULT 'aberto'
                CHECK (status IN ('aberto','em_andamento','resolvido','fechado')),
  criada_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizada_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant
  ON support_tickets(tenant_id, atualizada_em DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_abertos
  ON support_tickets(tenant_id, atualizada_em DESC)
  WHERE status IN ('aberto','em_andamento');

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Tenant lê seus tickets
CREATE POLICY tenant_le_tickets ON support_tickets
  FOR SELECT TO authenticated
  USING (tenant_id = my_tenant_id());

-- Autor (lojista logado) cria ticket no próprio tenant
CREATE POLICY autor_cria_ticket ON support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = my_tenant_id() AND autor_id = auth.uid());

-- Autor atualiza próprio ticket (resolver / reabrir)
CREATE POLICY autor_atualiza_ticket ON support_tickets
  FOR UPDATE TO authenticated
  USING (autor_id = auth.uid())
  WITH CHECK (autor_id = auth.uid());
