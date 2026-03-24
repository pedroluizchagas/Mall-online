# 05 — RLS, Policies e Segurança

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

Row Level Security (RLS) é a camada principal de isolamento de dados entre
os quatro atores da plataforma. Nenhuma query no código da aplicação deve
ser considerada segura sem o RLS correspondente — o filtro no código é uma
conveniência, não uma garantia.

Princípios aplicados:

- RLS habilitado em todas as tabelas sem exceção
- Cada ator acessa apenas os dados que lhe pertencem
- Operações administrativas usam `service_role` apenas dentro de Edge Functions
- Chave `service_role` nunca é exposta ao cliente
- Helpers de contexto (`my_tenant_id`, `my_consumer_id`, `my_courier_id`) evitam
  subconsultas repetidas nas policies e centralizam a lógica de identidade

-----

## HELPERS DE CONTEXTO

Os helpers retornam o ID do ator autenticado a partir do `auth.uid()`.
São funções `STABLE` — o PostgreSQL pode fazer cache do resultado dentro
da mesma transação.

```sql
-- Retorna o tenant_id do lojista autenticado
CREATE OR REPLACE FUNCTION my_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM tenants WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Retorna o consumer_id do consumidor autenticado
CREATE OR REPLACE FUNCTION my_consumer_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM consumers WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Retorna o courier_id do entregador autenticado
CREATE OR REPLACE FUNCTION my_courier_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM couriers WHERE user_id = auth.uid() LIMIT 1;
$$;

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
```

-----

## POLICIES POR TABELA

-----

### plans

Planos são públicos para leitura (qualquer usuário autenticado pode ver
os planos disponíveis durante o onboarding). Apenas admin pode modificar.

```sql
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado lê planos ativos
CREATE POLICY "plans_select_autenticado"
  ON plans FOR SELECT
  TO authenticated
  USING (ativo = true);

-- Admin lê todos (incluindo inativos)
CREATE POLICY "plans_select_admin"
  ON plans FOR SELECT
  TO authenticated
  USING (is_admin());

-- Apenas admin pode criar, alterar e excluir planos
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
```

-----

### tenants

```sql
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Lojista vê apenas seu próprio tenant
CREATE POLICY "tenants_select_proprio"
  ON tenants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admin vê todos os tenants
CREATE POLICY "tenants_select_admin"
  ON tenants FOR SELECT
  TO authenticated
  USING (is_admin());

-- Tenant é criado pela Edge Function onboard-tenant (service_role)
-- Lojista pode atualizar apenas seus próprios dados
CREATE POLICY "tenants_update_proprio"
  ON tenants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin pode atualizar qualquer tenant (ativar/suspender)
CREATE POLICY "tenants_update_admin"
  ON tenants FOR UPDATE
  TO authenticated
  USING (is_admin());
```

-----

### tenant_subscriptions

```sql
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;

-- Lojista vê apenas sua própria assinatura
CREATE POLICY "subscriptions_select_proprio"
  ON tenant_subscriptions FOR SELECT
  TO authenticated
  USING (tenant_id = my_tenant_id());

-- Admin vê todas as assinaturas
CREATE POLICY "subscriptions_select_admin"
  ON tenant_subscriptions FOR SELECT
  TO authenticated
  USING (is_admin());

-- Modificações apenas via service_role (webhooks Stripe e Edge Functions)
-- Nenhuma policy de INSERT/UPDATE/DELETE para authenticated
-- O service_role bypassa RLS por padrão no Supabase
```

-----

### stores

```sql
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Lojista vê apenas suas próprias lojas
CREATE POLICY "stores_select_proprio"
  ON stores FOR SELECT
  TO authenticated
  USING (tenant_id = my_tenant_id());

-- Consumidor e entregador veem lojas ativas (para exibição no app)
CREATE POLICY "stores_select_publico"
  ON stores FOR SELECT
  TO authenticated
  USING (ativo = true);

-- Admin vê todas as lojas
CREATE POLICY "stores_select_admin"
  ON stores FOR SELECT
  TO authenticated
  USING (is_admin());

-- Lojista cria lojas apenas para seu tenant
CREATE POLICY "stores_insert_proprio"
  ON stores FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = my_tenant_id());

-- Lojista atualiza apenas suas lojas
CREATE POLICY "stores_update_proprio"
  ON stores FOR UPDATE
  TO authenticated
  USING (tenant_id = my_tenant_id())
  WITH CHECK (tenant_id = my_tenant_id());

-- Lojista exclui apenas suas lojas
CREATE POLICY "stores_delete_proprio"
  ON stores FOR DELETE
  TO authenticated
  USING (tenant_id = my_tenant_id());
```

-----

### categories

```sql
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Categorias globais (tenant_id NULL) são visíveis para todos autenticados
-- Categorias do lojista são visíveis apenas para ele
CREATE POLICY "categories_select"
  ON categories FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NULL                   -- categoria global
    OR tenant_id = my_tenant_id()       -- categoria do próprio lojista
  );

-- Consumidor e entregador veem categorias ativas
CREATE POLICY "categories_select_publico"
  ON categories FOR SELECT
  TO authenticated
  USING (ativa = true AND tenant_id IS NULL);

-- Lojista cria e gerencia suas próprias categorias
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

-- Admin gerencia categorias globais
CREATE POLICY "categories_admin"
  ON categories FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
```

-----

### products

```sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Lojista vê apenas seus produtos
CREATE POLICY "products_select_proprio"
  ON products FOR SELECT
  TO authenticated
  USING (tenant_id = my_tenant_id());

-- Consumidor e entregador veem produtos disponíveis de lojas ativas
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

-- Lojista gerencia seus produtos
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
```

-----

### consumers

```sql
ALTER TABLE consumers ENABLE ROW LEVEL SECURITY;

-- Consumidor vê e edita apenas seu próprio perfil
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

-- Lojista pode ver dados básicos do consumidor de seus pedidos
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

-- Admin vê todos os consumidores
CREATE POLICY "consumers_select_admin"
  ON consumers FOR SELECT
  TO authenticated
  USING (is_admin());
```

-----

### couriers

```sql
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;

-- Entregador vê apenas seu próprio cadastro
CREATE POLICY "couriers_select_proprio"
  ON couriers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Lojista vê entregadores próprios vinculados ao seu tenant
-- e entregadores autônomos aprovados (para atribuição de pedidos)
CREATE POLICY "couriers_select_lojista"
  ON couriers FOR SELECT
  TO authenticated
  USING (
    (tenant_id = my_tenant_id())        -- entregador próprio
    OR (tipo = 'autonomo' AND status = 'aprovado')  -- pool geral
  );

-- Admin vê todos os entregadores
CREATE POLICY "couriers_select_admin"
  ON couriers FOR SELECT
  TO authenticated
  USING (is_admin());

-- Entregador atualiza apenas seu próprio cadastro
-- (campos restritos — status e aprovação só via service_role)
CREATE POLICY "couriers_update_proprio"
  ON couriers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    -- Não permite alterar status, aprovado_em, aprovado_por via cliente
  );

-- Admin atualiza qualquer entregador (aprovação, suspensão)
CREATE POLICY "couriers_update_admin"
  ON couriers FOR UPDATE
  TO authenticated
  USING (is_admin());
```

-----

### orders

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Consumidor vê apenas seus pedidos
CREATE POLICY "orders_select_consumidor"
  ON orders FOR SELECT
  TO authenticated
  USING (consumer_id = my_consumer_id());

-- Lojista vê apenas os pedidos de suas lojas
CREATE POLICY "orders_select_lojista"
  ON orders FOR SELECT
  TO authenticated
  USING (tenant_id = my_tenant_id());

-- Entregador vê pedidos atribuídos a ele
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

-- Admin vê todos os pedidos
CREATE POLICY "orders_select_admin"
  ON orders FOR SELECT
  TO authenticated
  USING (is_admin());

-- Consumidor cria pedido (INSERT)
CREATE POLICY "orders_insert_consumidor"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (consumer_id = my_consumer_id());

-- Lojista atualiza status do pedido de suas lojas
CREATE POLICY "orders_update_lojista"
  ON orders FOR UPDATE
  TO authenticated
  USING (tenant_id = my_tenant_id());

-- Atualizações de payment_status apenas via service_role (webhooks Stripe)
```

-----

### order_items

```sql
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Consumidor vê itens de seus pedidos
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

-- Lojista vê itens dos pedidos de suas lojas
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

-- Entregador vê itens do pedido atribuído a ele
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

-- INSERT apenas pelo próprio consumidor (durante criação do pedido)
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
```

-----

### delivery_assignments

```sql
ALTER TABLE delivery_assignments ENABLE ROW LEVEL SECURITY;

-- Entregador vê suas próprias atribuições
CREATE POLICY "assignments_select_entregador"
  ON delivery_assignments FOR SELECT
  TO authenticated
  USING (courier_id = my_courier_id());

-- Lojista vê atribuições dos pedidos de suas lojas
CREATE POLICY "assignments_select_lojista"
  ON delivery_assignments FOR SELECT
  TO authenticated
  USING (tenant_id = my_tenant_id());

-- Consumidor vê a atribuição do seu pedido ativo
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

-- Admin vê todas as atribuições
CREATE POLICY "assignments_select_admin"
  ON delivery_assignments FOR SELECT
  TO authenticated
  USING (is_admin());

-- Lojista cria a atribuição (designa entregador ao pedido)
CREATE POLICY "assignments_insert_lojista"
  ON delivery_assignments FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = my_tenant_id());

-- Entregador atualiza status da entrega (aceitar, coletar, entregar)
CREATE POLICY "assignments_update_entregador"
  ON delivery_assignments FOR UPDATE
  TO authenticated
  USING (courier_id = my_courier_id());
```

-----

### courier_locations

```sql
ALTER TABLE courier_locations ENABLE ROW LEVEL SECURITY;

-- Entregador atualiza sua própria localização
CREATE POLICY "locations_upsert_entregador"
  ON courier_locations FOR ALL
  TO authenticated
  USING (courier_id = my_courier_id())
  WITH CHECK (courier_id = my_courier_id());

-- Consumidor vê localização do entregador do seu pedido ativo
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

-- Lojista vê localização do entregador de seus pedidos ativos
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
```

-----

### payouts

```sql
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Lojista vê apenas seus repasses
CREATE POLICY "payouts_select_lojista"
  ON payouts FOR SELECT
  TO authenticated
  USING (tenant_id = my_tenant_id());

-- Entregador vê apenas seus repasses
CREATE POLICY "payouts_select_entregador"
  ON payouts FOR SELECT
  TO authenticated
  USING (courier_id = my_courier_id());

-- Admin vê todos os repasses
CREATE POLICY "payouts_select_admin"
  ON payouts FOR SELECT
  TO authenticated
  USING (is_admin());

-- INSERT e UPDATE apenas via service_role (Edge Function daily-payouts)
```

-----

### payout_advance_requests

```sql
ALTER TABLE payout_advance_requests ENABLE ROW LEVEL SECURITY;

-- Lojista vê e cria suas próprias solicitações
CREATE POLICY "advance_select_lojista"
  ON payout_advance_requests FOR SELECT
  TO authenticated
  USING (tenant_id = my_tenant_id());

CREATE POLICY "advance_insert_lojista"
  ON payout_advance_requests FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = my_tenant_id());

-- Admin vê e processa todas as solicitações
CREATE POLICY "advance_admin"
  ON payout_advance_requests FOR ALL
  TO authenticated
  USING (is_admin());
```

-----

### push_tokens

```sql
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Cada usuário/entregador gerencia apenas seus próprios tokens
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
```

-----

### stock_movements

```sql
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Lojista vê apenas movimentações de seus produtos
CREATE POLICY "stock_movements_select_lojista"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (tenant_id = my_tenant_id());

-- INSERT apenas via trigger (decrementar_estoque_pedido) ou service_role
-- Ajustes manuais: lojista pode inserir movimentações de ajuste
CREATE POLICY "stock_movements_insert_lojista"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = my_tenant_id()
    AND tipo IN ('entrada', 'ajuste_positivo', 'ajuste_negativo')
  );
```

-----

## TRIGGER: limite de lojas por plano

Herdado da migration_001. Impede que um tenant crie mais lojas do que
o plano permite.

```sql
CREATE OR REPLACE FUNCTION verificar_limite_lojas()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  max_lojas_plano INTEGER;
  lojas_atuais INTEGER;
BEGIN
  SELECT p.max_lojas INTO max_lojas_plano
  FROM plans p
  JOIN tenant_subscriptions ts ON ts.plan_id = p.id
  WHERE ts.tenant_id = NEW.tenant_id
  AND ts.billing_status IN ('trial', 'ativa')
  LIMIT 1;

  IF max_lojas_plano IS NULL THEN
    RAISE EXCEPTION 'Tenant sem assinatura ativa. Não é possível criar lojas.';
  END IF;

  SELECT COUNT(*) INTO lojas_atuais
  FROM stores
  WHERE tenant_id = NEW.tenant_id AND ativo = true;

  IF lojas_atuais >= max_lojas_plano THEN
    RAISE EXCEPTION 'Limite de lojas do plano atingido (máximo: %).', max_lojas_plano;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_limite_lojas
  BEFORE INSERT ON stores
  FOR EACH ROW
  EXECUTE FUNCTION verificar_limite_lojas();
```

-----

## TRIGGER: limite de produtos por plano

```sql
CREATE OR REPLACE FUNCTION verificar_limite_produtos()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  max_produtos_plano INTEGER;
  produtos_atuais INTEGER;
BEGIN
  SELECT p.max_produtos INTO max_produtos_plano
  FROM plans p
  JOIN tenant_subscriptions ts ON ts.plan_id = p.id
  WHERE ts.tenant_id = NEW.tenant_id
  AND ts.billing_status IN ('trial', 'ativa')
  LIMIT 1;

  IF max_produtos_plano IS NULL THEN
    RAISE EXCEPTION 'Tenant sem assinatura ativa. Não é possível criar produtos.';
  END IF;

  SELECT COUNT(*) INTO produtos_atuais
  FROM products
  WHERE tenant_id = NEW.tenant_id;

  IF produtos_atuais >= max_produtos_plano THEN
    RAISE EXCEPTION 'Limite de produtos do plano atingido (máximo: %).', max_produtos_plano;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_limite_produtos
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION verificar_limite_produtos();
```

-----

## REGRAS GERAIS DE SEGURANÇA

1. A chave `service_role` nunca é exposta ao cliente. Ela é usada apenas
   dentro de Edge Functions no servidor.
1. Toda Edge Function valida o JWT do usuário antes de executar qualquer
   operação. Requisições sem JWT válido retornam 401.
1. Webhooks do Stripe são verificados com `stripe.webhooks.constructEvent`
   usando o `STRIPE_WEBHOOK_SECRET`. Requisições sem assinatura válida
   retornam 400 sem processar nada.
1. Campos sensíveis como `stripe_account_id`, `cpf`, `cnpj` e `cnh_numero`
   nunca são retornados em queries públicas — as policies garantem isso.
1. A policy de `courier_locations` garante que o consumidor só enxerga
   a localização do entregador enquanto a entrega está ativa
   (status `aceita` ou `coletada`). Após entrega, a posição deixa de
   ser visível.
1. Aprovação de entregadores e ativação/suspensão de tenants só podem
   ser feitas pelo admin ou via service_role — nunca pelo próprio ator.

-----

*Arquivo 05 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 06 — Arquitetura Stripe Connect e Modelo Financeiro*
