-- ============================================================
-- MIGRATION 015 — Consolidação dos planos de assinatura
--
-- Reescrita após inspeção do banco real (2026-05-06):
--   • O catálogo definitivo é Básico / Profissional / Premium
--     (Stripe Billing), todos já presentes em `plans` com
--     `stripe_product_id` e `stripe_price_id` reais.
--   • O seed Starter / Pro / Premium-placeholder originalmente
--     planejado seria duplicata de Premium (com Stripe IDs
--     placeholder, quebrando billing) e introduziria 2 planos
--     novos que não existem no produto. Removido.
--   • O plano Enterprise existe na tabela mas não tem assinatura
--     em `tenant_subscriptions`. Soft-delete via `ativo = false`
--     para esconder do form de signup mantendo histórico.
--   • Adiciona UNIQUE em `plans(nome)` para impedir duplicação
--     futura (não há constraint hoje além de PK em `id`).
-- ============================================================

-- ── 1. Soft-delete Enterprise ────────────────────────────────
UPDATE plans
SET ativo = false,
    atualizado_em = now()
WHERE nome = 'Enterprise'
  AND ativo = true;

-- ── 2. Trava nomes duplicados de planos ──────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'plans_nome_unique'
  ) THEN
    ALTER TABLE plans
      ADD CONSTRAINT plans_nome_unique UNIQUE (nome);
  END IF;
END $$;
