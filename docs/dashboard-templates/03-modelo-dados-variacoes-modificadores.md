# 03 — Modelo de Dados: Variações, Modificadores e Templates

### Schema SQL completo, migrations, integridade e migração de estoque

*Versão 1.0 — 07/05/2026*

---

## OBJETIVO

Especificar **todas as alterações de schema** necessárias para suportar:

1. **Slug estável em `categories`** (base do mapeamento categoria→template — ver `07`)
2. **RLS de imutabilidade** da `categoria_id` para auto-serviço
3. **Auditoria** de troca de categoria via admin (`store_categoria_changes`)
4. Variações reais de produto (SKUs por combinação de opções)
5. Modificadores (personalizações que não viram SKU)
6. Migração do estoque para nível de variant
7. Campos extras por nicho (lote/validade, ANVISA, garantia, etc.)

**Princípios:**
- Migrations **aditivas** — nada é destruído nem renomeado.
- Lojistas atuais continuam funcionando sem mudar nenhuma linha.
- **Não existe coluna `stores.template_codigo`** — template é derivado de `categories.slug` em código (ver `02-arquitetura-templates.md`).
- Novas tabelas seguem o padrão do schema atual (UUID, `tenant_id`, `created_at`, RLS por tenant).

---

## VISÃO GERAL DAS NOVAS TABELAS

```
┌──────────────────┐
│   categories     │
│   + slug          │  ← UNIQUE para categorias globais
└──────────────────┘
         ▲
         │ FK (já existe)
┌────────┴─────────┐
│     stores       │
│  (categoria_id   │  ← RLS impede UPDATE em auto-serviço
│   imutável)      │
└────────┬─────────┘
         │
┌────────▼─────────┐
│    products      │  (já existe — alterado: campos viram opcionais quando há variants)
└─────┬───────────┬┘
      │           │
      │           │  ┌──────────────────────────┐
      │           └──►  product_option_groups   │  ex: "Tamanho", "Cor"
      │              │   (id, product_id, nome)  │
      │              └──────────────────────────┘
      │                          │
      │                          ▼
      │              ┌──────────────────────────┐
      │              │   product_options         │  ex: "P", "M", "G", "Verde", "Preto"
      │              │   (id, group_id, valor)   │
      │              └──────────────────────────┘
      │
      ├─►┌──────────────────────────────────┐
      │  │     product_variants              │  ← um SKU real
      │  │  (id, product_id, sku, preco,    │
      │  │   estoque, foto_url, disponivel) │
      │  └──────────────┬───────────────────┘
      │                 │
      │                 ▼
      │  ┌──────────────────────────────────┐
      │  │   product_variant_options         │  ← join table: variant ↔ options
      │  │   (variant_id, option_id)         │
      │  └──────────────────────────────────┘
      │
      ├─►┌──────────────────────────────────┐
      │  │  product_modifier_groups          │  ex: "Adicionais", "Ponto da carne"
      │  │  (id, product_id, nome,           │
      │  │   min_select, max_select,         │
      │  │   obrigatorio)                    │
      │  └──────────────┬───────────────────┘
      │                 │
      │                 ▼
      │  ┌──────────────────────────────────┐
      │  │   product_modifiers               │  ex: "Bacon (+R$4)"
      │  │   (id, group_id, nome, preco,    │
      │  │    disponivel)                    │
      │  └──────────────────────────────────┘
      │
      └─►┌──────────────────────────────────┐
         │  product_lotes                    │  ← farmácia (Fase 5)
         │  (id, product_id, lote, validade,│
         │   quantidade)                     │
         └──────────────────────────────────┘

order_items  ← alterado: passa a ter variant_id (nullable) e modifiers (JSONB)
```

---

## MIGRATION 014 — `categories.slug` + RLS de imutabilidade

```sql
-- supabase/migrations/20260507000001_migration_014_categories_slug_imutabilidade.sql

-- 1) Slug estável em categories (base do mapeamento categoria→template)
ALTER TABLE categories ADD COLUMN slug TEXT;

-- 2) Unique apenas para categorias globais (tenant_id IS NULL)
CREATE UNIQUE INDEX uq_categories_global_slug
  ON categories(slug) WHERE tenant_id IS NULL;

-- 3) RLS: lojista não pode trocar categoria_id em auto-serviço
DROP POLICY IF EXISTS stores_update_self ON stores;

CREATE POLICY stores_update_self ON stores FOR UPDATE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND categoria_id IS NOT DISTINCT FROM (
      SELECT categoria_id FROM stores AS s2 WHERE s2.id = stores.id
    )
  );
-- Admin tem policy separada (ver migration_008 e migration_006)

-- 4) Auditoria de troca de categoria via admin
CREATE TABLE store_categoria_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  categoria_anterior UUID,
  categoria_nova UUID NOT NULL,
  motivo TEXT NOT NULL,
  changed_by UUID NOT NULL,                                     -- admin user_id
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_scc_store ON store_categoria_changes(store_id);

COMMENT ON COLUMN categories.slug IS
  'Slug estável usado pelo mapeamento categoria→template em packages/lib/templates/mapping.ts.';
COMMENT ON TABLE store_categoria_changes IS
  'Histórico de troca de categoria de loja. Apenas super-admin pode alterar categoria_id de stores.';
```

**Decisões:**
- **Não há coluna `stores.template_codigo`.** Template é derivado em código a partir de `categories.slug` (ver `02-arquitetura-templates.md`).
- Slug é o **único campo estável** entre seed e código — nome pode mudar, slug não.
- RLS bloqueia UPDATE de `categoria_id` para `tenant_user`; admin tem policy permissiva separada.
- Tabela de auditoria preserva o histórico de toda troca administrativa.

**Backfill obrigatório do seed:**

Após aplicar a migration, rodar `apps/web/seed-categories.js` (versão reescrita com 20 itens — ver `07`). O seed é idempotente: faz `INSERT ... ON CONFLICT (slug) DO UPDATE` para nome e ícone.

---

## MIGRATION 015 — Variações de produto

```sql
-- supabase/migrations/20260507000002_migration_015_product_variants.sql

-- ── Grupo de opções (ex: "Tamanho") ──────────────────────────
CREATE TABLE product_option_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  nome TEXT NOT NULL,                  -- "Tamanho", "Cor", "Sabor", "Porte"
  ordem SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, nome)
);
CREATE INDEX idx_pog_product ON product_option_groups(product_id);

-- ── Valor de uma opção (ex: "M", "Preto") ───────────────────
CREATE TABLE product_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES product_option_groups(id) ON DELETE CASCADE,
  valor TEXT NOT NULL,                 -- "M", "Preto", "1kg"
  hex_color TEXT,                      -- opcional, para opção do tipo cor
  ordem SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, valor)
);
CREATE INDEX idx_po_group ON product_options(group_id);

-- ── Variant = combinação de opções = SKU real ───────────────
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  sku TEXT,                            -- código interno opcional
  preco INTEGER NOT NULL,              -- centavos (consistente com products.preco)
  preco_promocional INTEGER,
  stock_quantity INTEGER,              -- NULL se não rastreia
  stock_minimo INTEGER DEFAULT 0,
  foto_url TEXT,                       -- foto específica desta variação
  disponivel BOOLEAN NOT NULL DEFAULT true,
  ordem SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pv_product ON product_variants(product_id);
CREATE INDEX idx_pv_tenant ON product_variants(tenant_id);
CREATE UNIQUE INDEX uq_pv_sku_per_tenant
  ON product_variants(tenant_id, sku) WHERE sku IS NOT NULL;

-- ── Join: variant ↔ options selecionadas ────────────────────
CREATE TABLE product_variant_options (
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES product_options(id) ON DELETE RESTRICT,
  PRIMARY KEY (variant_id, option_id)
);
CREATE INDEX idx_pvo_option ON product_variant_options(option_id);

-- ── Trigger: garante que cada variant tenha exatamente 1 option de cada group do produto ──
-- (lógica complexa: ver função no final)
```

### Constraint de integridade da grade

Cada `product_variant` precisa ter **exatamente uma option de cada group do produto**. Ex: se o produto tem 2 grupos (Tamanho, Cor), cada variant tem que ter 1 tamanho + 1 cor — não pode ter 2 cores nem faltar tamanho.

```sql
CREATE OR REPLACE FUNCTION validate_variant_options()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_groups_count INT;
  v_variant_options_count INT;
BEGIN
  SELECT product_id INTO v_product_id FROM product_variants WHERE id = NEW.variant_id;

  SELECT COUNT(*) INTO v_groups_count
  FROM product_option_groups
  WHERE product_id = v_product_id;

  SELECT COUNT(DISTINCT pog.id) INTO v_variant_options_count
  FROM product_variant_options pvo
  JOIN product_options po ON po.id = pvo.option_id
  JOIN product_option_groups pog ON pog.id = po.group_id
  WHERE pvo.variant_id = NEW.variant_id AND pog.product_id = v_product_id;

  IF v_variant_options_count > v_groups_count THEN
    RAISE EXCEPTION 'Variant cobre mais grupos do que o produto tem';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_variant_options
  AFTER INSERT OR UPDATE ON product_variant_options
  FOR EACH ROW EXECUTE FUNCTION validate_variant_options();
```

> A validação de **completude** (cada variant tem 1 opção de cada grupo) é feita na **camada de aplicação** (server action `criarProdutoComVariacoes`) porque exige conhecer o estado final, não incremental. O trigger acima impede o pior caso (excesso/duplicação).

---

## MIGRATION 016 — Modificadores

```sql
-- supabase/migrations/20260507000003_migration_016_product_modifiers.sql

CREATE TABLE product_modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  nome TEXT NOT NULL,                  -- "Ponto da carne", "Adicionais"
  min_select SMALLINT NOT NULL DEFAULT 0,
  max_select SMALLINT NOT NULL DEFAULT 1,
  obrigatorio BOOLEAN GENERATED ALWAYS AS (min_select > 0) STORED,
  ordem SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (max_select >= min_select),
  CHECK (min_select >= 0)
);
CREATE INDEX idx_pmg_product ON product_modifier_groups(product_id);

CREATE TABLE product_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES product_modifier_groups(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,                  -- "Bacon", "Ao ponto"
  preco_extra INTEGER NOT NULL DEFAULT 0,    -- centavos, pode ser 0
  disponivel BOOLEAN NOT NULL DEFAULT true,
  ordem SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pm_group ON product_modifiers(group_id);

COMMENT ON TABLE product_modifier_groups IS
  'Grupo de personalizações que NÃO viram SKU. Ex: ponto da carne, adicionais.';
COMMENT ON TABLE product_modifiers IS
  'Item individual dentro de um grupo de modificador. preco_extra é somado ao produto.';
```

### Diferença conceitual: variation vs modifier

| | **Variation (SKU)** | **Modifier** |
|---|---|---|
| Cria SKU separado? | Sim | Não |
| Tem estoque próprio? | Sim | Não |
| Pode ter foto? | Sim | Não |
| Muda preço? | Sim (preço próprio) | Soma extra |
| Exemplo | Camiseta M Preto | Bacon adicional |

Lojistas de `food` usam só modifiers. `fashion` usa só variations. `pet` pode usar variations (porte) **e** modifiers (ração com adicional de petisco). O sistema permite ambos no mesmo produto (compatível).

---

## MIGRATION 017 — order_items: variant_id e modifiers

```sql
-- supabase/migrations/20260507000004_migration_017_order_items_variants.sql

ALTER TABLE order_items
  ADD COLUMN variant_id UUID REFERENCES product_variants(id),
  ADD COLUMN modifiers JSONB;          -- array de {modifier_id, nome, preco_extra}

CREATE INDEX idx_oi_variant ON order_items(variant_id) WHERE variant_id IS NOT NULL;

COMMENT ON COLUMN order_items.variant_id IS
  'NULL para produtos sem variação. Referência preservada para histórico/devolução.';
COMMENT ON COLUMN order_items.modifiers IS
  'Snapshot dos modificadores selecionados no momento da compra. JSONB para preservar mesmo se modifier for deletado.';
```

**Por que JSONB para modifiers e FK para variant?**
- `variant_id` precisa de integridade referencial para estoque e relatórios.
- `modifiers` é texto livre (snapshot) — se lojista deletar o modificador "bacon", o pedido antigo ainda mostra o que foi pedido.

Exemplo de `order_items.modifiers`:

```json
[
  {"modifier_id": "uuid-1", "nome": "Bacon", "preco_extra": 400},
  {"modifier_id": "uuid-2", "nome": "Ao ponto", "preco_extra": 0}
]
```

O `preco_total` do `order_item` continua sendo calculado: `preco_unitario_variant + soma(modifiers.preco_extra)` × quantidade.

---

## MIGRATION 018 — Migração de estoque para variant

A tabela `stock_movements` (criada em `migration_005`) hoje aponta para `product_id`. Vamos estender para suportar `variant_id` opcional:

```sql
-- supabase/migrations/20260507000005_migration_018_stock_movements_variants.sql

ALTER TABLE stock_movements
  ADD COLUMN variant_id UUID REFERENCES product_variants(id);

CREATE INDEX idx_sm_variant ON stock_movements(variant_id) WHERE variant_id IS NOT NULL;

-- Atualizar trigger de decremento de estoque (migration_012) para suportar variant
CREATE OR REPLACE FUNCTION decrement_stock_on_order_confirm()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
BEGIN
  FOR item IN
    SELECT product_id, variant_id, quantidade
    FROM order_items
    WHERE order_id = NEW.id
  LOOP
    IF item.variant_id IS NOT NULL THEN
      UPDATE product_variants
      SET stock_quantity = stock_quantity - item.quantidade
      WHERE id = item.variant_id AND stock_quantity IS NOT NULL;

      INSERT INTO stock_movements (product_id, variant_id, tipo, quantidade, ref_order_id, tenant_id)
      VALUES (item.product_id, item.variant_id, 'saida_pedido', -item.quantidade, NEW.id, NEW.tenant_id);
    ELSE
      -- comportamento legado: produto sem variação
      UPDATE products
      SET stock_quantity = stock_quantity - item.quantidade
      WHERE id = item.product_id AND track_stock = true;

      INSERT INTO stock_movements (product_id, tipo, quantidade, ref_order_id, tenant_id)
      VALUES (item.product_id, 'saida_pedido', -item.quantidade, NEW.id, NEW.tenant_id);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Disponibilidade automática:**

```sql
CREATE OR REPLACE FUNCTION update_variant_disponivel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_quantity IS NOT NULL AND NEW.stock_quantity <= 0 THEN
    NEW.disponivel := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_variant_disponivel
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_variant_disponivel();
```

---

## MIGRATION 019 — Campos extras por nicho (pharmacy)

```sql
-- supabase/migrations/20260507000006_migration_019_pharmacy_lotes.sql

-- Pode ser feito mais tarde (Fase 5)
CREATE TABLE product_lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  numero_lote TEXT NOT NULL,
  validade DATE NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, variant_id, numero_lote)
);
CREATE INDEX idx_pl_validade ON product_lotes(validade);
CREATE INDEX idx_pl_tenant ON product_lotes(tenant_id);

-- Campos farmácia em products (não criar tabela separada; opt-in por template)
ALTER TABLE products
  ADD COLUMN registro_anvisa TEXT,
  ADD COLUMN principio_ativo TEXT,
  ADD COLUMN exige_receita BOOLEAN DEFAULT false,
  ADD COLUMN categoria_regulatoria TEXT;        -- 'mip', 'lista_b', 'lista_c', 'lista_a'
```

> Apenas template `pharmacy` lê esses campos. Outros templates ignoram. Espaço em disco é desprezível.

---

## RLS — POLICIES (resumo)

Todas as novas tabelas seguem o padrão tenant-scoped já documentado em `docs/05-rls-policies-seguranca.md`:

```sql
-- Padrão para cada tabela nova
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY pv_select_tenant ON product_variants FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY pv_insert_tenant ON product_variants FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY pv_update_tenant ON product_variants FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY pv_delete_tenant ON product_variants FOR DELETE
  USING (tenant_id = current_tenant_id());

-- Public read (consumer app) — SELECT só de produtos disponíveis
CREATE POLICY pv_select_public ON product_variants FOR SELECT
  USING (disponivel = true AND product_id IN (
    SELECT id FROM products WHERE disponivel = true
  ));
```

Igual padrão para `product_option_groups`, `product_options`, `product_modifier_groups`, `product_modifiers`, `product_variant_options`, `product_lotes`.

---

## INTEGRIDADE COM PLANO

O contador de produtos do plano (`plans.max_produtos`) hoje conta `products`. Após variants, **conta variants quando há, e produto quando não há variants** (cada SKU vendável conta 1):

```sql
CREATE OR REPLACE FUNCTION count_skus_by_tenant(p_tenant UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(c), 0) FROM (
    SELECT 1 AS c FROM products p
      WHERE p.tenant_id = p_tenant
        AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id)
    UNION ALL
    SELECT 1 FROM product_variants v WHERE v.tenant_id = p_tenant
  ) sub;
$$ LANGUAGE sql STABLE;
```

E o gate do plano usa essa função em vez de `COUNT(products)`.

---

## ROLLBACK SAFETY

Cada migration tem `DROP IF EXISTS` reverso comentado no rodapé:

```sql
-- ROLLBACK (não usar em produção sem confirmação):
-- DROP TABLE product_variant_options;
-- DROP TABLE product_variants;
-- DROP TABLE product_options;
-- DROP TABLE product_option_groups;
```

Migrations 014 (RLS de stores) e 017 (order_items.variant_id) são **as mais sensíveis** — alteram comportamento de tabelas com dados de produção. As demais criam tabelas novas sem dados.

**Atenção em 014:** a policy `stores_update_self` é substituída. Se houver código no app/edge functions que **dependa** de fazer UPDATE em `categoria_id` via tenant_user, esse código precisa migrar para via super-admin (rota admin separada). Auditar antes de aplicar.

---

## RESUMO DAS NOVAS TABELAS

| Tabela | Função | Tenant-scoped | Indexada por |
|--------|--------|:-:|---|
| `store_categoria_changes` | Auditoria de troca de categoria via admin | ❌ (global) | store_id |
| `product_option_groups` | "Tamanho", "Cor" | ✅ | product_id |
| `product_options` | "M", "Preto" | ✅ | group_id |
| `product_variants` | SKU real | ✅ | product_id, tenant_id |
| `product_variant_options` | Join | ✅ (via FK) | variant_id, option_id |
| `product_modifier_groups` | "Adicionais" | ✅ | product_id |
| `product_modifiers` | "Bacon (+R$4)" | ✅ (via group) | group_id |
| `product_lotes` | Lote/validade farmácia | ✅ | product_id, validade |

**Colunas adicionadas:**
- `categories.slug` (TEXT, UNIQUE para tenant_id IS NULL)
- `order_items.variant_id` (UUID nullable)
- `order_items.modifiers` (JSONB)
- `stock_movements.variant_id` (UUID nullable)
- `products.registro_anvisa`, `products.principio_ativo`, `products.exige_receita`, `products.categoria_regulatoria` (todas nullable)

**RLS alterado:**
- `stores` — UPDATE pelo lojista bloqueia `categoria_id` (imutável em auto-serviço).

---

## ORDEM DE APLICAÇÃO

```
014 → categories.slug + RLS imutabilidade + store_categoria_changes
      [+ rodar seed-categories.js com 20 categorias]
015 → product_variants (e dependências)
016 → product_modifiers
017 → order_items aceita variant + modifiers
018 → stock_movements e trigger por variant
019 → pharmacy: lotes + campos ANVISA (Fase 5, pode ficar para depois)
```

Cada migration roda independente. **014 é pré-requisito para começar a usar templates** (sem slug, mapeamento não funciona); 015-018 destravam fashion; 019 destrava pharmacy.

**Ordem dentro da Fase 1:**
1. Aplicar migration 014.
2. Rodar `apps/web/seed-categories.js` reescrito (20 categorias, idempotente).
3. Aplicar migrations 015-018.
4. Codificar `mapping.ts`, `registry.ts`, `pisos.ts` em `packages/lib`.

---

> **Próximo:** `04-templates-por-nicho.md` traz o detalhe da especificação de cada template (campos, validações, copy).
