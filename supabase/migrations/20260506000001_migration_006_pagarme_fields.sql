-- ============================================================
-- MIGRATION 006 — Campos Pagar.me (split, recipients, charges)
-- Referência: docs/04-migrations-sql.md
-- Referência: docs/06-arquitetura-pagarme-e-modelo-financeiro.md
-- Referência: docs/30-integracao-pagarme-split-recebedores-liquidacao.md
--
-- Adiciona, de forma aditiva, todos os campos necessários para a
-- integração com Pagar.me (split, recipients, charges, transfers,
-- antecipações) sem remover nenhum campo Stripe existente. A
-- remoção dos campos stripe_account_id / stripe_onboarding_ok /
-- stripe_payment_intent_id / stripe_transfer_id ocorre apenas na
-- migration_007, após o cutover completo.
--
-- Também cria a tabela `webhook_events_log` usada para idempotência
-- nas Edge Functions `pagarme-webhook` e `stripe-webhook`.
-- ============================================================

-- ============================================================
-- UP
-- ============================================================

-- ------------------------------------------------------------
-- tenants — recipient Pagar.me do lojista
-- ------------------------------------------------------------
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS pagarme_recipient_id      TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pagarme_onboarding_status TEXT NOT NULL DEFAULT 'registration';

CREATE INDEX IF NOT EXISTS idx_tenants_pagarme_recipient
  ON tenants(pagarme_recipient_id);

-- ------------------------------------------------------------
-- couriers — recipient Pagar.me do entregador autônomo
-- ------------------------------------------------------------
ALTER TABLE couriers
  ADD COLUMN IF NOT EXISTS pagarme_recipient_id      TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pagarme_onboarding_status TEXT NOT NULL DEFAULT 'registration';

CREATE INDEX IF NOT EXISTS idx_couriers_pagarme_recipient
  ON couriers(pagarme_recipient_id);

-- ------------------------------------------------------------
-- orders — Order + Charge Pagar.me
-- ------------------------------------------------------------
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pagarme_order_id  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pagarme_charge_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS valor_estornado   INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_pagarme_order
  ON orders(pagarme_order_id);

CREATE INDEX IF NOT EXISTS idx_orders_pagarme_charge
  ON orders(pagarme_charge_id);

-- ------------------------------------------------------------
-- delivery_assignments — transfer estágio 2 do entregador
-- ------------------------------------------------------------
ALTER TABLE delivery_assignments
  ADD COLUMN IF NOT EXISTS pagarme_transfer_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_assignments_pagarme_transfer
  ON delivery_assignments(pagarme_transfer_id);

-- ------------------------------------------------------------
-- payouts — transfer e antecipação Pagar.me
-- ------------------------------------------------------------
ALTER TABLE payouts
  ADD COLUMN IF NOT EXISTS pagarme_transfer_id     TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pagarme_anticipation_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_payouts_pagarme_transfer
  ON payouts(pagarme_transfer_id);

CREATE INDEX IF NOT EXISTS idx_payouts_pagarme_anticipation
  ON payouts(pagarme_anticipation_id);

-- ------------------------------------------------------------
-- payout_advance_requests — id da antecipação na Pagar.me
-- ------------------------------------------------------------
ALTER TABLE payout_advance_requests
  ADD COLUMN IF NOT EXISTS pagarme_anticipation_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_advance_requests_pagarme_anticipation
  ON payout_advance_requests(pagarme_anticipation_id);

-- ------------------------------------------------------------
-- webhook_events_log — idempotência das Edge Functions de webhook
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS webhook_events_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source        TEXT NOT NULL CHECK (source IN ('pagarme', 'stripe')),
  event_id      TEXT NOT NULL,
  event_type    TEXT NOT NULL,
  payload       JSONB NOT NULL,
  status        TEXT NOT NULL DEFAULT 'received'
                CHECK (status IN ('received', 'processed', 'failed', 'ignored')),
  error_message TEXT,
  recebido_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  processado_em TIMESTAMPTZ,
  CONSTRAINT webhook_events_log_source_event_unique UNIQUE (source, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_log_source_type
  ON webhook_events_log(source, event_type);

CREATE INDEX IF NOT EXISTS idx_webhook_events_log_status
  ON webhook_events_log(status);

CREATE INDEX IF NOT EXISTS idx_webhook_events_log_recebido_em
  ON webhook_events_log(recebido_em DESC);

ALTER TABLE webhook_events_log ENABLE ROW LEVEL SECURITY;

-- Acesso restrito ao service_role (Edge Functions). Sem policies =
-- nenhum cliente authenticated/anon consegue ler ou escrever.

-- ============================================================
-- DOWN
-- ============================================================

-- DROP TABLE IF EXISTS webhook_events_log;

-- ALTER TABLE payout_advance_requests
--   DROP COLUMN IF EXISTS pagarme_anticipation_id;

-- ALTER TABLE payouts
--   DROP COLUMN IF EXISTS pagarme_transfer_id,
--   DROP COLUMN IF EXISTS pagarme_anticipation_id;

-- ALTER TABLE delivery_assignments
--   DROP COLUMN IF EXISTS pagarme_transfer_id;

-- ALTER TABLE orders
--   DROP COLUMN IF EXISTS pagarme_order_id,
--   DROP COLUMN IF EXISTS pagarme_charge_id,
--   DROP COLUMN IF EXISTS valor_estornado;

-- ALTER TABLE couriers
--   DROP COLUMN IF EXISTS pagarme_recipient_id,
--   DROP COLUMN IF EXISTS pagarme_onboarding_status;

-- ALTER TABLE tenants
--   DROP COLUMN IF EXISTS pagarme_recipient_id,
--   DROP COLUMN IF EXISTS pagarme_onboarding_status;
