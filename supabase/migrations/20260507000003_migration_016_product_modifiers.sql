-- ============================================================
-- MIGRATION 016 (Templates · Fase 1) — Modificadores de produto
-- (product_modifier_groups, product_modifiers)
-- Referência: docs/dashboard-templates/03-modelo-dados-variacoes-modificadores.md
-- ============================================================

-- ── Grupo de modificadores (ex: "Adicionais", "Ponto da carne") ──
CREATE TABLE IF NOT EXISTS product_modifier_groups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  min_select   SMALLINT NOT NULL DEFAULT 0,
  max_select   SMALLINT NOT NULL DEFAULT 1,
  obrigatorio  BOOLEAN GENERATED ALWAYS AS (min_select > 0) STORED,
  ordem        SMALLINT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (max_select >= min_select),
  CHECK (min_select >= 0)
);
CREATE INDEX IF NOT EXISTS idx_pmg_product ON product_modifier_groups(product_id);
CREATE INDEX IF NOT EXISTS idx_pmg_tenant ON product_modifier_groups(tenant_id);

COMMENT ON TABLE product_modifier_groups IS
  'Grupo de personalizações que NÃO viram SKU. Ex: ponto da carne, adicionais. min_select/max_select controlam validação no carrinho.';

-- ── Modificador individual (ex: "Bacon (+R$4)") ──────────────
CREATE TABLE IF NOT EXISTS product_modifiers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES product_modifier_groups(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  preco_extra  INTEGER NOT NULL DEFAULT 0,
  disponivel   BOOLEAN NOT NULL DEFAULT true,
  ordem        SMALLINT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pm_group ON product_modifiers(group_id);

COMMENT ON TABLE product_modifiers IS
  'Item individual dentro de um grupo de modificador. preco_extra (centavos) é somado ao preço do produto/variant.';
COMMENT ON COLUMN product_modifiers.preco_extra IS
  'Centavos. Pode ser 0 (modificador sem custo, ex: "Sem cebola").';

-- ── RLS: tenant-scoped ───────────────────────────────────────
ALTER TABLE product_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_modifiers        ENABLE ROW LEVEL SECURITY;

-- product_modifier_groups
CREATE POLICY pmg_select_tenant ON product_modifier_groups FOR SELECT
  TO authenticated USING (tenant_id = my_tenant_id());
CREATE POLICY pmg_insert_tenant ON product_modifier_groups FOR INSERT
  TO authenticated WITH CHECK (tenant_id = my_tenant_id());
CREATE POLICY pmg_update_tenant ON product_modifier_groups FOR UPDATE
  TO authenticated USING (tenant_id = my_tenant_id())
  WITH CHECK (tenant_id = my_tenant_id());
CREATE POLICY pmg_delete_tenant ON product_modifier_groups FOR DELETE
  TO authenticated USING (tenant_id = my_tenant_id());
CREATE POLICY pmg_select_admin ON product_modifier_groups FOR SELECT
  TO authenticated USING (is_admin());
CREATE POLICY pmg_select_publico ON product_modifier_groups FOR SELECT
  TO authenticated
  USING (product_id IN (SELECT id FROM products WHERE disponivel = true));

-- product_modifiers (tenant via group)
CREATE POLICY pm_select_tenant ON product_modifiers FOR SELECT
  TO authenticated
  USING (group_id IN (
    SELECT id FROM product_modifier_groups WHERE tenant_id = my_tenant_id()
  ));
CREATE POLICY pm_insert_tenant ON product_modifiers FOR INSERT
  TO authenticated
  WITH CHECK (group_id IN (
    SELECT id FROM product_modifier_groups WHERE tenant_id = my_tenant_id()
  ));
CREATE POLICY pm_update_tenant ON product_modifiers FOR UPDATE
  TO authenticated
  USING (group_id IN (
    SELECT id FROM product_modifier_groups WHERE tenant_id = my_tenant_id()
  ));
CREATE POLICY pm_delete_tenant ON product_modifiers FOR DELETE
  TO authenticated
  USING (group_id IN (
    SELECT id FROM product_modifier_groups WHERE tenant_id = my_tenant_id()
  ));
CREATE POLICY pm_select_admin ON product_modifiers FOR SELECT
  TO authenticated USING (is_admin());
CREATE POLICY pm_select_publico ON product_modifiers FOR SELECT
  TO authenticated
  USING (
    disponivel = true
    AND group_id IN (
      SELECT g.id FROM product_modifier_groups g
      JOIN products p ON p.id = g.product_id
      WHERE p.disponivel = true
    )
  );

-- ============================================================
-- ROLLBACK (não usar em produção sem confirmação):
--   DROP TABLE IF EXISTS product_modifiers;
--   DROP TABLE IF EXISTS product_modifier_groups;
-- ============================================================
