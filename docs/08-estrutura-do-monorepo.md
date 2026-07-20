# 08 — Estrutura do Monorepo

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

O projeto é um monorepo gerenciado com pnpm workspaces. As aplicações
independentes (web, mobile-consumer, mobile-courier, mobile-partner,
storefront, admin) compartilham dois packages internos (types, lib). As Edge
Functions do Supabase ficam na raiz do repositório, fora das aplicações.

Vantagens desta estrutura:

- Tipos TypeScript compartilhados entre todos os apps sem duplicação
- Helpers e constantes de negócio em um único lugar
- Scripts de desenvolvimento e build unificados na raiz
- Um único repositório Git para todo o projeto

-----

## ARVORE COMPLETA DE PASTAS

```
/ (raiz do repositório)
│
├── apps/
│   ├── web/                Dashboard do lojista (Next.js)
│   ├── admin/              Painel super admin (Next.js)
│   ├── storefront/         Vitrine web pública ({loja}.mallevo.com.br)
│   ├── mobile-consumer/    App do consumidor (Expo)
│   ├── mobile-courier/     App do entregador (Expo)
│   └── mobile-partner/     App do lojista (Expo) — docs/partner-app/
│
├── packages/
│   ├── types/
│   └── lib/
│
├── supabase/
│   ├── migrations/
│   └── functions/
│
├── pnpm-workspace.yaml
├── package.json
├── turbo.json
├── .gitignore
├── .env.example
└── README.md
```

-----

## CONFIGURACAO DO MONOREPO

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### package.json (raiz)

```json
{
  "name": "mallevo-monorepo",
  "private": true,
  "scripts": {
    "dev:web": "pnpm --filter web dev",
    "dev:consumer": "pnpm --filter mobile-consumer start",
    "dev:courier": "pnpm --filter mobile-courier start",
    "build:web": "pnpm --filter web build",
    "lint": "pnpm --filter '*' lint",
    "types:generate": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > packages/types/src/supabase.ts",
    "db:push": "supabase db push",
    "db:reset": "supabase db reset"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    }
  }
}
```

-----

## APPS/WEB — DASHBOARD DO LOJISTA

```
apps/web/
│
├── app/                              App Router do Next.js
│   │
│   ├── layout.tsx                    Layout raiz (fontes, providers)
│   ├── page.tsx                      Redirect para /entrar ou /dashboard
│   │
│   ├── (auth)/                       Grupo sem sidebar/header
│   │   ├── layout.tsx
│   │   ├── entrar/
│   │   │   └── page.tsx              Tela de login
│   │   ├── cadastro/
│   │   │   └── page.tsx              Tela de cadastro
│   │   └── onboarding/
│   │       ├── page.tsx              Wizard de onboarding (4 etapas)
│   │       └── recebimentos/
│   │           ├── page.tsx          Coleta de dados bancários ou chave Pix
│   │           └── kyc/
│   │               └── page.tsx      Embeds o link KYC do Pagar.me
│   │
│   ├── (dashboard)/                  Grupo com sidebar e header
│   │   ├── layout.tsx                Sidebar + Header + verificação de auth
│   │   ├── page.tsx                  Redirect para /dashboard/pedidos
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.tsx              Visão geral (KPIs do dia)
│   │   │
│   │   ├── produtos/
│   │   │   ├── page.tsx              Listagem de produtos
│   │   │   ├── novo/
│   │   │   │   └── page.tsx          Formulário de criação
│   │   │   └── [id]/
│   │   │       └── page.tsx          Formulário de edição
│   │   │
│   │   ├── categorias/
│   │   │   └── page.tsx              Gestão de categorias
│   │   │
│   │   ├── pedidos/
│   │   │   ├── page.tsx              Lista de pedidos (Realtime)
│   │   │   └── [id]/
│   │   │       └── page.tsx          Detalhes do pedido
│   │   │
│   │   ├── financeiro/
│   │   │   └── page.tsx              Dashboard financeiro e repasses
│   │   │
│   │   └── configuracoes/
│   │       ├── page.tsx              Dados da loja
│   │       ├── horarios/
│   │       │   └── page.tsx          Horários de funcionamento
│   │       └── assinatura/
│   │           └── page.tsx          Gestão da assinatura
│   │
│   └── (admin)/                      Grupo super admin
│       ├── layout.tsx                Verificação de role = 'admin'
│       └── admin/
│           ├── page.tsx              Visão geral da plataforma
│           ├── lojistas/
│           │   ├── page.tsx          Listagem de tenants
│           │   └── [id]/
│           │       └── page.tsx      Detalhes do tenant
│           ├── entregadores/
│           │   ├── page.tsx          Listagem e aprovações
│           │   └── [id]/
│           │       └── page.tsx      Detalhes do entregador
│           ├── planos/
│           │   └── page.tsx          Gestão de planos
│           └── financeiro/
│               └── page.tsx          Conciliação financeira
│
├── components/
│   ├── ui/                           Componentes shadcn/ui (gerados pelo CLI)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   └── ...
│   │
│   └── dashboard/                    Componentes específicos da aplicação
│       ├── sidebar.tsx
│       ├── header.tsx
│       ├── pedido-card.tsx
│       ├── produto-form.tsx
│       ├── status-badge.tsx
│       ├── repasse-card.tsx
│       └── ...
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts                 Cliente Supabase para Server Components
│   │   ├── client.ts                 Cliente Supabase para Client Components
│   │   └── middleware.ts             Verificação de sessão nas rotas
│   │
│   ├── pagarme/
│   │   ├── server.ts                 Cliente Pagar.me REST (Basic Auth)
│   │   └── webhook.ts                Verificação HMAC SHA-256
│   │
│   ├── stripe/
│   │   └── server.ts                 Cliente Stripe (apenas Stripe Billing)
│   │
│   ├── actions/                      Server Actions
│   │   ├── auth.ts                   Login, logout, signup
│   │   ├── produtos.ts               CRUD de produtos
│   │   ├── categorias.ts             CRUD de categorias
│   │   ├── pedidos.ts                Atualização de status
│   │   ├── lojas.ts                  Configurações da loja
│   │   └── financeiro.ts             Solicitação de antecipação
│   │
│   └── validations/                  Schemas Zod
│       ├── produto.ts
│       ├── loja.ts
│       └── onboarding.ts
│
├── middleware.ts                      Proteção de rotas (Next.js Middleware)
│
├── public/
│   ├── manifest.json                 PWA manifest
│   └── icons/                        Ícones do PWA
│
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### package.json (apps/web)

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@mallevo/lib": "workspace:*",
    "@mallevo/types": "workspace:*",
    "@supabase/ssr": "^0.4.0",
    "@supabase/supabase-js": "^2.43.0",
    "next": "14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "stripe": "^15.0.0",
    "react-hook-form": "^7.51.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.3.0",
    "zustand": "^4.5.0",
    "date-fns": "^3.6.0",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "typescript": "^5",
    "tailwindcss": "^3.4.0",
    "eslint": "^8",
    "eslint-config-next": "14.2.0"
  }
}
```

### next.config.ts

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'mallevo.com.br'],
    },
  },
}

export default nextConfig
```

### middleware.ts (apps/web)

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redirecionar para login se não autenticado
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/entrar', request.url))
  }

  // Redirecionar para dashboard se já autenticado tentando acessar auth
  if (user && (
    request.nextUrl.pathname.startsWith('/entrar') ||
    request.nextUrl.pathname.startsWith('/cadastro')
  )) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Verificar role admin para rotas /admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const role = user?.user_metadata?.role
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/entrar', '/cadastro'],
}
```

-----

## APPS/MOBILE-CONSUMER — APP DO CONSUMIDOR

```
apps/mobile-consumer/
│
├── app/                              Expo Router (file-based)
│   ├── _layout.tsx                   Layout raiz (providers, fonts)
│   │
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── boas-vindas.tsx           Onboarding slides
│   │   ├── entrar.tsx                Login (Magic Link / OTP)
│   │   └── cadastro.tsx              Nome e dados básicos
│   │
│   └── (tabs)/
│       ├── _layout.tsx               Tab bar (Home, Buscar, Pedidos, Perfil)
│       ├── index.tsx                 Home
│       ├── buscar.tsx                Busca global de lojas e produtos
│       ├── pedidos.tsx               Histórico de pedidos
│       └── perfil.tsx                Perfil e endereços
│
├── app/
│   ├── loja/
│   │   └── [slug].tsx                Página da loja
│   ├── produto/
│   │   └── [id].tsx                  Modal de produto (stack)
│   ├── checkout.tsx                  Checkout e Payment Sheet
│   └── pedido/
│       └── [id].tsx                  Acompanhamento do pedido
│
├── components/
│   ├── loja-card.tsx
│   ├── produto-card.tsx
│   ├── carrinho-bottom-sheet.tsx
│   ├── mapa-entregador.tsx
│   └── status-timeline.tsx
│
├── lib/
│   ├── supabase.ts                   Cliente Supabase para Expo
│   └── pagarme.ts                    Helper para chamar create-pagarme-order
│
├── store/
│   ├── useAuthStore.ts               Sessão e dados do consumidor
│   ├── useCartStore.ts               Itens do carrinho
│   └── useOrderStore.ts              Pedido ativo em acompanhamento
│
├── app.json
├── eas.json
├── babel.config.js
├── tsconfig.json
└── package.json
```

### package.json (apps/mobile-consumer)

```json
{
  "name": "mobile-consumer",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "lint": "eslint ."
  },
  "dependencies": {
    "@mallevo/lib": "workspace:*",
    "@mallevo/types": "workspace:*",
    "@supabase/supabase-js": "^2.43.0",
    "expo": "~51.0.0",
    "expo-router": "~3.5.0",
    "expo-notifications": "~0.28.0",
    "expo-location": "~17.0.0",
    "react-native": "0.74.0",
    "react-native-maps": "1.14.0",
    "nativewind": "^4.0.1",
    "zustand": "^4.5.0",
    "react-hook-form": "^7.51.0",
    "zod": "^3.23.0"
  }
}
```

-----

## APPS/MOBILE-COURIER — APP DO ENTREGADOR

```
apps/mobile-courier/
│
├── app/
│   ├── _layout.tsx
│   │
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── entrar.tsx
│   │   └── cadastro.tsx              Cadastro do entregador
│   │
│   └── (tabs)/
│       ├── _layout.tsx               Tab bar (Entregas, Ativa, Ganhos, Perfil)
│       ├── index.tsx                 Lista de entregas disponíveis
│       ├── ativa.tsx                 Entrega em andamento
│       ├── ganhos.tsx                Dashboard de ganhos
│       └── perfil.tsx                Perfil e conta de recebimentos (Pagar.me)
│
├── app/
│   └── entrega/
│       └── [id].tsx                  Detalhes da entrega aceita
│
├── components/
│   ├── entrega-card.tsx
│   ├── mapa-rota.tsx
│   ├── toggle-disponivel.tsx
│   └── confirmacao-entrega.tsx
│
├── lib/
│   └── supabase.ts
│
├── store/
│   ├── useAuthStore.ts
│   ├── useEntregaStore.ts            Entrega ativa
│   └── useLocalizacaoStore.ts        Estado do GPS
│
├── app.json
├── eas.json
├── babel.config.js
├── tsconfig.json
└── package.json
```

### package.json (apps/mobile-courier)

```json
{
  "name": "mobile-courier",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "lint": "eslint ."
  },
  "dependencies": {
    "@mallevo/lib": "workspace:*",
    "@mallevo/types": "workspace:*",
    "@supabase/supabase-js": "^2.43.0",
    "expo": "~51.0.0",
    "expo-router": "~3.5.0",
    "expo-notifications": "~0.28.0",
    "expo-location": "~17.0.0",
    "react-native": "0.74.0",
    "react-native-maps": "1.14.0",
    "nativewind": "^4.0.1",
    "zustand": "^4.5.0"
  }
}
```

-----

## PACKAGES/TYPES

```
packages/types/
│
├── src/
│   ├── supabase.ts                   Gerado por: pnpm types:generate
│   └── domain.ts                     Tipos adicionais de domínio
│
├── index.ts                          Re-exporta tudo
├── tsconfig.json
└── package.json
```

### package.json (packages/types)

```json
{
  "name": "@mallevo/types",
  "version": "0.0.1",
  "private": true,
  "main": "./index.ts",
  "types": "./index.ts",
  "exports": {
    ".": "./index.ts"
  }
}
```

### src/domain.ts — tipos adicionais

```typescript
// Tipos que não vêm do schema do Supabase mas são usados na aplicação

export type OrderStatus =
  | 'novo'
  | 'confirmado'
  | 'em_preparo'
  | 'aguardando_entregador'
  | 'saiu_para_entrega'
  | 'entregue'
  | 'cancelado'

export type PaymentStatus = 'pendente' | 'pago' | 'estornado' | 'em_disputa'

export type BillingStatus = 'trial' | 'ativa' | 'em_atraso' | 'cancelada' | 'suspensa'

export type CourierStatus = 'pendente' | 'aprovado' | 'reprovado' | 'suspenso'

export type PayoutStatus = 'agendado' | 'processando' | 'concluido' | 'falhou'

// Endereço (usado em consumers.enderecos e orders.endereco_entrega)
export interface Endereco {
  apelido?: string        // ex: 'Casa', 'Trabalho'
  rua: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  latitude?: number
  longitude?: number
}

// Item do carrinho (estado local — não vem do banco)
export interface ItemCarrinho {
  product_id: string
  nome: string
  preco: number           // em centavos
  quantidade: number
  foto_url?: string
  observacoes?: string
}

// Horários de funcionamento da loja
export interface HorariosFuncionamento {
  seg?: { abre: string; fecha: string } | null
  ter?: { abre: string; fecha: string } | null
  qua?: { abre: string; fecha: string } | null
  qui?: { abre: string; fecha: string } | null
  sex?: { abre: string; fecha: string } | null
  sab?: { abre: string; fecha: string } | null
  dom?: { abre: string; fecha: string } | null
}
```

-----

## PACKAGES/LIB

```
packages/lib/
│
├── src/
│   ├── supabase.ts                   Configuração base do cliente Supabase
│   ├── money.ts                      Helpers para centavos/reais
│   ├── date.ts                       Helpers de data (fuso horário BR)
│   └── constants.ts                  Constantes compartilhadas
│
├── index.ts
├── tsconfig.json
└── package.json
```

### package.json (packages/lib)

```json
{
  "name": "@mallevo/lib",
  "version": "0.0.1",
  "private": true,
  "main": "./index.ts",
  "types": "./index.ts",
  "exports": {
    ".": "./index.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.43.0"
  }
}
```

### src/money.ts

```typescript
// Converter centavos para real formatado
export function formatarReais(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100)
}

// Converter real para centavos (para armazenar no banco)
export function reaisParaCentavos(valor: number): number {
  return Math.round(valor * 100)
}

// Calcular taxa de antecipação
export function calcularTaxaAntecipacao(totalPedidos: number): number {
  return totalPedidos * 75 // R$0,75 em centavos por pedido
}
```

### src/constants.ts

```typescript
export const PLATFORM_FEE_CENTAVOS = 100          // R$1,00 por pedido
export const TAXA_ANTECIPACAO_CENTAVOS = 75        // R$0,75 por pedido antecipado
export const REPASSE_LOJISTA_DIAS = 7              // D+7
export const REPASSE_ENTREGADOR_DIAS = 1           // D+1
export const REPASSE_ANTECIPADO_DIAS = 2           // D+2
export const TRIAL_DIAS = 14                       // dias de trial para novos lojistas
export const LOCATION_UPDATE_INTERVAL_MS = 5000    // atualização GPS a cada 5s
export const MAX_RECUSAS_ENTREGA = 3               // entregador sai da fila após 3 recusas
```

-----

## SUPABASE — EDGE FUNCTIONS E MIGRATIONS

```
supabase/
│
├── migrations/
│   ├── 20240101000000_migration_001_additive.sql     (aplicada)
│   ├── 20240102000000_migration_002_payment_fields.sql
│   ├── 20240103000000_migration_003_couriers.sql
│   ├── 20240104000000_migration_004_payouts.sql
│   └── 20240105000000_migration_005_stock.sql
│
├── functions/
│   ├── helpers/
│   │   ├── auth.ts                   Reutilizado por todas as functions
│   │   └── pagarme.ts                Cliente Pagar.me REST + verificação HMAC
│   ├── onboard-tenant/
│   │   └── index.ts
│   ├── onboard-courier/
│   │   └── index.ts
│   ├── create-pagarme-order/
│   │   └── index.ts
│   ├── transfer-to-courier/
│   │   └── index.ts
│   ├── pagarme-webhook/
│   │   └── index.ts
│   ├── create-subscription/
│   │   └── index.ts
│   ├── stripe-webhook/               (apenas Stripe Billing)
│   │   └── index.ts
│   ├── request-advance/
│   │   └── index.ts
│   └── notify-order-update/
│       └── index.ts
│
└── config.toml                        Configuração do Supabase CLI
```

-----

## CONFIGURACOES COMPARTILHADAS

### .gitignore (raiz)

```
node_modules/
.env
.env.local
.env.*.local
.next/
dist/
.expo/
*.tsbuildinfo
```

### .env.example (raiz — commitar este, nunca o .env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
SUPABASE_PROJECT_ID=xxxxxxxxxxxx

# Pagar.me (pagamentos de pedidos)
PAGARME_API_KEY=ak_test_xxx
PAGARME_WEBHOOK_SECRET=whsec_xxx
PAGARME_PLATFORM_RECIPIENT_ID=rp_test_xxx

# Stripe Billing (apenas assinatura — sem chave pública mobile)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx     # uso restrito ao Customer Portal web
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# App
APP_URL=http://localhost:3000
```

### tsconfig.json (raiz — base compartilhada)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "skipLibCheck": true,
    "paths": {
      "@mallevo/types": ["../../packages/types/index.ts"],
      "@mallevo/lib": ["../../packages/lib/index.ts"]
    }
  }
}
```

-----

## INICIALIZANDO O PROJETO DO ZERO

```bash
# 1. Clonar ou criar o repositório
git init mallevo
cd mallevo

# 2. Criar estrutura base
mkdir -p apps packages supabase/migrations supabase/functions

# 3. Configurar pnpm
corepack enable
corepack prepare pnpm@latest --activate

# 4. Criar os apps
cd apps
npx create-next-app@14 web --typescript --tailwind --app --src-dir no
npx create-expo-app mobile-consumer --template blank-typescript
npx create-expo-app mobile-courier --template blank-typescript
cd ..

# 5. Instalar dependências
pnpm install

# 6. Configurar Supabase CLI
pnpm add -g supabase
supabase login
supabase init
supabase link --project-ref $SUPABASE_PROJECT_ID

# 7. Gerar tipos TypeScript do banco
pnpm types:generate

# 8. Aplicar migrations pendentes
pnpm db:push
```

-----

*Arquivo 08 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 09 — Variáveis de Ambiente e Secrets*
