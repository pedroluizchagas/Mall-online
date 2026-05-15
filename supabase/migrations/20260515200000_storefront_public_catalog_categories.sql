-- ============================================================
-- STOREFRONT · STAGE 3a — VIEW pública de categorias do catálogo
-- Referência: docs/storefront/02-stage-0-preflight.md (0a),
--             docs/storefront/05-stage-3-storefront.md (3a)
-- Decisões: D2 (catálogo via view, NÃO anon nas tabelas base)
--
-- Incremental ao migration 20260515190000_storefront_public_catalog.sql
-- (NÃO o edita — já no PR). Stage 0 criou as 4 views de catálogo mas
-- expôs só category_id (UUID), não o nome/ordem da categoria, e não
-- havia public_catalog_categories. O 3a precisa dos nomes/ordem reais
-- para os títulos de seção (paridade com apps/mobile-consumer, que
-- agrupa por categories(id, nome, ordem)).
--
-- Princípio (D2): RLS no Postgres é row-level, não column-level.
-- Abrir SELECT anônimo em categories exporia TODAS as colunas
-- (tenant_id, descricao, icone, timestamps). Por isso criamos uma
-- view SECURITY INVOKER com colunas EXPLÍCITAS e mínimas, e o
-- GRANT SELECT a anon é concedido SÓ na view. A tabela base
-- categories permanece intocada (não recebe GRANT a anon aqui).
-- Mesmo mecanismo exato (security_invoker = true) das 4 views
-- irmãs do Stage 0 — consistência é requisito: as 5 views devem
-- ser idênticas no mecanismo.
--
-- Idempotência: CREATE OR REPLACE VIEW. Re-rodável sem erro.
--
-- ============================================================
-- ROLLBACK (não usar em produção sem confirmação):
--   DROP VIEW IF EXISTS public_catalog_categories;
-- ============================================================


-- ── public_catalog_categories — categorias ativas de lojas ativas ──
-- Colunas EXCLUÍDAS (internas/sensíveis, nunca expostas a anon):
--   tenant_id, descricao, icone, criado_em, atualizado_em.
-- Colunas INCLUÍDAS (mínimas para renderizar seções do cardápio):
--   id, store_id, nome, ordem.
-- Filtro em paridade com public_catalog_products: categoria ativa
-- (c.ativa = true) E loja ativa (JOIN stores s ... s.ativo = true).
CREATE OR REPLACE VIEW public_catalog_categories
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.store_id,
  c.nome,
  c.ordem
FROM categories c
JOIN stores s ON s.id = c.store_id
WHERE c.ativa = true
  AND s.ativo = true;

COMMENT ON VIEW public_catalog_categories IS
  'Storefront público (anon). Só categorias ativas de lojas ativas, colunas seguras (id, store_id, nome, ordem). Sem tenant_id/descricao/icone/timestamps. Usada pelo Stage 3a para títulos/ordem das seções. Ver docs/storefront/02-stage-0-preflight.md e docs/storefront/05-stage-3-storefront.md (3a).';

-- ── GRANT SELECT só na view (anon + authenticated) ───────────
-- A tabela base categories NÃO recebe GRANT a anon aqui.
GRANT SELECT ON public_catalog_categories TO anon, authenticated;
