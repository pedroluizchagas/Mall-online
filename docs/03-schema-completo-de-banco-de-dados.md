# 03 — Schema Completo do Banco de Dados

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

O banco é PostgreSQL 15 hospedado no Supabase. Todas as tabelas têm Row Level
Security (RLS) habilitado. O isolamento entre tenants é garantido via políticas
RLS — nunca apenas por filtros no código da aplicação.

A migration_001 já foi aplicada em produção. As tabelas desta migration estão
documentadas aqui como referência, com os campos adicionais das migrations
subsequentes já incorporados para facilitar a leitura do schema final.

-----

## ENUMS

```sql
-- Status do pedido (ciclo de vida completo)
CREATE TYPE order_status AS ENUM (
  'novo',
  'confirmado',
  'em_preparo',
  'aguardando_entregador',
  'saiu_para_entrega',
  'entregue',
  'cancelado'
);

-- Status do pagamento do pedido
CREATE TYPE payment_status AS ENUM (
  'pendente',
  'pago',
  'estornado',
  'em_disputa'
);

-- Status da entrega (assignment)
CREATE TYPE delivery_status AS ENUM (
  'pendente',
  'aceita',
  'coletada',
  'entregue',
  'cancelada'
);

-- Status do repasse financeiro
CREATE TYPE payout_status AS ENUM (
  'agendado',
  'processando',
  'concluido',
  'falhou'
);

-- Status da assinatura do lojista
CREATE TYPE billing_status AS ENUM (
  'trial',
  'ativa',
  'em_atraso',
  'cancelada',
  'suspensa'
);

-- Status do cadastro do entregador
CREATE TYPE courier_status AS ENUM (
  'pendente',
  'aprovado',
  'reprovado',
  'suspenso'
);

-- Tipo do entregador
CREATE TYPE courier_type AS ENUM (
  'proprio',    -- vinculado a um lojista específico
  'autonomo'    -- pool geral da plataforma
);

-- Tipo de movimentação de estoque
CREATE TYPE stock_movement_type AS ENUM (
  'entrada',
  'saida_pedido',
  'ajuste_positivo',
  'ajuste_negativo'
);
```

-----

## TABELAS

-----

### plans

Planos de assinatura disponíveis na plataforma.

```sql
CREATE TABLE plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              TEXT NOT NULL,
  descricao         TEXT,
  preco_mensal      INTEGER NOT NULL,         -- em centavos (ex: 14900 = R$149,00)
  max_lojas         INTEGER NOT NULL DEFAULT 1,
  max_produtos      INTEGER NOT NULL DEFAULT 30,
  max_entregadores  INTEGER NOT NULL DEFAULT 1,
  tem_estoque       BOOLEAN NOT NULL DEFAULT false,
  tem_relatorios    BOOLEAN NOT NULL DEFAULT false,
  tem_antecipacao   BOOLEAN NOT NULL DEFAULT true,
  ativo             BOOLEAN NOT NULL DEFAULT true,
  stripe_product_id TEXT,                     -- ID do Product no Stripe
  stripe_price_id   TEXT,                     -- ID do Price no Stripe (recorrente)
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

-----

### tenants

Lojistas cadastrados na plataforma. Cada tenant pode ter uma ou mais lojas
conforme o plano contratado.

```sql
CREATE TABLE tenants (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_responsavel            TEXT NOT NULL,
  cpf_cnpj                    TEXT,
  telefone                    TEXT,
  email                       TEXT NOT NULL,
  slug                        TEXT UNIQUE,         -- identificador único na URL
  stripe_customer_id          TEXT UNIQUE,         -- Customer ID no Stripe Billing (assinatura)
  pagarme_recipient_id        TEXT UNIQUE,         -- Recipient ID no Pagar.me (split de pedidos)
  pagarme_onboarding_status   TEXT NOT NULL DEFAULT 'registration',
                                                   -- registration, affiliation, active, refused, suspended, blocked
  ativo                       BOOLEAN NOT NULL DEFAULT true,
  criado_em                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_user_id ON tenants(user_id);
CREATE INDEX idx_tenants_stripe_customer ON tenants(stripe_customer_id);
CREATE INDEX idx_tenants_pagarme_recipient ON tenants(pagarme_recipient_id);
```

-----

### tenant_subscriptions

Assinatura ativa do lojista. Um tenant tem uma assinatura por vez.

```sql
CREATE TABLE tenant_subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id                 UUID NOT NULL REFERENCES plans(id),
  billing_status          billing_status NOT NULL DEFAULT 'trial',
  stripe_subscription_id  TEXT UNIQUE,          -- sub_xxx no Stripe
  stripe_price_id         TEXT,                 -- price_xxx ativo
  trial_termina_em        TIMESTAMPTZ,
  periodo_inicio          TIMESTAMPTZ,
  periodo_fim             TIMESTAMPTZ,
  cancelado_em            TIMESTAMPTZ,
  criado_em               TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_stripe ON tenant_subscriptions(stripe_subscription_id);
```

-----

### stores

Lojas vinculadas a um tenant. O plano limita quantas lojas um tenant pode ter.
Esse limite é verificado via trigger no INSERT.

```sql
CREATE TABLE stores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  descricao       TEXT,
  slug            TEXT UNIQUE,
  logo_url        TEXT,
  banner_url      TEXT,
  telefone        TEXT,
  endereco        JSONB,                      -- { rua, numero, bairro, cidade, cep, lat, lng }
  horarios        JSONB,                      -- { seg: {abre, fecha}, ter: ... }
  taxa_entrega    INTEGER NOT NULL DEFAULT 0, -- em centavos
  tempo_entrega   INTEGER,                    -- em minutos (estimativa)
  raio_entrega_km NUMERIC(5,2),
  aceita_dinheiro BOOLEAN NOT NULL DEFAULT true,
  aceita_pix      BOOLEAN NOT NULL DEFAULT true,
  aceita_cartao_maquininha BOOLEAN NOT NULL DEFAULT true,
  aceita_cartao_online     BOOLEAN NOT NULL DEFAULT true,
  usa_entregadores_proprios BOOLEAN NOT NULL DEFAULT false,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  theme           JSONB,                      -- customizações visuais opcionais
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stores_tenant ON stores(tenant_id);
CREATE INDEX idx_stores_slug ON stores(slug);
```

-----

### categories

Categorias de produtos. Podem ser globais (criadas pelo admin, tenant_id NULL)
ou próprias do lojista (tenant_id preenchido).

```sql
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = categoria global
  store_id    UUID REFERENCES stores(id) ON DELETE CASCADE,  -- NULL = todas as lojas do tenant
  nome        TEXT NOT NULL,
  descricao   TEXT,
  icone       TEXT,                -- emoji ou nome de ícone
  ordem       INTEGER NOT NULL DEFAULT 0,
  ativa       BOOLEAN NOT NULL DEFAULT true,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_tenant ON categories(tenant_id);
CREATE INDEX idx_categories_store ON categories(store_id);
```

-----

### products

Produtos de uma loja. O plano limita a quantidade total de produtos por tenant.

```sql
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  nome            TEXT NOT NULL,
  descricao       TEXT,
  preco           INTEGER NOT NULL,           -- em centavos
  preco_promocional INTEGER,                  -- em centavos (NULL = sem promoção)
  foto_url        TEXT,
  disponivel      BOOLEAN NOT NULL DEFAULT true,
  track_stock     BOOLEAN NOT NULL DEFAULT false,
  stock_quantity  INTEGER,                    -- NULL se track_stock = false
  stock_minimo    INTEGER DEFAULT 0,          -- alerta abaixo deste valor
  ordem           INTEGER NOT NULL DEFAULT 0,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_category ON products(category_id);
```

-----

### consumers

Consumidores cadastrados no app. Separados dos usuários lojistas/entregadores
via `role` no Supabase Auth.

```sql
CREATE TABLE consumers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  telefone      TEXT,
  foto_url      TEXT,
  enderecos     JSONB DEFAULT '[]',           -- array de endereços salvos
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consumers_user ON consumers(user_id);
```

-----

### couriers

Entregadores cadastrados na plataforma.

```sql
CREATE TABLE couriers (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id                   UUID REFERENCES tenants(id) ON DELETE SET NULL, -- NULL = autônomo
  tipo                        courier_type NOT NULL DEFAULT 'autonomo',
  nome                        TEXT NOT NULL,
  cpf                         TEXT,
  telefone                    TEXT,
  foto_url                    TEXT,
  cnh_numero                  TEXT,
  cnh_foto_url                TEXT,
  veiculo_tipo                TEXT,                 -- moto, bicicleta, carro, a_pe
  veiculo_placa               TEXT,
  status                      courier_status NOT NULL DEFAULT 'pendente',
  online                      BOOLEAN NOT NULL DEFAULT false,
  pagarme_recipient_id        TEXT UNIQUE,          -- Recipient Pagar.me (recebimento)
  pagarme_onboarding_status   TEXT NOT NULL DEFAULT 'registration',
                                                    -- registration, affiliation, active, refused, suspended, blocked
  aprovado_em                 TIMESTAMPTZ,
  aprovado_por                UUID REFERENCES auth.users(id),
  criado_em                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_couriers_user ON couriers(user_id);
CREATE INDEX idx_couriers_tenant ON couriers(tenant_id);
CREATE INDEX idx_couriers_status ON couriers(status);
CREATE INDEX idx_couriers_online ON couriers(online) WHERE online = true;
CREATE INDEX idx_couriers_pagarme_recipient ON couriers(pagarme_recipient_id);
```

-----

### orders

Pedidos realizados pelos consumidores.

```sql
CREATE TABLE orders (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id             UUID NOT NULL REFERENCES consumers(id),
  store_id                UUID NOT NULL REFERENCES stores(id),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  status                  order_status NOT NULL DEFAULT 'novo',
  payment_status          payment_status NOT NULL DEFAULT 'pendente',
  forma_pagamento         TEXT NOT NULL,       -- online_cartao, online_pix, dinheiro, cartao_maquininha
  subtotal                INTEGER NOT NULL,    -- em centavos
  taxa_entrega            INTEGER NOT NULL DEFAULT 0,
  total                   INTEGER NOT NULL,    -- subtotal + taxa_entrega
  platform_fee_amount     INTEGER DEFAULT 100, -- em centavos (R$1,00)
  troco_para              INTEGER,             -- em centavos, se pagamento em dinheiro
  endereco_entrega        JSONB NOT NULL,      -- snapshot do endereço no momento do pedido
  observacoes             TEXT,
  pagarme_order_id        TEXT UNIQUE,         -- or_xxx (NULL se pagamento offline)
  pagarme_charge_id       TEXT UNIQUE,         -- ch_xxx
  valor_estornado         INTEGER NOT NULL DEFAULT 0,
  cancelado_em            TIMESTAMPTZ,
  motivo_cancelamento     TEXT,
  criado_em               TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_consumer ON orders(consumer_id);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_pagarme_order ON orders(pagarme_order_id);
CREATE INDEX idx_orders_pagarme_charge ON orders(pagarme_charge_id);
CREATE INDEX idx_orders_criado_em ON orders(criado_em DESC);
```

-----

### order_items

Itens de cada pedido. Snapshot dos dados do produto no momento da compra.

```sql
CREATE TABLE order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
  nome          TEXT NOT NULL,                -- snapshot do nome
  preco_unit    INTEGER NOT NULL,             -- snapshot do preço em centavos
  quantidade    INTEGER NOT NULL DEFAULT 1,
  subtotal      INTEGER NOT NULL,             -- preco_unit * quantidade
  observacoes   TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
```

-----

### delivery_assignments

Atribuição de um entregador a um pedido.

```sql
CREATE TABLE delivery_assignments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  courier_id            UUID NOT NULL REFERENCES couriers(id),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  status                delivery_status NOT NULL DEFAULT 'pendente',
  valor_entrega         INTEGER NOT NULL DEFAULT 0, -- em centavos (valor que o entregador recebe)
  aceito_em             TIMESTAMPTZ,
  coletado_em           TIMESTAMPTZ,
  entregue_em           TIMESTAMPTZ,
  cancelado_em          TIMESTAMPTZ,
  comprovante_url       TEXT,                       -- foto de confirmação de entrega
  codigo_confirmacao    TEXT,                       -- código alternativo de confirmação
  pagarme_transfer_id   TEXT UNIQUE,                -- tr_xxx (estágio 2 — taxa de entrega)
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assignments_order ON delivery_assignments(order_id);
CREATE INDEX idx_assignments_courier ON delivery_assignments(courier_id);
CREATE INDEX idx_assignments_tenant ON delivery_assignments(tenant_id);
CREATE INDEX idx_assignments_status ON delivery_assignments(status);
```

-----

### courier_locations

Posição em tempo real do entregador. Atualizada a cada 5 segundos durante
uma entrega ativa. Usada pelo Supabase Realtime para transmitir ao consumidor
e ao lojista.

```sql
CREATE TABLE courier_locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id    UUID NOT NULL UNIQUE REFERENCES couriers(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES delivery_assignments(id) ON DELETE SET NULL,
  latitude      NUMERIC(10, 7) NOT NULL,
  longitude     NUMERIC(10, 7) NOT NULL,
  precisao_m    NUMERIC(6, 2),               -- precisão do GPS em metros
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_courier_locations_courier ON courier_locations(courier_id);
CREATE INDEX idx_courier_locations_assignment ON courier_locations(assignment_id);
```

-----

### payouts

Registro de todos os repasses financeiros realizados pela plataforma.

```sql
CREATE TABLE payouts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                     TEXT NOT NULL,          -- 'lojista' ou 'entregador'
  tenant_id                UUID REFERENCES tenants(id),
  courier_id               UUID REFERENCES couriers(id),
  valor_bruto              INTEGER NOT NULL,       -- em centavos
  taxa_antecipacao         INTEGER NOT NULL DEFAULT 0, -- taxa Pagar.me da antecipação
  valor_liquido            INTEGER NOT NULL,       -- valor_bruto - taxa_antecipacao
  total_pedidos            INTEGER NOT NULL DEFAULT 0,
  status                   payout_status NOT NULL DEFAULT 'agendado',
  antecipado               BOOLEAN NOT NULL DEFAULT false,
  data_referencia          DATE NOT NULL,
  data_prevista            DATE NOT NULL,
  pagarme_transfer_id      TEXT UNIQUE,            -- tr_xxx (transfer estágio 2)
  pagarme_anticipation_id  TEXT UNIQUE,            -- ant_xxx (antecipação manual, opcional)
  erro_mensagem            TEXT,
  processado_em            TIMESTAMPTZ,
  criado_em                TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payouts_tenant ON payouts(tenant_id);
CREATE INDEX idx_payouts_courier ON payouts(courier_id);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_data_prevista ON payouts(data_prevista);
CREATE INDEX idx_payouts_pagarme_transfer ON payouts(pagarme_transfer_id);
```

-----

### payout_advance_requests

Solicitações de antecipação de repasse feitas pelo lojista.

```sql
CREATE TABLE payout_advance_requests (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payout_id                UUID REFERENCES payouts(id),
  total_pedidos            INTEGER NOT NULL DEFAULT 0,
  taxa_total               INTEGER NOT NULL,         -- taxa cobrada pelo Pagar.me
  valor_estimado           INTEGER NOT NULL,         -- valor bruto antecipado
  pagarme_anticipation_id  TEXT UNIQUE,              -- ant_xxx
  status                   TEXT NOT NULL DEFAULT 'pendente', -- pendente, aprovada, rejeitada, executada
  solicitado_em            TIMESTAMPTZ NOT NULL DEFAULT now(),
  processado_em            TIMESTAMPTZ,
  criado_em                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_advance_requests_tenant ON payout_advance_requests(tenant_id);
CREATE INDEX idx_advance_requests_status ON payout_advance_requests(status);
```

-----

### stock_movements

Histórico de movimentações de estoque por produto.

```sql
CREATE TABLE stock_movements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  tipo          stock_movement_type NOT NULL,
  quantidade    INTEGER NOT NULL,             -- positivo = entrada, negativo = saída
  quantidade_anterior INTEGER NOT NULL,
  quantidade_posterior INTEGER NOT NULL,
  motivo        TEXT,
  criado_por    UUID REFERENCES auth.users(id),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_tenant ON stock_movements(tenant_id);
```

-----

### push_tokens

Tokens de notificação push por usuário e app.

```sql
CREATE TABLE push_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  courier_id    UUID REFERENCES couriers(id) ON DELETE CASCADE,
  token         TEXT NOT NULL,
  plataforma    TEXT NOT NULL,                -- 'ios' ou 'android'
  app           TEXT NOT NULL,                -- 'consumer', 'courier', 'web'
  ativo         BOOLEAN NOT NULL DEFAULT true,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT push_tokens_owner CHECK (
    (user_id IS NOT NULL AND courier_id IS NULL) OR
    (user_id IS NULL AND courier_id IS NOT NULL)
  )
);

CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_courier ON push_tokens(courier_id);
```

-----

## DIAGRAMA DE RELACIONAMENTOS

```
auth.users
    |
    ├── tenants (user_id)
    │       |
    │       ├── tenant_subscriptions (tenant_id) → plans
    │       ├── stores (tenant_id)
    │       │       |
    │       │       ├── products (store_id) → categories
    │       │       └── (orders via store_id)
    │       ├── categories (tenant_id)
    │       ├── couriers [tipo=proprio] (tenant_id)
    │       └── payouts (tenant_id)
    │
    ├── consumers (user_id)
    │       |
    │       └── orders (consumer_id)
    │               |
    │               ├── order_items (order_id) → products
    │               └── delivery_assignments (order_id)
    │                       |
    │                       └── couriers (courier_id)
    │                               |
    │                               ├── courier_locations (courier_id)
    │                               └── payouts (courier_id)
    │
    └── couriers [tipo=autonomo] (user_id)
```

-----

## TABELAS HERDADAS DA MIGRATION_001 (ja aplicadas)

As seguintes tabelas já existem no banco. O schema acima reflete o estado
final após todas as migrations, incluindo os campos adicionados pelas
migrations 002 a 005.

Tabelas já existentes: `plans`, `tenant_subscriptions`, `categories`,
`tenants`, `stores`, `products`, `orders`, `consumers`.

Campos acrescentados nas migrations subsequentes estão marcados com
comentário nas definições acima.

-----

*Arquivo 03 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 04 — Migrations SQL*
