-- Tabela para armazenar tokens Expo Push de consumidores e entregadores
-- Usada pela Edge Function notify-order-update para enviar push notifications

CREATE TABLE push_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT NOT NULL UNIQUE,
  plataforma  TEXT NOT NULL CHECK (plataforma IN ('ios', 'android')),
  app         TEXT NOT NULL CHECK (app IN ('consumer', 'courier')),
  ativo       BOOLEAN NOT NULL DEFAULT true,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  courier_id  UUID REFERENCES couriers(id) ON DELETE CASCADE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT push_tokens_user_ou_courier CHECK (
    (user_id IS NOT NULL AND courier_id IS NULL) OR
    (user_id IS NULL AND courier_id IS NOT NULL)
  )
);

-- Índices para as consultas da Edge Function
CREATE INDEX push_tokens_user_id_ativo ON push_tokens (user_id, ativo);
CREATE INDEX push_tokens_courier_id_ativo ON push_tokens (courier_id, ativo);

-- Atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION atualizar_push_token_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW EXECUTE FUNCTION atualizar_push_token_timestamp();

-- RLS: usuário só acessa seus próprios tokens
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Consumidor pode inserir/atualizar/deletar o próprio token
CREATE POLICY "consumer: gerenciar próprio token"
  ON push_tokens
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Entregador pode inserir/atualizar/deletar o próprio token
-- (via courier_id vinculado ao auth.uid)
CREATE POLICY "courier: gerenciar próprio token"
  ON push_tokens
  FOR ALL
  TO authenticated
  USING (
    courier_id IN (
      SELECT id FROM couriers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    courier_id IN (
      SELECT id FROM couriers WHERE user_id = auth.uid()
    )
  );
