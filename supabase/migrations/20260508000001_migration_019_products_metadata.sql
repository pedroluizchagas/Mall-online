-- ============================================================
-- MIGRATION 019 (Templates · Fase 3a) — products.metadata JSONB
-- Coluna genérica de campos extras específicos de cada template.
-- Para food: tempo_preparo_min, serve_pessoas, tags
-- Para fashion: colecao, composicao, cuidados, tabela_medidas (futuro)
-- Para outros templates: ver packages/lib/src/templates/<codigo>.ts
-- Referência: docs/dashboard-templates/04-templates-por-nicho.md (seção
-- "CAMPOS EXTRAS — ARMAZENAMENTO")
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_products_metadata_gin
  ON products USING GIN (metadata);

COMMENT ON COLUMN products.metadata IS
  'Campos extras específicos do template do nicho. Estrutura varia por template — ver packages/lib/src/templates/<codigo>.ts e docs/dashboard-templates/04-templates-por-nicho.md.';

-- ============================================================
-- ROLLBACK (não usar em produção sem confirmação):
--   DROP INDEX IF EXISTS idx_products_metadata_gin;
--   ALTER TABLE products DROP COLUMN IF EXISTS metadata;
-- ============================================================
