-- ============================================================
-- PARTNER APP · Stage 3 — push_tokens aceita app 'partner'
-- Referência: docs/partner-app/05-stage-3-pedidos.md (push de pedido)
--
-- migration_011 criou o CHECK app IN ('consumer','courier'). O App do
-- Lojista registra tokens com app='partner' e user_id do lojista — a
-- Edge Function notify-order-update já busca tokens por tenants.user_id,
-- então o lojista passa a receber push sem mudança na função.
-- Idempotente.
-- ============================================================

DO $$
BEGIN
  -- Remove o CHECK antigo (nome auto-gerado pelo Postgres na migration_011)
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'push_tokens'::regclass
      AND conname = 'push_tokens_app_check'
  ) THEN
    ALTER TABLE push_tokens DROP CONSTRAINT push_tokens_app_check;
  END IF;

  -- Recria incluindo 'partner' (no-op se já existir com este nome)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'push_tokens'::regclass
      AND conname = 'push_tokens_app_check_v2'
  ) THEN
    ALTER TABLE push_tokens
      ADD CONSTRAINT push_tokens_app_check_v2
      CHECK (app IN ('consumer', 'courier', 'partner'));
  END IF;
END;
$$;
