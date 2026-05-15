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
por categoria, ordenados por `ordem`.
Componentes: `StoreHeader`, `ProductCard` (← `ProdutoCard.tsx`), `MenuSection`,
`cart/CartFab`, `ui/{Skeleton,Badge}`.
Adicionar: `<title>`/OG por loja (SEO), `robots`/`sitemap` por tenant.

## 3b — Produto / modifiers
Ref: `apps/mobile-consumer/components/ModalProduto.tsx`.

`components/store/ProductModal.tsx` (`'use client'`): quantidade, modifiers,
variants, observações, agendamento → `useCartStore().adicionarItem` (de
`@mallevo/lib`). `cart/TrocaLojaDialog.tsx` para `pendingTrocaLoja`
(regra single-store).

## 3c — Carrinho
`useCartStore` de `@mallevo/lib`. Adicionar `persist` em `sessionStorage`
(origin-scoped, reforça single-store) sem quebrar invariantes do store.
`ItemCarrinhoCard.tsx` (← mobile, com `formatarAgendamento`).

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

## 3e — Auth consumidor
Ref: `app/(auth)/entrar.tsx`, `verificar.tsx`.

`app/entrar/page.tsx` (`signUp`/`signInWithPassword` com `role:'consumer'`),
`app/verificar/page.tsx` (`verifyOtp`). `lib/auth.ts` `getConsumer()`.
Gate no checkout: sem sessão → `/entrar?next=/checkout`.
`AuthProvider.tsx` hidrata `useAuthStore` via `onAuthStateChange`.
Sessão escopada ao subdomínio (D5) — não setar `domain=.mallevo.com.br`.

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
