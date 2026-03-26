-- ============================================================
-- MIGRATION 007 — Fix RLS Infinite Recursion
--
-- Problema: dependência circular entre policies de orders e
-- delivery_assignments causa "infinite recursion detected".
--
-- Solução: criar funções SECURITY DEFINER que fazem as
-- subconsultas sem passar pelo RLS, quebrando o ciclo.
-- ============================================================

-- ============================================================
-- HELPERS SECURITY DEFINER (quebram recursão)
-- ============================================================

-- Verifica se o entregador autenticado está atribuído a um pedido
-- (bypassa RLS de delivery_assignments)
CREATE OR REPLACE FUNCTION courier_assigned_to_order(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM delivery_assignments
    WHERE order_id = p_order_id
    AND courier_id = (SELECT id FROM couriers WHERE user_id = auth.uid() LIMIT 1)
  );
$$;

-- Verifica se o pedido pertence ao consumidor autenticado
-- (bypassa RLS de orders)
CREATE OR REPLACE FUNCTION order_belongs_to_consumer(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM orders
    WHERE id = p_order_id
    AND consumer_id = (SELECT id FROM consumers WHERE user_id = auth.uid() LIMIT 1)
  );
$$;

-- Verifica se o pedido pertence ao tenant autenticado
-- (bypassa RLS de orders)
CREATE OR REPLACE FUNCTION order_belongs_to_tenant(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM orders
    WHERE id = p_order_id
    AND tenant_id = (SELECT id FROM tenants WHERE user_id = auth.uid() LIMIT 1)
  );
$$;

-- Verifica se o entregador está atribuído via delivery_assignments
-- para um dado courier_id (bypassa RLS de delivery_assignments)
CREATE OR REPLACE FUNCTION courier_has_active_delivery(p_courier_id UUID, p_statuses TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM delivery_assignments da
    WHERE da.courier_id = p_courier_id
    AND da.status::TEXT = ANY(p_statuses)
  );
$$;

-- Verifica se consumidor tem pedido com entregador ativo
-- (bypassa RLS de delivery_assignments e orders)
CREATE OR REPLACE FUNCTION consumer_tracking_courier(p_courier_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM delivery_assignments da
    JOIN orders o ON o.id = da.order_id
    WHERE da.courier_id = p_courier_id
    AND da.status IN ('aceita', 'coletada')
    AND o.consumer_id = (SELECT id FROM consumers WHERE user_id = auth.uid() LIMIT 1)
  );
$$;

-- Verifica se lojista tem pedido com entregador ativo
-- (bypassa RLS de delivery_assignments)
CREATE OR REPLACE FUNCTION tenant_tracking_courier(p_courier_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM delivery_assignments da
    WHERE da.courier_id = p_courier_id
    AND da.status IN ('aceita', 'coletada')
    AND da.tenant_id = (SELECT id FROM tenants WHERE user_id = auth.uid() LIMIT 1)
  );
$$;

-- Verifica se consumidor tem um pedido vinculado ao consumer_id
-- (bypassa RLS de orders — para consumers_select_lojista)
CREATE OR REPLACE FUNCTION consumer_has_order_with_tenant(p_consumer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM orders
    WHERE consumer_id = p_consumer_id
    AND tenant_id = (SELECT id FROM tenants WHERE user_id = auth.uid() LIMIT 1)
  );
$$;

-- ============================================================
-- DROP e RECRIAÇÃO das policies com recursão
-- ============================================================

-- -----------------------------------------------
-- ORDERS: policy do entregador (causava recursão)
-- -----------------------------------------------
DROP POLICY IF EXISTS "orders_select_entregador" ON orders;

CREATE POLICY "orders_select_entregador"
  ON orders FOR SELECT
  TO authenticated
  USING (courier_assigned_to_order(id));

-- -----------------------------------------------
-- DELIVERY_ASSIGNMENTS: policy do consumidor (causava recursão)
-- -----------------------------------------------
DROP POLICY IF EXISTS "assignments_select_consumidor" ON delivery_assignments;

CREATE POLICY "assignments_select_consumidor"
  ON delivery_assignments FOR SELECT
  TO authenticated
  USING (order_belongs_to_consumer(order_id));

-- -----------------------------------------------
-- ORDER_ITEMS: policies que subquerem orders (recursão indireta)
-- -----------------------------------------------
DROP POLICY IF EXISTS "order_items_select_consumidor" ON order_items;

CREATE POLICY "order_items_select_consumidor"
  ON order_items FOR SELECT
  TO authenticated
  USING (order_belongs_to_consumer(order_id));

DROP POLICY IF EXISTS "order_items_select_lojista" ON order_items;

CREATE POLICY "order_items_select_lojista"
  ON order_items FOR SELECT
  TO authenticated
  USING (order_belongs_to_tenant(order_id));

DROP POLICY IF EXISTS "order_items_select_entregador" ON order_items;

CREATE POLICY "order_items_select_entregador"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND courier_assigned_to_order(orders.id)
    )
  );

DROP POLICY IF EXISTS "order_items_insert_consumidor" ON order_items;

CREATE POLICY "order_items_insert_consumidor"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (order_belongs_to_consumer(order_id));

-- -----------------------------------------------
-- COURIER_LOCATIONS: policies que subquerem delivery_assignments
-- -----------------------------------------------
DROP POLICY IF EXISTS "locations_select_consumidor" ON courier_locations;

CREATE POLICY "locations_select_consumidor"
  ON courier_locations FOR SELECT
  TO authenticated
  USING (consumer_tracking_courier(courier_id));

DROP POLICY IF EXISTS "locations_select_lojista" ON courier_locations;

CREATE POLICY "locations_select_lojista"
  ON courier_locations FOR SELECT
  TO authenticated
  USING (tenant_tracking_courier(courier_id));

-- -----------------------------------------------
-- CONSUMERS: policy do lojista (subqueria orders)
-- -----------------------------------------------
DROP POLICY IF EXISTS "consumers_select_lojista" ON consumers;

CREATE POLICY "consumers_select_lojista"
  ON consumers FOR SELECT
  TO authenticated
  USING (consumer_has_order_with_tenant(id));
