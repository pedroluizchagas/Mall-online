# Stage 3 — Storefront completo

Cada subestágio é entregável e revisável isoladamente (preview Vercel). Cada um
referencia o arquivo mobile de origem — é **reescrita RN→DOM**, não cópia. Esse
é o maior custo de esforço do projeto; não comprimir os subestágios.

> Catálogo lê das **views públicas** do Stage 0a (anon). Checkout usa JWT de
> consumer. Todo pedido carimba `origem='storefront'`.

## 3a — Catálogo
Ref: `apps/mobile-consumer/app/loja/[slug].tsx` (480 LOC).

`app/page.tsx` (Server Component): via `getStore(slug)` →
`public_catalog_stores` + `public_catalog_products` por `store_id` agrupados
por categoria. O agrupamento usa `public_catalog_categories` (nome/ordem
reais): seções ordenadas por `categories.ordem`, produtos por
`products.ordem`; sem categoria → seção "Outros" por último.
Componentes: `StoreHeader`, `ProductCard` (← `ProdutoCard.tsx`), `MenuSection`,
`cart/CartFab`, `ui/{Skeleton,Badge}`.
Adicionar: `<title>`/OG por loja (SEO), `robots`/`sitemap` por tenant.

## 3b — Produto / modifiers
Ref: `apps/mobile-consumer/components/ModalProduto.tsx`.

`components/store/ProductModal.tsx` (`'use client'`): quantidade, modifiers,
variants, observações, agendamento → `useCartStore().adicionarItem` (de
`@mallevo/lib`). `cart/TrocaLojaDialog.tsx` para `pendingTrocaLoja`
(regra single-store).

> **Status: conforme parcial — validado pelo tech lead** (commits
> `ee429d1`/`de85519`/`76eaedd`; 8 arquivos `apps/storefront/*`). Verificado
> independentemente: typecheck limpo, build OK (rotas `/`, `/produto/[id]`),
> sem query a tabela base (só views `public_catalog_*`, D2), `useCartStore`
> consumido sem reimplementação (assinatura `adicionarItem` conferida em
> `useCartStore.ts:74`), Middleware/tenant intactos. Entregue: quantidade,
> observações, preço/promo, total, single-store via `pendingTrocaLoja`,
> wiring `ProductCard→ProductModal`, rota `/produto/[id]` (deep-link que
> reabre o modal — **não** PDP própria; mantém URL indexável do sitemap 3a).
>
> **⚠ Bloqueio de fundação (Stage 0) — decisão do tech lead PENDENTE:**
> modifiers, variants e agendamento **não** foram portados porque as views
> públicas do Stage 0 não expõem os dados necessários:
> - `public_catalog_product_modifiers`: sem `product_id` (só `group_id`) e
>   sem metadados do grupo (`nome`/`min_select`/`max_select`) — impossível
>   agrupar/validar obrigatoriedade.
> - `public_catalog_product_variants`: tem `product_id` mas sem rótulo nem
>   views de option groups/options/variant_options (`ItemCarrinhoVariant`
>   exige `rotulo`).
> - Agendamento (services): view só expõe `categoria_id` (sem
>   `categoria_slug` p/ `getTemplateBySlug`) e a disponibilidade exige
>   sessão autenticada (auth = 3e).
>
> Resolver exige **migration incremental Stage 0** (novas views públicas,
> mesmo padrão D2) — fora do escopo de 3b. `ProductModal` mantém a estrutura
> de validação (`erroValidacao`, hoje inerte) para encaixe 1:1 quando as
> views forem estendidas.
>
> **Decisão do tech lead (aprovada):** migration incremental Stage 0
> `20260516160000_storefront_public_catalog_modifiers_variants.sql` criada —
> views `public_catalog_product_modifier_groups`,
> `public_catalog_product_option_groups`, `public_catalog_product_options`,
> `public_catalog_product_variant_options` + `categoria_slug` anexado a
> `public_catalog_stores` (LEFT JOIN categories). Padrão D2 (security_invoker,
> GRANT só na view, sem tenant_id/sku/estoque). Stage 0/tabelas base não
> editados. **2ª passada do 3b CONFORME** (validada tech lead, commit
> `4aa254d`): `lib/catalog.ts` ganhou `carregarDetalhesCatalogo` (loader
> Server em lote, só views `public_catalog_*`); `ProductModal` renderiza
> modifiers (radio/checkbox por min/max) e variants (swatch `hex_color`),
> resolve `precoBase` pelo variant, soma `preco_extra`, e `erroValidacao`
> está ATIVO (variant incompleto/indisponível + min/max). Item montado no
> shape real `ItemCarrinho(Variant|Modifier)`; `rotulo` com ` × ` (paridade
> `ModalProduto.tsx`). Boundary Server/client preservado (`import type` de
> `@/lib/catalog`). Aviso de estoque do mobile não é portável (D2 não expõe
> `stock_quantity` à view) — esperado. **Agendamento/services adiado p/
> pós-3e** (depende de sessão autenticada de consumer); `categoria_slug` já
> exposto para essa etapa futura, mas o storefront ainda não cobre
> agendamento.

## 3c — Carrinho
Persistência do carrinho em `sessionStorage` (origin-scoped, reforça
single-store) + `ItemCarrinhoCard.tsx` (← mobile).

> **Decisão do tech lead (aprovada) — corrige a redação original
> "Adicionar `persist` no `useCartStore`":** `useCartStore` vive em
> `packages/lib` e é consumido **também pelo `apps/mobile-consumer`
> (React Native) via shim `apps/mobile-consumer/store/useCartStore.ts`
> → `export * from '@mallevo/lib'`**. Adicionar o middleware `persist`
> com `sessionStorage` no store compartilhado quebraria o mobile (RN não
> tem `window`/`sessionStorage`) e o SSR do storefront (server sem
> `sessionStorage` → hydration mismatch). Portanto a persistência é
> **local ao `apps/storefront`, SEM editar `@mallevo/lib`**: um
> componente/hook `'use client'` que (1) espelha o estado relevante do
> `useCartStore` → `sessionStorage` em mudança e (2) re-hidrata uma vez
> no mount via `useCartStore.setState(...)` (já exposto pelo zustand, sem
> alterar a definição do store). SSR-safe (efeito client-only),
> origin-scoped por natureza do `sessionStorage`, reversível, zero risco
> de regressão p/ mobile/web. Invariantes do store preservadas (single-
> store, `linha_id`, regra de agendamento) — a persistência só serializa/
> restaura `itens`/`store_*`, nunca reimplementa lógica do store.
>
> `ItemCarrinhoCard.tsx` RN→DOM: o ramo de agendamento
> (`formatarAgendamento`) é mantido **estruturalmente porém inerte** — o
> storefront não cria itens de agendamento até pós-3e (mesmo padrão de
> `erroValidacao` no 3b). Sem segmento de rota `/loja/`. Dados de catálogo
> seguem só via views `public_catalog_*` (D2).

## 3d — Checkout
Ref: `apps/mobile-consumer/app/checkout.tsx` (622 LOC), `lib/pagarme.ts`.

- `lib/pagarme.ts`: portar `tokenizarCartao`. **PAN/CVV só browser→`api.pagar.me`,
  nunca nosso servidor** (mantém SAQ-A). `NEXT_PUBLIC_PAGARME_APPID` é chave
  pública.
- `app/checkout/page.tsx` (`'use client'`):
  - `fluxoCartao`/`fluxoPix` → `POST ${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-pagarme-order`
    com Bearer da sessão. Incluir `origem: 'storefront'` no payload.
  - `fluxoPagamentoOffline` → insert direto `orders` + `order_items`
    (incl. `platform_fee_amount`, troco, **`origem: 'storefront'`**).
  - Usar a regra de cobertura/entrega de `@mallevo/lib` (D4) — entrega vs
    retirada, `taxa_entrega`. Não reimplementar.
- `app/checkout/pix/page.tsx`: QR + poll/realtime.
- `components/checkout/`: `SeletorEndereco`, `SeletorPagamento`,
  `SeletorParcelas`, `FormularioCartao`.

> **Decisão do tech lead (aprovada) — sequenciamento 3d↔3e:** os três
> fluxos de `apps/mobile-consumer/app/checkout.tsx` dependem de **sessão
> consumer autenticada**, que só nasce no 3e: `fluxoCartao`/`fluxoPix`
> enviam `Authorization: Bearer ${session.access_token}` à edge function
> `create-pagarme-order`; `fluxoPagamentoOffline` usa `session.user.id`
> (lookup de endereço + insert RLS em `orders`/`order_items`);
> `obterSessaoOuFalhar()` lança sem sessão. O próprio §3e define o gate
> `sem sessão → /entrar?next=/checkout`. **3d é construído agora de forma
> estrutural, com o caminho sem-sessão como fronteira INERTE** (mesmo
> padrão de `erroValidacao` no 3b e do ramo de agendamento no 3c):
> `lib/pagarme.ts` (tokenização browser→`api.pagar.me`, SAQ-A) é
> **funcional já agora** (não depende de sessão); a página de checkout, os
> seletores e os três fluxos são portados RN→DOM ligados ao
> `useAuthStore`/`supabase` **reais** de `@mallevo/lib`/`lib/supabase`,
> mas sem sessão o `obterSessaoOuFalhar()` redireciona para
> `/entrar?next=/checkout` — rota que passa a existir no 3e. Não se
> reordena 3d↔3e nem se reimplementa auth aqui; a regra de cobertura/
> entrega vem de `@mallevo/lib` (D4), não reimplementada. PAN/CVV nunca
> tocam nosso servidor. `origem: 'storefront'` em todos os caminhos.

## 3e — Auth consumidor
Ref: `app/(auth)/entrar.tsx`, `verificar.tsx`.

`app/entrar/page.tsx` (`signUp`/`signInWithPassword` com `role:'consumer'`),
`app/verificar/page.tsx` (`verifyOtp`). `lib/auth.ts` `getConsumer()`.
Gate no checkout: sem sessão → `/entrar?next=/checkout`.
`AuthProvider.tsx` hidrata `useAuthStore` via `onAuthStateChange`.
Sessão escopada ao subdomínio (D5) — não setar `domain=.mallevo.com.br`.

> **Decisão do tech lead (aprovada) — escopo 3e:** port fiel das telas
> `entrar.tsx`/`verificar.tsx` RN→DOM. `entrar` mantém os dois modos do
> mobile (`signInWithPassword` e `signUp` com `options.data.role:
> 'consumer'`; signup sem sessão → tela "confirme seu email");
> `verificar` faz `verifyOtp({type:'email'})` + reenvio via
> `signInWithOtp`. O gate do checkout (`/entrar?next=/checkout`, já
> emitido pelo `CheckoutClient` no 3d) passa a ter rota real — `entrar`/
> `verificar` leem `?next=` e redirecionam para lá pós-auth (default
> `/`), substituindo o `router.replace('/(tabs)')` do mobile (rota
> inexistente no storefront). `lib/auth.ts.getConsumer()` lê a tabela
> `consumers` por `user_id` (leitura autenticada por RLS — **não** é
> catálogo, não cai na restrição D2 das views `public_catalog_*`).
> `AuthProvider` (client) é montado no `app/layout.tsx`, hidrata
> `useAuthStore` (user via `getSession`/`onAuthStateChange`; consumer via
> `getConsumer`) — `useAuthStore` é consumido de `@mallevo/lib` **sem
> edição** (espelha 3c). **D5 já satisfeito** pela infra existente: o
> middleware (Stage 2) e o `@supabase/ssr` (browser/server clients)
> escrevem cookies host-scoped por padrão; nenhum código seta
> `domain=.mallevo.com.br` — 3e não introduz override. 3e **ativa** a
> fronteira inerte do 3d (card/pix passam a alcançar o POST autenticado;
> offline continua gated). 3e **não** resolve a decisão aberta do
> `tenant_id` do pedido offline (§3d) — permanece pendente.

## 3f — Acompanhamento
Ref: `app/pedido/[id].tsx`.

`app/pedido/[id]/page.tsx` (server fetch + filho `'use client'` com Realtime em
`orders`/localização). `components/order/{OrderStatusTimeline,OrderItemsList}`.

## Critérios de aceite (e2e, por subestágio)

Caminho feliz local: catálogo → ProductModal → add carrinho → CartFab →
`/checkout` → redirect `/entrar?next=/checkout` → login consumer → checkout →
Pix → `create-pagarme-order` → `/checkout/pix` (QR) → `/pedido/{id}` com status
realtime. Testar também cartão (appId teste) e dinheiro (insert direto).
Negativo: slug inexistente → 404; loja `ativo=false` → 404.

- [ ] Catálogo carrega anônimo (sem login) via views públicas.
- [ ] Pedido criado tem `origem='storefront'` no banco.
- [ ] Carrinho sobrevive a reload (sessionStorage), single-store respeitado.
- [ ] PAN/CVV nunca trafegam pelo nosso backend (só browser→pagar.me).
- [ ] Entrega vs retirada usa regra de `@mallevo/lib` (D4).
- [ ] Sessão não vaza para outro subdomínio.

## Fora de escopo

Corte de domínio (Stage 4). Não tocar `apps/web/middleware.ts` ainda.
