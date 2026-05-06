-- ============================================================
-- UP
-- ============================================================

-- Status do onboarding do recipient Pagar.me
DO $$ BEGIN
  CREATE TYPE pagarme_recipient_status AS ENUM ('pending', 'active', 'refused', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Campos Pagar.me na tenant (recebimentos do lojista)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS pagarme_recipient_id      TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pagarme_onboarding_status pagarme_recipient_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS pagarme_kyc_link          TEXT;

CREATE INDEX IF NOT EXISTS idx_tenants_pagarme_recipient
  ON tenants(pagarme_recipient_id);
