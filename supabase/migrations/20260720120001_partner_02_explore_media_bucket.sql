-- ============================================================
-- PARTNER APP · Stage 0 (2/4) — Bucket explore-media
-- Referência: docs/partner-app/02-stage-0-backend.md §2
--
-- Mídia dos posts do Explorar (vídeo .mp4 + foto/thumb .jpg).
-- Mesma mecânica de store-assets (20260509000001): escrita apenas
-- no prefixo do próprio tenant, leitura pública (consumer é anônimo).
-- Prefixo de 2 níveis: {tenant_id}/{store_id}/{uuid}.(mp4|jpg)
-- Idempotente.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('explore-media', 'explore-media', true,
        52428800,  -- 50 MB hard cap (compressão client fica bem abaixo)
        ARRAY['video/mp4','video/quicktime',
              'image/jpeg','image/webp','image/png'])
ON CONFLICT (id) DO NOTHING;

-- Lojista faz upload apenas em prefixo do próprio tenant: {tenant_id}/*
DROP POLICY IF EXISTS "explore_media_insert_tenant_proprio" ON storage.objects;
CREATE POLICY "explore_media_insert_tenant_proprio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'explore-media'
    AND (storage.foldername(name))[1] = my_tenant_id()::text
  );

-- Update/upsert no mesmo prefixo (retomada de upload TUS)
DROP POLICY IF EXISTS "explore_media_update_tenant_proprio" ON storage.objects;
CREATE POLICY "explore_media_update_tenant_proprio"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'explore-media'
    AND (storage.foldername(name))[1] = my_tenant_id()::text
  )
  WITH CHECK (
    bucket_id = 'explore-media'
    AND (storage.foldername(name))[1] = my_tenant_id()::text
  );

-- Lojista remove apenas seus próprios arquivos (soft delete + best-effort)
DROP POLICY IF EXISTS "explore_media_delete_tenant_proprio" ON storage.objects;
CREATE POLICY "explore_media_delete_tenant_proprio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'explore-media'
    AND (storage.foldername(name))[1] = my_tenant_id()::text
  );

-- Leitura pública (o Explorar do consumer toca vídeo/vê foto sem sessão)
DROP POLICY IF EXISTS "explore_media_select_publico" ON storage.objects;
CREATE POLICY "explore_media_select_publico"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'explore-media');
