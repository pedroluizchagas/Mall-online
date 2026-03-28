-- ============================================================
-- MIGRATION 012 — Trigger de Disponibilidade Automática por Estoque
-- Complemento da migration_005: marca produto como indisponível
-- ao zerar o estoque e disponível novamente ao receber entrada.
-- ============================================================

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
-- DROP TRIGGER IF EXISTS trigger_disponibilidade_estoque ON products;
-- DROP FUNCTION IF EXISTS atualizar_disponibilidade_estoque();
