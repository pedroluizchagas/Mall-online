-- ============================================================
-- PIX · Coluna de expiração do QR code
--
-- As telas de checkout Pix (consumer `app/checkout/pix.tsx` e storefront
-- `PixClient.tsx`) sempre selecionaram `pagarme_qr_code_expires_at`, mas a
-- coluna nunca existiu — o select inteiro falhava com 42703 e a tela ficava
-- em erro. As colunas irmãs (`pagarme_qr_code`, `pagarme_qr_code_url`) já
-- existem; esta completa o trio e passa a ser preenchida pela Edge Function
-- create-pagarme-order junto com as demais.
-- Idempotente.
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pagarme_qr_code_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN orders.pagarme_qr_code_expires_at IS
  'Expiração do QR code Pix informada pelo Pagar.me (expires_in de 1h no create-pagarme-order).';

-- ============================================================
-- DOWN (referência)
-- ============================================================
-- ALTER TABLE orders DROP COLUMN IF EXISTS pagarme_qr_code_expires_at;
