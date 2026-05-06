-- ============================================================
-- MIGRATION — bucket courier-docs + INSERT policy em couriers
--
-- Problemas corrigidos:
--   1. Bucket courier-docs ausente → uploads retornavam 400
--   2. Sem policy INSERT em couriers → cadastro bloqueado pelo RLS
-- ============================================================

-- Bucket para fotos de perfil e documentos dos entregadores
INSERT INTO storage.buckets (id, name, public)
VALUES ('courier-docs', 'courier-docs', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: entregador faz upload/upsert apenas na sua pasta (uid/*)
CREATE POLICY "courier_docs_insert_proprio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'courier-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "courier_docs_update_proprio"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'courier-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'courier-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: leitura pública (fotos de perfil exibidas no admin e no app consumidor)
CREATE POLICY "courier_docs_select_publico"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'courier-docs');

-- Policy: admin pode remover arquivos
CREATE POLICY "courier_docs_delete_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'courier-docs'
    AND is_admin()
  );

-- INSERT em couriers estava ausente desde a migration 006
-- Sem isso, o RLS bloqueava o auto-cadastro do entregador
CREATE POLICY "couriers_insert_proprio"
  ON couriers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
