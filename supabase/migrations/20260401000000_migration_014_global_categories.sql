-- ============================================================
-- MIGRATION 014 — Categorias Globais de Loja
--
-- 1. Adiciona global_category_id em stores para vincular cada
--    loja a uma categoria de tipo (Restaurante, Farmácia, etc.)
-- 2. Insere as categorias globais de seed (tenant_id IS NULL)
-- ============================================================

-- ── 1. Coluna em stores ──────────────────────────────────────
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS global_category_id UUID
    REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stores_global_category
  ON stores(global_category_id);

-- ── 2. Seed: categorias globais (tipo de loja) ───────────────
-- tenant_id e store_id ficam NULL → são globais / públicas

INSERT INTO categories (nome, icone, ordem, ativa) VALUES
  ('Restaurantes',     '🍽️',  1,  true),
  ('Lanchonetes',      '🍔',  2,  true),
  ('Pizzarias',        '🍕',  3,  true),
  ('Padarias & Cafés', '🥐',  4,  true),
  ('Sorveterias',      '🍦',  5,  true),
  ('Açaí & Sucos',     '🥤',  6,  true),
  ('Sushi & Japonês',  '🍣',  7,  true),
  ('Mercados',         '🛒',  8,  true),
  ('Farmácias',        '💊',  9,  true),
  ('Conveniências',    '🏪',  10, true),
  ('Pet Shops',        '🐾',  11, true),
  ('Bebidas',          '🍺',  12, true),
  ('Flores & Presentes','🌸', 13, true),
  ('Outros',           '📦',  99, true)
ON CONFLICT DO NOTHING;
