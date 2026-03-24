# 02 — Arquitetura Técnica & Stack

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISÃO GERAL DA ARQUITETURA

A plataforma é composta por três aplicações frontend independentes que compartilham
um único backend Supabase. Toda comunicação com serviços externos (Stripe, push
notifications) passa obrigatoriamente pelo backend — nunca pelo cliente.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                   │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   apps/web       │  │ apps/mobile-     │  │ apps/mobile-     │  │
│  │  Dashboard       │  │ consumer         │  │ courier          │  │
│  │  Lojista         │  │ App Consumidor   │  │ App Entregador   │  │
│  │  Next.js 14+     │  │ Expo SDK 51      │  │ Expo SDK 51      │  │
│  │  (PWA)           │  │                  │  │                  │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
└───────────┼──────────────────────┼──────────────────────┼───────────┘
            │                      │                      │
            └──────────────────────┼──────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│                         SUPABASE (Backend)                          │
│                                                                     │
│  PostgreSQL   Auth   Storage   Realtime   Edge Functions   Cron     │
│                                                                     │
│  RLS por ator: lojista / consumidor / entregador / admin            │
└──────────────────┬──────────────────────────┬───────────────────────┘
                   │                          │
       ┌───────────▼──────────┐   ┌───────────▼──────────┐
       │       STRIPE         │   │   EXPO PUSH API       │
       │                      │   │                       │
       │  Connect (Express)   │   │  Notificações push    │
       │  Billing             │   │  iOS e Android        │
       │  Webhooks            │   │                       │
       └──────────────────────┘   └───────────────────────┘
```

-----

## DECISÕES ARQUITETURAIS E JUSTIFICATIVAS

### Backend único (Supabase) para os três apps

Todos os apps compartilham o mesmo projeto Supabase. A separação de contexto
entre lojista, consumidor e entregador é feita via Row Level Security (RLS),
não via projetos separados. Isso reduz custo operacional, simplifica deploys
e mantém consistência dos dados em tempo real.

### Separate Charges and Transfers no Stripe

O modelo de split de pagamento escolhido é Separate Charges and Transfers
porque a plataforma precisa de dois destinatários por transação (lojista e
entregador). O Destination Charge suporta apenas um destinatário por transação.
Com Separate Charges and Transfers a plataforma recebe tudo primeiro e depois
faz transfers individuais para cada conta Express — o que também facilita o
controle de antecipação e o tratamento de estornos.

### Repasse por cron (não atômico por transação)

Os repasses são processados por um cron job (Supabase Scheduled Edge Function)
que roda toda meia-noite. Isso simplifica a arquitetura, permite agrupar
múltiplos pedidos num único transfer e facilita o tratamento de cancelamentos
que podem ocorrer após o pagamento.

### Next.js App Router com Server Components

O dashboard do lojista usa Server Components por padrão. Queries ao Supabase
acontecem no servidor — sem exposição de dados sensíveis ao cliente. Client
Components são usados apenas onde há interatividade (formulários, realtime,
modais). Mutations são feitas via Server Actions — sem rotas API intermediárias
para operações simples.

### Expo Router para os apps mobile

Ambos os apps mobile (consumidor e entregador) usam Expo Router, que adota
file-based routing similar ao Next.js. Isso mantém consistência de padrões
entre as três aplicações e facilita a transição de desenvolvedores entre elas.

### Monorepo com pnpm workspaces

As três aplicações e os dois packages compartilhados vivem no mesmo repositório.
pnpm workspaces gerencia as dependências sem duplicação. Tipos TypeScript e
funções utilitárias são compartilhados via packages internos — sem publicação
em npm.

-----

## STACK COMPLETA COM VERSÕES

### Dashboard do Lojista (apps/web)

|Tecnologia     |Versão           |Função              |
|---------------|-----------------|--------------------|
|Next.js        |14.x (App Router)|Framework web       |
|TypeScript     |5.x (strict)     |Linguagem           |
|Tailwind CSS   |3.x              |Estilização         |
|shadcn/ui      |latest           |Componentes UI      |
|Supabase JS    |2.x              |Cliente banco/auth  |
|Stripe JS      |latest           |Cliente pagamentos  |
|React Hook Form|7.x              |Formulários         |
|Zod            |3.x              |Validação de schemas|
|Zustand        |4.x              |Estado global leve  |
|date-fns       |3.x              |Manipulação de datas|
|Recharts       |2.x              |Gráficos financeiros|

### App do Consumidor (apps/mobile-consumer)

|Tecnologia                 |Versão|Função            |
|---------------------------|------|------------------|
|Expo SDK                   |51.x  |Plataforma mobile |
|React Native               |0.74.x|Framework mobile  |
|Expo Router                |3.x   |Navegação         |
|NativeWind                 |4.x   |Tailwind para RN  |
|Supabase JS                |2.x   |Cliente banco/auth|
|@stripe/stripe-react-native|latest|Payment Sheet     |
|Expo Notifications         |latest|Push notifications|
|React Hook Form            |7.x   |Formulários       |
|Zod                        |3.x   |Validação         |
|Zustand                    |4.x   |Estado global     |
|react-native-maps          |latest|Mapa do entregador|

### App do Entregador (apps/mobile-courier)

|Tecnologia        |Versão|Função            |
|------------------|------|------------------|
|Expo SDK          |51.x  |Plataforma mobile |
|React Native      |0.74.x|Framework mobile  |
|Expo Router       |3.x   |Navegação         |
|NativeWind        |4.x   |Tailwind para RN  |
|Supabase JS       |2.x   |Cliente banco/auth|
|Expo Location     |latest|GPS em background |
|Expo Notifications|latest|Push notifications|
|react-native-maps |latest|Mapa de rota      |
|Zustand           |4.x   |Estado global     |

### Backend (Supabase)

|Recurso              |Uso                                         |
|---------------------|--------------------------------------------|
|PostgreSQL 15        |Banco de dados principal                    |
|Supabase Auth        |Autenticação dos 4 atores                   |
|Supabase Storage     |Fotos de produtos, logos, comprovantes      |
|Supabase Realtime    |Pedidos ao vivo, localização do entregador  |
|Edge Functions (Deno)|Lógica de negócio, integrações Stripe       |
|Scheduled Functions  |Cron de repasses (daily-payouts, meia-noite)|
|Row Level Security   |Isolamento de dados por ator e tenant       |

### Packages Compartilhados

|Package       |Conteúdo                                                         |
|--------------|-----------------------------------------------------------------|
|packages/types|Tipos gerados do Supabase + tipos de domínio adicionais          |
|packages/lib  |Clientes Supabase (server/client), helpers monetários, constantes|

### Infraestrutura e Serviços

|Serviço       |Plano             |Função                       |
|--------------|------------------|-----------------------------|
|Vercel Pro    |$20/mês           |Hosting do Next.js, CI/CD    |
|Supabase Pro  |$25/mês           |Backend completo em produção |
|Stripe Connect|Pay-as-you-go     |Pagamentos e repasses        |
|Expo EAS      |Free/Pay-as-you-go|Build e distribuição dos apps|
|Expo Push     |Gratuito          |Notificações push            |

-----

## ESTRUTURA DO MONOREPO

```
/ (raiz)
├── apps/
│   ├── web/                        Dashboard lojista (Next.js)
│   │   ├── app/
│   │   │   ├── (auth)/             Login, cadastro, onboarding
│   │   │   ├── (dashboard)/        Área logada do lojista
│   │   │   │   ├── produtos/
│   │   │   │   ├── pedidos/
│   │   │   │   ├── financeiro/
│   │   │   │   └── configuracoes/
│   │   │   └── (admin)/            Painel super admin
│   │   ├── components/
│   │   │   ├── ui/                 Primitivos shadcn
│   │   │   └── dashboard/          Componentes específicos
│   │   ├── lib/
│   │   │   ├── supabase/           server.ts, client.ts, middleware.ts
│   │   │   ├── stripe/             helpers Stripe server-side
│   │   │   ├── actions/            Server Actions
│   │   │   └── validations/        Schemas Zod
│   │   └── public/
│   │
│   ├── mobile-consumer/            App consumidor (Expo)
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   └── (tabs)/
│   │   │       ├── index.tsx       Home
│   │   │       ├── buscar.tsx
│   │   │       ├── pedidos.tsx
│   │   │       └── perfil.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   └── store/                  Zustand stores
│   │
│   └── mobile-courier/             App entregador (Expo)
│       ├── app/
│       │   ├── (auth)/
│       │   └── (tabs)/
│       │       ├── index.tsx       Entregas disponíveis
│       │       ├── ativa.tsx       Entrega em andamento
│       │       ├── ganhos.tsx
│       │       └── perfil.tsx
│       ├── components/
│       ├── lib/
│       └── store/
│
├── packages/
│   ├── types/
│   │   ├── supabase.ts             Gerado via supabase gen types
│   │   └── domain.ts               Tipos adicionais de domínio
│   └── lib/
│       ├── supabase.ts             Configuração base do cliente
│       ├── money.ts                Helpers para centavos/reais
│       └── constants.ts            Constantes compartilhadas
│
├── supabase/
│   ├── migrations/                 Todas as migrations SQL
│   └── functions/                  Edge Functions (Deno)
│       ├── onboard-tenant/
│       ├── onboard-courier/
│       ├── create-payment-intent/
│       ├── stripe-webhook/
│       ├── daily-payouts/
│       ├── request-advance/
│       └── notify-order-update/
│
├── pnpm-workspace.yaml
├── package.json                    Scripts raiz
└── turbo.json                      Turborepo (opcional)
```

-----

## FLUXO DE DADOS — CENÁRIOS PRINCIPAIS

### Pedido em tempo real (lojista e consumidor)

```
Consumidor cria pedido
      → INSERT em orders (Supabase)
      → Realtime dispara para o dashboard do lojista
      → Lojista vê o pedido instantaneamente
      → Lojista atualiza status
      → Realtime dispara para o app do consumidor
      → Consumidor vê atualização instantânea
```

### Localização do entregador

```
App do entregador (Expo Location)
      → watchPositionAsync a cada 5s
      → UPSERT em courier_locations (Supabase)
      → Realtime transmite para quem tem subscribe no canal do pedido
      → App do consumidor recebe coordenadas e atualiza o mapa
      → Dashboard do lojista recebe coordenadas e atualiza mini-mapa
```

### Pagamento e repasse

```
Consumidor finaliza checkout
      → App chama Edge Function create-payment-intent
      → Edge Function cria PaymentIntent no Stripe (server-side)
      → App abre Stripe Payment Sheet com o client_secret
      → Consumidor confirma pagamento
      → Stripe dispara webhook payment_intent.succeeded
      → Edge Function stripe-webhook atualiza payment_status no banco
      → Pedido confirmado

Cron meia-noite (daily-payouts)
      → Busca pedidos entregues do dia com payment_status = 'paid'
      → Para cada entregador autônomo: Transfer Stripe D+1
      → Para cada lojista: agrupa pedidos, calcula valor, agenda Transfer D+7
      → Para lojistas com antecipação aprovada: Transfer D+2 com desconto R$0,75/pedido
      → Registra em tabela payouts
```

-----

## AUTENTICACAO POR ATOR

A separação de sessões entre os quatro atores é feita dentro do mesmo projeto
Supabase Auth usando metadados no JWT:

|Ator      |Campo no JWT                     |Acesso            |
|----------|---------------------------------|------------------|
|Lojista   |`user_metadata.role = 'tenant'`  |Dashboard web     |
|Consumidor|`user_metadata.role = 'consumer'`|App consumidor    |
|Entregador|`user_metadata.role = 'courier'` |App entregador    |
|Admin     |`user_metadata.role = 'admin'`   |Painel super admin|

As políticas RLS verificam o `role` e o ID correspondente para filtrar os dados.
Detalhes completos das políticas estão no arquivo 05.

-----

## CONVENCOES DE CODIGO

1. TypeScript strict mode em tudo — sem `any` explícito
1. Tipos gerados do Supabase em `packages/types/supabase.ts`
1. Server Components por padrão no Next.js; Client Components apenas quando necessário
1. Mutations via Server Actions — não criar rotas API para operações simples
1. Toda operação Stripe acontece no servidor — nunca expor chaves no cliente
1. Valores monetários sempre em centavos (integer) — nunca float
1. Nomes de variáveis de domínio em português: `pedido`, `loja`, `produto`, `entrega`, `repasse`
1. Comentários em português
1. Componentes em PascalCase, arquivos em kebab-case
1. Nunca hardcodar IDs de plano, tenant ou usuário — sempre via contexto/auth

-----

## PALETA DE CORES (Verde Minas)

|Nome          |Hex    |Uso                                |
|--------------|-------|-----------------------------------|
|Verde Profundo|#1A4D3A|Primary, headers, botões principais|
|Verde Médio   |#4CAF82|Accent, badges de status positivo  |
|Ambar         |#F5A623|CTA, alertas, destaques            |
|Creme         |#FFF8ED|Background geral                   |

A paleta se aplica aos três apps e ao painel admin. Componentes shadcn/ui
e NativeWind são configurados com essas variáveis CSS como tema base.

-----

*Arquivo 02 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 03 — Schema Completo do Banco*
