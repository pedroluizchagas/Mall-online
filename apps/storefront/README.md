# apps/storefront

Storefront público do consumidor (site-na-bio por loja). App Next.js isolado do
Dashboard (`apps/web`) — runtime, deploy, middleware, bundle e tema separados.
Ver `docs/storefront/01-arquitetura-e-decisoes.md`.

> **Estado:** Stage 2 — roteamento host-based (D1) + resolução de tenant
> implementados (middleware + `lib/tenant.ts` + page mínima). Telas reais de
> catálogo/checkout entram no Stage 3.

## Dev local

```bash
pnpm install                      # registra apps/storefront no workspace
cp apps/storefront/.env.local.example apps/storefront/.env.local
pnpm --filter storefront dev      # http://localhost:3002
```

Portas do monorepo: `3000` = web (Dashboard), `3001` = admin, `3002` = storefront.

### Roteamento host-based (Stage 2 — implementado)

Cada request é uma loja. O `middleware.ts` lê o header `host`, extrai o slug
do subdomínio e injeta o header `x-store-slug` (`NextResponse.next()` —
**sem rewrite para `/loja/{slug}`**, D1). As páginas resolvem o slug via
`lib/tenant.ts`:

- `getStoreSlug()` — lê `headers().get('x-store-slug')` (server-side).
- `getStore(slug)` — consulta a view pública `public_catalog_stores`
  (`.eq('slug', slug).single()`, cache por request com `React.cache`).

Slug ausente (apex/`www`) ou loja inexistente/inativa (não aparece na view
pública, que filtra `ativo = true`) → `notFound()` → `app/not-found.tsx`,
que renderiza a mesma UI de `app/loja-nao-encontrada/page.tsx`.

> **Como o `notFound` é resolvido:** o App Router renderiza o
> `not-found.tsx` mais próximo quando `notFound()` é chamado. Mantemos a UI
> em `app/loja-nao-encontrada/loja-nao-encontrada.tsx` e a reaproveitamos
> tanto na rota direta `/loja-nao-encontrada` quanto em `app/not-found.tsx`.
> Não há segmento de rota `/loja/` em nenhum lugar (D1).

A sessão Supabase é escopada ao host exato (`@supabase/ssr`), isolada por loja
e sem vazamento para `app.mallevo.com.br` (D5). O `middleware.ts` faz o
"cookie dance" do `@supabase/ssr` (mesmo bloco de `apps/web/middleware.ts`)
para renovar o token do consumer a cada request.

### Testando subdomínios localmente

O servidor de dev sobe na porta `3002`. Para exercitar o roteamento por loja
você precisa acessar um host `<slug>.mallevo.localhost:3002`:

- **Chrome / Firefox:** `*.mallevo.localhost` resolve para `127.0.0.1`
  automaticamente. Acesse direto:
  `http://acme.mallevo.localhost:3002` (sem configuração extra).
- **Safari / `curl` / outros:** não resolvem `*.localhost` por padrão.
  Opção 1 — `/etc/hosts`:

  ```
  127.0.0.1   acme.mallevo.localhost
  127.0.0.1   mallevo.localhost
  ```

  Opção 2 — `dnsmasq` (resolve todo `*.mallevo.localhost` de uma vez):

  ```
  address=/mallevo.localhost/127.0.0.1
  ```

  Com `curl` também dá para forçar o header `Host` sem mexer no DNS:

  ```bash
  curl -s -H 'Host: acme.mallevo.localhost:3002' http://localhost:3002/
  ```

- **Slug de teste:** use o slug de uma loja com `ativo = true` no seed
  (lojas inativas não aparecem em `public_catalog_stores` → `notFound()`).
- **Apex** (`mallevo.localhost:3002`) e `www` não têm slug → `notFound()`
  (página "loja não encontrada"), sem crash.

## Scripts

| Script | Ação |
|---|---|
| `pnpm --filter storefront dev` | Next dev na porta 3002 |
| `pnpm --filter storefront build` | Build de produção |
| `pnpm --filter storefront start` | Servir build na porta 3002 |
| `pnpm --filter storefront lint` | ESLint (next lint) |
| `pnpm --filter storefront typecheck` | `tsc --noEmit` |

## Compartilhado vs isolado

- **Compartilhado:** Supabase, catálogo, checkout Pagar.me, lógica de entrega
  (`@mallevo/lib`), tipos (`@mallevo/types`).
- **Isolado:** este app Next.js, tema (`tailwind.config.ts`,
  `lib/consumer-design.ts` — tokens copiados/traduzidos de mobile-consumer),
  clients Supabase locais (`lib/supabase/*`).
