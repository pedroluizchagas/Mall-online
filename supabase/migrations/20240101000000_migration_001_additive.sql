-- ============================================================
-- MIGRATION 001 — Base do Projeto
-- Referência: docs/03-schema-completo-de-banco-de-dados.md
-- Referência: docs/04-migrations-sql.md
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE order_status AS ENUM (
  'novo',
  'confirmado',
  'em_preparo',
  'aguardando_entregador',
  'saiu_para_entrega',
  'entregue',
  'cancelado'
);

-- ============================================================
-- TABELAS
-- ============================================================

-- Plans
CREATE TABLE plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  descricao       TEXT,
  preco_mensal    INTEGER NOT NULL,
  max_lojas       INTEGER NOT NULL DEFAULT 1,
  max_produtos    INTEGER NOT NULL DEFAULT 30,
  tem_estoque     BOOLEAN NOT NULL DEFAULT false,
  tem_relatorios  BOOLEAN NOT NULL DEFAULT false,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenants
CREATE TABLE tenants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_responsavel  TEXT NOT NULL,
  cpf_cnpj          TEXT,
  telefone          TEXT,
  email             TEXT NOT NULL,
  slug              TEXT UNIQUE,
  ativo             BOOLEAN NOT NULL DEFAULT true,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_user_id ON tenants(user_id);

-- Tenant Subscriptions
CREATE TABLE tenant_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id     UUID NOT NULL REFERENCES plans(id),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_tenant ON tenant_subscriptions(tenant_id);

-- Stores
CREATE TABLE stores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  descricao       TEXT,
  slug            TEXT UNIQUE,
  logo_url        TEXT,
  banner_url      TEXT,
  telefone        TEXT,
  endereco        JSONB,
  horarios        JSONB,
  taxa_entrega    INTEGER NOT NULL DEFAULT 0,
  tempo_entrega   INTEGER,
  raio_entrega_km NUMERIC(5,2),
  aceita_dinheiro BOOLEAN NOT NULL DEFAULT true,
  aceita_pix      BOOLEAN NOT NULL DEFAULT true,
  aceita_cartao_maquininha BOOLEAN NOT NULL DEFAULT true,
  aceita_cartao_online     BOOLEAN NOT NULL DEFAULT true,
  usa_entregadores_proprios BOOLEAN NOT NULL DEFAULT false,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  theme           JSONB,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stores_tenant ON stores(tenant_id);
CREATE INDEX idx_stores_slug ON stores(slug);

-- Categories
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  store_id    UUID REFERENCES stores(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  descricao   TEXT,
  icone       TEXT,
  ordem       INTEGER NOT NULL DEFAULT 0,
  ativa       BOOLEAN NOT NULL DEFAULT true,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_tenant ON categories(tenant_id);
CREATE INDEX idx_categories_store ON categories(store_id);

-- Products (sem campos de estoque — adicionados na migration_005)
CREATE TABLE products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
  nome              TEXT NOT NULL,
  descricao         TEXT,
  preco             INTEGER NOT NULL,
  preco_promocional INTEGER,
  foto_url          TEXT,
  disponivel        BOOLEAN NOT NULL DEFAULT true,
  ordem             INTEGER NOT NULL DEFAULT 0,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_category ON products(category_id);

-- Consumers
CREATE TABLE consumers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  telefone      TEXT,
  foto_url      TEXT,
  enderecos     JSONB DEFAULT '[]',
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consumers_user ON consumers(user_id);

-- Orders (sem campos Stripe/payment — adicionados na migration_002)
CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id       UUID NOT NULL REFERENCES consumers(id),
  store_id          UUID NOT NULL REFERENCES stores(id),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  status            order_status NOT NULL DEFAULT 'novo',
  forma_pagamento   TEXT NOT NULL,
  subtotal          INTEGER NOT NULL,
  taxa_entrega      INTEGER NOT NULL DEFAULT 0,
  total             INTEGER NOT NULL,
  endereco_entrega  JSONB NOT NULL,
  observacoes       TEXT,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_consumer ON orders(consumer_id);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_criado_em ON orders(criado_em DESC);

-- Order Items
CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
  nome        TEXT NOT NULL,
  preco_unit  INTEGER NOT NULL,
  quantidade  INTEGER NOT NULL DEFAULT 1,
  subtotal    INTEGER NOT NULL,
  observacoes TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================================
-- HELPERS RLS
-- ============================================================

CREATE OR REPLACE FUNCTION my_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM tenants WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION my_consumer_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM consumers WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- TRIGGERS: Limites do plano
-- ============================================================

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
