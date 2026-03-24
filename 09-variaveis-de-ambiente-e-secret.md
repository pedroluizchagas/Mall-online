# 09 — Variáveis de Ambiente e Secrets

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## REGRAS FUNDAMENTAIS

1. Nunca commitar arquivos `.env` ou `.env.local` no repositório
1. Commitar apenas o `.env.example` com valores fictícios como referência
1. Variáveis com prefixo `NEXT_PUBLIC_` são expostas ao navegador — nunca colocar secrets nelas
1. Variáveis com prefixo `EXPO_PUBLIC_` são expostas no bundle do app — nunca colocar secrets nelas
1. Chaves secretas (Stripe secret key, service_role) ficam apenas no servidor
1. Cada ambiente (local, staging, produção) tem seu próprio conjunto de chaves

-----

## AMBIENTES

|Ambiente   |Onde roda               |Chaves Stripe          |Supabase                       |
|-----------|------------------------|-----------------------|-------------------------------|
|Local (dev)|Máquina do desenvolvedor|`pk_test_` / `sk_test_`|Projeto local ou projeto de dev|
|Staging    |Vercel preview          |`pk_test_` / `sk_test_`|Projeto Supabase de staging    |
|Produção   |Vercel production       |`pk_live_` / `sk_live_`|Projeto Supabase de produção   |

-----

## TODAS AS VARIÁVEIS DE AMBIENTE

### Supabase

|Variável                       |Onde usar                       |Como obter                                                    |
|-------------------------------|--------------------------------|--------------------------------------------------------------|
|`NEXT_PUBLIC_SUPABASE_URL`     |Web + Edge Functions            |Supabase Dashboard > Project Settings > API > Project URL     |
|`NEXT_PUBLIC_SUPABASE_ANON_KEY`|Web + Mobile                    |Supabase Dashboard > Project Settings > API > anon public     |
|`SUPABASE_SERVICE_ROLE_KEY`    |Apenas servidor / Edge Functions|Supabase Dashboard > Project Settings > API > service_role    |
|`SUPABASE_PROJECT_ID`          |CLI (migrations, gen types)     |Supabase Dashboard > Project Settings > General > Reference ID|

A `SUPABASE_SERVICE_ROLE_KEY` bypassa o RLS. Nunca expor ao cliente.
Usada apenas dentro de Edge Functions e Server Actions com `createClient` server-side.

### Stripe

|Variável                            |Onde usar                       |Como obter                                                |
|------------------------------------|--------------------------------|----------------------------------------------------------|
|`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`|Dashboard web (cliente)         |Stripe Dashboard > Developers > API Keys > Publishable key|
|`EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`|Apps mobile (cliente)           |Mesma chave acima                                         |
|`STRIPE_SECRET_KEY`                 |Apenas servidor / Edge Functions|Stripe Dashboard > Developers > API Keys > Secret key     |
|`STRIPE_WEBHOOK_SECRET`             |Edge Function stripe-webhook    |Stripe Dashboard > Developers > Webhooks > Signing secret |

Em desenvolvimento, usar chaves `pk_test_` e `sk_test_`.
O `STRIPE_WEBHOOK_SECRET` local é gerado pelo Stripe CLI com `stripe listen`.

### Aplicação

|Variável             |Onde usar                               |Valor                                                      |
|---------------------|----------------------------------------|-----------------------------------------------------------|
|`APP_URL`            |Edge Functions (URLs de callback Stripe)|`http://localhost:3000` em dev / URL do domínio em produção|
|`EXPO_PUBLIC_APP_URL`|Apps mobile                             |Mesma URL acima                                            |

-----

## ARQUIVO .env.local (apps/web)

Criar este arquivo na pasta `apps/web/`. Nunca commitar.

```bash
# ============================================================
# SUPABASE
# ============================================================

# URL pública do projeto Supabase (exposta ao cliente)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co

# Chave anônima — permissões limitadas pelo RLS (exposta ao cliente)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx

# Chave service_role — bypassa RLS (APENAS servidor, nunca expor)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx

# ID do projeto (usado pelo CLI)
SUPABASE_PROJECT_ID=xxxxxxxxxxxx

# ============================================================
# STRIPE
# ============================================================

# Chave pública — segura para expor ao cliente
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Chave secreta — APENAS servidor, nunca expor ao cliente
STRIPE_SECRET_KEY=sk_test_xxx

# Secret para verificação de assinatura dos webhooks
# Em dev: gerado pelo comando 'stripe listen'
STRIPE_WEBHOOK_SECRET=whsec_xxx

# ============================================================
# APLICACAO
# ============================================================

# URL base do dashboard (usado nas URLs de callback do Stripe Connect)
APP_URL=http://localhost:3000
```

-----

## ARQUIVO .env.local (apps/mobile-consumer)

Criar na pasta `apps/mobile-consumer/`. Nunca commitar.

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx

# Stripe (chave pública apenas)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# URL da aplicação web (para deep links e callbacks)
EXPO_PUBLIC_APP_URL=http://localhost:3000
```

-----

## ARQUIVO .env.local (apps/mobile-courier)

Criar na pasta `apps/mobile-courier/`. Nunca commitar.

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx

# URL da aplicação web
EXPO_PUBLIC_APP_URL=http://localhost:3000
```

-----

## VARIÁVEIS NAS EDGE FUNCTIONS (Supabase)

As Edge Functions recebem variáveis via `Deno.env.get()`. O Supabase
injeta automaticamente `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
em todas as functions. As demais precisam ser configuradas manualmente.

### Configurar via Supabase CLI

```bash
# Definir variável de ambiente para as Edge Functions
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
supabase secrets set APP_URL=http://localhost:3000

# Listar secrets configurados
supabase secrets list
```

### Configurar via Supabase Dashboard (produção)

```
Supabase Dashboard
  → Edge Functions
  → Manage secrets
  → Add secret
```

Secrets necessários nas Edge Functions:

|Secret                 |Descrição                      |
|-----------------------|-------------------------------|
|`STRIPE_SECRET_KEY`    |Chave secreta Stripe           |
|`STRIPE_WEBHOOK_SECRET`|Secret de assinatura do webhook|
|`APP_URL`              |URL base do dashboard web      |

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetados automaticamente
pelo Supabase — não precisam ser configurados manualmente.

-----

## CONFIGURAÇÃO NO VERCEL

### Dashboard web (apps/web)

```
Vercel Dashboard
  → Projeto web
  → Settings
  → Environment Variables
```

Adicionar para cada ambiente (Production, Preview, Development):

|Nome                                |Production              |Preview               |
|------------------------------------|------------------------|----------------------|
|`NEXT_PUBLIC_SUPABASE_URL`          |URL do projeto prod     |URL do projeto staging|
|`NEXT_PUBLIC_SUPABASE_ANON_KEY`     |Anon key prod           |Anon key staging      |
|`SUPABASE_SERVICE_ROLE_KEY`         |Service role prod       |Service role staging  |
|`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`|`pk_live_xxx`           |`pk_test_xxx`         |
|`STRIPE_SECRET_KEY`                 |`sk_live_xxx`           |`sk_test_xxx`         |
|`STRIPE_WEBHOOK_SECRET`             |Secret prod             |Secret staging        |
|`APP_URL`                           |`https://mallora.com.br`|URL do preview Vercel |

### Como configurar via Vercel CLI

```bash
# Instalar Vercel CLI
pnpm add -g vercel

# Autenticar
vercel login

# Vincular projeto
vercel link

# Adicionar variável de produção
vercel env add STRIPE_SECRET_KEY production

# Adicionar para todos os ambientes
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_URL development

# Listar variáveis configuradas
vercel env ls
```

-----

## CONFIGURAÇÃO NO EXPO EAS (apps mobile)

Para builds na nuvem via EAS Build, as variáveis de ambiente são
configuradas no arquivo `eas.json` e no dashboard do Expo.

### eas.json (apps/mobile-consumer e apps/mobile-courier)

```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://xxxxxxxxxxxx.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJxxx",
        "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY": "pk_test_xxx",
        "EXPO_PUBLIC_APP_URL": "https://staging.mallora.com.br"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://xxxxxxxxxxxx.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJxxx",
        "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY": "pk_test_xxx",
        "EXPO_PUBLIC_APP_URL": "https://staging.mallora.com.br"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://xxxxxxxxxxxx.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJxxx",
        "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY": "pk_live_xxx",
        "EXPO_PUBLIC_APP_URL": "https://mallora.com.br"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

Para secrets que não devem ficar no `eas.json` (como chaves que precisam
ficar apenas no servidor), usar o EAS Secrets:

```bash
# Instalar EAS CLI
pnpm add -g eas-cli

# Autenticar
eas login

# Adicionar secret (não aparece no eas.json)
eas secret:create --scope project --name SUPABASE_SERVICE_ROLE_KEY --value eyJxxx
```

-----

## ONDE OBTER CADA CHAVE

### Supabase

```
1. Acessar https://supabase.com/dashboard
2. Selecionar o projeto
3. Settings (engrenagem no menu lateral)
4. API
   → Project URL         = SUPABASE_URL
   → anon public         = SUPABASE_ANON_KEY
   → service_role secret = SUPABASE_SERVICE_ROLE_KEY
5. General
   → Reference ID        = SUPABASE_PROJECT_ID
```

### Stripe — Chaves de API

```
1. Acessar https://dashboard.stripe.com
2. Developers (menu superior)
3. API Keys
   → Publishable key = STRIPE_PUBLISHABLE_KEY
   → Secret key      = STRIPE_SECRET_KEY
   (clicar em 'Reveal' para ver a secret key)
```

### Stripe — Webhook Secret (produção)

```
1. Stripe Dashboard
2. Developers
3. Webhooks
4. Add endpoint
   → URL: https://xxxxxxxxxxxx.supabase.co/functions/v1/stripe-webhook
   → Selecionar todos os eventos listados no arquivo 07
5. Após criar, clicar no endpoint
6. Signing secret → Reveal
   = STRIPE_WEBHOOK_SECRET
```

### Stripe — Webhook Secret (desenvolvimento local)

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Autenticar
stripe login

# Escutar e reencaminhar para Supabase local
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# O terminal exibirá:
# Ready! Your webhook signing secret is whsec_xxx
# Copiar esse valor para STRIPE_WEBHOOK_SECRET no .env.local
```

-----

## .env.example (raiz do repositório)

Este arquivo é commitado no repositório como referência.
Nunca colocar valores reais aqui.

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
SUPABASE_PROJECT_ID=seu-project-id-aqui

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_sua_chave_aqui
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_sua_chave_aqui
STRIPE_SECRET_KEY=sk_test_sua_chave_aqui
STRIPE_WEBHOOK_SECRET=whsec_sua_chave_aqui

# Expo (mobile)
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui

# Aplicacao
APP_URL=http://localhost:3000
EXPO_PUBLIC_APP_URL=http://localhost:3000
```

-----

## CHECKLIST DE CONFIGURACAO

### Antes de rodar localmente

- [ ] Criar `apps/web/.env.local` com todas as variáveis
- [ ] Criar `apps/mobile-consumer/.env.local` com as variáveis Expo
- [ ] Criar `apps/mobile-courier/.env.local` com as variáveis Expo
- [ ] Configurar secrets nas Edge Functions via `supabase secrets set`
- [ ] Rodar `stripe listen` para obter o `STRIPE_WEBHOOK_SECRET` local
- [ ] Confirmar que `.env.local` está no `.gitignore`

### Antes de fazer deploy em produção

- [ ] Configurar todas as variáveis no Vercel (Production environment)
- [ ] Usar chaves `pk_live_` e `sk_live_` no ambiente de produção
- [ ] Configurar secrets nas Edge Functions do projeto Supabase de produção
- [ ] Registrar o endpoint de webhook de produção no Stripe Dashboard
- [ ] Confirmar que o `STRIPE_WEBHOOK_SECRET` de produção está correto
- [ ] Confirmar que `APP_URL` aponta para o domínio de produção
- [ ] Verificar que nenhuma chave de teste (`pk_test_`, `sk_test_`) está no ambiente de produção

-----

*Arquivo 09 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 10 — Auth e Onboarding do Lojista*
