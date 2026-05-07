-- ============================================================
-- MIGRATION 015 (Templates · Fase 1) — Variações de produto
-- (product_option_groups, product_options, product_variants,
--  product_variant_options + trigger validate_variant_options)
-- Referência: docs/dashboard-templates/03-modelo-dados-variacoes-modificadores.md
-- ============================================================

-- ── Grupo de opções (ex: "Tamanho", "Cor") ───────────────────
CREATE TABLE IF NOT EXISTS product_option_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  ordem       SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, nome)
);
CREATE INDEX IF NOT EXISTS idx_pog_product ON product_option_groups(product_id);
CREATE INDEX IF NOT EXISTS idx_pog_tenant ON product_option_groups(tenant_id);

COMMENT ON TABLE product_option_groups IS
  'Grupo de atributos de variação (ex: Tamanho, Cor, Sabor, Porte). Cada produto pode ter 0..N grupos.';

-- ── Valor de uma opção (ex: "M", "Preto", "1kg") ─────────────
CREATE TABLE IF NOT EXISTS product_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES product_option_groups(id) ON DELETE CASCADE,
  valor       TEXT NOT NULL,
  hex_color   TEXT,
  ordem       SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, valor)
);
CREATE INDEX IF NOT EXISTS idx_po_group ON product_options(group_id);

COMMENT ON COLUMN product_options.hex_color IS
  'Opcional, usado apenas quando o grupo representa cor (UI exibe swatch).';

-- ── Variant = combinação de opções = SKU real ────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sku                TEXT,
  preco              INTEGER NOT NULL,
  preco_promocional  INTEGER,
  stock_quantity     INTEGER,
  stock_minimo       INTEGER DEFAULT 0,
  foto_url           TEXT,
  disponivel         BOOLEAN NOT NULL DEFAULT true,
  ordem              SMALLINT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pv_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_pv_tenant ON product_variants(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pv_sku_per_tenant
  ON product_variants(tenant_id, sku) WHERE sku IS NOT NULL;

COMMENT ON TABLE product_variants IS
  'SKU vendável real. Quando há variants, o estoque/preço da products fica como referência e o cálculo usa o variant. Ver docs/dashboard-templates/03.';
COMMENT ON COLUMN product_variants.preco IS
  'Preço em centavos (consistente com products.preco).';
COMMENT ON COLUMN product_variants.stock_quantity IS
  'NULL = não rastreia estoque; INT = quantidade atual.';

-- ── Join: variant ↔ options selecionadas ─────────────────────
CREATE TABLE IF NOT EXISTS product_variant_options (
  variant_id  UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  option_id   UUID NOT NULL REFERENCES product_options(id) ON DELETE RESTRICT,
  PRIMARY KEY (variant_id, option_id)
);
CREATE INDEX IF NOT EXISTS idx_pvo_option ON product_variant_options(option_id);

-- ── RLS: tenant-scoped ───────────────────────────────────────
ALTER TABLE product_option_groups   ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_options          ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant_options  ENABLE ROW LEVEL SECURITY;

-- product_option_groups: tenant_id direto
CREATE POLICY pog_select_tenant ON product_option_groups FOR SELECT
  TO authenticated USING (tenant_id = my_tenant_id());
CREATE POLICY pog_insert_tenant ON product_option_groups FOR INSERT
  TO authenticated WITH CHECK (tenant_id = my_tenant_id());
CREATE POLICY pog_update_tenant ON product_option_groups FOR UPDATE
  TO authenticated USING (tenant_id = my_tenant_id())
  WITH CHECK (tenant_id = my_tenant_id());
CREATE POLICY pog_delete_tenant ON product_option_groups FOR DELETE
  TO authenticated USING (tenant_id = my_tenant_id());
CREATE POLICY pog_select_admin ON product_option_groups FOR SELECT
  TO authenticated USING (is_admin());

-- Public read (consumer app) — só de produtos disponíveis
CREATE POLICY pog_select_publico ON product_option_groups FOR SELECT
  TO authenticated
  USING (product_id IN (SELECT id FROM products WHERE disponivel = true));

-- product_options: tenant via group
CREATE POLICY po_select_tenant ON product_options FOR SELECT
  TO authenticated
  USING (group_id IN (
    SELECT id FROM product_option_groups WHERE tenant_id = my_tenant_id()
  ));
CREATE POLICY po_insert_tenant ON product_options FOR INSERT
  TO authenticated
  WITH CHECK (group_id IN (
    SELECT id FROM product_option_groups WHERE tenant_id = my_tenant_id()
  ));
CREATE POLICY po_update_tenant ON product_options FOR UPDATE
  TO authenticated
  USING (group_id IN (
    SELECT id FROM product_option_groups WHERE tenant_id = my_tenant_id()
  ));
CREATE POLICY po_delete_tenant ON product_options FOR DELETE
  TO authenticated
  USING (group_id IN (
    SELECT id FROM product_option_groups WHERE tenant_id = my_tenant_id()
  ));
CREATE POLICY po_select_admin ON product_options FOR SELECT
  TO authenticated USING (is_admin());
CREATE POLICY po_select_publico ON product_options FOR SELECT
  TO authenticated
  USING (group_id IN (
    SELECT g.id FROM product_option_groups g
    JOIN products p ON p.id = g.product_id
    WHERE p.disponivel = true
  ));

-- product_variants
CREATE POLICY pv_select_tenant ON product_variants FOR SELECT
  TO authenticated USING (tenant_id = my_tenant_id());
CREATE POLICY pv_insert_tenant ON product_variants FOR INSERT
  TO authenticated WITH CHECK (tenant_id = my_tenant_id());
CREATE POLICY pv_update_tenant ON product_variants FOR UPDATE
  TO authenticated USING (tenant_id = my_tenant_id())
  WITH CHECK (tenant_id = my_tenant_id());
CREATE POLICY pv_delete_tenant ON product_variants FOR DELETE
  TO authenticated USING (tenant_id = my_tenant_id());
CREATE POLICY pv_select_admin ON product_variants FOR SELECT
  TO authenticated USING (is_admin());
CREATE POLICY pv_select_publico ON product_variants FOR SELECT
  TO authenticated
  USING (
    disponivel = true
    AND product_id IN (SELECT id FROM products WHERE disponivel = true)
  );

-- product_variant_options: tenant via variant
CREATE POLICY pvo_select_tenant ON product_variant_options FOR SELECT
  TO authenticated
  USING (variant_id IN (
    SELECT id FROM product_variants WHERE tenant_id = my_tenant_id()
  ));
CREATE POLICY pvo_insert_tenant ON product_variant_options FOR INSERT
  TO authenticated
  WITH CHECK (variant_id IN (
    SELECT id FROM product_variants WHERE tenant_id = my_tenant_id()
  ));
CREATE POLICY pvo_delete_tenant ON product_variant_options FOR DELETE
  TO authenticated
  USING (variant_id IN (
    SELECT id FROM product_variants WHERE tenant_id = my_tenant_id()
  ));
CREATE POLICY pvo_select_admin ON product_variant_options FOR SELECT
  TO authenticated USING (is_admin());
CREATE POLICY pvo_select_publico ON product_variant_options FOR SELECT
  TO authenticated
  USING (variant_id IN (
    SELECT v.id FROM product_variants v
    JOIN products p ON p.id = v.product_id
    WHERE v.disponivel = true AND p.disponivel = true
  ));

-- ── Trigger: garante que cada variant tenha no máximo uma option de cada group ──
CREATE OR REPLACE FUNCTION validate_variant_options()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_product_id            UUID;
  v_groups_count          INT;
  v_variant_options_count INT;
BEGIN
  SELECT product_id INTO v_product_id
  FROM product_variants
  WHERE id = NEW.variant_id;

  SELECT COUNT(*) INTO v_groups_count
  FROM product_option_groups
  WHERE product_id = v_product_id;

  SELECT COUNT(DISTINCT pog.id) INTO v_variant_options_count
  FROM product_variant_options pvo
  JOIN product_options po ON po.id = pvo.option_id
  JOIN product_option_groups pog ON pog.id = po.group_id
  WHERE pvo.variant_id = NEW.variant_id
    AND pog.product_id = v_product_id;

  IF v_variant_options_count > v_groups_count THEN
    RAISE EXCEPTION 'Variant cobre mais grupos do que o produto tem (variant_id=%, esperado <= %)',
      NEW.variant_id, v_groups_count;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_variant_options ON product_variant_options;
CREATE TRIGGER trg_validate_variant_options
  AFTER INSERT OR UPDATE ON product_variant_options
  FOR EACH ROW EXECUTE FUNCTION validate_variant_options();

COMMENT ON FUNCTION validate_variant_options() IS
  'Impede que um variant receba mais options do que o número de groups do produto. A validação de completude (1 opção de cada grupo) é feita na camada de aplicação.';

-- ============================================================
-- ROLLBACK (não usar em produção sem confirmação):
--   DROP TRIGGER IF EXISTS trg_validate_variant_options ON product_variant_options;
--   DROP FUNCTION IF EXISTS validate_variant_options();
--   DROP TABLE IF EXISTS product_variant_options;
--   DROP TABLE IF EXISTS product_variants;
--   DROP TABLE IF EXISTS product_options;
--   DROP TABLE IF EXISTS product_option_groups;
-- ============================================================
