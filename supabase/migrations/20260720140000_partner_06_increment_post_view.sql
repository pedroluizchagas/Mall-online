-- ============================================================
-- PARTNER APP · Stage 9 — RPC increment_post_view
-- Referência: docs/partner-app/11-stage-9-integracao-consumer.md
--
-- O consumer (anon) incrementa views quando um post fica ativo no
-- Explorar (onViewableItemsChanged, com dedupe por sessão no cliente).
-- SECURITY DEFINER: anon não tem UPDATE em store_posts — a função roda
-- como owner e só toca posts publicados. Fecha a alça de métricas do
-- Stage 8 (o lojista vê o número real).
-- Idempotente (CREATE OR REPLACE).
-- ============================================================

CREATE OR REPLACE FUNCTION increment_post_view(post_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE store_posts
     SET views = views + 1
   WHERE id = post_id
     AND status = 'published';
$$;

GRANT EXECUTE ON FUNCTION increment_post_view(UUID) TO anon, authenticated;
