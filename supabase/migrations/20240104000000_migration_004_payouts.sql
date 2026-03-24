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

-- Tabela de repasses
CREATE TABLE payouts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                TEXT NOT NULL CHECK (tipo IN ('lojista', 'entregador')),
  tenant_id           UUID REFERENCES tenants(id),
  courier_id          UUID REFERENCES couriers(id),
  valor_bruto         INTEGER NOT NULL,
  taxa_antecipacao    INTEGER NOT NULL DEFAULT 0,
  valor_liquido       INTEGER NOT NULL,
  total_pedidos       INTEGER NOT NULL DEFAULT 0,
  status              payout_status NOT NULL DEFAULT 'agendado',
  antecipado          BOOLEAN NOT NULL DEFAULT false,
  data_referencia     DATE NOT NULL,
  data_prevista       DATE NOT NULL,
  stripe_transfer_id  TEXT UNIQUE,
  erro_mensagem       TEXT,
  processado_em       TIMESTAMPTZ,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payouts_owner CHECK (
    (tenant_id IS NOT NULL AND courier_id IS NULL) OR
    (tenant_id IS NULL AND courier_id IS NOT NULL)
  )
);

CREATE INDEX idx_payouts_tenant        ON payouts(tenant_id);
CREATE INDEX idx_payouts_courier       ON payouts(courier_id);
CREATE INDEX idx_payouts_status        ON payouts(status);
CREATE INDEX idx_payouts_data_prevista ON payouts(data_prevista);

-- Tabela de solicitações de antecipação
CREATE TABLE payout_advance_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payout_id       UUID REFERENCES payouts(id),
  total_pedidos   INTEGER NOT NULL,
  taxa_total      INTEGER NOT NULL,
  valor_estimado  INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente', 'aprovada', 'rejeitada', 'executada')),
  solicitado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  processado_em   TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
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
