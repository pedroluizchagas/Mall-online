-- ============================================================
-- MIGRATION — Vitrine foundation: theme backfill + store-assets bucket
-- Referência: PR 1.3a (foundation da Vitrine)
-- ============================================================
--
-- Notas:
-- * stores.theme (jsonb), stores.ativo (boolean) e idx_stores_slug já
--   foram criados em 20240101000000_migration_001_additive.sql — por
--   isso esta migration NÃO os recria. Apenas faz backfill.
-- * Bucket store-assets é novo (separado de product-images para isolar
--   logo/banner da loja dos arquivos de produto).

-- ------------------------------------------------------------
-- 1. Backfill de stores.theme para tenants existentes
-- ------------------------------------------------------------
UPDATE stores
   SET theme = jsonb_build_object('template', 'market', 'paleta', null)
 WHERE theme IS NULL;

-- ------------------------------------------------------------
-- 2. Bucket público para assets da vitrine (logo, banner)
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Lojista faz upload apenas em prefixo do próprio tenant: {tenant_id}/*
CREATE POLICY "store_assets_insert_tenant_proprio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'store-assets'
    AND (storage.foldername(name))[1] = my_tenant_id()::text
  );

-- Update/upsert no mesmo prefixo
CREATE POLICY "store_assets_update_tenant_proprio"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'store-assets'
    AND (storage.foldername(name))[1] = my_tenant_id()::text
  )
  WITH CHECK (
    bucket_id = 'store-assets'
    AND (storage.foldername(name))[1] = my_tenant_id()::text
  );

-- Lojista remove apenas seus próprios arquivos
CREATE POLICY "store_assets_delete_tenant_proprio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'store-assets'
    AND (storage.foldername(name))[1] = my_tenant_id()::text
  );

-- Leitura pública (logo e banner aparecem na vitrine /loja/{slug})
CREATE POLICY "store_assets_select_publico"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'store-assets');
