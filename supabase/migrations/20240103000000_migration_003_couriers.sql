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
  status                courier_status NOT NULL DEFAULT 'pendente',
  online                BOOLEAN NOT NULL DEFAULT false,
  stripe_account_id     TEXT UNIQUE,
  stripe_onboarding_ok  BOOLEAN NOT NULL DEFAULT false,
  aprovado_em           TIMESTAMPTZ,
  aprovado_por          UUID REFERENCES auth.users(id),
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_couriers_user     ON couriers(user_id);
CREATE INDEX idx_couriers_tenant   ON couriers(tenant_id);
CREATE INDEX idx_couriers_status   ON couriers(status);
CREATE INDEX idx_couriers_online   ON couriers(online) WHERE online = true;
CREATE INDEX idx_couriers_stripe   ON couriers(stripe_account_id);

-- Tabela de atribuições de entrega
CREATE TABLE delivery_assignments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  courier_id          UUID NOT NULL REFERENCES couriers(id),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  status              delivery_status NOT NULL DEFAULT 'pendente',
  valor_entrega       INTEGER NOT NULL DEFAULT 0,
  aceito_em           TIMESTAMPTZ,
  coletado_em         TIMESTAMPTZ,
  entregue_em         TIMESTAMPTZ,
  cancelado_em        TIMESTAMPTZ,
  comprovante_url     TEXT,
  codigo_confirmacao  TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
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
