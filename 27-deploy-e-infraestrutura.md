# 27 — Deploy e Infraestrutura

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

Este arquivo cobre todo o processo de configuração de infraestrutura
para produção: Supabase Pro, Vercel Pro, domínio, Stripe em produção,
monitoramento e o checklist completo de lançamento.

A infraestrutura mensal custa aproximadamente $45 (R$225/mês).
Todo o ambiente de desenvolvimento pode rodar localmente sem custo.

-----

## AMBIENTES

|Ambiente|Branch Git|Supabase        |Stripe |URL               |
|--------|----------|----------------|-------|------------------|
|Local   |qualquer  |`supabase start`|pk_test|localhost:3000    |
|Staging |`develop` |Projeto staging |pk_test|preview.vercel.app|
|Produção|`main`    |Projeto pro     |pk_live|mallora.com.br    |

-----

## SUPABASE PRO — CONFIGURACAO

### Por que Supabase Pro ($25/mês)

O plano Free tem limitações que bloqueiam produção:

- Banco pausa após 7 dias sem atividade
- 500MB de storage (insuficiente para fotos de produtos)
- Sem Scheduled Functions (necessário para `daily-payouts`)
- Sem suporte a múltiplos projetos sem restrições

### Upgrade para Pro

```
Supabase Dashboard
  → Configurações do projeto
  → Billing
  → Upgrade to Pro
  → Inserir cartão de crédito
```

### Configuracoes pós-upgrade

```
1. Habilitar Realtime nas tabelas necessárias
   Database → Replication → Tables
   Habilitar: orders, courier_locations, delivery_assignments

2. Configurar Scheduled Functions (cron daily-payouts)
   Edge Functions → Schedules → Create schedule
   Function: daily-payouts
   Schedule: 0 3 * * *  (03:00 UTC = 00:00 Brasília)

3. Ajustar limites de storage
   Storage → Settings
   → Max file size: 10MB (padrão 50MB — pode reduzir)

4. Habilitar Point-in-Time Recovery (PITR)
   Database → Backups → Enable PITR
   Retenção: 7 dias (padrão no Pro)

5. Configurar secrets das Edge Functions
   Edge Functions → Manage secrets
   STRIPE_SECRET_KEY=sk_live_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   APP_URL=https://mallora.com.br
   WEBHOOK_SECRET=uuid_aleatorio_gerado

6. Vincular domínio customizado (opcional)
   Project Settings → Custom domains
   → Adicionar: api.mallora.com.br
```

### Deploy das Edge Functions

```bash
# Autenticar no Supabase CLI
supabase login

# Vincular ao projeto de produção
supabase link --project-ref <PROJECT_REF_PRODUCAO>

# Deploy de todas as Edge Functions
supabase functions deploy

# Deploy de uma função específica
supabase functions deploy daily-payouts
supabase functions deploy stripe-webhook
supabase functions deploy notify-order-update

# Verificar deploy
supabase functions list
```

### Aplicar migrations em producao

```bash
# SEMPRE fazer backup antes
# Supabase Dashboard → Database → Backups → Create backup

# Verificar migrations pendentes
supabase migration list

# Aplicar migrations pendentes em produção
supabase db push

# Verificar que todas foram aplicadas
supabase migration list
```

-----

## VERCEL PRO — CONFIGURACAO

### Por que Vercel Pro ($20/mês)

O plano Free tem limitações relevantes para produção:

- Sem domínio customizado com SSL automático
- Limite de deploys por hora em projetos com muitos branches
- Sem Analytics avançado
- Sem suporte a equipe (embora no nosso caso seja só você)

### Setup do projeto no Vercel

```bash
# Instalar Vercel CLI
pnpm add -g vercel

# Autenticar
vercel login

# Dentro de apps/web/
cd apps/web
vercel link

# Selecionar projeto existente ou criar novo
# → Criar novo: mallora-web
```

### Configurar variáveis de ambiente no Vercel

```bash
# Produção (pk_live, sk_live)
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add APP_URL production

# Preview (pk_test, sk_test — usa projeto Supabase de staging)
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
vercel env add SUPABASE_SERVICE_ROLE_KEY preview
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY preview
vercel env add STRIPE_SECRET_KEY preview
vercel env add STRIPE_WEBHOOK_SECRET preview
vercel env add APP_URL preview
```

### Configurar domínio customizado

```
Vercel Dashboard
  → Projeto mallora-web
  → Settings
  → Domains
  → Add domain
  → mallora.com.br
  → Copiar os registros DNS fornecidos pelo Vercel
```

Registros DNS a adicionar no registro do domínio:

```
Tipo: A
Nome: @
Valor: 76.76.21.21

Tipo: CNAME
Nome: www
Valor: cname.vercel-dns.com
```

### vercel.json (apps/web)

```json
{
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["gru1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

Nota: `regions: ["gru1"]` coloca o servidor na região São Paulo,
reduzindo latência para usuários brasileiros.

-----

## EXPO EAS — BUILD E DISTRIBUICAO

### eas.json (apps/mobile-consumer e apps/mobile-courier)

Cada app mobile tem seu próprio `eas.json`. Estrutura de builds:

```json
{
  "cli": {
    "version": ">= 10.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": false },
      "android": { "buildType": "apk" },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://staging.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJxxx_staging",
        "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY": "pk_test_xxx",
        "EXPO_PUBLIC_APP_URL": "https://staging.mallora.com.br"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://staging.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJxxx_staging",
        "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY": "pk_test_xxx",
        "EXPO_PUBLIC_APP_URL": "https://staging.mallora.com.br"
      }
    },
    "production": {
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://producao.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJxxx_prod",
        "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY": "pk_live_xxx",
        "EXPO_PUBLIC_APP_URL": "https://mallora.com.br"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "seu@email.com",
        "ascAppId": "XXXXXXXXXX",
        "appleTeamId": "XXXXXXXXXX"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

### Comandos EAS

```bash
# Build de desenvolvimento (instalar no dispositivo físico)
cd apps/mobile-consumer
eas build --profile development --platform android

# Build de preview (para testes internos)
eas build --profile preview --platform all

# Build de produção
eas build --profile production --platform all

# Submeter para App Store e Play Store
eas submit --profile production --platform all

# Over-the-air update (sem novo build na store)
eas update --branch production --message "Correção de bug"
```

-----

## STRIPE EM PRODUCAO

### Checklist de ativação da conta Stripe

```
1. Acessar https://dashboard.stripe.com
2. Completar verificação da conta (pessoa física ou jurídica)
3. Adicionar dados bancários para recebimento das taxas da plataforma
4. Verificar que Connect está habilitado para o Brasil
   Dashboard → Connect → Settings → Countries → Brazil
5. Ativar PIX
   Dashboard → Settings → Payment methods → PIX → Ativar
6. Verificar limite de transferências para o Brasil
   Dashboard → Connect → Settings → Transfer schedule
```

### Registrar webhook de producao

```
Stripe Dashboard
  → Developers
  → Webhooks
  → Add endpoint

URL: https://[PROJECT_REF].supabase.co/functions/v1/stripe-webhook
Events a selecionar:
  - payment_intent.succeeded
  - payment_intent.payment_failed
  - payment_intent.canceled
  - account.updated
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.paid
  - invoice.payment_failed
  - invoice.payment_action_required
  - charge.dispute.created
  - charge.refunded

Após criar:
  → Clicar no endpoint
  → Reveal signing secret
  → Copiar para STRIPE_WEBHOOK_SECRET nos secrets do Supabase
```

### Configurar Stripe Radar (antifraude)

```
Stripe Dashboard
  → Radar
  → Rules
  → Criar regras básicas:

Regra 1: Bloquear cartões com risco alto
  IF :risk_level: = 'highest' THEN block

Regra 2: Revisar transações acima de R$500 sem histórico
  IF :risk_score: > 65 AND :total_charges_per_customer_lifetime_count: = 0
  THEN review

Regra 3: Bloquear cartões de países fora do Brasil (opcional)
  IF :card_country: != 'BR' THEN block
```

### Ativar Customer Portal do Stripe

```
Stripe Dashboard
  → Billing
  → Customer portal
  → Activate portal

Configurar:
  - Permitir cancelamento de assinatura: Sim
  - Permitir atualização de cartão: Sim
  - Exibir histórico de faturas: Sim
  - URL de retorno: https://mallora.com.br/dashboard/configuracoes/assinatura
```

-----

## CONFIGURACAO DE DNS E SSL

### Registrar o domínio

Registrar `mallora.com.br` (ou nome final escolhido) no Registro.br:

- Custo: ~R$40/ano
- Acesse: https://registro.br

### Configurar registros DNS

Após registrar o domínio e configurar no Vercel, adicionar:

```
Registro A (raiz):
  Nome: @
  Tipo: A
  Valor: 76.76.21.21
  TTL: 3600

Registro CNAME (www):
  Nome: www
  Tipo: CNAME
  Valor: cname.vercel-dns.com
  TTL: 3600
```

O SSL é configurado automaticamente pelo Vercel via Let’s Encrypt
após a propagação dos registros DNS (pode levar até 48h).

-----

## MONITORAMENTO

### Vercel Analytics

Habilitado automaticamente no plano Pro. Acesse via:

```
Vercel Dashboard → Projeto → Analytics
```

Métricas disponíveis:

- Tempo de carregamento das páginas
- Core Web Vitals (LCP, FID, CLS)
- Erros de runtime JavaScript
- Tráfego por rota

### Supabase Dashboard

Monitorar via Supabase Dashboard diariamente:

- Database → Logs (queries lentas, erros)
- Edge Functions → Logs (falhas nas funções)
- Storage → Usage
- Auth → Users

### Stripe Dashboard

- Developers → Logs (requisições à API)
- Developers → Webhooks → logs de entrega
- Payments → filtrar por período para reconciliação

### Alertas de erro — Vercel

Configurar notificações por email quando ocorrer erro em produção:

```
Vercel Dashboard
  → Projeto
  → Settings
  → Notifications
  → Error notifications → Enable
  → Adicionar email para alertas
```

### Alertas do Stripe

```
Stripe Dashboard
  → Settings
  → Emails
  → Habilitar:
    - Failed payments
    - Disputed charges
    - Payouts (quando dinheiro sair da conta)
```

-----

## BACKUP E RECUPERACAO

### Backup automático do Supabase (Pro)

O Supabase Pro faz backup automático diário com retenção de 7 dias.
Para backups manuais antes de operações críticas:

```
Supabase Dashboard
  → Database
  → Backups
  → Create backup
```

### Restaurar backup

```
Supabase Dashboard
  → Database
  → Backups
  → Selecionar backup
  → Restore
```

### Backup das Edge Functions (Git)

As Edge Functions ficam no repositório Git. O backup é automático
via controle de versão.

-----

## PIPELINE DE DEPLOY

### Fluxo de desenvolvimento para produção

```
Feature branch
  → PR para develop
  → Testes automatizados (CI)
  → Deploy automático para staging (Vercel preview)
  → Revisão manual em staging
  → Merge para main
  → Deploy automático para produção (Vercel)
  → Migrations: aplicar manualmente com supabase db push
  → Edge Functions: aplicar manualmente com supabase functions deploy
```

### Regras de proteção do branch main

```
GitHub → Repositório → Settings → Branches
→ Add branch protection rule
→ Branch name pattern: main
→ Require pull request before merging: Sim
→ Require status checks to pass: testes-unit, testes-e2e
→ Require branches to be up to date: Sim
```

-----

## CHECKLIST COMPLETO DE LANCAMENTO

### Infraestrutura (1 semana antes)

- [ ] Conta Supabase Pro ativa e configurada
- [ ] Bucket `product-images` criado com policies corretas
- [ ] Bucket `courier-docs` criado como privado com policies corretas
- [ ] Realtime habilitado para: `orders`, `courier_locations`, `delivery_assignments`
- [ ] Scheduled Function `daily-payouts` configurada (cron `0 3 * * *`)
- [ ] Todas as migrations aplicadas em produção (`supabase db push`)
- [ ] Tipos TypeScript gerados do banco de produção (`pnpm types:generate`)
- [ ] Todas as Edge Functions deployadas (`supabase functions deploy`)
- [ ] Secrets configurados nas Edge Functions
- [ ] Conta Vercel Pro ativa
- [ ] Domínio registrado e DNS configurado
- [ ] SSL ativo no domínio principal
- [ ] Variáveis de ambiente de produção configuradas no Vercel
- [ ] Build de produção do Next.js sem erros (`pnpm build`)

### Stripe (3 dias antes)

- [ ] Conta Stripe verificada e aprovada para o Brasil
- [ ] PIX ativado no Stripe Dashboard
- [ ] Stripe Connect habilitado para o Brasil
- [ ] Customer Portal ativado e configurado
- [ ] Webhook de produção registrado com todos os eventos necessários
- [ ] `STRIPE_WEBHOOK_SECRET` de produção atualizado nos secrets do Supabase
- [ ] Stripe Radar configurado com regras básicas
- [ ] Planos criados na tabela `plans` com `stripe_product_id` e `stripe_price_id`
- [ ] Teste de pagamento com cartão real de valor mínimo (R$1,00)
- [ ] Teste de onboarding de Express Account em produção

### Apps mobile (1 semana antes)

- [ ] Build de produção do consumer app gerado via EAS
- [ ] Build de produção do courier app gerado via EAS
- [ ] Apps testados em dispositivos iOS e Android físicos
- [ ] Deep links (`mallora-consumer://` e `mallora-courier://`) funcionando
- [ ] URLs de redirect do Magic Link configuradas no Supabase de produção
- [ ] Push notifications funcionando em produção (token registrado e notificação recebida)
- [ ] Permissões de localização funcionando no courier app
- [ ] Apps submetidos para revisão nas stores (App Store e Play Store)

### Conteúdo inicial (2 dias antes)

- [ ] Usuário admin criado com `role = 'admin'` nos metadados
- [ ] Categorias globais inseridas na tabela `categories`
- [ ] Planos criados na tabela `plans` com preços definidos
- [ ] Pelo menos um lojista de teste cadastrado e operacional
- [ ] Pelo menos um entregador de teste aprovado e com Stripe configurado

### Testes finais (dia anterior)

- [ ] Fluxo completo em produção: consumidor faz pedido → paga → lojista confirma → entregador entrega
- [ ] Notificações push funcionando para os três apps
- [ ] Localização do entregador aparecendo no mapa do consumidor
- [ ] Repasse D+1 testado manualmente via `supabase functions invoke daily-payouts`
- [ ] Onboarding de novo lojista testado do zero até o dashboard
- [ ] Dashboard do admin acessível e mostrando métricas
- [ ] Nenhum erro nos logs do Vercel, Supabase e Stripe

### No dia do lançamento

- [ ] Fazer backup manual do banco antes de abrir para usuários
- [ ] Monitorar logs do Supabase por 1 hora após abertura
- [ ] Monitorar logs do Vercel por 1 hora após abertura
- [ ] Monitorar webhooks do Stripe por 1 hora após abertura
- [ ] Ter canal de suporte pronto (WhatsApp ou email)
- [ ] Ter o Stripe CLI instalado para simular/debugar webhooks se necessário

-----

## CUSTOS MENSAIS ESTIMADOS

|Serviço        |Plano        |Custo               |
|---------------|-------------|--------------------|
|Supabase       |Pro          |$25,00              |
|Vercel         |Pro          |$20,00              |
|Stripe         |Pay-as-you-go|~3,8% por transação*|
|Expo EAS       |Free tier    |$0,00               |
|Domínio .com.br|Anual        |~R$3,50/mês         |
|Total fixo     |             |~$45/mês + R$3,50   |

*Taxa Stripe debitada automaticamente das transações. Com 1.500 pedidos/mês
de R$60 médios = R$90.000 em volume, a taxa Stripe seria ~R$3.420.
Essa taxa sai do volume transacionado — não é custo adicional para a plataforma
além do que já foi considerado no modelo financeiro.

-----

*Arquivo 27 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 28 — Prompt Mestre Claude Code*
