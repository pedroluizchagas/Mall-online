# 04 — Migrations SQL

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

As migrations são aplicadas em ordem sequencial via Supabase CLI.
Cada migration tem uma seção `up` (aplicar) e uma seção `down` (reverter).
A migration_001 já foi aplicada em produção — está documentada aqui apenas
como referência histórica. As migrations 002 a 005 precisam ser aplicadas.

Convenção de nomenclatura dos arquivos:

```
supabase/migrations/YYYYMMDDHHMMSS_nome_descritivo.sql
```

-----

## COMO APLICAR

```bash
# Aplicar todas as migrations pendentes
supabase db push

# Verificar status das migrations
supabase migration list

# Aplicar localmente (ambiente de desenvolvimento)
supabase db reset
```

-----

## MIGRATION 001 — Base do Projeto

### Status: APLICADA em producao

Arquivo: `20240101000000_migration_001_additive.sql`

Criou as tabelas base: `plans`, `tenant_subscriptions`, `categories`,
`tenants`, `stores`, `products`, `orders`, `consumers`.

Criou os helpers RLS: `my_tenant_id()` e `my_consumer_id()`.

Criou o trigger de limite de lojas e produtos por plano.

Não é necessário reaplicar. Documentada aqui apenas para referência.

-----

## MIGRATION 002 — Campos de pagamento (Pagar.me + Stripe Billing)

### Status: PENDENTE

Arquivo: `20240102000000_migration_002_payment_fields.sql`

Adiciona todos os campos necessários para integração com **Pagar.me** (split
de pedidos) e **Stripe Billing** (assinatura mensal) nas tabelas existentes.

```sql
-- ============================================================
-- UP
-- ============================================================

-- Campos do tenant (lojista)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id        TEXT UNIQUE,                 -- Stripe Billing
  ADD COLUMN IF NOT EXISTS pagarme_recipient_id      TEXT UNIQUE,                 -- Pagar.me split
  ADD COLUMN IF NOT EXISTS pagarme_onboarding_status TEXT NOT NULL DEFAULT 'registration';

-- Campos de assinatura (Stripe Billing — inalterado)
ALTER TABLE tenant_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_price_id         TEXT,
  ADD COLUMN IF NOT EXISTS billing_status          TEXT NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_termina_em        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS periodo_inicio          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS periodo_fim             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelado_em            TIMESTAMPTZ;

-- Campos de pagamento no pedido (Pagar.me)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status      TEXT NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS pagarme_order_id    TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pagarme_charge_id   TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS valor_estornado     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee_amount INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS troco_para          INTEGER,
  ADD COLUMN IF NOT EXISTS cancelado_em        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT;

-- Campos Stripe Billing nos planos (mensalidade — inalterado)
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id   TEXT,
  ADD COLUMN IF NOT EXISTS tem_antecipacao   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_entregadores  INTEGER NOT NULL DEFAULT 1;

-- Índices novos
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer
  ON tenants(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_tenants_pagarme_recipient
  ON tenants(pagarme_recipient_id);

CREATE INDEX IF NOT EXISTS idx_orders_pagarme_order
  ON orders(pagarme_order_id);

CREATE INDEX IF NOT EXISTS idx_orders_pagarme_charge
  ON orders(pagarme_charge_id);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status
  ON orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe
  ON tenant_subscriptions(stripe_subscription_id);

-- ============================================================
-- DOWN
-- ============================================================

-- ALTER TABLE tenants
--   DROP COLUMN IF EXISTS stripe_customer_id,
--   DROP COLUMN IF EXISTS pagarme_recipient_id,
--   DROP COLUMN IF EXISTS pagarme_onboarding_status;

-- ALTER TABLE tenant_subscriptions
--   DROP COLUMN IF EXISTS stripe_subscription_id,
--   DROP COLUMN IF EXISTS stripe_price_id,
--   DROP COLUMN IF EXISTS billing_status,
--   DROP COLUMN IF EXISTS trial_termina_em,
--   DROP COLUMN IF EXISTS periodo_inicio,
--   DROP COLUMN IF EXISTS periodo_fim,
--   DROP COLUMN IF EXISTS cancelado_em;

-- ALTER TABLE orders
--   DROP COLUMN IF EXISTS payment_status,
--   DROP COLUMN IF EXISTS pagarme_order_id,
--   DROP COLUMN IF EXISTS pagarme_charge_id,
--   DROP COLUMN IF EXISTS valor_estornado,
--   DROP COLUMN IF EXISTS platform_fee_amount,
--   DROP COLUMN IF EXISTS troco_para,
--   DROP COLUMN IF EXISTS cancelado_em,
--   DROP COLUMN IF EXISTS motivo_cancelamento;

-- ALTER TABLE plans
--   DROP COLUMN IF EXISTS stripe_product_id,
--   DROP COLUMN IF EXISTS stripe_price_id,
--   DROP COLUMN IF EXISTS tem_antecipacao,
--   DROP COLUMN IF EXISTS max_entregadores;
```

-----

## MIGRATION 003 — Modulo Entregador

### Status: PENDENTE

Arquivo: `20240103000000_migration_003_couriers.sql`

Cria todas as tabelas necessárias para o módulo de entregadores:
cadastro, atribuição de entregas e localização em tempo real.

```sql
-- ============================================================
-- UP
-- ============================================================

-- Tipos ENUM novos
CREATE TYPE courier_status AS ENUM (
  'pendente',
  'aprovado',
  'reprovado',
  'suspenso'
);

CREATE TYPE courier_type AS ENUM (
  'proprio',
  'autonomo'
);

CREATE TYPE delivery_status AS ENUM (
  'pendente',
  'aceita',
  'coletada',
  'entregue',
  'cancelada'
);

-- Tabela de entregadores
CREATE TABLE couriers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id             UUID REFERENCES tenants(id) ON DELETE SET NULL,
  tipo                  courier_type NOT NULL DEFAULT 'autonomo',
  nome                  TEXT NOT NULL,
  cpf                   TEXT,
  telefone              TEXT,
  foto_url              TEXT,
  cnh_numero            TEXT,
  cnh_foto_url          TEXT,
  veiculo_tipo          TEXT,
  veiculo_placa         TEXT,
  status                      courier_status NOT NULL DEFAULT 'pendente',
  online                      BOOLEAN NOT NULL DEFAULT false,
  pagarme_recipient_id        TEXT UNIQUE,
  pagarme_onboarding_status   TEXT NOT NULL DEFAULT 'registration',
  aprovado_em                 TIMESTAMPTZ,
  aprovado_por                UUID REFERENCES auth.users(id),
  criado_em                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_couriers_user      ON couriers(user_id);
CREATE INDEX idx_couriers_tenant    ON couriers(tenant_id);
CREATE INDEX idx_couriers_status    ON couriers(status);
CREATE INDEX idx_couriers_online    ON couriers(online) WHERE online = true;
CREATE INDEX idx_couriers_recipient ON couriers(pagarme_recipient_id);

-- Tabela de atribuições de entrega
CREATE TABLE delivery_assignments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                 UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  courier_id               UUID NOT NULL REFERENCES couriers(id),
  tenant_id                UUID NOT NULL REFERENCES tenants(id),
  status                   delivery_status NOT NULL DEFAULT 'pendente',
  valor_entrega            INTEGER NOT NULL DEFAULT 0,
  aceito_em                TIMESTAMPTZ,
  coletado_em              TIMESTAMPTZ,
  entregue_em              TIMESTAMPTZ,
  cancelado_em             TIMESTAMPTZ,
  comprovante_url          TEXT,
  codigo_confirmacao       TEXT,
  pagarme_transfer_id      TEXT UNIQUE,                  -- estágio 2 do split
  criado_em                TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assignments_order   ON delivery_assignments(order_id);
CREATE INDEX idx_assignments_courier ON delivery_assignments(courier_id);
CREATE INDEX idx_assignments_tenant  ON delivery_assignments(tenant_id);
CREATE INDEX idx_assignments_status  ON delivery_assignments(status);

-- Tabela de localização em tempo real
CREATE TABLE courier_locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id    UUID NOT NULL UNIQUE REFERENCES couriers(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES delivery_assignments(id) ON DELETE SET NULL,
  latitude      NUMERIC(10, 7) NOT NULL,
  longitude     NUMERIC(10, 7) NOT NULL,
  precisao_m    NUMERIC(6, 2),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_courier_locations_courier    ON courier_locations(courier_id);
CREATE INDEX idx_courier_locations_assignment ON courier_locations(assignment_id);

-- Habilitar RLS nas novas tabelas
ALTER TABLE couriers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_locations    ENABLE ROW LEVEL SECURITY;

-- Helper: retorna o courier_id do usuário autenticado
CREATE OR REPLACE FUNCTION my_courier_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM couriers WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- DOWN
-- ============================================================

-- DROP FUNCTION IF EXISTS my_courier_id();
-- DROP TABLE IF EXISTS courier_locations;
-- DROP TABLE IF EXISTS delivery_assignments;
-- DROP TABLE IF EXISTS couriers;
-- DROP TYPE IF EXISTS delivery_status;
-- DROP TYPE IF EXISTS courier_type;
-- DROP TYPE IF EXISTS courier_status;
```

-----

## MIGRATION 004 — Modulo Financeiro (Repasses e Antecipacao)

### Status: PENDENTE

Arquivo: `20240104000000_migration_004_payouts.sql`

Cria as tabelas de controle financeiro de repasses e solicitações
de antecipação. Também cria a tabela de tokens push e a tabela
de push_tokens.

```sql
-- ============================================================
-- UP
-- ============================================================

-- Tipos ENUM novos
CREATE TYPE payout_status AS ENUM (
  'agendado',
  'processando',
  'concluido',
  'falhou'
);

-- Tabela de repasses (auditoria de transfers Pagar.me + antecipações)
CREATE TABLE payouts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                     TEXT NOT NULL CHECK (tipo IN ('lojista', 'entregador')),
  tenant_id                UUID REFERENCES tenants(id),
  courier_id               UUID REFERENCES couriers(id),
  valor_bruto              INTEGER NOT NULL,
  taxa_antecipacao         INTEGER NOT NULL DEFAULT 0,
  valor_liquido            INTEGER NOT NULL,
  total_pedidos            INTEGER NOT NULL DEFAULT 0,
  status                   payout_status NOT NULL DEFAULT 'agendado',
  antecipado               BOOLEAN NOT NULL DEFAULT false,
  data_referencia          DATE NOT NULL,
  data_prevista            DATE NOT NULL,
  pagarme_transfer_id      TEXT UNIQUE,
  pagarme_anticipation_id  TEXT UNIQUE,
  erro_mensagem            TEXT,
  processado_em            TIMESTAMPTZ,
  criado_em                TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payouts_owner CHECK (
    (tenant_id IS NOT NULL AND courier_id IS NULL) OR
    (tenant_id IS NULL AND courier_id IS NOT NULL)
  )
);

CREATE INDEX idx_payouts_tenant        ON payouts(tenant_id);
CREATE INDEX idx_payouts_courier       ON payouts(courier_id);
CREATE INDEX idx_payouts_status        ON payouts(status);
CREATE INDEX idx_payouts_data_prevista ON payouts(data_prevista);
CREATE INDEX idx_payouts_transfer      ON payouts(pagarme_transfer_id);

-- Tabela de solicitações de antecipação (chamadas à API Pagar.me)
CREATE TABLE payout_advance_requests (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payout_id                UUID REFERENCES payouts(id),
  total_pedidos            INTEGER NOT NULL DEFAULT 0,
  taxa_total               INTEGER NOT NULL,
  valor_estimado           INTEGER NOT NULL,
  pagarme_anticipation_id  TEXT UNIQUE,
  status                   TEXT NOT NULL DEFAULT 'pendente'
                           CHECK (status IN ('pendente', 'aprovada', 'rejeitada', 'executada')),
  solicitado_em            TIMESTAMPTZ NOT NULL DEFAULT now(),
  processado_em            TIMESTAMPTZ,
  criado_em                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_advance_requests_tenant ON payout_advance_requests(tenant_id);
CREATE INDEX idx_advance_requests_status ON payout_advance_requests(status);

-- Tabela de tokens push
CREATE TABLE push_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  courier_id    UUID REFERENCES couriers(id) ON DELETE CASCADE,
  token         TEXT NOT NULL,
  plataforma    TEXT NOT NULL CHECK (plataforma IN ('ios', 'android')),
  app           TEXT NOT NULL CHECK (app IN ('consumer', 'courier', 'web')),
  ativo         BOOLEAN NOT NULL DEFAULT true,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT push_tokens_owner CHECK (
    (user_id IS NOT NULL AND courier_id IS NULL) OR
    (user_id IS NULL AND courier_id IS NOT NULL)
  )
);

CREATE INDEX idx_push_tokens_user    ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_courier ON push_tokens(courier_id);

-- Habilitar RLS
ALTER TABLE payouts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_advance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens            ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DOWN
-- ============================================================

-- DROP TABLE IF EXISTS push_tokens;
-- DROP TABLE IF EXISTS payout_advance_requests;
-- DROP TABLE IF EXISTS payouts;
-- DROP TYPE IF EXISTS payout_status;
```

-----

## MIGRATION 005 — Modulo de Estoque

### Status: PENDENTE (disponivel apos lancamento, planos superiores)

Arquivo: `20240105000000_migration_005_stock.sql`

Adiciona controle de estoque aos produtos e cria o histórico de
movimentações. Os campos `track_stock` e `stock_quantity` já foram
incluídos na tabela `products` da migration_001 como colunas opcionais —
esta migration cria apenas a tabela de movimentações e o trigger de
decremento automático.

```sql
-- ============================================================
-- UP
-- ============================================================

-- Tipo ENUM novo
CREATE TYPE stock_movement_type AS ENUM (
  'entrada',
  'saida_pedido',
  'ajuste_positivo',
  'ajuste_negativo'
);

-- Garantir que os campos existam em products (caso migration_001 não os tenha)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS track_stock     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_quantity  INTEGER,
  ADD COLUMN IF NOT EXISTS stock_minimo    INTEGER DEFAULT 0;

-- Tabela de movimentações de estoque
CREATE TABLE stock_movements (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id           UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id             UUID REFERENCES orders(id) ON DELETE SET NULL,
  tipo                 stock_movement_type NOT NULL,
  quantidade           INTEGER NOT NULL,
  quantidade_anterior  INTEGER NOT NULL,
  quantidade_posterior INTEGER NOT NULL,
  motivo               TEXT,
  criado_por           UUID REFERENCES auth.users(id),
  criado_em            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_tenant  ON stock_movements(tenant_id);
CREATE INDEX idx_stock_movements_order   ON stock_movements(order_id);

-- Habilitar RLS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Trigger: decrementar estoque ao confirmar pedido
CREATE OR REPLACE FUNCTION decrementar_estoque_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  item RECORD;
  produto RECORD;
BEGIN
  -- Só executa quando status muda para 'confirmado'
  IF NEW.status = 'confirmado' AND OLD.status != 'confirmado' THEN
    FOR item IN
      SELECT product_id, quantidade
      FROM order_items
      WHERE order_id = NEW.id
    LOOP
      SELECT id, stock_quantity, track_stock
      INTO produto
      FROM products
      WHERE id = item.product_id;

      IF produto.track_stock AND produto.stock_quantity IS NOT NULL THEN
        -- Registrar movimentação
        INSERT INTO stock_movements (
          product_id,
          tenant_id,
          order_id,
          tipo,
          quantidade,
          quantidade_anterior,
          quantidade_posterior
        ) VALUES (
          produto.id,
          NEW.tenant_id,
          NEW.id,
          'saida_pedido',
          -item.quantidade,
          produto.stock_quantity,
          produto.stock_quantity - item.quantidade
        );

        -- Decrementar estoque
        UPDATE products
        SET stock_quantity = stock_quantity - item.quantidade
        WHERE id = produto.id;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_decrementar_estoque
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION decrementar_estoque_pedido();

-- ============================================================
-- DOWN
-- ============================================================

-- DROP TRIGGER IF EXISTS trigger_decrementar_estoque ON orders;
-- DROP FUNCTION IF EXISTS decrementar_estoque_pedido();
-- DROP TABLE IF EXISTS stock_movements;
-- DROP TYPE IF EXISTS stock_movement_type;
-- ALTER TABLE products
--   DROP COLUMN IF EXISTS track_stock,
--   DROP COLUMN IF EXISTS stock_quantity,
--   DROP COLUMN IF EXISTS stock_minimo;
```

-----

## MIGRATION 006 — Cutover Pagar.me (campos + log de webhooks)

### Status: PENDENTE — primeiro passo da migracao Pagar.me

Arquivo: `20260506000001_migration_006_pagarme_fields.sql`

A `migration_002` aplicada em produção foi escrita ainda no modelo
Stripe Connect (campos `stripe_account_id`, `stripe_onboarding_ok`,
`stripe_payment_intent_id`, `stripe_transfer_id`). A `migration_006` é
o **primeiro passo do cutover para Pagar.me**: adiciona as colunas
`pagarme_*` em paralelo aos campos Stripe Connect legados (que serão
mantidos durante a janela de cutover e derrubados pela `migration_007`
depois de validada a migração).

Também cria a tabela `webhook_events_log`, que garante idempotência
do `pagarme-webhook` — cada evento da Pagar.me tem um `id` único e
qualquer reentrada (retry, replay) é descartada com base nessa tabela.

```sql
-- ============================================================
-- UP
-- ============================================================

-- Campos Pagar.me em tenants (lojista)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS pagarme_recipient_id      TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pagarme_onboarding_status TEXT NOT NULL DEFAULT 'pending';

-- Campos Pagar.me em couriers (entregador autonomo)
ALTER TABLE couriers
  ADD COLUMN IF NOT EXISTS pagarme_recipient_id      TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pagarme_onboarding_status TEXT NOT NULL DEFAULT 'pending';

-- Campos Pagar.me em orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pagarme_order_id  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pagarme_charge_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS valor_estornado   INTEGER NOT NULL DEFAULT 0;

-- Estagio 2 do split: Transfer da Mallora para o entregador
ALTER TABLE delivery_assignments
  ADD COLUMN IF NOT EXISTS pagarme_transfer_id TEXT UNIQUE;

-- Auditoria de transfers em payouts (alem do stripe_transfer_id legado)
ALTER TABLE payouts
  ADD COLUMN IF NOT EXISTS pagarme_transfer_id     TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pagarme_anticipation_id TEXT UNIQUE;

-- Indices novos
CREATE INDEX IF NOT EXISTS idx_tenants_pagarme_recipient
  ON tenants(pagarme_recipient_id);

CREATE INDEX IF NOT EXISTS idx_couriers_pagarme_recipient
  ON couriers(pagarme_recipient_id);

CREATE INDEX IF NOT EXISTS idx_orders_pagarme_order
  ON orders(pagarme_order_id);

CREATE INDEX IF NOT EXISTS idx_orders_pagarme_charge
  ON orders(pagarme_charge_id);

CREATE INDEX IF NOT EXISTS idx_assignments_pagarme_transfer
  ON delivery_assignments(pagarme_transfer_id);

CREATE INDEX IF NOT EXISTS idx_payouts_pagarme_transfer
  ON payouts(pagarme_transfer_id);

-- Tabela de log/idempotencia de webhooks Pagar.me
-- Cada evento tem id unico (event.id na payload). O pagarme-webhook
-- insere ANTES de processar; conflito de PK = duplicata, retorna
-- 200 sem reprocessar.
CREATE TABLE IF NOT EXISTS webhook_events_log (
  event_id     TEXT PRIMARY KEY,
  tipo         TEXT NOT NULL,
  payload      JSONB,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_tipo
  ON webhook_events_log(tipo);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed
  ON webhook_events_log(processed_at DESC);

-- RLS — apenas service_role acessa
ALTER TABLE webhook_events_log ENABLE ROW LEVEL SECURITY;

-- Backfill: quem ja tinha stripe_onboarding_ok = true é considerado
-- 'pending' no Pagar.me até passar pelo novo onboarding. Não há
-- mapeamento automático de Stripe Connect → Pagar.me recipient.
-- Tenants/couriers existentes precisarão refazer o onboarding via
-- onboard-tenant / onboard-courier para obter pagarme_recipient_id.

-- ============================================================
-- DOWN
-- ============================================================

-- DROP INDEX IF EXISTS idx_webhook_events_processed;
-- DROP INDEX IF EXISTS idx_webhook_events_tipo;
-- DROP TABLE IF EXISTS webhook_events_log;
--
-- DROP INDEX IF EXISTS idx_payouts_pagarme_transfer;
-- DROP INDEX IF EXISTS idx_assignments_pagarme_transfer;
-- DROP INDEX IF EXISTS idx_orders_pagarme_charge;
-- DROP INDEX IF EXISTS idx_orders_pagarme_order;
-- DROP INDEX IF EXISTS idx_couriers_pagarme_recipient;
-- DROP INDEX IF EXISTS idx_tenants_pagarme_recipient;
--
-- ALTER TABLE payouts
--   DROP COLUMN IF EXISTS pagarme_transfer_id,
--   DROP COLUMN IF EXISTS pagarme_anticipation_id;
--
-- ALTER TABLE delivery_assignments
--   DROP COLUMN IF EXISTS pagarme_transfer_id;
--
-- ALTER TABLE orders
--   DROP COLUMN IF EXISTS pagarme_order_id,
--   DROP COLUMN IF EXISTS pagarme_charge_id,
--   DROP COLUMN IF EXISTS valor_estornado;
--
-- ALTER TABLE couriers
--   DROP COLUMN IF EXISTS pagarme_recipient_id,
--   DROP COLUMN IF EXISTS pagarme_onboarding_status;
--
-- ALTER TABLE tenants
--   DROP COLUMN IF EXISTS pagarme_recipient_id,
--   DROP COLUMN IF EXISTS pagarme_onboarding_status;
```

### Observação importante

Os campos `stripe_account_id`, `stripe_onboarding_ok`,
`stripe_payment_intent_id` e `stripe_transfer_id` (Stripe Connect)
**permanecem** no schema após a `migration_006` — são derrubados
apenas pela `migration_007` depois do cutover validado em
produção, garantindo plano de rollback durante a janela de migração.

Os campos `stripe_customer_id`, `stripe_subscription_id`,
`stripe_price_id`, `stripe_product_id` (Stripe Billing) **continuam
em uso** indefinidamente — Stripe Billing segue como gateway da
assinatura mensal do lojista.

-----

## MIGRATION 007 — Drop dos campos Stripe Connect (pos-cutover)

### Status: PENDENTE — somente apos validacao do cutover Pagar.me

Arquivo: `<timestamp>_migration_007_drop_stripe_connect.sql`

Executar **somente** quando:

- nenhum tenant ativo dependa mais de `stripe_account_id`;
- todas as orders abertas tenham `pagarme_order_id` populado;
- todos os payouts pendentes tenham `pagarme_transfer_id`;
- já tiver passado pelo menos um ciclo completo de pagamentos via
  Pagar.me em produção sem rollback.

```sql
-- ============================================================
-- UP
-- ============================================================

ALTER TABLE tenants
  DROP COLUMN IF EXISTS stripe_account_id,
  DROP COLUMN IF EXISTS stripe_onboarding_ok;

ALTER TABLE couriers
  DROP COLUMN IF EXISTS stripe_account_id,
  DROP COLUMN IF EXISTS stripe_onboarding_ok;

ALTER TABLE orders
  DROP COLUMN IF EXISTS stripe_payment_intent_id;

ALTER TABLE payouts
  DROP COLUMN IF EXISTS stripe_transfer_id;

DROP INDEX IF EXISTS idx_tenants_stripe_account;
DROP INDEX IF EXISTS idx_couriers_stripe;
DROP INDEX IF EXISTS idx_orders_payment_intent;

-- ============================================================
-- DOWN — recriar exige restore de backup; nao reversivel via SQL puro
-- ============================================================
```

`stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id` e
`stripe_product_id` permanecem intactos — Stripe Billing continua ativo.

-----

## TRIGGER: atualizado_em automatico

Aplicar em todas as tabelas que possuem a coluna `atualizado_em`.
Recomendado incluir no final da migration_002 ou criar como migration
separada.

```sql
-- Função genérica de atualização de timestamp
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- Aplicar nas tabelas relevantes
CREATE TRIGGER trg_tenants_atualizado_em
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_stores_atualizado_em
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_products_atualizado_em
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_orders_atualizado_em
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_couriers_atualizado_em
  BEFORE UPDATE ON couriers
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_assignments_atualizado_em
  BEFORE UPDATE ON delivery_assignments
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_payouts_atualizado_em
  BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_subscriptions_atualizado_em
  BEFORE UPDATE ON tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
```

-----

## CHECKLIST DE APLICACAO

Antes de aplicar cada migration em produção:

1. Fazer backup do banco (Supabase Dashboard > Database > Backups)
1. Testar a migration no ambiente local com `supabase db reset`
1. Revisar o `down` antes de aplicar o `up`
1. Aplicar com `supabase db push`
1. Verificar com `supabase migration list` que a migration aparece como aplicada
1. Testar o fluxo afetado manualmente antes de fazer deploy do código

-----

*Arquivo 04 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 05 — RLS, Policies e Segurança*
