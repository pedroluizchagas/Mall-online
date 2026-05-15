# 01 — Arquitetura e Decisões

## Por que projeto isolado (e não rota em `apps/web`)

`apps/web` hoje acumula, no mesmo `middleware.ts`, o rewrite host→`/loja/{slug}`
do consumidor **e** o refresh de token + onboarding do lojista. Servir as duas
audiências no mesmo runtime significa:

- Pico de tráfego no storefront de um lojista (post viral / link na bio) pode
  degradar o Dashboard de **todos** os lojistas.
- Deploy acoplado: feature do Dashboard fica refém do QA do storefront.
- Superfícies de segurança opostas: storefront é anônimo e público; Dashboard é
  autenticado e sensível.

Perfis de tráfego, público, SEO e cadência de deploy são incompatíveis →
runtime e deploy separados.

## O que é isolado vs compartilhado

**Isolado (por superfície):** o app Next.js, o projeto Vercel, o deploy, o
middleware, o tema visual, o bundle.

**Compartilhado (um cérebro):**

- Supabase (Postgres + Auth + Storage + Realtime + Edge Functions).
- Catálogo (`stores`, `products`, `categories`, variants, modifiers).
- Checkout Pagar.me (Edge Function `create-pagarme-order`, tokenização client-side).
- Roteamento/cobertura de entrega Mallevo.
- Tabela `orders` / `order_items` — pedidos dos 3 canais convergem aqui.

> "Desacoplado" = frontend desacoplado. Banco/lógica de negócio NUNCA duplicados.

## Decisões e justificativas

### D1 — Roteamento host-based, sem `/loja/[slug]`

Todo request no `apps/storefront` é uma loja. `middleware.ts` lê o header `host`,
extrai o slug, injeta `x-store-slug`. Páginas root (`app/page.tsx`,
`app/produto/[id]`, `app/checkout`, `app/pedido/[id]`) leem o slug via
`next/headers`. URLs limpas: `acme.mallevo.com.br/checkout`.

### D2 — Catálogo público via VIEW, não anon nas tabelas base

RLS no Postgres é row-level, não column-level. Abrir `SELECT` anônimo em
`products`/`stores` exporia **todas as colunas** das linhas ativas (custo,
`metadata`, `tenant_id`, campos internos) mesmo que a query selecione poucas.

**Decisão:** criar views `SECURITY INVOKER` com colunas explícitas e seguras
(`public_catalog_stores`, `public_catalog_products`, etc.), filtradas a
`ativo = true` / `disponivel = true`, e conceder `SELECT` ao papel `anon`
**apenas nas views**. As tabelas base permanecem `TO authenticated`.

Estado atual confirmado nas migrations:
- `stores_select_publico` → `TO authenticated` (anon bloqueado).
- `products_select_publico` → `TO authenticated` (anon bloqueado).
- `categories_select_publico` → já liberado p/ anon (migration `20260425000000`).

### D3 — `orders.origem` para convergência dos 3 canais

`orders` hoje **não tem** coluna de canal. Sem ela, o Dashboard mistura pedidos
sem distinguir origem e não há métrica de conversão do site-na-bio.

**Decisão:** adicionar `origem TEXT NOT NULL DEFAULT 'app'` com CHECK em
(`app`, `storefront`, `dashboard_manual`). O storefront carimba
`origem = 'storefront'` em todo pedido (insert direto ou payload da Edge
Function). Migration entra no Stage 0 (mesma natureza bloqueante do RLS).

### D4 — Lógica de entrega/cobertura compartilhada

A regra "essa venda é entregável pela Mallevo (é para a cidade)?" e o cálculo
de `taxa_entrega` / `platform_fee_amount` devem viver em `packages/lib`,
consumidos por mobile-consumer e storefront. Duas implementações divergiriam.

### D5 — Sessão por subdomínio (isolada)

`@supabase/ssr` escopa cookie ao host exato → sessão por loja, não vaza para
`app.mallevo.com.br`. Consumidor loga por loja. Cookie `domain=.mallevo.com.br`
foi **rejeitado** (vazaria sessão de consumidor para Dashboard/Admin). Login
unificado entre lojas (host central de auth com hand-off) fica como evolução
futura, fora de escopo agora.

### D6 — Provisionamento DNS inalterado

`provisionTenantDomain` lê `process.env.VERCEL_PROJECT_ID` em runtime. Retarget
para o novo projeto = trocar uma env var no `apps/web`. Sem mudança de lógica.
Continua sendo chamado no Dashboard (onde está o onboarding).

## Riscos e mitigações

| Risco | Severidade | Mitigação |
|---|---|---|
| RLS anon (catálogo invisível) | Bloqueante | Stage 0: views públicas antes do Stage 3a |
| Vazamento de coluna sensível a anon | Alta | Views com colunas explícitas (D2), nunca tabela base |
| Corte do wildcard (downtime SSL) | Alta | Stage 4: ensaiar com tenant descartável, script back-to-back, janela de baixo tráfego |
| Esforço RN→DOM subestimado | Alta | Stages 3a–3f entregáveis e revisáveis individualmente |
| 3 canais não convergem no Dashboard | Alta | `orders.origem` (D3) + lógica de entrega na lib (D4) |
| Sessão entre lojas (UX de relogin) | Média | Aceito conscientemente (D5); evolução futura |
| Edge Function compartilhada sob abuso | Média | Avaliar rate-limit em `create-pagarme-order` |
| Carrinho perdido em reload (web) | Baixa | `sessionStorage` (origin-scoped) reforça regra single-store |

## Arquivos críticos de referência

- `apps/web/middleware.ts` — origem de `getSubdomain()`; bloco a remover no corte
- `apps/web/lib/dns/tenant-dns.ts` — extrair p/ `packages/lib`; retarget via env
- `apps/web/lib/supabase/server.ts` — padrão SSR a copiar
- `apps/mobile-consumer/app/loja/[slug].tsx` (480 LOC) — query catálogo
- `apps/mobile-consumer/app/checkout.tsx` (622 LOC) — checkout cartão/Pix/offline
- `apps/mobile-consumer/store/{useCartStore,useOrderStore,useAuthStore}.ts` — Zustand puro
- `apps/mobile-consumer/lib/{pagarme,consumer-design}.ts` — tokenização / tokens visuais
- `supabase/migrations/20240106000000_migration_006_rls_policies.sql` — RLS atual
