-- ============================================================
-- STOREFRONT — FIX: catálogo público ilegível por anon
-- ============================================================
-- BUG (descoberto em 2026-07-14, smoke test do StoreTheme):
-- as views public_catalog_* foram criadas com security_invoker
-- = true, ou seja, rodam com os privilégios de QUEM consulta.
-- Anon não tem policy de SELECT nas tabelas base (stores,
-- products, ...): stores_select_publico é `TO authenticated`
-- (migration_006). Resultado: para anon as views retornam
-- SEMPRE 0 linhas (RLS filtra silenciosamente) e todo acesso
-- anônimo ao storefront cai em notFound(). O comentário "D2 —
-- funciona ANÔNIMO" nunca foi verdadeiro em runtime.
--
-- FIX: flip para security_invoker = false (comportamento
-- definer: a view roda com os privilégios do OWNER, que é dono
-- das tabelas e portanto não é filtrado por RLS). A view passa
-- a ser a fronteira de segurança REAL — que sempre foi a
-- intenção do D2:
--   • colunas: só as seguras (as views não projetam tenant_id,
--     endereco, sku, stock_quantity, custo, timestamps);
--   • linhas: WHERE ativo = true / disponivel = true em cadeia
--     (loja→produto→variant/modifier), verificado em todas as 9;
--   • acesso: GRANT SELECT nas views para anon+authenticated
--     (já concedido nas migrations de origem, re-aplicado aqui
--     por idempotência).
-- As policies das tabelas base ficam INTOCADAS (dashboard/admin
-- seguem via authenticated + tenant).
--
-- ROLLBACK:
--   ALTER VIEW <cada view> SET (security_invoker = true);
-- ============================================================

ALTER VIEW public_catalog_stores                   SET (security_invoker = false);
ALTER VIEW public_catalog_products                 SET (security_invoker = false);
ALTER VIEW public_catalog_product_variants         SET (security_invoker = false);
ALTER VIEW public_catalog_product_modifiers        SET (security_invoker = false);
ALTER VIEW public_catalog_categories               SET (security_invoker = false);
ALTER VIEW public_catalog_product_modifier_groups  SET (security_invoker = false);
ALTER VIEW public_catalog_product_option_groups    SET (security_invoker = false);
ALTER VIEW public_catalog_product_options          SET (security_invoker = false);
ALTER VIEW public_catalog_product_variant_options  SET (security_invoker = false);

-- Re-GRANT idempotente: garante o par (definer + grant) mesmo se
-- alguma view for recriada sem grant em migration futura.
GRANT SELECT ON public_catalog_stores                  TO anon, authenticated;
GRANT SELECT ON public_catalog_products                TO anon, authenticated;
GRANT SELECT ON public_catalog_product_variants        TO anon, authenticated;
GRANT SELECT ON public_catalog_product_modifiers       TO anon, authenticated;
GRANT SELECT ON public_catalog_categories              TO anon, authenticated;
GRANT SELECT ON public_catalog_product_modifier_groups TO anon, authenticated;
GRANT SELECT ON public_catalog_product_option_groups   TO anon, authenticated;
GRANT SELECT ON public_catalog_product_options         TO anon, authenticated;
GRANT SELECT ON public_catalog_product_variant_options TO anon, authenticated;

COMMENT ON VIEW public_catalog_stores IS
  'Storefront público (anon). Só lojas ativas, colunas seguras. SECURITY DEFINER (invoker=false): a view é a fronteira de acesso — anon não tem policy nas tabelas base. Ver migration 20260714120000.';
