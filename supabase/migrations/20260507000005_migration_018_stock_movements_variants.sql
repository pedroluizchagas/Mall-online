-- ============================================================
-- MIGRATION 018 (Templates · Fase 1) — stock_movements suporta
-- variant_id; trigger de decremento por variant; trigger de
-- disponibilidade automática no variant
-- Referência: docs/dashboard-templates/03-modelo-dados-variacoes-modificadores.md
-- ============================================================
--
-- Notas de adaptação ao schema existente:
--   • `stock_movements` no schema real tem colunas em pt-BR e
--     usa `order_id` (não `ref_order_id`), além de
--     `quantidade_anterior`/`quantidade_posterior` NOT NULL e
--     `tipo` do enum `stock_movement_type`. A função abaixo
--     respeita o schema real (migration_005) e estende para
--     variant.
--   • A função antiga é `decrementar_estoque_pedido()` (pt-BR) e
--     já trata o caso de produto sem variação. Estendemos para
--     produto COM variação, mantendo o caminho legado.
-- ============================================================

ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sm_variant
  ON stock_movements(variant_id) WHERE variant_id IS NOT NULL;

COMMENT ON COLUMN stock_movements.variant_id IS
  'NULL quando o movimento se refere a um produto sem variação (caminho legado).';

-- ── Trigger de decremento de estoque (suporta variant) ───────
CREATE OR REPLACE FUNCTION decrementar_estoque_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  item    RECORD;
  produto RECORD;
  variant RECORD;
BEGIN
  -- Só executa quando status muda para 'confirmado'
  IF NEW.status = 'confirmado' AND OLD.status IS DISTINCT FROM 'confirmado' THEN
    FOR item IN
      SELECT product_id, variant_id, quantidade
      FROM order_items
      WHERE order_id = NEW.id
    LOOP
      IF item.variant_id IS NOT NULL THEN
        -- Caminho com variant: estoque vive em product_variants.
        SELECT id, stock_quantity, product_id
        INTO variant
        FROM product_variants
        WHERE id = item.variant_id;

        IF variant.stock_quantity IS NOT NULL THEN
          INSERT INTO stock_movements (
            product_id,
            variant_id,
            tenant_id,
            order_id,
            tipo,
            quantidade,
            quantidade_anterior,
            quantidade_posterior
          ) VALUES (
            variant.product_id,
            variant.id,
            NEW.tenant_id,
            NEW.id,
            'saida_pedido',
            -item.quantidade,
            variant.stock_quantity,
            variant.stock_quantity - item.quantidade
          );

          UPDATE product_variants
          SET stock_quantity = stock_quantity - item.quantidade,
              updated_at = now()
          WHERE id = variant.id;
        END IF;
      ELSE
        -- Caminho legado: produto sem variação.
        SELECT id, stock_quantity, track_stock
        INTO produto
        FROM products
        WHERE id = item.product_id;

        IF produto.track_stock AND produto.stock_quantity IS NOT NULL THEN
          INSERT INTO stock_movements (
            product_id,
            tenant_id,
            order_id,
            tipo,
            quantidade,
            quantidade_anterior,
            quantidade_posterior
          ) VALUES (
            produto.id,
            NEW.tenant_id,
            NEW.id,
            'saida_pedido',
            -item.quantidade,
            produto.stock_quantity,
            produto.stock_quantity - item.quantidade
          );

          UPDATE products
          SET stock_quantity = stock_quantity - item.quantidade
          WHERE id = produto.id;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION decrementar_estoque_pedido() IS
  'Decrementa estoque ao confirmar pedido. Aceita item com variant_id (estoque em product_variants) ou sem (estoque em products, caminho legado).';

-- O trigger trigger_decrementar_estoque já existe em migration_005,
-- e re-aproveita a função recém-substituída (CREATE OR REPLACE).

-- ── Trigger: marca variant indisponível quando estoque <= 0 ──
CREATE OR REPLACE FUNCTION update_variant_disponivel()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.stock_quantity IS NOT NULL AND NEW.stock_quantity <= 0 THEN
    NEW.disponivel := false;
    NEW.stock_quantity := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_variant_disponivel ON product_variants;
CREATE TRIGGER trg_variant_disponivel
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_variant_disponivel();

COMMENT ON FUNCTION update_variant_disponivel() IS
  'Mantém variant.disponivel = false quando estoque chega a zero. Espelho da lógica de products (migration_005).';

-- ============================================================
-- ROLLBACK (não usar em produção sem confirmação):
--   DROP TRIGGER IF EXISTS trg_variant_disponivel ON product_variants;
--   DROP FUNCTION IF EXISTS update_variant_disponivel();
--   -- A função decrementar_estoque_pedido() volta à versão de
--   -- migration_005 (manualmente, não há rollback automático).
--   DROP INDEX IF EXISTS idx_sm_variant;
--   ALTER TABLE stock_movements DROP COLUMN IF EXISTS variant_id;
-- ============================================================
