# 09 — Variáveis de Ambiente e Secrets

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## REGRAS FUNDAMENTAIS

1. Nunca commitar arquivos `.env` ou `.env.local` no repositório
1. Commitar apenas o `.env.example` com valores fictícios como referência
1. Variáveis com prefixo `NEXT_PUBLIC_` são expostas ao navegador — nunca colocar secrets nelas
1. Variáveis com prefixo `EXPO_PUBLIC_` são expostas no bundle do app — nunca colocar secrets nelas
1. Chaves secretas (Pagar.me API key, Stripe secret key, Supabase service_role) ficam apenas no servidor
1. Cada ambiente (local, staging, produção) tem seu próprio conjunto de chaves

-----

## AMBIENTES

|Ambiente   |Onde roda               |Pagar.me                          |Stripe Billing         |Supabase                       |
|-----------|------------------------|----------------------------------|-----------------------|-------------------------------|
|Local (dev)|Máquina do desenvolvedor|`ak_test_`                        |`sk_test_`             |Projeto local ou de dev        |
|Staging    |Vercel preview          |`ak_test_`                        |`sk_test_`             |Projeto Supabase de staging    |
|Produção   |Vercel production       |`ak_live_`                        |`sk_live_`             |Projeto Supabase de produção   |

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

### Pagar.me (gateway de pedidos)

|Variável                          |Onde usar                            |Como obter                                                          |
|----------------------------------|-------------------------------------|--------------------------------------------------------------------|
|`PAGARME_API_KEY`                 |Apenas servidor / Edge Functions     |Pagar.me Dashboard > Developer > API Keys                           |
|`PAGARME_WEBHOOK_SECRET`          |Edge Function pagarme-webhook        |Pagar.me Dashboard > Developer > Webhooks > Signing secret          |
|`PAGARME_PLATFORM_RECIPIENT_ID`   |Apenas servidor / Edge Functions     |`rp_xxx` do recipient principal da Mallora (criado no onboarding)   |
|`EXPO_PUBLIC_PAGARME_APPID`       |App mobile-consumer (tokenização)    |Pagar.me Dashboard > Developer > App IDs (`appid_test_*` / `appid_live_*`)|

Em desenvolvimento, usar chaves `ak_test_` e webhook secret de sandbox. A
`PAGARME_API_KEY` nunca aparece no cliente — somente em Edge Functions e
Server Actions. A tokenização do cartão é **obrigatoriamente** feita no
cliente via `POST /core/v5/tokens?appId=$EXPO_PUBLIC_PAGARME_APPID`; o
backend recebe apenas `card_token`. Nunca enviar número/CVV ao Supabase.

### Stripe Billing (apenas assinatura mensal)

|Variável                            |Onde usar                       |Como obter                                                |
|------------------------------------|--------------------------------|----------------------------------------------------------|
|`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`|Dashboard web (Customer Portal) |Stripe Dashboard > Developers > API Keys > Publishable key|
|`STRIPE_SECRET_KEY`                 |Apenas servidor / Edge Functions|Stripe Dashboard > Developers > API Keys > Secret key     |
|`STRIPE_WEBHOOK_SECRET`             |Edge Function stripe-webhook    |Stripe Dashboard > Developers > Webhooks > Signing secret |

Em desenvolvimento, usar chaves `pk_test_` e `sk_test_`. O
`STRIPE_WEBHOOK_SECRET` local é gerado pelo Stripe CLI com `stripe listen`.

A `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` foi **descontinuada** — os apps mobile
não usam Stripe em nenhum fluxo (pagamentos passam pelo Pagar.me via Edge
Function).

### Aplicação

|Variável             |Onde usar                                 |Valor                                                      |
|---------------------|------------------------------------------|-----------------------------------------------------------|
|`APP_URL`            |Edge Functions (URLs de retorno e KYC link)|`http://localhost:3000` em dev / URL do domínio em produção|
|`EXPO_PUBLIC_APP_URL`|Apps mobile                               |Mesma URL acima                                            |

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
# PAGAR.ME (pagamentos de pedidos)
# ============================================================

# Chave secreta de API — APENAS servidor
PAGARME_API_KEY=ak_test_xxx

# Secret HMAC dos webhooks (cabeçalho X-Hub-Signature)
PAGARME_WEBHOOK_SECRET=whsec_xxx

# recipient_id da Mallora (recebedor padrão da plataforma)
PAGARME_PLATFORM_RECIPIENT_ID=rp_test_xxx

# ============================================================
# STRIPE BILLING (apenas assinatura mensal)
# ============================================================

# Chave pública — usada apenas pelo Customer Portal web
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Chave secreta — APENAS servidor
STRIPE_SECRET_KEY=sk_test_xxx

# Secret de webhook (gerado pelo 'stripe listen' em dev)
STRIPE_WEBHOOK_SECRET=whsec_xxx

# ============================================================
# APLICACAO
# ============================================================

# URL base do dashboard (usada em retornos de KYC link e callbacks)
APP_URL=http://localhost:3000
```

-----

## ARQUIVO .env.local (apps/mobile-consumer)

Criar na pasta `apps/mobile-consumer/`. Nunca commitar.

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx

# URL da aplicação web (para deep links e callbacks)
EXPO_PUBLIC_APP_URL=http://localhost:3000

# Pagar.me — appId público para tokenização de cartão no cliente.
# É público por design (identifica a conta da Mallora ao tokenizar).
# Número/CVV nunca passam pelo backend.
EXPO_PUBLIC_PAGARME_APPID=appid_test_xxx
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
supabase secrets set PAGARME_API_KEY=ak_test_xxx
supabase secrets set PAGARME_WEBHOOK_SECRET=whsec_xxx
supabase secrets set PAGARME_PLATFORM_RECIPIENT_ID=rp_test_xxx
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

|Secret                            |Descrição                                                  |
|----------------------------------|-----------------------------------------------------------|
|`PAGARME_API_KEY`                 |Chave secreta Pagar.me                                     |
|`PAGARME_WEBHOOK_SECRET`          |Secret HMAC para verificação de webhook Pagar.me           |
|`PAGARME_PLATFORM_RECIPIENT_ID`   |recipient_id da Mallora (recebedor padrão)                 |
|`STRIPE_SECRET_KEY`                |Chave secreta Stripe (Billing)                             |
|`STRIPE_WEBHOOK_SECRET`            |Secret de assinatura do webhook Stripe (Billing)           |
|`APP_URL`                          |URL base do dashboard web                                  |

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
|`PAGARME_API_KEY`                   |`ak_live_xxx`           |`ak_test_xxx`         |
|`PAGARME_WEBHOOK_SECRET`            |Secret prod             |Secret sandbox        |
|`PAGARME_PLATFORM_RECIPIENT_ID`     |`rp_live_xxx`           |`rp_test_xxx`         |
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
vercel env add PAGARME_API_KEY production
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
        "EXPO_PUBLIC_APP_URL": "https://staging.mallora.com.br"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://xxxxxxxxxxxx.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJxxx",
        "EXPO_PUBLIC_APP_URL": "https://staging.mallora.com.br"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://xxxxxxxxxxxx.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJxxx",
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

### Pagar.me — Chaves de API

```
1. Acessar https://dashboard.pagar.me
2. Developer Settings
3. API Keys
   → Sandbox: ak_test_xxx
   → Produção: ak_live_xxx
4. Recipients
   → Criar recipient principal da Mallora
   → Anotar rp_xxx em PAGARME_PLATFORM_RECIPIENT_ID
```

### Pagar.me — Webhook Secret

```
1. Pagar.me Dashboard
2. Developer > Webhooks
3. Add endpoint
   → URL: https://xxxxxxxxxxxx.supabase.co/functions/v1/pagarme-webhook
   → Selecionar eventos listados no arquivo 30 (§ 6)
4. Gerar secret
   = PAGARME_WEBHOOK_SECRET
```

### Stripe Billing — Chaves de API

```
1. Acessar https://dashboard.stripe.com
2. Developers (menu superior)
3. API Keys
   → Publishable key = STRIPE_PUBLISHABLE_KEY
   → Secret key      = STRIPE_SECRET_KEY
   (clicar em 'Reveal' para ver a secret key)
```

### Stripe Billing — Webhook Secret (produção)

```
1. Stripe Dashboard
2. Developers
3. Webhooks
4. Add endpoint
   → URL: https://xxxxxxxxxxxx.supabase.co/functions/v1/stripe-webhook
   → Selecionar apenas eventos de subscription/invoice (lista no arquivo 07)
5. Após criar, clicar no endpoint
6. Signing secret → Reveal
   = STRIPE_WEBHOOK_SECRET
```

### Stripe Billing — Webhook Secret (desenvolvimento local)

```bash
# Stripe CLI permanece útil apenas para Billing
brew install stripe/stripe-cli/stripe
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

# Pagar.me (pagamentos de pedidos)
PAGARME_API_KEY=ak_test_sua_chave_aqui
PAGARME_WEBHOOK_SECRET=whsec_sua_chave_aqui
PAGARME_PLATFORM_RECIPIENT_ID=rp_test_recipient_mallora
EXPO_PUBLIC_PAGARME_APPID=appid_test_sua_app_aqui

# Stripe Billing (assinatura mensal)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_sua_chave_aqui
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
- [ ] Configurar webhook Pagar.me sandbox apontando para a URL local (via ngrok ou ambiente staging) e copiar o secret para `PAGARME_WEBHOOK_SECRET`
- [ ] Rodar `stripe listen` para obter o `STRIPE_WEBHOOK_SECRET` local (apenas Billing)
- [ ] Confirmar que `.env.local` está no `.gitignore`

### Antes de fazer deploy em produção

- [ ] Configurar todas as variáveis no Vercel (Production environment)
- [ ] Usar chaves `ak_live_` (Pagar.me) e `sk_live_` (Stripe Billing) no ambiente de produção
- [ ] Configurar secrets nas Edge Functions do projeto Supabase de produção
- [ ] Registrar webhook de produção no Pagar.me Dashboard (eventos do § 6 do doc 30)
- [ ] Registrar webhook de produção no Stripe Dashboard (apenas eventos de Billing)
- [ ] Confirmar que `PAGARME_WEBHOOK_SECRET` e `STRIPE_WEBHOOK_SECRET` de produção estão corretos
- [ ] Confirmar `PAGARME_PLATFORM_RECIPIENT_ID` aponta para o `rp_live_` da Mallora
- [ ] Trocar `EXPO_PUBLIC_PAGARME_APPID` para `appid_live_*` no build de produção do mobile-consumer
- [ ] Confirmar que `APP_URL` aponta para o domínio de produção
- [ ] Verificar que nenhuma chave de teste (`ak_test_`, `pk_test_`, `sk_test_`, `appid_test_`) está no ambiente de produção

-----

*Arquivo 09 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 10 — Auth e Onboarding do Lojista*
