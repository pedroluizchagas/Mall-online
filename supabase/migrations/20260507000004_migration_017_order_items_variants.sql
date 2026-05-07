-- ============================================================
-- MIGRATION 017 (Templates · Fase 1) — order_items aceita
-- variant_id (FK) e modifiers (snapshot JSONB)
-- Referência: docs/dashboard-templates/03-modelo-dados-variacoes-modificadores.md
-- ============================================================

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS modifiers  JSONB;

CREATE INDEX IF NOT EXISTS idx_oi_variant
  ON order_items(variant_id) WHERE variant_id IS NOT NULL;

COMMENT ON COLUMN order_items.variant_id IS
  'NULL quando o produto não tem variação. Referência preservada para histórico, devolução e estoque por SKU.';
COMMENT ON COLUMN order_items.modifiers IS
  'Snapshot dos modificadores selecionados na compra. Array JSONB de {modifier_id, nome, preco_extra}. Snapshot porque o lojista pode deletar o modificador depois sem afetar pedidos antigos.';

-- ============================================================
-- ROLLBACK (não usar em produção sem confirmação):
--   DROP INDEX IF EXISTS idx_oi_variant;
--   ALTER TABLE order_items
--     DROP COLUMN IF EXISTS modifiers,
--     DROP COLUMN IF EXISTS variant_id;
-- ============================================================
