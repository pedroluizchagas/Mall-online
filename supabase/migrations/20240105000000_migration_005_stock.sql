-- ============================================================
-- MIGRATION 005 — Módulo de Estoque
-- Referência: docs/04-migrations-sql.md
-- ============================================================

-- ============================================================
-- UP
-- ============================================================

-- Tipo ENUM novo
CREATE TYPE stock_movement_type AS ENUM (
  'entrada',
  'saida_pedido',
  'ajuste_positivo',
  'ajuste_negativo'
);

-- Garantir que os campos existam em products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS track_stock     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_quantity  INTEGER,
  ADD COLUMN IF NOT EXISTS stock_minimo    INTEGER DEFAULT 0;

-- Tabela de movimentações de estoque
CREATE TABLE stock_movements (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id           UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id             UUID REFERENCES orders(id) ON DELETE SET NULL,
  tipo                 stock_movement_type NOT NULL,
  quantidade           INTEGER NOT NULL,
  quantidade_anterior  INTEGER NOT NULL,
  quantidade_posterior INTEGER NOT NULL,
  motivo               TEXT,
  criado_por           UUID REFERENCES auth.users(id),
  criado_em            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_tenant  ON stock_movements(tenant_id);
CREATE INDEX idx_stock_movements_order   ON stock_movements(order_id);

-- Habilitar RLS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Trigger: decrementar estoque ao confirmar pedido
CREATE OR REPLACE FUNCTION decrementar_estoque_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  item RECORD;
  produto RECORD;
BEGIN
  -- Só executa quando status muda para 'confirmado'
  IF NEW.status = 'confirmado' AND OLD.status != 'confirmado' THEN
    FOR item IN
      SELECT product_id, quantidade
      FROM order_items
      WHERE order_id = NEW.id
    LOOP
      SELECT id, stock_quantity, track_stock
      INTO produto
      FROM products
      WHERE id = item.product_id;

      IF produto.track_stock AND produto.stock_quantity IS NOT NULL THEN
        -- Registrar movimentação
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

        -- Decrementar estoque
        UPDATE products
        SET stock_quantity = stock_quantity - item.quantidade
        WHERE id = produto.id;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_decrementar_estoque
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION decrementar_estoque_pedido();

-- Trigger: marcar produto como indisponível ao zerar o estoque
-- e disponível novamente ao receber entrada
CREATE OR REPLACE FUNCTION atualizar_disponibilidade_estoque()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Produto com estoque controlado chegou a zero
  IF NEW.track_stock = true
    AND NEW.stock_quantity IS NOT NULL
    AND NEW.stock_quantity <= 0
    AND OLD.disponivel = true
  THEN
    NEW.disponivel := false;
    NEW.stock_quantity := 0; -- garantir que não fique negativo
  END IF;

  -- Produto com estoque controlado voltou a ter estoque
  IF NEW.track_stock = true
    AND NEW.stock_quantity IS NOT NULL
    AND NEW.stock_quantity > 0
    AND OLD.disponivel = false
    AND OLD.stock_quantity = 0
  THEN
    NEW.disponivel := true;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_disponibilidade_estoque
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_disponibilidade_estoque();

-- ============================================================
-- DOWN
-- ============================================================

-- DROP TRIGGER IF EXISTS trigger_decrementar_estoque ON orders;
-- DROP FUNCTION IF EXISTS decrementar_estoque_pedido();
-- DROP TABLE IF EXISTS stock_movements;
-- DROP TYPE IF EXISTS stock_movement_type;
-- ALTER TABLE products
--   DROP COLUMN IF EXISTS track_stock,
--   DROP COLUMN IF EXISTS stock_quantity,
--   DROP COLUMN IF EXISTS stock_minimo;
