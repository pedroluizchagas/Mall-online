-- ============================================================
-- PARTNER APP · Stage 0 (1/4) — Tabela store_posts
-- Referência: docs/partner-app/02-stage-0-backend.md §1
--
-- Fundação do Explorar: posts de mídia das lojas (fotos e vídeos
-- estilo Reels) publicados pelo lojista via apps/mobile-partner.
-- O Explorar do consumer era 100% mock; esta é a tabela canônica.
-- Helpers RLS my_tenant_id() / is_admin() vêm de migration_006.
-- Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS store_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES stores(id)   ON DELETE CASCADE,
  -- Denormalizado p/ policy RLS (my_tenant_id) e índice de gestão;
  -- a fonte de verdade de "a qual loja pertence" é store_id.
  tenant_id     UUID NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id)          ON DELETE SET NULL,

  tipo          TEXT NOT NULL DEFAULT 'video'
                  CHECK (tipo IN ('video','foto')),

  -- Fonte da verdade da mídia: {tenant_id}/{store_id}/{uuid}.(mp4|jpg)
  media_path    TEXT NOT NULL,
  media_url     TEXT NOT NULL,            -- URL pública derivada (conveniência)
  thumb_path    TEXT,                     -- foto: pode apontar pra própria imagem
  thumb_url     TEXT,

  descricao     TEXT CHECK (length(descricao) <= 600),
  tags          TEXT[] NOT NULL DEFAULT '{}',

  status        TEXT NOT NULL DEFAULT 'processing'
                  CHECK (status IN ('processing','published','hidden','removed')),
  -- Default 'approved': publica na hora, modera por exceção (flag no Admin).
  -- Decisão registrada em docs/partner-app/13-workflow-tech-lead.md.
  moderacao     TEXT NOT NULL DEFAULT 'approved'
                  CHECK (moderacao IN ('pending','approved','flagged','rejected')),

  duracao_seg   INT  CHECK (duracao_seg IS NULL OR duracao_seg BETWEEN 1 AND 120),
  largura       INT,
  altura        INT,
  bytes         BIGINT,

  -- Métricas: quem incrementa é o consumer (Stage 9), nunca o Partner App.
  curtidas      INT NOT NULL DEFAULT 0,
  comentarios   INT NOT NULL DEFAULT 0,
  views         INT NOT NULL DEFAULT 0,

  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  publicado_em  TIMESTAMPTZ,

  -- Vídeo tem duração; foto não.
  CONSTRAINT store_posts_duracao_coerente
    CHECK (tipo <> 'foto' OR duracao_seg IS NULL)
);

-- Feed público: loja -> posts publicados, mais novos primeiro
CREATE INDEX IF NOT EXISTS idx_store_posts_feed
  ON store_posts(store_id, publicado_em DESC)
  WHERE status = 'published' AND moderacao = 'approved';

-- Gestão no Partner App: tudo do tenant, mais novos primeiro
CREATE INDEX IF NOT EXISTS idx_store_posts_tenant
  ON store_posts(tenant_id, criado_em DESC);

-- Fila de moderação no Admin
CREATE INDEX IF NOT EXISTS idx_store_posts_moderacao
  ON store_posts(moderacao) WHERE moderacao IN ('pending','flagged');

ALTER TABLE store_posts ENABLE ROW LEVEL SECURITY;

-- Lojista lê/gerencia só os posts do próprio tenant.
-- anon NÃO tem policy: o consumer lê apenas a view public_explore_feed (4/4).
DROP POLICY IF EXISTS store_posts_select_proprio ON store_posts;
CREATE POLICY store_posts_select_proprio ON store_posts
  FOR SELECT TO authenticated USING (tenant_id = my_tenant_id());

DROP POLICY IF EXISTS store_posts_insert_proprio ON store_posts;
CREATE POLICY store_posts_insert_proprio ON store_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = my_tenant_id()
    AND store_id IN (SELECT id FROM stores WHERE tenant_id = my_tenant_id())
  );

DROP POLICY IF EXISTS store_posts_update_proprio ON store_posts;
CREATE POLICY store_posts_update_proprio ON store_posts
  FOR UPDATE TO authenticated
  USING (tenant_id = my_tenant_id())
  WITH CHECK (tenant_id = my_tenant_id());

DROP POLICY IF EXISTS store_posts_delete_proprio ON store_posts;
CREATE POLICY store_posts_delete_proprio ON store_posts
  FOR DELETE TO authenticated USING (tenant_id = my_tenant_id());

-- Admin da plataforma: moderação/gestão completa
DROP POLICY IF EXISTS store_posts_admin ON store_posts;
CREATE POLICY store_posts_admin ON store_posts
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
