-- ============================================================
-- STOREFRONT · STAGE 0 (incremental) — Views públicas de
-- modifiers/variants + categoria_slug em public_catalog_stores
-- Referência: docs/storefront/02-stage-0-preflight.md (0a),
--             docs/storefront/05-stage-3-storefront.md §3b
-- Decisão: D2 (catálogo via VIEW SECURITY INVOKER, NUNCA anon nas
--          tabelas base). Mesmo padrão das views do Stage 0
--          (20260515190000) e da view de categorias (20260515200000).
--
-- Motivo: o Stage 0 expôs public_catalog_product_{variants,modifiers}
-- mas SEM os dados de agrupamento/validação necessários ao 3b:
--   - modifiers só tinha group_id (sem product_id) e sem
--     nome/min_select/max_select do grupo → impossível agrupar por
--     produto nem validar obrigatoriedade.
--   - variants tinha product_id mas sem rótulo nem option groups/
--     options/variant_options → impossível compor o `rotulo`
--     (ItemCarrinhoVariant exige rotulo).
-- Esta migration adiciona SÓ as views faltantes (colunas seguras,
-- sem tenant_id/sku/estoque). As tabelas base e a migration do
-- Stage 0 NÃO são editadas (padrão incremental do 3a).
--
-- categoria_slug: exposto agora em public_catalog_stores (uso futuro
-- no 3e p/ detecção de template de services — getTemplateBySlug).
-- O storefront anônimo ainda NÃO implementa agendamento (decisão:
-- adiar p/ depois do 3e). Só a coluna é antecipada aqui p/ não
-- precisar mexer na fundação de novo.
--
-- Idempotência: CREATE OR REPLACE VIEW + GRANT (re)aplicáveis.
-- CREATE OR REPLACE em public_catalog_stores apenas ANEXA
-- categoria_slug ao FIM (mesma ordem das 16 colunas originais +
-- 1 nova) — não-quebra: lib/tenant.ts lê colunas por nome.
--
-- ============================================================
-- ROLLBACK (não usar em produção sem confirmação):
--   DROP VIEW IF EXISTS public_catalog_product_variant_options;
--   DROP VIEW IF EXISTS public_catalog_product_options;
--   DROP VIEW IF EXISTS public_catalog_product_option_groups;
--   DROP VIEW IF EXISTS public_catalog_product_modifier_groups;
--   -- public_catalog_stores: reaplicar 20260515190000_storefront_
--   -- public_catalog.sql restaura a definição sem categoria_slug
--   -- (CREATE OR REPLACE idempotente).
-- ============================================================


-- ============================================================
-- Modifiers — grupos (faltava product_id + nome/min/max/obrigatorio)
-- ============================================================
-- public_catalog_product_modifiers (Stage 0) já expõe os itens por
-- group_id. Esta view dá o grupo: product_id (p/ agrupar por
-- produto) + min_select/max_select/obrigatorio (p/ validação no
-- ProductModal, espelhando ModalProduto.tsx). Sem tenant_id.
CREATE OR REPLACE VIEW public_catalog_product_modifier_groups
WITH (security_invoker = true) AS
SELECT
  g.id,
  g.product_id,
  g.nome,
  g.min_select,
  g.max_select,
  g.obrigatorio,
  g.ordem
FROM product_modifier_groups g
JOIN products p ON p.id = g.product_id
JOIN stores   s ON s.id = p.store_id
WHERE p.disponivel = true
  AND s.ativo = true;

COMMENT ON VIEW public_catalog_product_modifier_groups IS
  'Storefront público (anon). Grupos de modificadores de produtos disponíveis em lojas ativas. Sem tenant_id. Itens via public_catalog_product_modifiers (group_id).';


-- ============================================================
-- Variants — option groups / options / variant_options
-- ============================================================
-- public_catalog_product_variants (Stage 0) já expõe o variant
-- (id, product_id, preco, ...). Estas 3 views permitem compor o
-- `rotulo` do variant (ex.: "M / Preto") sem expor sku/estoque:
--   variant → variant_options → options (valor) ← option_groups.

CREATE OR REPLACE VIEW public_catalog_product_option_groups
WITH (security_invoker = true) AS
SELECT
  og.id,
  og.product_id,
  og.nome,
  og.ordem
FROM product_option_groups og
JOIN products p ON p.id = og.product_id
JOIN stores   s ON s.id = p.store_id
WHERE p.disponivel = true
  AND s.ativo = true;

COMMENT ON VIEW public_catalog_product_option_groups IS
  'Storefront público (anon). Grupos de opções (ex.: Tamanho, Cor) de produtos disponíveis em lojas ativas. Sem tenant_id.';

CREATE OR REPLACE VIEW public_catalog_product_options
WITH (security_invoker = true) AS
SELECT
  o.id,
  o.group_id,
  o.valor,
  o.hex_color,
  o.ordem
FROM product_options o
JOIN product_option_groups og ON og.id = o.group_id
JOIN products p ON p.id = og.product_id
JOIN stores   s ON s.id = p.store_id
WHERE p.disponivel = true
  AND s.ativo = true;

COMMENT ON VIEW public_catalog_product_options IS
  'Storefront público (anon). Valores de opção (ex.: M, Preto) com hex_color p/ swatch. Sem tenant_id.';

CREATE OR REPLACE VIEW public_catalog_product_variant_options
WITH (security_invoker = true) AS
SELECT
  vo.variant_id,
  vo.option_id
FROM product_variant_options vo
JOIN product_variants v ON v.id = vo.variant_id
JOIN products p ON p.id = v.product_id
JOIN stores   s ON s.id = p.store_id
WHERE v.disponivel = true
  AND p.disponivel = true
  AND s.ativo = true;

COMMENT ON VIEW public_catalog_product_variant_options IS
  'Storefront público (anon). Join variant↔option p/ compor o rótulo do variant. Sem tenant_id/sku.';


-- ============================================================
-- public_catalog_stores — anexa categoria_slug (LEFT JOIN categories)
-- ============================================================
-- CREATE OR REPLACE preserva as 16 colunas originais NA MESMA ORDEM
-- e anexa categoria_slug por último (regra do Postgres p/ OR REPLACE).
-- LEFT JOIN: loja sem categoria, ou categoria não visível a anon
-- (categories_select_publico = ativa AND tenant_id IS NULL), resulta
-- categoria_slug = NULL — mesma semântica do mobile (`?? null`).
-- GRANT já concedido no Stage 0; CREATE OR REPLACE preserva.
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
  s.theme,
  c.slug AS categoria_slug
FROM stores s
LEFT JOIN categories c ON c.id = s.categoria_id
WHERE s.ativo = true;

COMMENT ON VIEW public_catalog_stores IS
  'Storefront público (anon). Só lojas ativas, colunas seguras. Sem tenant_id/endereco/raio/timestamps. categoria_slug via LEFT JOIN categories (uso futuro 3e/services). Ver docs/storefront/02-stage-0-preflight.md.';


-- ============================================================
-- GRANT SELECT só nas views (anon + authenticated) — D2
-- ============================================================
GRANT SELECT ON public_catalog_product_modifier_groups TO anon, authenticated;
GRANT SELECT ON public_catalog_product_option_groups    TO anon, authenticated;
GRANT SELECT ON public_catalog_product_options          TO anon, authenticated;
GRANT SELECT ON public_catalog_product_variant_options  TO anon, authenticated;
GRANT SELECT ON public_catalog_stores                   TO anon, authenticated;
