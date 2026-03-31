-- Garante que a constraint única no token existe com nome previsível.
-- Se a tabela push_tokens já existir sem a constraint, adiciona.
-- Se já existir, o DO $$ ignora silenciosamente.

DO $$
BEGIN
  -- Adiciona constraint única no token se ainda não existir
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conrelid = 'push_tokens'::regclass
    AND    contype  = 'u'
    AND    conname  = 'push_tokens_token_unique'
  ) THEN
    ALTER TABLE push_tokens
      ADD CONSTRAINT push_tokens_token_unique UNIQUE (token);
  END IF;
END;
$$;
