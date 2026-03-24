-- ============================================================
-- UP
-- ============================================================

-- Campos Stripe no tenant (lojista)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id   TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_account_id    TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_ok BOOLEAN NOT NULL DEFAULT false;

-- Campos Stripe na assinatura
ALTER TABLE tenant_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_price_id         TEXT,
  ADD COLUMN IF NOT EXISTS billing_status          TEXT NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_termina_em        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS periodo_inicio          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS periodo_fim             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelado_em            TIMESTAMPTZ;

-- Campos de pagamento no pedido
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status           TEXT NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS platform_fee_amount      INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS troco_para               INTEGER,
  ADD COLUMN IF NOT EXISTS cancelado_em             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento      TEXT;

-- Campos Stripe nos planos
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id   TEXT,
  ADD COLUMN IF NOT EXISTS tem_antecipacao   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_entregadores  INTEGER NOT NULL DEFAULT 1;

-- Índices novos
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer
  ON tenants(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_tenants_stripe_account
  ON tenants(stripe_account_id);

CREATE INDEX IF NOT EXISTS idx_orders_payment_intent
  ON orders(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status
  ON orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe
  ON tenant_subscriptions(stripe_subscription_id);
