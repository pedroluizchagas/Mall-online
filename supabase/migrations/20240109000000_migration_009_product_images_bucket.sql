-- Bucket para fotos de produtos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: lojista faz upload apenas na sua pasta (tenant_id/*)
CREATE POLICY "upload_produto_proprio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM tenants WHERE user_id = auth.uid() LIMIT 1
    )
  );

-- Policy: leitura pública
CREATE POLICY "leitura_publica_produtos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- Policy: lojista exclui apenas seus arquivos
CREATE POLICY "exclusao_produto_proprio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM tenants WHERE user_id = auth.uid() LIMIT 1
    )
  );
