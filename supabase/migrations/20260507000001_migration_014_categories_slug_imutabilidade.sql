-- ============================================================
-- MIGRATION 014 (Templates · Fase 1) — categories.slug + RLS de
-- imutabilidade de stores.categoria_id + auditoria de troca
-- Referência: docs/dashboard-templates/03-modelo-dados-variacoes-modificadores.md
--             docs/dashboard-templates/07-categorias-e-pisos.md
-- ============================================================
--
-- Notas de adaptação ao schema existente:
--   • A doc usa o helper `current_tenant_id()`. No banco real o helper
--     é `my_tenant_id()` (definido em migration_006_rls_policies). Usamos
--     o que já existe.
--   • A doc menciona substituir a policy `stores_update_self`. No banco
--     real a policy de UPDATE é `stores_update_proprio` (idem migration_006).
--     Removemos ambos os nomes (DROP IF EXISTS) para defesa em profundidade
--     e recriamos com o nome canônico da doc (`stores_update_self`) já com
--     o WITH CHECK que bloqueia troca de categoria_id.
--   • Já existe um índice único parcial em categories(nome) WHERE
--     tenant_id IS NULL (migration_014_global_categories). Adicionamos
--     o equivalente para `slug`.
-- ============================================================

-- ── 1) Slug estável em categories ───────────────────────────
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Único apenas para categorias globais (tenant_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_global_slug
  ON categories(slug) WHERE tenant_id IS NULL;

COMMENT ON COLUMN categories.slug IS
  'Slug estável usado pelo mapeamento categoria→template em packages/lib/templates/mapping.ts. Único quando tenant_id IS NULL.';

-- ── 2) RLS: lojista não pode trocar categoria_id em auto-serviço ──
-- Substitui a policy atual de UPDATE de stores por uma versão que
-- bloqueia mudança em categoria_id. Admin tem policies separadas.
DROP POLICY IF EXISTS stores_update_self ON stores;
DROP POLICY IF EXISTS stores_update_proprio ON stores;

CREATE POLICY stores_update_self ON stores FOR UPDATE
  TO authenticated
  USING (tenant_id = my_tenant_id())
  WITH CHECK (
    tenant_id = my_tenant_id()
    AND categoria_id IS NOT DISTINCT FROM (
      SELECT categoria_id FROM stores AS s2 WHERE s2.id = stores.id
    )
  );

COMMENT ON POLICY stores_update_self ON stores IS
  'Lojista pode atualizar a própria store, exceto categoria_id (template é derivado da categoria — ver docs/dashboard-templates/02-arquitetura-templates.md). Troca de categoria é operação de super-admin.';

-- ── 3) Auditoria de troca de categoria via admin ────────────
CREATE TABLE IF NOT EXISTS store_categoria_changes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id            UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  categoria_anterior  UUID REFERENCES categories(id) ON DELETE SET NULL,
  categoria_nova      UUID NOT NULL REFERENCES categories(id),
  motivo              TEXT NOT NULL,
  changed_by          UUID NOT NULL REFERENCES auth.users(id),
  changed_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scc_store ON store_categoria_changes(store_id);
CREATE INDEX IF NOT EXISTS idx_scc_changed_at ON store_categoria_changes(changed_at DESC);

COMMENT ON TABLE store_categoria_changes IS
  'Histórico de troca de categoria de loja. Apenas super-admin pode alterar stores.categoria_id; cada mudança é registrada aqui com motivo.';

-- RLS: tabela de auditoria — apenas admin lê/escreve.
ALTER TABLE store_categoria_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY scc_select_admin ON store_categoria_changes FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY scc_insert_admin ON store_categoria_changes FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- ============================================================
-- ROLLBACK (não usar em produção sem confirmação):
--   DROP POLICY IF EXISTS scc_insert_admin ON store_categoria_changes;
--   DROP POLICY IF EXISTS scc_select_admin ON store_categoria_changes;
--   DROP TABLE IF EXISTS store_categoria_changes;
--   DROP POLICY IF EXISTS stores_update_self ON stores;
--   CREATE POLICY stores_update_proprio ON stores FOR UPDATE
--     TO authenticated
--     USING (tenant_id = my_tenant_id())
--     WITH CHECK (tenant_id = my_tenant_id());
--   DROP INDEX IF EXISTS uq_categories_global_slug;
--   ALTER TABLE categories DROP COLUMN IF EXISTS slug;
-- ============================================================
