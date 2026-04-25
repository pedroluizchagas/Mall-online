-- Adiciona coluna de categoria à tabela stores.
-- A categoria (tenant_id IS NULL) classifica o tipo de loja para navegação dos consumidores
-- (ex: Alimentos, Vestuário, Eletrônicos) e foi coletada no onboarding desde o início
-- mas nunca persistida por falta desta coluna.

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stores_categoria ON stores(categoria_id);
