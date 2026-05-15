# apps/storefront

Storefront público do consumidor (site-na-bio por loja). App Next.js isolado do
Dashboard (`apps/web`) — runtime, deploy, middleware, bundle e tema separados.
Ver `docs/storefront/01-arquitetura-e-decisoes.md`.

> **Estado:** Stage 1 — scaffold compilável. Roteamento host-based (D1) e
> lógica de tenant entram no Stage 2; telas reais no Stage 3.

## Dev local

```bash
pnpm install                      # registra apps/storefront no workspace
cp apps/storefront/.env.local.example apps/storefront/.env.local
pnpm --filter storefront dev      # http://localhost:3002
```

Portas do monorepo: `3000` = web (Dashboard), `3001` = admin, `3002` = storefront.

### Roteamento host-based (Stage 2 — ainda não implementado)

Cada request é uma loja. O `middleware.ts` (Stage 2) lê o header `host`,
extrai o slug do subdomínio e injeta `x-store-slug`; as páginas leem o slug via
`next/headers`. Sem `/loja/[slug]`. Para testar subdomínios localmente serão
usados hosts `*.mallevo.localhost` (instruções detalhadas no Stage 2).

A sessão Supabase é escopada ao host exato (`@supabase/ssr`), isolada por loja
e sem vazamento para `app.mallevo.com.br` (D5).

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
