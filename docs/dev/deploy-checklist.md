# Checklist de Deploy — Mallevo

> Runbook consolidado para colocar a plataforma em produção. Aterrado no
> estado real do repo (jun/2026). Marque cada item; o que já foi feito nesta
> rodada está em **§7**.
>
> **Modelo:** 1 backend Supabase compartilhado + 4 frontends isolados
> (3 Vercel + 2 apps Expo). Pagamentos = **Pagar.me** (pedidos) + **Stripe
> Billing** (assinatura do lojista). Projeto Supabase: `rtesdjobtgqkiuywadnl`.

---

## 1. Supabase (backend) — fonte da verdade

- [ ] **Migrations aplicadas:** `supabase db push` (local e remoto em sync — conferir `supabase migration list --linked`).
- [ ] **Secrets das Edge Functions** (`supabase secrets set ... --project-ref rtesdjobtgqkiuywadnl`):
  - [ ] `PAGARME_API_KEY` (chave secreta — **produção**, não `ak_test_`)
  - [ ] `PAGARME_WEBHOOK_SECRET` (HMAC do webhook Pagar.me)
  - [ ] `PAGARME_PLATFORM_RECIPIENT_ID` (recebedor da Mallevo — produção)
  - [ ] `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (Billing)
  - [ ] `WEBHOOK_SECRET` (auth do trigger interno → `notify-order-update`)
  - [ ] `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` (onboard-tenant registra subdomínio) ✅ já setado nesta sessão
  - [ ] `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (injetados pelo runtime; confirmar)
- [ ] **Deploy das 14 Edge Functions:** `supabase functions deploy <nome>` (ou todas). Críticas: `create-pagarme-order`, `pagarme-webhook`, `create-subscription`, `stripe-webhook`, `onboard-tenant`, `onboard-courier`, `transfer-to-courier`, `notify-order-update`, `agenda-disponibilidade`, `request-advance`, `pagarme-balance`/`-courier-balance`/`-anticipations`, `get-pagarme-kyc-link`.
- [ ] **Realtime publication** — tabelas: `orders` ✅ (migration), `delivery_assignments`, `courier_locations`, `messages`, `message_threads`. Confirmar em Database → Replication que `supabase_realtime` está ativa.
- [ ] **Storage buckets** (criar se não existirem, com as RLS dos docs):
  - [ ] `courier-docs` (privado), `courier-avatars`, `store-assets`, `product-images`
- [ ] **Auth → URL Configuration** (deep links de produção):
  - [ ] `mallevo-consumer://auth/callback`
  - [ ] `mallevo-courier://auth/callback`
  - [ ] Site URL / redirect dos domínios web (`app.mallevo.com.br`, `*.mallevo.com.br`)
- [ ] **RLS:** confirmar que está habilitada em todas as tabelas (políticas já versionadas em migrations 006/007).
- [ ] **Planos:** seed de `plans` aplicado e `stripe_price_id` de **produção** preenchido em cada plano.

## 2. Vercel — 3 projetos isolados

- [ ] **`web`** → `app.mallevo.com.br`. Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `APP_URL=https://app.mallevo.com.br`, Cloudflare/Vercel (provision-domain), `SUPABASE_PROJECT_ID`.
- [ ] **`admin`** → `admin.mallevo.com.br`. Env: Supabase + Stripe (subset do web).
- [ ] **`storefront`** → **wildcard `*.mallevo.com.br`** ✅ corte feito. Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_PAGARME_APPID`.
- [ ] Confirmar que **só o storefront** tem o wildcard; `web`/`admin` só seus hosts (já limpo no código).
- [ ] Chaves de **produção** (sem `_test_`) em todos os projetos.
- [ ] Build OK nos 3 (`pnpm --filter <app> build`).

## 3. Pagar.me (pedidos)

- [ ] Conta em produção; `PAGARME_PLATFORM_RECIPIENT_ID` da Mallevo criado e **KYC ativo**.
- [ ] **Webhook** apontando para `…/functions/v1/pagarme-webhook` com o `PAGARME_WEBHOOK_SECRET` correto; eventos: `order.paid`, `charge.paid/refunded`, `chargeback`, `recipient.status.changed`, `transfer.paid/failed`.
- [ ] Split em 2 estágios validado (lojista recebe; taxa de entrega em custódia → courier).
- [ ] Checkout é **gateway-only** (cartão + Pix online); dinheiro/maquininha foram removidos.

## 4. Stripe Billing (assinatura)

- [ ] Produtos/preços de produção criados; IDs em `plans.stripe_price_id`.
- [ ] **Webhook** → `…/functions/v1/stripe-webhook`; eventos: `customer.subscription.*`, `invoice.paid/payment_failed`.
- [ ] Customer Portal habilitado (return_url → `/minha-conta?aba=assinatura`).

## 5. Mobile (Expo / EAS)

- [ ] `eas.json` perfil **production** com env de produção (`EXPO_PUBLIC_*`, `EXPO_PUBLIC_USE_MOCK=false`).
- [ ] `EXPO_PUBLIC_PROJECT_ID` correto nos dois apps.
- [ ] Credenciais de push: **FCM (Android)** e **APNs (iOS)** configurados no Expo (push remoto não funciona em Expo Go — exige build real).
- [ ] Build EAS dos dois apps (`mobile-consumer`, `mobile-courier`); testar push de verdade.
- [ ] Deep link schemes batendo com os callbacks de Auth (`mallevo-consumer`, `mallevo-courier`).
- [ ] Submissão às lojas (App Store / Play) quando aplicável.

## 6. Smoke tests pós-deploy (e2e)

- [ ] **Onboarding lojista** → cria tenant/store + recipient Pagar.me + subdomínio. Conferir log: `supabase functions logs onboard-tenant` sem `console.warn` de Vercel.
- [ ] Abrir `{loja}.mallevo.com.br` (storefront resolve por subdomínio).
- [ ] **Pedido e2e por canal** (app, storefront, manual): pagar (cartão **e** Pix) → `pagarme-webhook` marca `payment_status=pago` → acompanhamento atualiza **em tempo real** (valida Realtime de `orders`).
- [ ] Alocar entregador → `transfer-to-courier` transfere a taxa.
- [ ] Assinatura: trial → ativa via `stripe-webhook`.
- [ ] Dashboard: pedidos/financeiro/estoque/configurações carregam sem erro.

## 7. Já concluído nesta rodada (referência)

- ✅ Corte do wildcard `*.mallevo.com.br` para o storefront (Stage 4).
- ✅ Secrets `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` no Supabase; `onboard-tenant` redeployada (v17) lendo `VERCEL_PROJECT_ID`.
- ✅ Realtime de `orders` codificado em migration (era passo manual).
- ✅ Índice trigram para busca (Fase 3.3).
- ✅ Dashboard: crash de Configurações/Minha conta, queries de loja frágeis, estoque, coesão de IA — corrigidos.
- ✅ `.env.example` completo (inclui `WEBHOOK_SECRET` e provisionamento).

---

> **Itens de risco que continuam abertos** (ver `correction-plan.md`): ausência de
> testes de integração de pagamento; Fase 4 (rate limiting, fila de notificações,
> observabilidade/Sentry) não iniciada; Explorar ainda em mock (Partner App não
> iniciado).
