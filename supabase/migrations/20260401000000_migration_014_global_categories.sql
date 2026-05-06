-- ============================================================
-- MIGRATION 014 — Consolidação de categorias globais
--
-- Reescrita após inspeção do banco real (2026-05-06):
--   • Os 14 nomes do seed original já existem em `categories`
--     (alguns com duplicatas) — o seed seria no-op com UNIQUE,
--     ou criaria duplicatas sem ele. Removido.
--   • A coluna `stores.global_category_id` é redundante com
--     `stores.categoria_id` (já gravada no onboarding desde a
--     migration 20260425000001 e referenciada pelas mesmas FKs).
--     Removida para evitar divergência futura.
--   • Existem 9 linhas duplicadas em `categories` (tenant_id IS NULL)
--     em 8 nomes distintos; nenhuma é referenciada por `stores`
--     (`categoria_id` ou `global_category_id` apontando para elas).
--     Mantemos a linha mais antiga por `criado_em` (tiebreak `id::text`).
--   • Cria índice único parcial em `categories(nome) WHERE tenant_id
--     IS NULL` para impedir reincidência da duplicação.
-- ============================================================

-- ── 1. Remove coluna redundante ──────────────────────────────
DROP INDEX IF EXISTS idx_stores_global_category;

ALTER TABLE stores
  DROP COLUMN IF EXISTS global_category_id;

-- ── 2. Deduplica categorias globais ──────────────────────────
WITH winners AS (
  SELECT DISTINCT ON (nome) id
  FROM categories
  WHERE tenant_id IS NULL
  ORDER BY nome, criado_em ASC NULLS LAST, id::text ASC
)
DELETE FROM categories
WHERE tenant_id IS NULL
  AND id NOT IN (SELECT id FROM winners);

-- ── 3. Trava futuras duplicatas globais ──────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS categories_nome_global_unique
  ON categories (nome) WHERE tenant_id IS NULL;
