-- Bucket público para fotos de perfil dos entregadores
-- Separado do courier-docs (documentos privados) para permitir acesso via URL pública sem signed URL
INSERT INTO storage.buckets (id, name, public)
VALUES ('courier-avatars', 'courier-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Entregador faz upload/upsert apenas na sua pasta (uid/*)
CREATE POLICY "courier_avatars_insert_proprio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'courier-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "courier_avatars_update_proprio"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'courier-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'courier-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Leitura pública (avatar exibido no app consumidor, painel admin e app entregador)
CREATE POLICY "courier_avatars_select_publico"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'courier-avatars');

-- Admin pode remover avatares
CREATE POLICY "courier_avatars_delete_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'courier-avatars'
    AND is_admin()
  );
