# Stage 2 — Roteamento host-based + resolução de tenant

## `apps/storefront/middleware.ts`

Portar `getSubdomain()` de `apps/web/middleware.ts`:
- `MAIN_DOMAINS = ['mallevo.com.br', 'mallevo.localhost']`
- Extrai slug do `host`. Apex/`www`/sem slug → landing simples ou 404.
- Com slug → `NextResponse.next()` setando header `x-store-slug` (NÃO rewrite
  para `/loja/{slug}` — D1, todo request já é uma loja).
- Incluir o bloco de refresh de token `@supabase/ssr` (mesmo "cookie dance" de
  `apps/web/middleware.ts`) para sessão de consumer funcionar.
- Matcher: `['/((?!_next/static|_next/image|favicon.ico|api).*)']`.

Diferença-chave vs web: web faz `rewrite` para `/loja/{slug}`; storefront
**não reescreve** — injeta header e segue. As páginas leem o slug.

## `apps/storefront/lib/tenant.ts`

- `getStoreSlug()` — lê `headers().get('x-store-slug')` (server-side).
- `getStore(slug)` — query em `public_catalog_stores` (view do Stage 0a)
  `.eq('slug', slug).single()`. Cache por request.
- `null` / loja inexistente → `notFound()` →
  `apps/storefront/app/loja-nao-encontrada/page.tsx`.

## Dev local

`*.mallevo.localhost` resolve para `127.0.0.1` automaticamente em Chrome/Firefox.
Documentar em `apps/storefront/README.md`:
- Chrome/Firefox: `acme.mallevo.localhost:3002` funciona direto.
- Safari/curl: adicionar a `/etc/hosts` ou usar `dnsmasq`.
- Slug de teste: usar uma loja `ativo = true` do seed.

## Critérios de aceite

- [ ] `acme.mallevo.localhost:3002` → header `x-store-slug=acme` chega na page.
- [ ] `naoexiste.mallevo.localhost:3002` → página "loja não encontrada" (404).
- [ ] Loja com `ativo = false` → 404 (não aparece na view pública).
- [ ] Apex `mallevo.localhost:3002` → landing/404, sem crash.
- [ ] Refresh de token Supabase funciona (cookie setado/renovado).
- [ ] Nenhum path contém segmento `/loja/`.

## Fora de escopo

Telas de catálogo/checkout (Stage 3). Aqui: middleware + resolução de tenant +
page mínima que imprime o slug resolvido e dados básicos da loja vindos da view.
