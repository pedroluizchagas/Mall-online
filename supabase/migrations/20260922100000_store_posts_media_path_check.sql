-- ============================================================
-- Fase 6 · A-03 — Origem da mídia dos posts é do próprio tenant
-- Referência: docs/dev/plano-convergencia-web-storefront-mobile.md §4.1
--
-- `store_posts.media_path` / `thumb_path` são a FONTE DA VERDADE da mídia
-- (a URL é conveniência derivada). A convenção, fixada em `caminhosDoPost`
-- (@mallevo/lib, packages/lib/src/conteudo/posts.ts) e respeitada pelo
-- Partner App, pelo dashboard e pelas 10 linhas de supabase/seed.sql, é:
--
--     {tenant_id}/{store_id}/{uuid}.(mp4|mov|jpg)
--     {tenant_id}/{store_id}/{uuid}-thumb.jpg
--
-- É a mesma que as policies do bucket `explore-media` exigem no Storage.
-- Sem este CHECK, um lojista autenticado podia gravar em `media_path` o
-- objeto de OUTRO tenant: a RLS confere quem escreve a LINHA, não para onde
-- a linha aponta.
--
-- NOT VALID de propósito: a checagem passa a valer para todo INSERT/UPDATE
-- a partir de agora, sem varrer as linhas antigas. Nenhuma linha do seed
-- diverge, mas produção não foi inspecionada nesta sessão. Depois de
-- conferir com
--
--   SELECT id, tenant_id, store_id, media_path, thumb_path
--     FROM store_posts
--    WHERE media_path NOT LIKE tenant_id::text || '/' || store_id::text || '/%'
--       OR (thumb_path IS NOT NULL
--           AND thumb_path NOT LIKE tenant_id::text || '/' || store_id::text || '/%');
--
-- (esperado: 0 linhas), rodar:
--
--   ALTER TABLE store_posts VALIDATE CONSTRAINT store_posts_media_path_do_tenant;
--   ALTER TABLE store_posts VALIDATE CONSTRAINT store_posts_thumb_path_do_tenant;
--
-- Idempotente.
-- ============================================================

ALTER TABLE store_posts
  DROP CONSTRAINT IF EXISTS store_posts_media_path_do_tenant;

ALTER TABLE store_posts
  ADD CONSTRAINT store_posts_media_path_do_tenant
  CHECK (media_path LIKE tenant_id::text || '/' || store_id::text || '/%')
  NOT VALID;

ALTER TABLE store_posts
  DROP CONSTRAINT IF EXISTS store_posts_thumb_path_do_tenant;

ALTER TABLE store_posts
  ADD CONSTRAINT store_posts_thumb_path_do_tenant
  CHECK (
    thumb_path IS NULL
    OR thumb_path LIKE tenant_id::text || '/' || store_id::text || '/%'
  )
  NOT VALID;

COMMENT ON CONSTRAINT store_posts_media_path_do_tenant ON store_posts IS
  'A-03: media_path tem que estar sob {tenant_id}/{store_id}/ (convenção de caminhosDoPost e das policies do bucket explore-media).';

COMMENT ON CONSTRAINT store_posts_thumb_path_do_tenant ON store_posts IS
  'A-03: thumb_path, quando existe, segue o mesmo prefixo de media_path.';
