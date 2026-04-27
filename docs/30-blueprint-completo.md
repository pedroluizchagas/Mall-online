# 30 — Blueprint Completo do Projeto

### Mallora — Shopping Digital de Divinópolis

*Versão 1.0 — 27/04/2026*

---

## VISÃO GERAL

**Mallora** é uma plataforma regional de delivery e marketplace multi-tenant que conecta consumidores, lojistas locais e entregadores em um único ecossistema. Diferente dos grandes players nacionais (iFood, Rappi), o modelo é pensado para fortalecer o comércio local: lojistas pagam mensalidade fixa pelo sistema e uma comissão mínima por pedido — sem percentual sobre o faturamento.

**Foco inicial:** Divinópolis, MG — arquitetura preparada para expansão regional.

**Meta de escala:** 5.000 lojistas · 100.000 usuários consumidores.

---

## OS QUATRO ATORES

```
┌──────────────────────────────────────────────────────────────┐
│                   PLATAFORMA (Operador)                      │
│           Painel Super Admin — Next.js (apps/admin)          │
└───────────────┬──────────────────────────┬───────────────────┘
                │                          │
     ┌──────────▼──────────┐    ┌──────────▼──────────┐
     │      LOJISTA        │    │     ENTREGADOR       │
     │  Dashboard Web PWA  │    │   App Mobile Expo    │
     │  (apps/web)         │    │  (apps/mobile-       │
     │  Next.js 14         │    │   courier)           │
     └──────────┬──────────┘    └──────────┬──────────┘
                │                          │
     ┌──────────▼──────────────────────────▼──────────┐
     │                  CONSUMIDOR                     │
     │        App Mobile Expo (apps/mobile-consumer)   │
     └─────────────────────────────────────────────────┘
```

| Ator | Interface | Responsabilidades |
|------|-----------|-------------------|
| **Plataforma** | Painel Admin Web | Aprovar cadastros, definir planos, monitorar métricas, conciliação financeira |
| **Lojista** | Dashboard Web (PWA) | Gerenciar produtos/pedidos, configurar loja, acompanhar financeiro, solicitar antecipação |
| **Consumidor** | App Mobile | Explorar lojas, montar carrinho, pagar online, acompanhar entrega em tempo real |
| **Entregador** | App Mobile | Aceitar entregas, confirmar coleta/entrega, receber via Stripe Express |

### Tipos de Entregador

- **Próprio do lojista** — vinculado a um único tenant, gerenciado pelo lojista, recebe entregas exclusivas daquela loja
- **Autônomo da plataforma** — pool geral, aceita entregas de qualquer lojista, repasse D+1 automático via Stripe

---

## MODELO DE NEGÓCIO — 3 FONTES DE RECEITA

### Fonte 1 — Assinatura Mensal do Lojista

Cobrada via **Stripe Billing** (recorrente automático). Dá acesso ao dashboard CRM/ERP.

| Plano | Lojas | Produtos | Estoque | Relatórios | Entregadores próprios |
|-------|-------|----------|---------|------------|-----------------------|
| Básico | 1 | 30 | ❌ | Básico | 1 |
| Profissional | 3 | 100 | ✅ | Completo | 5 |
| Premium | Ilimitado | Ilimitado | ✅ | Avançado + export | Ilimitado |

### Fonte 2 — Comissão por Pedido (R$ 1,00)

Debitada automaticamente de cada pedido entregue via `application_fee` no Stripe. Não incide sobre cancelamentos.

### Fonte 3 — Taxa de Antecipação de Repasse (R$ 0,75/pedido)

Repasse padrão ao lojista: **D+7**. Lojista pode antecipar para **D+2** pagando R$ 0,75 por pedido antecipado.

---

## ARQUITETURA TÉCNICA

```
┌──────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────┐ │
│  │  apps/web      │  │ apps/mobile-   │  │ apps/mobile-   │  │adm │ │
│  │  Next.js 14    │  │ consumer       │  │ courier        │  │in  │ │
│  │  App Router    │  │ Expo SDK 54    │  │ Expo SDK 54    │  │    │ │
│  │  Vercel        │  │ React Native   │  │ React Native   │  │    │ │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘  └──┬─┘ │
└──────────┼────────────────────┼────────────────────┼─────────────┼───┘
           └────────────────────┴────────────────────┴─────────────┘
                                          │
┌─────────────────────────────────────────▼────────────────────────────┐
│                        SUPABASE (BaaS)                               │
│                                                                      │
│  ┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌─────────┐ │
│  │ PostgreSQL 15│ │   Auth   │ │ Storage  │ │Realtime│ │  Edge   │ │
│  │  + RLS       │ │  JWT     │ │ Buckets  │ │WebSocket│ │Functions│ │
│  └──────────────┘ └──────────┘ └──────────┘ └────────┘ └────┬────┘ │
└──────────────────────────────────────────────────────────────┼───────┘
                                                               │
                        ┌──────────────────┬───────────────────┘
                        │                  │
             ┌──────────▼──────┐  ┌────────▼────────┐
             │     STRIPE      │  │  EXPO PUSH API  │
             │  Connect        │  │  Notificações   │
             │  Billing        │  │  iOS + Android  │
             │  Webhooks       │  └─────────────────┘
             └─────────────────┘
```

### Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| **Backend único Supabase** | Separação por RLS, não por projetos — reduz custo e mantém consistência em tempo real |
| **Separate Charges and Transfers** | Dois destinatários por transação (lojista + entregador) — impossível com Destination Charge |
| **Repasse por cron, não atômico** | Agrupa múltiplos pedidos num único transfer, facilita cancelamentos tardios |
| **Next.js App Router + Server Components** | Queries no servidor — sem exposição de dados sensíveis; mutations via Server Actions |
| **Expo Router nos apps mobile** | File-based routing consistente com Next.js — facilita transição de devs |
| **Monorepo pnpm + Turbo** | Tipos e utilitários compartilhados sem publicação em npm |

---

## STACK COMPLETA

### Repositório

| Aspecto | Valor |
|---------|-------|
| Estrutura | Monorepo — pnpm workspaces 10.33.0 |
| Build orchestration | Turbo 2.0.0 |
| TypeScript | 5.x (strict mode em todos os apps) |

### Apps

| App | Framework | Versão | Hospedagem | Porta dev |
|-----|-----------|--------|------------|-----------|
| `apps/web` | Next.js | 14.2.0 (App Router) | Vercel | 3000 |
| `apps/admin` | Next.js | 14.2.0 (App Router) | Vercel | 3001 |
| `apps/mobile-consumer` | Expo + React Native | SDK 54 / RN 0.81.5 | App Stores (EAS Build) | — |
| `apps/mobile-courier` | Expo + React Native | SDK 54 / RN 0.81.5 | App Stores (EAS Build) | — |

### Backend (Supabase)

| Componente | Tecnologia | Finalidade |
|------------|-----------|------------|
| Banco de dados | PostgreSQL 15 | Dados relacionais + RLS multi-tenant |
| Auth | Supabase Auth | JWT — 4 roles (lojista, consumidor, entregador, admin) |
| Storage | Supabase Storage | Imagens de produtos (bucket `product-images`) |
| Realtime | Supabase Realtime | WebSocket — pedidos, localização do entregador |
| Edge Functions | Deno runtime | Pagamentos, webhooks, notificações, cron |

### Dependências principais (apps/web)

| Pacote | Versão | Uso |
|--------|--------|-----|
| `@supabase/supabase-js` | 2.43.0 | Cliente Supabase |
| `@supabase/ssr` | 0.4.0 | SSR com cookies |
| `stripe` | 15.0.0 | SDK Stripe |
| `react-hook-form` + `zod` | 7.51.0 / 3.23.0 | Formulários + validação |
| `zustand` | 4.5.0 | Estado global |
| `recharts` | 2.12.0 | Gráficos financeiros |
| `framer-motion` | 12.38.0 | Animações |
| `tailwindcss` | 3.4.0 | Estilização |

### Dependências principais (apps/mobile-consumer)

| Pacote | Versão | Uso |
|--------|--------|-----|
| `expo-router` | 6.0.23 | Navegação file-based |
| `@stripe/stripe-react-native` | 0.50.3 | Checkout Stripe |
| `react-native-maps` | 1.20.1 | Mapa de rastreamento |
| `expo-location` | 19.0.8 | GPS do entregador |
| `expo-notifications` | 0.32.16 | Push notifications |
| `nativewind` | 4.2.3 | Tailwind no RN |

---

## BANCO DE DADOS

### ENUMs

```sql
order_status:    novo | confirmado | em_preparo | aguardando_entregador
                 saiu_para_entrega | entregue | cancelado

payment_status:  pendente | pago | estornado | em_disputa

delivery_status: pendente | aceita | coletada | entregue | cancelada

payout_status:   agendado | processando | concluido | falhou

billing_status:  trial | ativa | em_atraso | cancelada | suspensa

courier_status:  pendente | aprovado | reprovado | suspenso

courier_type:    proprio | autonomo

stock_movement:  entrada | saida_pedido | ajuste_positivo | ajuste_negativo
```

### Diagrama de Entidades

```
auth.users (Supabase Auth)
    │
    ├── tenants (lojistas)
    │       │── tenant_subscriptions ──── plans
    │       │── stores
    │       │       │── products ──── categories
    │       │       └── categories (específicas da loja)
    │       └── couriers (tipo=proprio)
    │
    ├── consumers
    │       └── orders
    │               │── order_items
    │               └── delivery_assignments
    │                       └── courier_locations
    │
    ├── couriers (tipo=autonomo)
    │       └── payouts
    │
    └── [admin via role no JWT]
```

### Tabelas — Resumo

| Tabela | Linhas esperadas (5K lojistas) | Índices críticos |
|--------|-------------------------------|-----------------|
| `plans` | ~5 | — |
| `tenants` | 5.000 | `user_id`, `stripe_customer_id` |
| `tenant_subscriptions` | 5.000 | `tenant_id`, `stripe_subscription_id` |
| `stores` | ~10.000 | `tenant_id`, `slug` |
| `categories` | ~50.000 | `tenant_id`, `store_id` |
| `products` | ~500.000 | `store_id`, `tenant_id`, `category_id` |
| `consumers` | 100.000 | `user_id` |
| `orders` | ~5M/ano | `tenant_id`, `consumer_id`, `status`, `criado_em DESC` |
| `order_items` | ~20M/ano | `order_id` |
| `couriers` | ~5.000 | `user_id`, `tenant_id`, `status`, `online` (partial) |
| `delivery_assignments` | ~5M/ano | `order_id`, `courier_id`, `status` |
| `courier_locations` | ~5.000 (1 row/courier) | `courier_id` (UNIQUE) |
| `payouts` | ~1M/ano | `tenant_id`, `courier_id`, `data_prevista` |
| `payout_advance_requests` | ~200K/ano | `tenant_id`, `payout_id` |
| `push_tokens` | ~150.000 | `user_id`, `courier_id` |
| `stock_movements` | ~1M/ano | `product_id`, `tenant_id` |

### Row Level Security (RLS)

Toda tabela tem RLS habilitado. Isolamento multi-tenant garantido pelo banco — nunca apenas por filtros no código da aplicação.

**Funções helper:**

```sql
my_tenant_id()   -- retorna o tenant_id do lojista autenticado
my_consumer_id() -- retorna o consumer_id do consumidor autenticado
my_courier_id()  -- retorna o courier_id do entregador autenticado
is_admin()       -- verifica role admin no JWT
```

**Matriz de acesso por ator:**

| Tabela | Lojista | Consumidor | Entregador | Admin |
|--------|---------|-----------|-----------|-------|
| `tenants` | Só o seu | ❌ | ❌ | ✅ todos |
| `stores` | Só as suas | Lê ativos | Lê ativos | ✅ todos |
| `products` | Só os seus | Lê disponíveis | Lê disponíveis | ✅ todos |
| `orders` | Do seu tenant | Só os seus | Assignments seus | ✅ todos |
| `couriers` | Próprios seus | ❌ | Só o seu | ✅ todos |
| `courier_locations` | Ativos seus | Entregador do pedido ativo | Só a sua | ✅ todos |
| `payouts` | Só os seus | ❌ | Só os seus | ✅ todos |

---

## AUTENTICAÇÃO E AUTORIZAÇÃO

### Fluxo de Auth

```
1. Usuário faz login → Supabase Auth emite JWT (expiry: 1h)
2. JWT carrega metadata: { role: 'tenant' | 'consumer' | 'courier' | 'admin' }
3. Refresh token rotation: reemissão automática a cada request
4. Reuse interval: 10s (proteção contra race conditions)
5. Server-side: middleware Next.js valida JWT em toda rota protegida
6. Database: RLS usa JWT para filtrar dados automaticamente
```

### Configurações de Auth (supabase/config.toml)

```toml
[auth]
jwt_expiry = 3600                      # 1 hora
enable_refresh_token_rotation = true
refresh_token_reuse_interval = 10      # segundos
enable_signup = true
minimum_password_length = 6
```

### Onboarding por Tipo de Usuário

| Ator | Fluxo | Aprovação |
|------|-------|-----------|
| **Lojista** | Cadastro → Edge Function `onboard-tenant` (cria tenant + store + Stripe Customer + inicia Express onboarding) → aguarda KYC Stripe | Manual (admin) |
| **Consumidor** | Cadastro simples → cria registro em `consumers` | Automática |
| **Entregador** | Cadastro com documentos (CNH, foto) → aguarda aprovação admin → Stripe Express onboarding | Manual (admin) |

---

## ARQUITETURA DE PAGAMENTOS (STRIPE)

### Modelo: Separate Charges and Transfers

```
Consumidor paga R$60,00
(R$50 produto + R$10 frete)
         ↓
Plataforma recebe R$60,00 (Merchant of Record)
         ↓
Stripe desconta ~R$2,28 (taxa ~3,8% + R$0,50)
         ↓
Plataforma retém R$1,00 (comissão por pedido)
         ↓
Saldo a distribuir: ~R$56,72
    ↙                              ↘
Lojista: ~R$46,72              Entregador: R$10,00
D+7 (padrão)                   D+1 automático
ou D+2 pagando R$0,75/pedido
```

### Edge Functions de Pagamento

| Função | Trigger | Responsabilidade |
|--------|---------|-----------------|
| `create-payment-intent` | App consumidor no checkout | Cria PaymentIntent no Stripe com `application_fee` |
| `stripe-webhook` | Stripe (evento `payment_intent.succeeded`) | Confirma pagamento, atualiza `payment_status` |
| `create-subscription` | Onboarding do lojista | Cria Subscription no Stripe Billing |
| `onboard-tenant` | Cadastro do lojista | Cria tenant, store, Stripe Customer, inicia Express onboarding |
| `daily-payouts` | **Cron — 03:00 UTC** (00:00 Brasília) | Processa repasses D+1 (entregadores) e D+7/D+2 (lojistas) |
| `request-advance` | Lojista solicita antecipação | Muda repasse para D+2 com desconto R$0,75/pedido |
| `courier-stripe-info` | App entregador | Consulta status da conta Express do entregador |
| `notify-order-update` | Trigger de DB (webhook) | Envia push notifications via Expo API |

### Fluxo de Repasse (daily-payouts)

```
Cron 03:00 UTC
    ↓
1. Busca delivery_assignments entregues D-1 (entregadores autônomos aprovados)
    ↓ Agrupa por entregador
    ↓ Cria Stripe Transfer para cada um
    ↓ Registra em payouts (tipo=entregador, D+1)
    ↓
2. Busca orders pagas com data_prevista = hoje (lojistas)
    ↓ Agrupa por lojista
    ↓ Aplica desconto de antecipação se solicitado
    ↓ Cria Stripe Transfer para cada lojista
    ↓ Registra em payouts (tipo=lojista, D+7 ou D+2)
    ↓
3. Registra erros na coluna erro_mensagem
```

---

## CICLO DE VIDA DE UM PEDIDO

```
[CONSUMIDOR]                [LOJISTA]               [ENTREGADOR]
     │                          │                        │
     │── Abre app               │                        │
     │── Explora lojas          │                        │
     │── Monta carrinho         │                        │
     │── Checkout               │                        │
     │   └─ Stripe Payment      │                        │
     │      Intent criado       │                        │
     │                          │                        │
     │── Pedido criado ─────────►                        │
     │   status: "novo"         │── Push notification    │
     │                          │── Som no dashboard     │
     │                          │                        │
     │◄─────────────────────────│── Confirma pedido      │
     │   status: "confirmado"   │   status: "em_preparo" │
     │   Push notification      │                        │
     │                          │── Atribui entregador ──►
     │                          │                        │── Push notification
     │                          │                        │── Aceita entrega
     │                          │                        │
     │◄─────────────────────────┼────────────────────────│── Coleta no lojista
     │   status: "saiu_para_    │                        │   status: "coletada"
     │   entrega"               │                        │
     │   Mapa com localização   │                        │── Atualiza GPS a/5s
     │   em tempo real          │                        │
     │◄─────────────────────────┼────────────────────────│── Confirma entrega
     │   status: "entregue"     │   Push notification    │   (foto ou código)
     │   Push notification      │                        │
     │                          │                        │
     └── Avalia loja            └── Repasse agendado     └── Repasse D+1
         e entregador               D+7 ou D+2               agendado
```

---

## REALTIME

Supabase Realtime via WebSocket (PostgreSQL CHANGES). Canais ativos por sessão:

| Canal | Quem assina | Evento | Dados transmitidos |
|-------|------------|--------|--------------------|
| `pedidos-{tenant_id}` | Dashboard lojista | INSERT, UPDATE em `orders` | Novo pedido ou mudança de status |
| `courier_locations` | App consumidor | UPDATE em `courier_locations` | Latitude/longitude do entregador |
| `delivery_assignments-{courier_id}` | App entregador | INSERT em `delivery_assignments` | Nova entrega disponível |

**Importante:** RLS filtra os dados antes de transmitir — lojista só recebe seus pedidos, consumidor só vê a localização do entregador do seu pedido ativo.

---

## PUSH NOTIFICATIONS

Implementadas via **Expo Push API**. Tokens armazenados em `push_tokens`.

| Evento | Destinatário | Trigger |
|--------|-------------|---------|
| Novo pedido | Lojista | INSERT em `orders` |
| Status atualizado | Consumidor | UPDATE `orders.status` |
| Nova entrega disponível | Entregador | INSERT em `delivery_assignments` |
| Entrega confirmada | Lojista | UPDATE `delivery_assignments.status = 'entregue'` |
| Repasse processado | Entregador | UPDATE `payouts.status = 'concluido'` |

Notificações são enviadas em lotes de 100 via a Edge Function `notify-order-update`. Tokens inválidos (`DeviceNotRegistered`) são desativados automaticamente.

---

## ESTRUTURA DO MONOREPO

```
Mall-online/
├── apps/
│   ├── web/                    # Dashboard lojista (Next.js 14)
│   │   ├── app/
│   │   │   ├── (auth)/         # Login, cadastro
│   │   │   └── (dashboard)/    # Pedidos, produtos, financeiro, configurações
│   │   ├── components/
│   │   │   ├── dashboard/      # Componentes específicos do dashboard
│   │   │   └── ui/             # Design system (Button, Card, Modal, etc.)
│   │   ├── lib/
│   │   │   ├── actions/        # Server Actions (mutations)
│   │   │   ├── supabase/       # Clientes SSR e browser
│   │   │   └── format.ts       # Formatadores (moeda, data)
│   │   └── middleware.ts       # Proteção de rotas autenticadas
│   │
│   ├── admin/                  # Painel super admin (Next.js 14)
│   │   └── app/
│   │       ├── lojistas/       # Aprovação e gestão de lojistas
│   │       ├── entregadores/   # Aprovação de entregadores
│   │       ├── planos/         # Gestão de planos e preços
│   │       └── metricas/       # Dashboard de receita e uso
│   │
│   ├── mobile-consumer/        # App consumidor (Expo SDK 54)
│   │   └── app/
│   │       ├── (auth)/         # Login, cadastro
│   │       └── (tabs)/
│   │           ├── index.tsx   # Home — lojas em destaque
│   │           ├── buscar.tsx  # Busca de lojas e produtos
│   │           ├── carrinho.tsx # Carrinho de compras
│   │           └── perfil.tsx  # Pedidos, endereços, perfil
│   │
│   └── mobile-courier/         # App entregador (Expo SDK 54)
│       └── app/
│           ├── (auth)/         # Login, cadastro com documentos
│           └── (tabs)/
│               ├── entregas.tsx # Lista de entregas disponíveis
│               ├── ativa.tsx   # Entrega em andamento + mapa
│               └── ganhos.tsx  # Histórico financeiro
│
├── packages/
│   ├── types/                  # TypeScript types compartilhados
│   │   └── src/
│   │       ├── domain/         # Tipos de domínio do negócio
│   │       └── supabase/       # Types gerados do schema (supabase gen types)
│   └── lib/                    # Utilitários compartilhados
│       └── src/
│           └── format.ts       # formatarReais, formatarData, etc.
│
└── supabase/
    ├── config.toml             # Configuração do projeto local
    ├── migrations/             # 17 migrations SQL (001–017)
    ├── functions/              # 8 Edge Functions (Deno)
    │   ├── create-payment-intent/
    │   ├── create-subscription/
    │   ├── daily-payouts/
    │   ├── stripe-webhook/
    │   ├── notify-order-update/
    │   ├── onboard-tenant/
    │   ├── request-advance/
    │   ├── courier-stripe-info/
    │   └── helpers/            # auth.ts (getSupabaseAdmin)
    ├── templates/
    │   └── confirmacao.html    # Template de e-mail de confirmação
    └── seed.sql                # Dados iniciais (planos, categorias)
```

---

## MIGRATIONS (histórico)

| Migration | Conteúdo |
|-----------|----------|
| `001_additive` | Schema inicial: plans, tenants, stores, products, categories, consumers, orders, order_items |
| `002_stripe_fields` | Campos Stripe em tenants, stores, orders |
| `003_couriers` | Tabelas: couriers, delivery_assignments, courier_locations |
| `004_payouts` | Tabelas: payouts, payout_advance_requests, platform_fee_amount |
| `005_stock` | Tabelas: stock_movements; campos stock_quantity, track_stock em products |
| `006_rls_policies` | RLS policies completas para todos os atores |
| `007_fix_rls_recursion` | Correção de recursão nas policies de lojista |
| `008_admin_locations_policy` | Policy de acesso admin a courier_locations |
| `009_product_images_bucket` | Bucket `product-images` no Storage |
| `010_realtime_tables` | Habilita Realtime em orders, courier_locations, delivery_assignments |
| `011_push_tokens` | Tabela push_tokens para notificações Expo |
| `012_stock_availability_trigger` | Trigger que atualiza disponibilidade ao zerar estoque |
| `013_push_tokens_constraint` | Constraint única em push_tokens |
| `fix_rls` | Correções adicionais de RLS |
| `stores_categoria` | Categorias globais de lojas |
| `get_user_by_email` | Função helper para busca de usuário por email (admin) |
| `update_plans_stripe_ids` | Sincroniza IDs do Stripe nos planos |

---

## DEPLOY E INFRAESTRUTURA

### Ambientes

| Ambiente | Branch | URL | Stripe |
|----------|--------|-----|--------|
| Produção | `main` | `mallora.com.br` | `pk_live_*` |
| Staging | `develop` | `*.vercel.app` | `pk_test_*` |

### Componentes de Infraestrutura

| Componente | Serviço | Plano |
|------------|---------|-------|
| Dashboard web (apps/web) | Vercel | Pro |
| Painel admin (apps/admin) | Vercel | Pro |
| Banco + Auth + Storage + Realtime | Supabase | Pro ($25/mês) |
| Edge Functions + Cron | Supabase | Pro (incluído) |
| Apps mobile | Expo EAS Build | — |
| Pagamentos | Stripe | Pay-as-you-go |

### Variáveis de Ambiente (produção)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # apenas Edge Functions e admin

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
APP_URL=https://mallora.com.br
WEBHOOK_SECRET=<uuid>  # para autenticar chamadas internas às Edge Functions
```

---

## FLUXOS CRÍTICOS — REFERÊNCIA RÁPIDA

### Checkout (consumidor)

```
App → Supabase (cria order com status "novo")
    → Edge Function create-payment-intent
    → Stripe (PaymentIntent com application_fee=100)
    → Stripe webhook → Edge Function stripe-webhook
    → Atualiza payment_status = "pago"
    → Trigger → notify-order-update (push ao lojista)
```

### Rastreamento em tempo real

```
App entregador → Atualiza courier_locations a cada 5s
               → Supabase Realtime publica via WebSocket
               → App consumidor recebe lat/lng
               → Atualiza posição no mapa
```

### Repasse diário (cron)

```
03:00 UTC → daily-payouts Edge Function
          → Query delivery_assignments (entregadores D-1)
          → Stripe Transfer por entregador
          → Query orders (lojistas com data_prevista = hoje)
          → Stripe Transfer por lojista
          → Registra em payouts
          → Trigger → notify-order-update (push ao entregador)
```

---

## TESTES

| Tipo | Cobertura atual | Ferramenta |
|------|----------------|-----------|
| Unitário (Edge Functions) | Pagamentos, webhooks, payouts | Vitest + Deno |
| Integração RLS | Isolamento entre tenants | Script manual (`test-rls-isolation.mjs`) |
| E2E | Definido em docs, pendente implementação | Playwright |
| Carga / Performance | **Não implementado** | — |
| Frontend (componentes) | **Não implementado** | — |
