# Stage 1 — Scaffold `apps/storefront`

Registro no workspace é automático (`apps/*` em `pnpm-workspace.yaml`). Porta
dev: **3002** (3000 = web, 3001 = admin se aplicável — confirmar antes).

## Arquivos a criar

### `apps/storefront/package.json`
Espelhar `apps/web/package.json`. Deps:
`@mallevo/lib`, `@mallevo/types` (`workspace:*`), `@supabase/ssr`,
`@supabase/supabase-js`, `next@14.2.0`, `react`, `react-dom`, `zustand`,
`lucide-react`, `date-fns`.
**Remover** deps só-Dashboard: `recharts`, `stripe`, `react-hook-form`.
`"dev": "next dev -p 3002"`. Scripts `build`/`lint`/`typecheck` espelhando web.

### `apps/storefront/next.config.mjs`
- `transpilePackages: ['@mallevo/types', '@mallevo/lib']`
- `images.remotePatterns`: `*.supabase.co` em `/storage/v1/object/public/**`
- `experimental.serverActions.allowedOrigins`:
  `['localhost:3002', '*.mallevo.com.br', '*.mallevo.localhost']`
  (**sem** `app.mallevo.com.br`)

### `apps/storefront/tsconfig.json`
Copiar de `apps/web` — mesmos `paths` (`@mallevo/*`, `@/*`).
`postcss.config.js` idem.

### `apps/storefront/tailwind.config.ts`
`theme.extend` traduzido de `apps/mobile-consumer/lib/consumer-design.ts`:
`colors`, `borderRadius`, `boxShadow` (shadow RN → CSS box-shadow),
`fontFamily`/typography. Tokens **copiados e traduzidos**, não compartilhados
(elevation RN não mapeia para web).

### `apps/storefront/app/{layout.tsx,globals.css}`
`<html lang="pt-BR">`, fundo `canvas` do tema. `globals.css` com Tailwind
directives + reset.

### `apps/storefront/lib/supabase/{client,server}.ts`
Copiar padrão de `apps/web/lib/supabase/*` (browser client, server client SSR,
admin com service role). É código pequeno e app-local — copiar, não compartilhar.

### `apps/storefront/lib/{consumer-design.ts,format.ts}`
- `consumer-design.ts`: copiar de mobile-consumer (referência de tokens em TS).
- `format.ts`: re-exporta `formatarReais` de `@mallevo/lib` + helpers de data.

### Outros
`apps/storefront/.env.local.example`, `next-env.d.ts`, `public/`,
`apps/storefront/README.md` (instruções de dev local — ver Stage 2).

## Env vars do `apps/storefront`

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_PAGARME_APPID`, `APP_URL`.
Adicionar ao `.env.example` raiz e a `turbo.json globalEnv` se faltar (a maioria
já está; `NEXT_PUBLIC_PAGARME_APPID` confirmar).

## Critérios de aceite

- [ ] `pnpm install` reconhece `apps/storefront` no workspace.
- [ ] `pnpm --filter storefront dev` sobe na porta 3002 sem erro.
- [ ] `pnpm --filter storefront build` passa (página placeholder ok).
- [ ] `pnpm --filter storefront typecheck` limpo.
- [ ] Nenhuma dep só-Dashboard no bundle.
- [ ] Nada em `apps/web`/`apps/admin` alterado.

## Fora de escopo

Lógica de tenant/middleware (Stage 2) e telas reais (Stage 3). Aqui só o
esqueleto compilável com uma `app/page.tsx` placeholder.
