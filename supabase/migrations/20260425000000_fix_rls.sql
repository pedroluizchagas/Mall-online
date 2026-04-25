-- Fix RLS for categories and plans to allow anon reads
DROP POLICY IF EXISTS "categories_select_publico" ON categories;
CREATE POLICY "categories_select_publico" ON categories FOR SELECT USING (ativa = true AND tenant_id IS NULL);

DROP POLICY IF EXISTS "plans_select_autenticado" ON plans;
CREATE POLICY "plans_select_publico" ON plans FOR SELECT USING (ativo = true);
