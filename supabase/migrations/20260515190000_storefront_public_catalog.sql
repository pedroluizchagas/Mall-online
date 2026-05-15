-- ============================================================
-- STOREFRONT · STAGE 0 — Catálogo público via VIEW + orders.origem
-- Referência: docs/storefront/02-stage-0-preflight.md (0a + 0b)
-- Decisões: D2 (catálogo via view, NÃO anon nas tabelas base),
--           D3 (orders.origem para convergência dos 3 canais)
--
-- Princípio (D2): RLS no Postgres é row-level, não column-level.
-- Abrir SELECT anônimo em stores/products exporia TODAS as colunas
-- (custo, tenant_id, metadata, campos internos). Por isso criamos
-- views SECURITY INVOKER com colunas EXPLÍCITAS e seguras, e o
-- GRANT SELECT a anon é concedido SÓ nas views. As tabelas base
-- stores/products/variants/modifiers permanecem TO authenticated.
-- Nenhuma policy de orders/order_items/consumers é tocada aqui.
-- categories já tem categories_select_publico (anon) — reusado, não recriado.
--
-- Idempotência: CREATE OR REPLACE VIEW + ADD COLUMN/CONSTRAINT/INDEX
-- IF NOT EXISTS. Constraint orders_origem_check é (re)criada via guard.
--
-- ============================================================
-- ROLLBACK (não usar em produção sem confirmação):
--   -- 0a:
--   DROP VIEW IF EXISTS public_catalog_product_modifiers;
--   DROP VIEW IF EXISTS public_catalog_product_variants;
--   DROP VIEW IF EXISTS public_catalog_products;
--   DROP VIEW IF EXISTS public_catalog_stores;
--   -- 0b:
--   DROP INDEX IF EXISTS idx_orders_origem;
--   ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_origem_check;
--   ALTER TABLE orders DROP COLUMN IF EXISTS origem;
-- ============================================================


-- ============================================================
-- 0a — VIEWS PÚBLICAS DO CATÁLOGO (SECURITY INVOKER)
-- ============================================================
-- security_invoker = true: a view roda com os privilégios de quem
-- consulta (anon). Como anon NÃO tem policy nas tabelas base, a
-- leitura só funciona porque concedemos GRANT SELECT na view e a
-- view define exatamente quais colunas/linhas são expostas.
--
-- Colunas EXCLUÍDAS (internas/sensíveis, nunca expostas a anon):
--   tenant_id, endereco, raio_entrega_km, cf_dns_record_id, domain,
--   sku, stock_quantity, stock_minimo, timestamps internos.
--
-- Colunas INCLUÍDAS por serem voltadas ao consumidor (já exibidas
-- hoje no apps/mobile-consumer — necessárias para paridade):
--   preco_promocional → preço de venda promocional exibido na loja
--     (NÃO é custo/margem; não há campo de custo nessas tabelas).
--   products.metadata → campos de template exibidos ao consumidor
--     (ex.: tempo_preparo_min, serve_pessoas, exige_receita,
--     duracao_min). Ver migration_019 e templates/<codigo>.ts.

-- ── public_catalog_stores — só lojas ativas ──────────────────
CREATE OR REPLACE VIEW public_catalog_stores
WITH (security_invoker = true) AS
SELECT
  s.id,
  s.slug,
  s.nome,
  s.descricao,
  s.logo_url,
  s.banner_url,
  s.telefone,
  s.horarios,
  s.taxa_entrega,
  s.tempo_entrega,
  s.aceita_dinheiro,
  s.aceita_pix,
  s.aceita_cartao_maquininha,
  s.aceita_cartao_online,
  s.categoria_id,
  s.theme
FROM stores s
WHERE s.ativo = true;

COMMENT ON VIEW public_catalog_stores IS
  'Storefront público (anon). Só lojas ativas, colunas seguras. Sem tenant_id/endereco/raio/timestamps. Ver docs/storefront/02-stage-0-preflight.md.';

-- ── public_catalog_products — produtos disponíveis de lojas ativas ──
CREATE OR REPLACE VIEW public_catalog_products
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.store_id,
  p.category_id,
  p.nome,
  p.descricao,
  p.preco,
  p.preco_promocional,
  p.foto_url,
  p.ordem,
  p.disponivel,
  p.metadata
FROM products p
JOIN stores s ON s.id = p.store_id
WHERE p.disponivel = true
  AND s.ativo = true;

COMMENT ON VIEW public_catalog_products IS
  'Storefront público (anon). Só produtos disponíveis de lojas ativas. Sem tenant_id/custo interno/timestamps. preco_promocional é preço de venda exibido ao consumidor (não margem).';

-- ── public_catalog_product_variants — SKUs vendáveis ─────────
-- Sem tenant_id, sku, stock_quantity, stock_minimo, timestamps.
CREATE OR REPLACE VIEW public_catalog_product_variants
WITH (security_invoker = true) AS
SELECT
  v.id,
  v.product_id,
  v.preco,
  v.preco_promocional,
  v.foto_url,
  v.disponivel,
  v.ordem
FROM product_variants v
JOIN products p ON p.id = v.product_id
JOIN stores s ON s.id = p.store_id
WHERE v.disponivel = true
  AND p.disponivel = true
  AND s.ativo = true;

COMMENT ON VIEW public_catalog_product_variants IS
  'Storefront público (anon). Variants disponíveis de produtos disponíveis em lojas ativas. Sem tenant_id/sku/estoque.';

-- ── public_catalog_product_modifiers — adicionais/personalizações ──
CREATE OR REPLACE VIEW public_catalog_product_modifiers
WITH (security_invoker = true) AS
SELECT
  m.id,
  m.group_id,
  m.nome,
  m.preco_extra,
  m.disponivel,
  m.ordem
FROM product_modifiers m
JOIN product_modifier_groups g ON g.id = m.group_id
JOIN products p ON p.id = g.product_id
JOIN stores s ON s.id = p.store_id
WHERE m.disponivel = true
  AND p.disponivel = true
  AND s.ativo = true;

COMMENT ON VIEW public_catalog_product_modifiers IS
  'Storefront público (anon). Modificadores disponíveis de produtos disponíveis em lojas ativas. Sem tenant_id.';

-- ── GRANT SELECT só nas views (anon + authenticated) ─────────
-- As tabelas base NÃO recebem GRANT a anon e suas policies
-- continuam TO authenticated (não alteradas aqui).
GRANT SELECT ON public_catalog_stores            TO anon, authenticated;
GRANT SELECT ON public_catalog_products          TO anon, authenticated;
GRANT SELECT ON public_catalog_product_variants  TO anon, authenticated;
GRANT SELECT ON public_catalog_product_modifiers TO anon, authenticated;

-- categories: já existe categories_select_publico
-- (FOR SELECT USING (ativa = true AND tenant_id IS NULL)) — aplica a
-- anon. Reusado, NÃO recriado aqui (ver supabase/migrations/20260425000000_fix_rls.sql).


-- ============================================================
-- 0b — orders.origem (D3: convergência dos 3 canais)
-- ============================================================
-- DEFAULT 'app' mantém pedidos existentes consistentes (eram todos
-- do app). storefront carimba origem='storefront'; lançamento manual
-- no Dashboard usa 'dashboard_manual'.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'app';

-- Constraint idempotente: dropa e recria (CHECK não tem IF NOT EXISTS).
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_origem_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_origem_check
  CHECK (origem IN ('app', 'storefront', 'dashboard_manual'));

CREATE INDEX IF NOT EXISTS idx_orders_origem ON orders(origem);

COMMENT ON COLUMN orders.origem IS
  'Canal de origem do pedido: app (mobile-consumer, default), storefront (loja web anônima), dashboard_manual (lançado pelo lojista). Ver docs/storefront/01-arquitetura-e-decisoes.md D3.';
