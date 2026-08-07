-- ============================================================
-- LOGISTICA · 1/3 — Carga em cascata e veículo estruturado
-- Referência: docs/31-logistica-de-entrega.md §1 e §2
--
-- Cadastro de carga em CASCATA (decisão de produto):
--   produto (override) → categoria (default) → loja (item médio) → fallback
-- Loja de carga homogênea (açaí, pizzaria) cadastra o perfil UMA vez;
-- comércio de carga heterogênea (mercado, pet) detalha por produto.
--
-- O perfil da LOJA descreve o ITEM MÉDIO, não o pedido: o porte do pedido
-- continua vindo da soma dos itens × quantidades (calcular_perfil_carga_pedido).
--
-- Helpers RLS my_tenant_id() / is_admin() vêm de migration_006.
-- Idempotente.
-- ============================================================

-- ------------------------------------------------------------
-- 1. ENUMs
-- ------------------------------------------------------------

-- Porte da carga do pedido — dita quais veículos podem transportá-la (§2)
DO $$ BEGIN
  CREATE TYPE cargo_size AS ENUM ('P', 'M', 'G', 'XG');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Substitui o TEXT livre couriers.veiculo_tipo, que nunca influenciou nada
DO $$ BEGIN
  CREATE TYPE vehicle_type AS ENUM
    ('a_pe', 'bicicleta', 'moto', 'carro', 'utilitario');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------
-- 2. Nível LOJA — perfil do item médio (base da cascata)
--    Cadastrado uma única vez no onboarding. Cobre 100% do
--    cardápio de quem tem carga homogênea.
-- ------------------------------------------------------------

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS carga_item_peso_g    INTEGER
    CHECK (carga_item_peso_g IS NULL OR carga_item_peso_g BETWEEN 1 AND 300000),
  ADD COLUMN IF NOT EXISTS carga_item_volume_ml INTEGER
    CHECK (carga_item_volume_ml IS NULL OR carga_item_volume_ml BETWEEN 1 AND 500000),
  ADD COLUMN IF NOT EXISTS carga_refrigerada    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS carga_fragil         BOOLEAN NOT NULL DEFAULT false,
  -- Controla o formulário do dashboard: 'loja' esconde os campos de carga no
  -- cadastro de produto (alimentação); 'produto' os exibe (mercado, pet).
  -- Não é uma escolha do lojista — o segmento define, ver docs/31 §1.1.
  ADD COLUMN IF NOT EXISTS carga_modo           TEXT NOT NULL DEFAULT 'loja'
    CHECK (carga_modo IN ('loja', 'produto'));

COMMENT ON COLUMN stores.carga_item_peso_g IS
  'Peso do ITEM MEDIO da loja em gramas. Base da cascata de carga (docs/31 §1.1).';
COMMENT ON COLUMN stores.carga_modo IS
  'Deriva do segmento: loja=campos de carga escondidos no produto; produto=exibidos.';

-- ------------------------------------------------------------
-- 3. Nível CATEGORIA — defaults (NULL = herda da loja)
-- ------------------------------------------------------------

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS peso_g      INTEGER
    CHECK (peso_g IS NULL OR peso_g BETWEEN 1 AND 300000),
  ADD COLUMN IF NOT EXISTS volume_ml   INTEGER
    CHECK (volume_ml IS NULL OR volume_ml BETWEEN 1 AND 500000),
  ADD COLUMN IF NOT EXISTS refrigerado BOOLEAN,
  ADD COLUMN IF NOT EXISTS fragil      BOOLEAN;

-- ------------------------------------------------------------
-- 4. Nível PRODUTO — override (NULL = herda categoria/loja)
-- ------------------------------------------------------------

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS peso_g      INTEGER
    CHECK (peso_g IS NULL OR peso_g BETWEEN 1 AND 300000),
  ADD COLUMN IF NOT EXISTS volume_ml   INTEGER
    CHECK (volume_ml IS NULL OR volume_ml BETWEEN 1 AND 500000),
  ADD COLUMN IF NOT EXISTS refrigerado BOOLEAN,
  ADD COLUMN IF NOT EXISTS fragil      BOOLEAN;

COMMENT ON COLUMN products.peso_g IS
  'Override de carga. NULL = herda da categoria, depois da loja (docs/31 §1.1).';

-- ------------------------------------------------------------
-- 5. Entregador — veículo estruturado e capacidade
--    veiculo_tipo (TEXT livre) é preservado; a coluna nova é a
--    fonte da verdade do despacho.
-- ------------------------------------------------------------

ALTER TABLE couriers
  ADD COLUMN IF NOT EXISTS veiculo              vehicle_type,
  ADD COLUMN IF NOT EXISTS bag_termica          BOOLEAN NOT NULL DEFAULT false,
  -- Capacidade efetiva: NULL usa o default do modal (capacidade_do_veiculo).
  -- Preenchido quando o entregador declara baú/mochila extra.
  ADD COLUMN IF NOT EXISTS capacidade_peso_g    INTEGER
    CHECK (capacidade_peso_g IS NULL OR capacidade_peso_g > 0),
  ADD COLUMN IF NOT EXISTS capacidade_volume_ml INTEGER
    CHECK (capacidade_volume_ml IS NULL OR capacidade_volume_ml > 0),
  ADD COLUMN IF NOT EXISTS raio_max_km          NUMERIC(4,1)
    CHECK (raio_max_km IS NULL OR raio_max_km > 0),
  -- Score de despacho (§3.1): mantidos por gatilho ao responder ofertas
  ADD COLUMN IF NOT EXISTS taxa_aceitacao       NUMERIC(4,3) NOT NULL DEFAULT 1.0
    CHECK (taxa_aceitacao BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS avaliacao_media      NUMERIC(3,2)
    CHECK (avaliacao_media IS NULL OR avaliacao_media BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS ultima_entrega_em    TIMESTAMPTZ;

-- Backfill do TEXT livre para o ENUM (não sobrescreve o que já foi migrado)
UPDATE couriers SET veiculo = CASE lower(trim(veiculo_tipo))
    WHEN 'moto'       THEN 'moto'::vehicle_type
    WHEN 'motocicleta' THEN 'moto'::vehicle_type
    WHEN 'carro'      THEN 'carro'::vehicle_type
    WHEN 'bicicleta'  THEN 'bicicleta'::vehicle_type
    WHEN 'bike'       THEN 'bicicleta'::vehicle_type
    WHEN 'a_pe'       THEN 'a_pe'::vehicle_type
    WHEN 'a pé'       THEN 'a_pe'::vehicle_type
    WHEN 'utilitario' THEN 'utilitario'::vehicle_type
    ELSE 'moto'::vehicle_type   -- default seguro: modal mais comum da frota
  END
WHERE veiculo IS NULL AND veiculo_tipo IS NOT NULL;

-- Fila de despacho: candidatos elegíveis são varridos por (online, status)
CREATE INDEX IF NOT EXISTS idx_couriers_despacho
  ON couriers(veiculo, tenant_id)
  WHERE online = true AND status = 'aprovado';

-- ------------------------------------------------------------
-- 6. Pedido — perfil de carga consolidado + geo do destino
-- ------------------------------------------------------------

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS carga_porte       cargo_size,
  ADD COLUMN IF NOT EXISTS carga_peso_g      INTEGER,
  ADD COLUMN IF NOT EXISTS carga_volume_ml   INTEGER,
  ADD COLUMN IF NOT EXISTS carga_refrigerada BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS carga_fragil      BOOLEAN NOT NULL DEFAULT false,
  -- Alto valor: confirmação por código obrigatória, foto não basta (§1.3)
  ADD COLUMN IF NOT EXISTS carga_alto_valor  BOOLEAN NOT NULL DEFAULT false,
  -- Preenchido pelo lojista na separação; o entregador confere na coleta
  ADD COLUMN IF NOT EXISTS volumes           INTEGER NOT NULL DEFAULT 1
    CHECK (volumes >= 1),
  -- Geo desnormalizado de endereco_entrega (JSONB) para o matching.
  -- Pedido sem lat/lng nunca entra em agrupamento — vira entrega individual.
  ADD COLUMN IF NOT EXISTS entrega_lat       NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS entrega_lng       NUMERIC(10,7),
  -- geohash de 7 dígitos ≈ 153m × 153m: pré-filtro barato de vizinhança
  -- antes de calcular Haversine par a par (§4.2)
  ADD COLUMN IF NOT EXISTS entrega_geohash7  TEXT;

-- Busca de vizinhos agrupáveis: pedidos da mesma loja, aguardando despacho
CREATE INDEX IF NOT EXISTS idx_orders_agrupamento
  ON orders(store_id, entrega_geohash7)
  WHERE status IN ('em_preparo', 'aguardando_entregador');

-- ------------------------------------------------------------
-- 7. Capacidade e portes por modal (§2)
--    Fonte única da matriz de compatibilidade veículo × carga.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION capacidade_do_veiculo(v vehicle_type)
RETURNS TABLE (peso_g INTEGER, volume_ml INTEGER, raio_km NUMERIC, max_paradas SMALLINT)
LANGUAGE sql IMMUTABLE
AS $$
  -- Colunas qualificadas: os nomes do RETURNS TABLE são OUT params e
  -- colidiriam com o alias t se referenciados sem prefixo.
  SELECT t.peso_g, t.volume_ml, t.raio_km, t.max_paradas FROM (VALUES
    ('a_pe'::vehicle_type,        4000,   25000,  1.5::NUMERIC, 2::SMALLINT),
    ('bicicleta'::vehicle_type,   6000,   40000,  3.0::NUMERIC, 2::SMALLINT),
    ('moto'::vehicle_type,       12000,   60000, 10.0::NUMERIC, 3::SMALLINT),
    ('carro'::vehicle_type,      80000,  400000, 50.0::NUMERIC, 5::SMALLINT),
    ('utilitario'::vehicle_type, 300000, 2000000, 200.0::NUMERIC, 8::SMALLINT)
  ) AS t(veiculo, peso_g, volume_ml, raio_km, max_paradas)
  WHERE t.veiculo = v;
$$;

COMMENT ON FUNCTION capacidade_do_veiculo IS
  'Matriz veículo × capacidade (docs/31 §2). Fonte única — não duplicar no app.';

-- Portes que cada modal aceita. Deriva da capacidade de peso/volume acima,
-- mas é explícito para o despacho poder filtrar por porte sem aritmética.
CREATE OR REPLACE FUNCTION veiculo_aceita_porte(v vehicle_type, p cargo_size)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE v
    WHEN 'a_pe'       THEN p = 'P'
    WHEN 'bicicleta'  THEN p = 'P'
    WHEN 'moto'       THEN p IN ('P', 'M')
    WHEN 'carro'      THEN p IN ('P', 'M', 'G')
    WHEN 'utilitario' THEN true
  END;
$$;

-- ------------------------------------------------------------
-- 8. Resolução da cascata de carga por item
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION resolver_carga_item(p_product_id UUID, p_store_id UUID)
RETURNS TABLE (peso_g INTEGER, volume_ml INTEGER, refrigerado BOOLEAN, fragil BOOLEAN)
LANGUAGE sql STABLE
AS $$
  -- COALESCE percorre a cascata produto → categoria → loja → fallback.
  -- Fallback (800g / 1500ml) calibrado para o item típico de alimentação,
  -- segmento de maior volume na plataforma.
  SELECT
    COALESCE(p.peso_g,      c.peso_g,      s.carga_item_peso_g,    800),
    COALESCE(p.volume_ml,   c.volume_ml,   s.carga_item_volume_ml, 1500),
    COALESCE(p.refrigerado, c.refrigerado, s.carga_refrigerada,    false),
    COALESCE(p.fragil,      c.fragil,      s.carga_fragil,         false)
  FROM stores s
  -- LEFT JOIN: item de pedido pode ter product_id NULL (produto excluído
  -- depois da venda — order_items.product_id é ON DELETE SET NULL).
  -- Nesse caso a carga cai direto para o perfil da loja.
  LEFT JOIN products   p ON p.id = p_product_id
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE s.id = p_store_id;
$$;

COMMENT ON FUNCTION resolver_carga_item IS
  'Cascata de carga: produto → categoria → loja → fallback (docs/31 §1.1).';

-- ------------------------------------------------------------
-- 9. Geohash — pré-filtro de vizinhança sem PostGIS
--    Precisão 7 ≈ 153m × 153m. Estreita o candidato set antes do
--    Haversine (migration 3), que é quem dá a distância real.
--    Definido antes de calcular_perfil_carga_pedido, que o usa.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION geohash_encode(p_lat NUMERIC, p_lng NUMERIC, p_precisao INTEGER DEFAULT 7)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  base32   TEXT := '0123456789bcdefghjkmnpqrstuvwxyz';
  lat_min  NUMERIC := -90;  lat_max NUMERIC := 90;
  lng_min  NUMERIC := -180; lng_max NUMERIC := 180;
  is_lng   BOOLEAN := true;
  bit      INTEGER := 0;
  ch       INTEGER := 0;
  meio     NUMERIC;
  saida    TEXT := '';
BEGIN
  IF p_lat IS NULL OR p_lng IS NULL THEN RETURN NULL; END IF;

  WHILE length(saida) < p_precisao LOOP
    IF is_lng THEN
      meio := (lng_min + lng_max) / 2;
      IF p_lng > meio THEN ch := ch * 2 + 1; lng_min := meio;
      ELSE                 ch := ch * 2;     lng_max := meio;
      END IF;
    ELSE
      meio := (lat_min + lat_max) / 2;
      IF p_lat > meio THEN ch := ch * 2 + 1; lat_min := meio;
      ELSE                 ch := ch * 2;     lat_max := meio;
      END IF;
    END IF;

    is_lng := NOT is_lng;

    IF bit < 4 THEN
      bit := bit + 1;
    ELSE
      saida := saida || substr(base32, ch + 1, 1);
      bit := 0; ch := 0;
    END IF;
  END LOOP;

  RETURN saida;
END;
$$;

-- ------------------------------------------------------------
-- 10. Perfil de carga do pedido (soma dos itens × quantidades)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION calcular_perfil_carga_pedido(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_store_id   UUID;
  v_total      INTEGER;
  v_peso       INTEGER := 0;
  v_volume     INTEGER := 0;
  v_refrig     BOOLEAN := false;
  v_fragil     BOOLEAN := false;
  v_porte      cargo_size;
  v_lat        NUMERIC(10,7);
  v_lng        NUMERIC(10,7);
BEGIN
  SELECT o.store_id, o.total,
         NULLIF(o.endereco_entrega->>'latitude',  '')::NUMERIC,
         NULLIF(o.endereco_entrega->>'longitude', '')::NUMERIC
    INTO v_store_id, v_total, v_lat, v_lng
  FROM orders o WHERE o.id = p_order_id;

  IF v_store_id IS NULL THEN RETURN; END IF;

  -- Soma dos itens resolvendo a cascata item a item
  SELECT
    COALESCE(SUM(r.peso_g    * oi.quantidade), 0),
    COALESCE(SUM(r.volume_ml * oi.quantidade), 0),
    COALESCE(bool_or(r.refrigerado), false),
    COALESCE(bool_or(r.fragil),      false)
  INTO v_peso, v_volume, v_refrig, v_fragil
  FROM order_items oi
  CROSS JOIN LATERAL resolver_carga_item(oi.product_id, v_store_id) r
  WHERE oi.order_id = p_order_id;

  -- Porte: o limite mais restritivo entre peso e volume manda.
  -- Um pedido leve mas volumoso (salgadinhos) precisa de baú igual.
  v_porte := CASE
    WHEN v_peso <=  4000 AND v_volume <=  20000 THEN 'P'
    WHEN v_peso <= 10000 AND v_volume <=  45000 THEN 'M'
    WHEN v_peso <= 25000 AND v_volume <= 120000 THEN 'G'
    ELSE 'XG'
  END::cargo_size;

  UPDATE orders SET
    carga_porte       = v_porte,
    carga_peso_g      = v_peso,
    carga_volume_ml   = v_volume,
    carga_refrigerada = v_refrig,
    carga_fragil      = v_fragil,
    carga_alto_valor  = (v_total > 30000),   -- R$ 300,00 em centavos
    entrega_lat       = v_lat,
    entrega_lng       = v_lng,
    entrega_geohash7  = CASE
      WHEN v_lat IS NOT NULL AND v_lng IS NOT NULL
      THEN geohash_encode(v_lat, v_lng, 7)
      ELSE NULL
    END
  WHERE id = p_order_id;
END;
$$;

-- ------------------------------------------------------------
-- 11. Triggers — mantêm o perfil de carga fresco
--
--     Dois gatilhos porque o checkout insere o pedido ANTES dos
--     itens: no AFTER INSERT de orders a soma ainda é zero. O
--     trigger de order_items é quem produz o número real, e o de
--     orders garante recálculo na confirmação e na troca de endereço.
--
--     Sem recursão: calcular_perfil_carga_pedido só escreve nas
--     colunas carga_*/entrega_*, e o trigger de orders é UPDATE OF
--     status, endereco_entrega — colunas que ele nunca toca.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_orders_perfil_carga()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Recalcula na criação e na confirmação. Não recalcula depois de
  -- despachado: a rota já foi dimensionada com o perfil vigente.
  IF TG_OP = 'INSERT'
     OR (NEW.status IN ('confirmado', 'em_preparo') AND OLD.status = 'novo')
     OR NEW.endereco_entrega IS DISTINCT FROM OLD.endereco_entrega
  THEN
    PERFORM calcular_perfil_carga_pedido(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_perfil_carga ON orders;
CREATE TRIGGER orders_perfil_carga
  AFTER INSERT OR UPDATE OF status, endereco_entrega ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_orders_perfil_carga();

-- Statement-level com transition table: um recálculo por pedido mesmo
-- quando o checkout insere os N itens de uma vez (evita O(n²)).
CREATE OR REPLACE FUNCTION trg_order_items_perfil_carga()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT order_id FROM itens_alterados LOOP
    PERFORM calcular_perfil_carga_pedido(r.order_id);
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS order_items_perfil_carga_ins ON order_items;
CREATE TRIGGER order_items_perfil_carga_ins
  AFTER INSERT ON order_items
  REFERENCING NEW TABLE AS itens_alterados
  FOR EACH STATEMENT EXECUTE FUNCTION trg_order_items_perfil_carga();

DROP TRIGGER IF EXISTS order_items_perfil_carga_del ON order_items;
CREATE TRIGGER order_items_perfil_carga_del
  AFTER DELETE ON order_items
  REFERENCING OLD TABLE AS itens_alterados
  FOR EACH STATEMENT EXECUTE FUNCTION trg_order_items_perfil_carga();

-- ------------------------------------------------------------
-- 12. Backfill dos pedidos existentes
-- ------------------------------------------------------------

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM orders WHERE carga_porte IS NULL LOOP
    PERFORM calcular_perfil_carga_pedido(r.id);
  END LOOP;
END $$;

-- ============================================================
-- DOWN (referência — não executar em produção sem análise)
-- ============================================================
-- DROP TRIGGER IF EXISTS orders_perfil_carga ON orders;
-- DROP FUNCTION IF EXISTS trg_orders_perfil_carga, calcular_perfil_carga_pedido,
--   resolver_carga_item, geohash_encode, veiculo_aceita_porte, capacidade_do_veiculo;
-- ALTER TABLE orders DROP COLUMN IF EXISTS carga_porte, ...;
-- DROP TYPE IF EXISTS cargo_size, vehicle_type;
