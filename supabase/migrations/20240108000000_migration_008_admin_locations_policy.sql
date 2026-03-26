-- ============================================================
-- MIGRATION 008 — Policy admin para courier_locations
-- Faltava no doc 05 — admin precisa ver todas as localizações
-- ============================================================

CREATE POLICY "locations_select_admin"
  ON courier_locations FOR SELECT
  TO authenticated
  USING (is_admin());
