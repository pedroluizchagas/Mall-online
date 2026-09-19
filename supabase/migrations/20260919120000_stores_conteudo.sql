-- ============================================================================
-- Convergência web · storefront · mobile — Fase 0
-- docs/dev/plano-convergencia-web-storefront-mobile.md
--
-- `stores.conteudo`: conteúdo editorial da loja (campanha do hero, manifesto,
-- fotos da casa, destaques), controlado pelo lojista em /minha-loja e lido
-- pelas vitrines do consumer e do storefront. Schema v1 validado em
-- @mallevo/lib (`packages/lib/src/loja/conteudo.ts`); a coluna é JSONB
-- frouxo, como `theme`, para evoluir sem migration.
-- ============================================================================

ALTER TABLE stores ADD COLUMN IF NOT EXISTS conteudo JSONB;

COMMENT ON COLUMN stores.conteudo IS
  'Conteúdo editorial da vitrine (StoreConteudo v1, @mallevo/lib): campanha, manifesto, galeria_casa, destaques. NULL = a loja nunca preencheu; vitrines usam fallbacks.';

-- A view pública já expõe theme, horarios e categoria_slug; passa a expor
-- conteudo. CREATE OR REPLACE exige colunas novas NO FIM da lista.
-- security_invoker = false é a fronteira de acesso do anon (migration
-- 20260714120000) — precisa ser repetido aqui ou a view volta ao default.
CREATE OR REPLACE VIEW public_catalog_stores
WITH (security_invoker = false) AS
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
  c.slug AS categoria_slug,
  s.conteudo
FROM stores s
LEFT JOIN categories c ON c.id = s.categoria_id
WHERE s.ativo = true;

GRANT SELECT ON public_catalog_stores TO anon, authenticated;
