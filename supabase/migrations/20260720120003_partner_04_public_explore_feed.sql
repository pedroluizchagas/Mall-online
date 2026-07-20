-- ============================================================
-- PARTNER APP · Stage 0 (4/4) — View pública public_explore_feed
-- Referência: docs/partner-app/02-stage-0-backend.md §4 e §6
--
-- O consumer (anon) NUNCA lê store_posts direto — lê esta view, que
-- expõe apenas posts published + approved de lojas ativas, no formato
-- que o Explorar consome (contrato do Stage 9). security_invoker=false
-- (roda como owner): RLS protege linha, view protege coluna — mesmo
-- raciocínio das views public_catalog_* do storefront.
-- products.preco é INTEGER em centavos (migration_001).
-- Idempotente (CREATE OR REPLACE).
-- ============================================================

CREATE OR REPLACE VIEW public_explore_feed
WITH (security_invoker = false) AS
SELECT
  v.id,
  v.tipo,
  s.slug                              AS loja_slug,
  s.nome                              AS loja_nome,
  upper(left(s.nome, 1))              AS loja_inicial,
  v.media_url,
  v.thumb_url,
  COALESCE(v.descricao, '')           AS descricao,
  v.tags,
  v.curtidas,
  v.comentarios,
  v.views,
  v.duracao_seg,
  v.publicado_em,
  CASE WHEN p.id IS NOT NULL
       THEN jsonb_build_object('id', p.id, 'nome', p.nome, 'preco', p.preco)
  END                                 AS produto
FROM store_posts v
JOIN stores   s ON s.id = v.store_id AND s.ativo = true
LEFT JOIN products p ON p.id = v.product_id
WHERE v.status = 'published' AND v.moderacao = 'approved'
ORDER BY v.publicado_em DESC;

GRANT SELECT ON public_explore_feed TO anon, authenticated;
