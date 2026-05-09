-- ============================================================
-- PR 2.1 — Avaliações de loja e entrega
-- Referência: docs/dashboard-redesign/04-novas-paginas.md §4.4
-- Helpers RLS my_tenant_id() / my_consumer_id() vêm de migration_006.
-- A escrita pelo dashboard passa apenas pelas Server Actions; a policy
-- de UPDATE do tenant não restringe colunas (validação fica nas actions).
-- ============================================================

CREATE TABLE IF NOT EXISTS store_reviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id            UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  consumer_id         UUID NOT NULL REFERENCES consumers(id) ON DELETE CASCADE,
  estrelas_loja       INT  NOT NULL CHECK (estrelas_loja BETWEEN 1 AND 5),
  estrelas_entrega    INT  CHECK (estrelas_entrega BETWEEN 1 AND 5),
  comentario          TEXT CHECK (length(comentario) <= 2000),
  resposta_lojista    TEXT CHECK (length(resposta_lojista) <= 2000),
  respondida_em       TIMESTAMPTZ,
  sinalizada          BOOLEAN NOT NULL DEFAULT false,
  motivo_sinalizacao  TEXT CHECK (length(motivo_sinalizacao) <= 500),
  criada_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_reviews_tenant_data
  ON store_reviews(tenant_id, criada_em DESC);
CREATE INDEX IF NOT EXISTS idx_store_reviews_sem_resposta
  ON store_reviews(tenant_id, criada_em DESC) WHERE respondida_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_reviews_estrelas
  ON store_reviews(tenant_id, estrelas_loja);
CREATE INDEX IF NOT EXISTS idx_store_reviews_sinalizadas
  ON store_reviews(tenant_id) WHERE sinalizada = true;

ALTER TABLE store_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_le_avaliacoes ON store_reviews
  FOR SELECT TO authenticated
  USING (tenant_id = my_tenant_id());

CREATE POLICY tenant_responde_avaliacao ON store_reviews
  FOR UPDATE TO authenticated
  USING (tenant_id = my_tenant_id())
  WITH CHECK (tenant_id = my_tenant_id());

CREATE POLICY consumer_cria_avaliacao ON store_reviews
  FOR INSERT TO authenticated
  WITH CHECK (consumer_id = my_consumer_id());

CREATE POLICY consumer_le_propria_avaliacao ON store_reviews
  FOR SELECT TO authenticated
  USING (consumer_id = my_consumer_id());

-- Consumer só edita a própria avaliação enquanto o lojista não respondeu
CREATE POLICY consumer_atualiza_propria_pre_resposta ON store_reviews
  FOR UPDATE TO authenticated
  USING (consumer_id = my_consumer_id() AND respondida_em IS NULL)
  WITH CHECK (consumer_id = my_consumer_id() AND respondida_em IS NULL);
