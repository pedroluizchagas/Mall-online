# Stage 0 — Backend do Explorar (BLOQUEANTE)

> Nada de UI antes deste stage fechar e mergear. O app não tem pra onde
> publicar enquanto a tabela, o bucket e a view não existirem. Este stage
> também publica o **contrato de dado** que o Stage 5 vai consumir sem
> renegociar.

## Entregáveis

1. Migration `store_videos` (tabela + índices + RLS).
2. Migration bucket `explore-videos` + policies de Storage.
3. Migration trigger de limite por plano (espelha o padrão de `stores`).
4. View `public_explore_feed` exposta a `anon`.
5. Tipos regenerados em `@mallevo/types`.
6. Contrato documentado (`Reel` ↔ `public_explore_feed`).

Convenções obrigatórias (já vigentes no repo): nome de arquivo
`YYYYMMDDHHMMSS_<descricao>.sql`, comentários em PT, `IF NOT EXISTS`, helpers
`my_tenant_id()` / `is_admin()` de `migration_006`, `ON CONFLICT DO NOTHING`
em seed/bucket.

## 1. Tabela `store_videos`

`supabase/migrations/<ts>_partner_01_store_videos.sql`:

```sql
-- ============================================================
-- Partner App PR 0 — Fundação do Explorar (vídeos das lojas)
-- Helpers RLS my_tenant_id() / is_admin() vêm de migration_006.
-- O Explorar do consumer era 100% mock; esta é a tabela canônica.
-- ============================================================

CREATE TABLE IF NOT EXISTS store_videos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES stores(id)   ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE, -- denormalizado p/ RLS+índice
  product_id    UUID REFERENCES products(id)          ON DELETE SET NULL,

  storage_path  TEXT NOT NULL,            -- fonte da verdade: {tenant_id}/{store_id}/{uuid}.mp4
  video_url     TEXT NOT NULL,            -- URL pública derivada (conveniência de leitura)
  thumb_path    TEXT,
  thumb_url     TEXT,

  descricao     TEXT CHECK (length(descricao) <= 600),
  tags          TEXT[] NOT NULL DEFAULT '{}',

  status        TEXT NOT NULL DEFAULT 'processing'
                  CHECK (status IN ('processing','published','hidden','removed')),
  moderacao     TEXT NOT NULL DEFAULT 'approved'
                  CHECK (moderacao IN ('pending','approved','flagged','rejected')),

  duracao_seg   INT  CHECK (duracao_seg IS NULL OR duracao_seg BETWEEN 1 AND 120),
  largura       INT,
  altura        INT,
  bytes         BIGINT,

  curtidas      INT NOT NULL DEFAULT 0,
  comentarios   INT NOT NULL DEFAULT 0,
  views         INT NOT NULL DEFAULT 0,

  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  publicado_em  TIMESTAMPTZ
);

-- Feed público: loja -> vídeos publicados, mais novos primeiro
CREATE INDEX IF NOT EXISTS idx_store_videos_feed
  ON store_videos(store_id, publicado_em DESC)
  WHERE status = 'published' AND moderacao = 'approved';

-- Gestão no Partner App: tudo do tenant, mais novos primeiro
CREATE INDEX IF NOT EXISTS idx_store_videos_tenant
  ON store_videos(tenant_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_store_videos_moderacao
  ON store_videos(moderacao) WHERE moderacao IN ('pending','flagged');

ALTER TABLE store_videos ENABLE ROW LEVEL SECURITY;

-- Lojista lê/gerencia só os vídeos do próprio tenant
CREATE POLICY store_videos_select_proprio ON store_videos
  FOR SELECT TO authenticated USING (tenant_id = my_tenant_id());

CREATE POLICY store_videos_insert_proprio ON store_videos
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = my_tenant_id()
    AND store_id IN (SELECT id FROM stores WHERE tenant_id = my_tenant_id())
  );

CREATE POLICY store_videos_update_proprio ON store_videos
  FOR UPDATE TO authenticated
  USING (tenant_id = my_tenant_id())
  WITH CHECK (tenant_id = my_tenant_id());

CREATE POLICY store_videos_delete_proprio ON store_videos
  FOR DELETE TO authenticated USING (tenant_id = my_tenant_id());

CREATE POLICY store_videos_admin ON store_videos
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
```

> **Decisão a fechar pelo tech lead antes de mergear:** `moderacao` default
> `approved` (publica na hora, modera por exceção) vs `pending` (fila de
> aprovação no Admin). O DDL acima assume `approved` (coerente com
> "praticidade"); trocar o `DEFAULT` é a única mudança se a decisão for fila.

## 2. Bucket `explore-videos`

`supabase/migrations/<ts>_partner_02_explore_videos_bucket.sql` — mesma
mecânica de `store-assets` (`(storage.foldername(name))[1] = my_tenant_id()`),
mas prefixo de 2 níveis `{tenant_id}/{store_id}/`:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('explore-videos','explore-videos', true,
        52428800,  -- 50 MB hard cap (compressão client fica bem abaixo)
        ARRAY['video/mp4','video/quicktime','image/jpeg','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY explore_videos_insert_proprio
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'explore-videos'
    AND (storage.foldername(name))[1] = my_tenant_id()::text
  );

CREATE POLICY explore_videos_update_proprio
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'explore-videos'
         AND (storage.foldername(name))[1] = my_tenant_id()::text)
  WITH CHECK (bucket_id = 'explore-videos'
         AND (storage.foldername(name))[1] = my_tenant_id()::text);

CREATE POLICY explore_videos_delete_proprio
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'explore-videos'
         AND (storage.foldername(name))[1] = my_tenant_id()::text);

CREATE POLICY explore_videos_select_publico
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'explore-videos');
```

## 3. Limite por plano (trigger)

`stores` já limita criação por trigger no INSERT (ver
`docs/03-schema-completo-de-banco-de-dados.md` §stores: "Esse limite é
verificado via trigger"). Espelhar para `store_videos`: função
`check_store_videos_limit()` que conta vídeos `status <> 'removed'` do tenant e
compara com um teto do plano (`plans.max_videos`, nova coluna nullable; `NULL`
= ilimitado). Migration adiciona a coluna em `plans` + seed, a função e o
trigger `BEFORE INSERT`. Sem teto definido, o trigger é no-op (não bloqueia o
MVP), mas o gancho já fica pronto e centralizado no banco — Partner App nunca
checa limite no cliente.

## 4. View pública `public_explore_feed`

Mesma decisão #4 do storefront: `anon` **não** toca `store_videos`. Lê uma
view que já entrega exatamente o `interface Reel` do consumer:

`supabase/migrations/<ts>_partner_03_public_explore_feed.sql`:

```sql
CREATE OR REPLACE VIEW public_explore_feed
WITH (security_invoker = false) AS
SELECT
  v.id,
  s.slug                              AS loja_slug,
  s.nome                              AS loja_nome,
  upper(left(s.nome, 1))              AS loja_inicial,
  v.video_url,
  v.thumb_url,
  COALESCE(v.descricao, '')           AS descricao,
  v.tags,
  v.curtidas,
  v.comentarios,
  v.views,
  v.publicado_em,
  CASE WHEN p.id IS NOT NULL
       THEN jsonb_build_object('id', p.id, 'nome', p.nome, 'preco', p.preco)
  END                                 AS produto
FROM store_videos v
JOIN stores   s ON s.id = v.store_id AND s.ativo = true
LEFT JOIN products p ON p.id = v.product_id
WHERE v.status = 'published' AND v.moderacao = 'approved'
ORDER BY v.publicado_em DESC;

GRANT SELECT ON public_explore_feed TO anon, authenticated;
```

> `security_invoker = false` (view roda como owner) é o que permite `anon` ler
> só as colunas seguras sem abrir a tabela base — RLS é row-level, view protege
> coluna. Idêntico ao raciocínio de `public_catalog_*` do storefront.
> Validar o nome/tipo de `products.preco` (centavos int) contra o schema real
> ao escrever a migration.

## 5. Tipos `@mallevo/types`

Regenerar `packages/types/src` a partir do schema (mesmo processo já usado para
as outras tabelas) para que `store_videos` e `public_explore_feed` apareçam em
`Database`. Tanto `apps/mobile-partner` quanto `apps/mobile-consumer` consomem
via `createClient<Database>`.

## 6. Contrato (fonte da verdade do Stage 5)

`public_explore_feed` é **isomórfico** ao `interface Reel` de
[`explorar.tsx`](../../apps/mobile-consumer/app/(tabs)/explorar.tsx) — de
propósito. O Stage 5 só troca o array mock por um `select('*').from(
'public_explore_feed')`, sem mexer na UI. Diferenças intencionais a anotar para
o Stage 5:

| `interface Reel` (mock) | `public_explore_feed` | Nota |
|---|---|---|
| `id: string` | `id uuid` | ok |
| `loja_slug/nome/inicial` | colunas da view | derivado de `stores` |
| `video_url` | `video_url` | público |
| — | `thumb_url` | **novo**: usar na `GaleriaGrid` (hoje placeholder) |
| `descricao/tags/curtidas/comentarios` | idem | ok |
| `produto?: {nome,preco}` | `produto jsonb {id,nome,preco}` | view inclui `id` (deep-link futuro) |

## Critérios de aceite

- [ ] `store_videos` criada com RLS; INSERT só do próprio tenant+loja.
- [ ] Bucket `explore-videos` com cap 50 MB e mime allowlist; escrita só no
      prefixo `{tenant_id}/`, leitura pública.
- [ ] Trigger de limite por plano presente (no-op sem teto).
- [ ] `public_explore_feed` retorna só `published`+`approved`; `anon` faz
      SELECT na view e **não** na tabela base (testar com anon key).
- [ ] `@mallevo/types` regenerado e tipa as duas entidades.
- [ ] Decisão de `moderacao` default registrada no `00-INDEX` (status) e no
      campo `DEFAULT` da migration.
