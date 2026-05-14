-- ============================================================
-- MIGRATION 007 — DROP de colunas Stripe Connect (resíduo)
-- Cutover Stripe Connect → <Pagar.me> concluído.
-- Stripe Billing permanece (colunas stripe_customer_id,
-- stripe_subscription_id, stripe_price_id, stripe_product_id ficam).
-- ============================================================

-- UP

-- tenants
DROP INDEX IF EXISTS idx_tenants_stripe_account; -- ver migration_002:41
ALTER TABLE tenants
  DROP COLUMN IF EXISTS stripe_account_id,
  DROP COLUMN IF EXISTS stripe_onboarding_ok;

-- orders
DROP INDEX IF EXISTS idx_orders_payment_intent; -- ver migration_002:44
ALTER TABLE orders
  DROP COLUMN IF EXISTS stripe_payment_intent_id;

-- couriers
DROP INDEX IF EXISTS idx_couriers_stripe; -- ver migration_003:54
ALTER TABLE couriers
  DROP COLUMN IF EXISTS stripe_account_id,
  DROP COLUMN IF EXISTS stripe_onboarding_ok;

-- payouts
ALTER TABLE payouts
  DROP COLUMN IF EXISTS stripe_transfer_id;

-- DOWN (comentado — para referência manual em rollback)
/*
-- Reverter: re-adicionar colunas como NULLABLE (não tente repreencher,
-- os dados originais foram perdidos no drop). Use somente para
-- desbloquear código antigo em emergência.
ALTER TABLE tenants     ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
                        ADD COLUMN IF NOT EXISTS stripe_onboarding_ok BOOLEAN DEFAULT false;
ALTER TABLE orders      ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE couriers    ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
                        ADD COLUMN IF NOT EXISTS stripe_onboarding_ok BOOLEAN DEFAULT false;
ALTER TABLE payouts     ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;
*/
