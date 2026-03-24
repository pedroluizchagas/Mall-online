-- ============================================================
-- MIGRATION 006 — RLS Policies e Segurança
-- Referência: docs/05-rls-policies-seguranca.md
-- ============================================================

-- ============================================================
-- HELPERS DE CONTEXTO
-- ============================================================

-- Verifica se o usuário autenticado é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- Recria helpers com SECURITY DEFINER (conforme doc 05)
CREATE OR REPLACE FUNCTION my_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM tenants WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION my_consumer_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM consumers WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION my_courier_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM couriers WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- PLANS
-- ============================================================

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select_autenticado"
  ON plans FOR SELECT
  TO authenticated
  USING (ativo = true);

CREATE POLICY "plans_select_admin"
  ON plans FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "plans_insert_admin"
  ON plans FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "plans_update_admin"
  ON plans FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "plans_delete_admin"
  ON plans FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================
-- TENANTS
-- ============================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_select_proprio"
  ON tenants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "tenants_select_admin"
  ON tenants FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "tenants_update_proprio"
  ON tenants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tenants_update_admin"
  ON tenants FOR UPDATE
  TO authenticated
  USING (is_admin());

-- ============================================================
-- TENANT_SUBSCRIPTIONS
-- ============================================================

ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_proprio"
  ON tenant_subscriptions FOR SELECT
  TO authenticated
  USING (tenant_id = my_tenant_id());

CREATE POLICY "subscriptions_select_admin"
  ON tenant_subscriptions FOR SELECT
  TO authenticated
  USING (is_admin());

-- Modificações apenas via service_role (webhooks Stripe e Edge Functions)

-- ============================================================
-- STORES
-- ============================================================

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stores_select_proprio"
  ON stores FOR SELECT
  TO authenticated
  USING (tenant_id = my_tenant_id());

CREATE POLICY "stores_select_publico"
  ON stores FOR SELECT
  TO authenticated
  USING (ativo = true);

CREATE POLICY "stores_select_admin"
  ON stores FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "stores_insert_proprio"
  ON stores FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = my_tenant_id());

CREATE POLICY "stores_update_proprio"
  ON stores FOR UPDATE
  TO authenticated
  USING (tenant_id = my_tenant_id())
  WITH CHECK (tenant_id = my_tenant_id());

CREATE POLICY "stores_delete_proprio"
  ON stores FOR DELETE
  TO authenticated
  USING (tenant_id = my_tenant_id());

-- ============================================================
-- CATEGORIES
-- ============================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select"
  ON categories FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NULL
    OR tenant_id = my_tenant_id()
  );

CREATE POLICY "categories_select_publico"
  ON categories FOR SELECT
  TO authenticated
  USING (ativa = true AND tenant_id IS NULL);

CREATE POLICY "categories_insert_proprio"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = my_tenant_id());

CREATE POLICY "categories_update_proprio"
  ON categories FOR UPDATE
  TO authenticated
  USING (tenant_id = my_tenant_id())
  WITH CHECK (tenant_id = my_tenant_id());

CREATE POLICY "categories_delete_proprio"
  ON categories FOR DELETE
  TO authenticated
  USING (tenant_id = my_tenant_id());

CREATE POLICY "categories_admin"
  ON categories FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- PRODUCTS
-- ============================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select_proprio"
  ON products FOR SELECT
  TO authenticated
  USING (tenant_id = my_tenant_id());

CREATE POLICY "products_select_publico"
  ON products FOR SELECT
  TO authenticated
  USING (
    disponivel = true
    AND EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.ativo = true
    )
  );

CREATE POLICY "products_insert_proprio"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = my_tenant_id());

CREATE POLICY "products_update_proprio"
  ON products FOR UPDATE
  TO authenticated
  USING (tenant_id = my_tenant_id())
  WITH CHECK (tenant_id = my_tenant_id());

CREATE POLICY "products_delete_proprio"
  ON products FOR DELETE
  TO authenticated
  USING (tenant_id = my_tenant_id());

-- ============================================================
-- CONSUMERS
-- ============================================================

ALTER TABLE consumers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consumers_select_proprio"
  ON consumers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "consumers_insert_proprio"
  ON consumers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "consumers_update_proprio"
  ON consumers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "consumers_select_lojista"
  ON consumers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.consumer_id = consumers.id
      AND orders.tenant_id = my_tenant_id()
    )
  );

CREATE POLICY "consumers_select_admin"
  ON consumers FOR SELECT
  TO authenticated
  USING (is_admin());

-- ============================================================
-- COURIERS
-- ============================================================

ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "couriers_select_proprio"
  ON couriers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "couriers_select_lojista"
  ON couriers FOR SELECT
  TO authenticated
  USING (
    (tenant_id = my_tenant_id())
    OR (tipo = 'autonomo' AND status = 'aprovado')
  );

CREATE POLICY "couriers_select_admin"
  ON couriers FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "couriers_update_proprio"
  ON couriers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "couriers_update_admin"
  ON couriers FOR UPDATE
  TO authenticated
  USING (is_admin());

-- ============================================================
-- ORDERS
-- ============================================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_consumidor"
  ON orders FOR SELECT
  TO authenticated
  USING (consumer_id = my_consumer_id());

CREATE POLICY "orders_select_lojista"
  ON orders FOR SELECT
  TO authenticated
  USING (tenant_id = my_tenant_id());

CREATE POLICY "orders_select_entregador"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_assignments
      WHERE delivery_assignments.order_id = orders.id
      AND delivery_assignments.courier_id = my_courier_id()
    )
  );

CREATE POLICY "orders_select_admin"
  ON orders FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "orders_insert_consumidor"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (consumer_id = my_consumer_id());

CREATE POLICY "orders_update_lojista"
  ON orders FOR UPDATE
  TO authenticated
  USING (tenant_id = my_tenant_id());

-- Atualizações de payment_status apenas via service_role (webhooks Stripe)

-- ============================================================
-- ORDER_ITEMS
-- ============================================================

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_select_consumidor"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.consumer_id = my_consumer_id()
    )
  );

CREATE POLICY "order_items_select_lojista"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.tenant_id = my_tenant_id()
    )
  );

CREATE POLICY "order_items_select_entregador"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN delivery_assignments ON delivery_assignments.order_id = orders.id
      WHERE orders.id = order_items.order_id
      AND delivery_assignments.courier_id = my_courier_id()
    )
  );

CREATE POLICY "order_items_insert_consumidor"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.consumer_id = my_consumer_id()
    )
  );

-- ============================================================
-- DELIVERY_ASSIGNMENTS
-- ============================================================

ALTER TABLE delivery_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignments_select_entregador"
  ON delivery_assignments FOR SELECT
  TO authenticated
  USING (courier_id = my_courier_id());

CREATE POLICY "assignments_select_lojista"
  ON delivery_assignments FOR SELECT
  TO authenticated
  USING (tenant_id = my_tenant_id());

CREATE POLICY "assignments_select_consumidor"
  ON delivery_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = delivery_assignments.order_id
      AND orders.consumer_id = my_consumer_id()
    )
  );

CREATE POLICY "assignments_select_admin"
  ON delivery_assignments FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "assignments_insert_lojista"
  ON delivery_assignments FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = my_tenant_id());

CREATE POLICY "assignments_update_entregador"
  ON delivery_assignments FOR UPDATE
  TO authenticated
  USING (courier_id = my_courier_id());

-- ============================================================
-- COURIER_LOCATIONS
-- ============================================================

ALTER TABLE courier_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations_upsert_entregador"
  ON courier_locations FOR ALL
  TO authenticated
  USING (courier_id = my_courier_id())
  WITH CHECK (courier_id = my_courier_id());

CREATE POLICY "locations_select_consumidor"
  ON courier_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM delivery_assignments da
      JOIN orders o ON o.id = da.order_id
      WHERE da.courier_id = courier_locations.courier_id
      AND da.status IN ('aceita', 'coletada')
      AND o.consumer_id = my_consumer_id()
    )
  );

CREATE POLICY "locations_select_lojista"
  ON courier_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM delivery_assignments da
      WHERE da.courier_id = courier_locations.courier_id
      AND da.status IN ('aceita', 'coletada')
      AND da.tenant_id = my_tenant_id()
    )
  );

-- ============================================================
-- PAYOUTS
-- ============================================================

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payouts_select_lojista"
  ON payouts FOR SELECT
  TO authenticated
  USING (tenant_id = my_tenant_id());

CREATE POLICY "payouts_select_entregador"
  ON payouts FOR SELECT
  TO authenticated
  USING (courier_id = my_courier_id());

CREATE POLICY "payouts_select_admin"
  ON payouts FOR SELECT
  TO authenticated
  USING (is_admin());

-- INSERT e UPDATE apenas via service_role (Edge Function daily-payouts)

-- ============================================================
-- PAYOUT_ADVANCE_REQUESTS
-- ============================================================

ALTER TABLE payout_advance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "advance_select_lojista"
  ON payout_advance_requests FOR SELECT
  TO authenticated
  USING (tenant_id = my_tenant_id());

CREATE POLICY "advance_insert_lojista"
  ON payout_advance_requests FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = my_tenant_id());

CREATE POLICY "advance_admin"
  ON payout_advance_requests FOR ALL
  TO authenticated
  USING (is_admin());

-- ============================================================
-- PUSH_TOKENS
-- ============================================================

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_tokens_select_proprio"
  ON push_tokens FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR courier_id = my_courier_id()
  );

CREATE POLICY "push_tokens_insert_proprio"
  ON push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR courier_id = my_courier_id()
  );

CREATE POLICY "push_tokens_update_proprio"
  ON push_tokens FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR courier_id = my_courier_id()
  );

-- service_role lê todos os tokens (para envio de notificações via Edge Function)

-- ============================================================
-- STOCK_MOVEMENTS
-- ============================================================

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_movements_select_lojista"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (tenant_id = my_tenant_id());

CREATE POLICY "stock_movements_insert_lojista"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = my_tenant_id()
    AND tipo IN ('entrada', 'ajuste_positivo', 'ajuste_negativo')
  );
