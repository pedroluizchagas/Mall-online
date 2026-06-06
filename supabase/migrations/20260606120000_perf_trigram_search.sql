-- ============================================================
-- PERFORMANCE · Fase 3.3 — busca por trigram (ILIKE '%termo%')
-- Referência: docs/dev/correction-plan.md (Fase 3 — Performance)
--
-- A busca do consumer (apps/mobile-consumer/app/(tabs)/buscar.tsx) usa
-- ILIKE '%termo%' em stores.nome e products.nome. Wildcard à esquerda NÃO
-- aproveita índice B-tree → sequential scan. Com a plataforma crescendo
-- (5k lojistas / 100k produtos) isso degrada. Índice GIN trigram torna a
-- busca por substring indexada.
--
-- Aditivo e idempotente. Em produção com volume, preferir CREATE INDEX
-- CONCURRENTLY (não roda em transação de migration) — irrelevante agora
-- (sem usuários reais).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_stores_nome_trgm
  ON stores USING gin (nome gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_nome_trgm
  ON products USING gin (nome gin_trgm_ops);
