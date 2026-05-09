-- ============================================================
-- MIGRATION 021 (Templates · Fase 6) — flag de tutorial inicial
-- Marca se o lojista já viu o tutorial in-app específico do template
-- ============================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS tutorial_template_visto BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tenants.tutorial_template_visto IS
  'Lojista já viu o tutorial in-app sobre os recursos do template do nicho. Mostrado uma vez na primeira sessão após onboarding.';

-- ============================================================
-- ROLLBACK:
--   ALTER TABLE tenants DROP COLUMN IF EXISTS tutorial_template_visto;
-- ============================================================
