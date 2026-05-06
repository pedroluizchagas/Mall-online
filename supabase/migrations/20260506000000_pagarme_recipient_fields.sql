-- ============================================================
-- Pagar.me recipient fields para tenants e couriers
-- ============================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS pagarme_recipient_id      TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pagarme_onboarding_status TEXT;

ALTER TABLE couriers
  ADD COLUMN IF NOT EXISTS pagarme_recipient_id      TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pagarme_onboarding_status TEXT;

CREATE INDEX IF NOT EXISTS idx_tenants_pagarme_recipient
  ON tenants(pagarme_recipient_id);

CREATE INDEX IF NOT EXISTS idx_couriers_pagarme_recipient
  ON couriers(pagarme_recipient_id);
