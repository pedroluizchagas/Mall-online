-- Perfil completo do consumidor (docs/dev/plano-perfil-consumer.md — Fase 0)
--
-- Três blocos independentes:
--   1. bucket público `consumer-avatars` (foto de perfil)
--   2. colunas `cpf` e `data_nascimento` em `consumers`
--   3. preparo da exclusão de conta: `user_id` anulável + FK ON DELETE SET NULL

-- ============================================================
-- 1. BUCKET consumer-avatars
-- ============================================================
-- Público (como courier-avatars): o avatar aparece em telas que não têm
-- sessão do dono e signed URL exigiria round-trip a cada render.
INSERT INTO storage.buckets (id, name, public)
VALUES ('consumer-avatars', 'consumer-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Upload/upsert apenas na própria pasta (uid/*)
CREATE POLICY "consumer_avatars_insert_proprio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'consumer-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "consumer_avatars_update_proprio"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'consumer-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'consumer-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Leitura pública (avatar exibido no app e no painel do lojista)
CREATE POLICY "consumer_avatars_select_publico"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'consumer-avatars');

-- O dono remove a própria foto ("Remover foto" no perfil). Diferente do
-- courier-avatars, onde só o admin apaga: aqui a foto é do consumidor e ele
-- precisa poder voltar à inicial do nome sem passar por suporte.
CREATE POLICY "consumer_avatars_delete_proprio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'consumer-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 2. CADASTRO COMPLETO
-- ============================================================
-- cpf: armazenado só com dígitos (sem pontos/traço) — a máscara é do app.
-- Sem UNIQUE: base legada pode ter duplicata e um erro de digitação
-- bloquearia o cadastro de outra pessoa. Ambos opcionais: o signup pede só
-- nome/email/telefone, o resto é preenchido no perfil.
ALTER TABLE consumers ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE consumers ADD COLUMN IF NOT EXISTS data_nascimento DATE;

COMMENT ON COLUMN consumers.cpf IS 'Somente dígitos (11 caracteres). Validado no app.';
COMMENT ON COLUMN consumers.data_nascimento IS 'Data de nascimento. Opcional.';

-- ============================================================
-- 3. PREPARO DA EXCLUSÃO DE CONTA
-- ============================================================
-- Excluir a conta anonimiza o `consumers` e apaga o auth user; a linha
-- precisa SOBREVIVER porque `orders.consumer_id` a referencia (NO ACTION) e
-- os pedidos ficam por obrigação fiscal. Com o CASCADE original, deletar o
-- auth user levaria o consumer junto e o FK de orders barraria a operação.
ALTER TABLE consumers ALTER COLUMN user_id DROP NOT NULL;

DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  -- Nome gerado pelo Postgres na criação da tabela; descoberto em runtime
  -- para o push não quebrar se o ambiente tiver outro nome.
  SELECT conname INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = 'public.consumers'::regclass
    AND contype = 'f'
    AND conkey = ARRAY[
      (SELECT attnum FROM pg_attribute
        WHERE attrelid = 'public.consumers'::regclass AND attname = 'user_id')
    ];

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE consumers DROP CONSTRAINT %I', v_constraint);
  END IF;
END $$;

ALTER TABLE consumers
  ADD CONSTRAINT consumers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- O UNIQUE em user_id continua válido: no Postgres, NULLs não colidem entre
-- si, então várias contas excluídas convivem.
