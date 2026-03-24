# 06 — Arquitetura Stripe Connect e Modelo Financeiro

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

A plataforma usa Stripe Connect com o modelo Separate Charges and Transfers.
A plataforma é o Merchant of Record em todas as transações — o consumidor
paga para a plataforma, e a plataforma distribui os valores para lojistas
e entregadores em momentos distintos, via cron job diário.

Esse modelo foi escolhido por três razões:

1. A transação tem dois destinatários (lojista e entregador), e Destination
   Charges suportam apenas um destinatário por transação.
1. O repasse periódico (não atômico) simplifica o tratamento de cancelamentos
   e estornos — tudo fica na conta da plataforma até o repasse.
1. O controle de antecipação (D+2 com taxa) é mais simples de implementar
   quando os repasses são gerenciados pela plataforma de forma centralizada.

-----

## TIPOS DE CONTA STRIPE

### Conta da plataforma

Conta Stripe padrão registrada em nome da plataforma (Pedro).
Recebe todos os pagamentos dos consumidores.
Executa todos os transfers para lojistas e entregadores.
Paga as taxas Stripe.

### Contas conectadas — Express Accounts

Cada lojista e cada entregador autônomo tem uma Express Account vinculada
à conta da plataforma.

Express Account é o tipo recomendado pela Stripe para marketplaces onde:

- A plataforma controla a experiência de pagamento
- Os recebedores não precisam de acesso ao Stripe Dashboard completo
- O KYC (verificação de identidade) é gerenciado pelo próprio Stripe

Com Express Accounts:

- O lojista/entregador faz o KYC no fluxo hospedado pelo Stripe
- Tem acesso ao Stripe Express Dashboard (ver saldo, histórico, sacar)
- A plataforma não precisa gerenciar dados bancários diretamente

-----

## FLUXO COMPLETO DE PAGAMENTO

### Etapa 1 — Consumidor finaliza o pedido

```
App do consumidor chama a Edge Function create-payment-intent

Edge Function cria no Stripe:
  PaymentIntent {
    amount: 6000,          // R$60,00 em centavos
    currency: 'brl',
    // Sem transfer_data — a plataforma recebe tudo primeiro
    metadata: {
      order_id: 'uuid-do-pedido',
      tenant_id: 'uuid-do-tenant',
      store_id: 'uuid-da-loja'
    }
  }

Edge Function retorna o client_secret para o app

App abre o Stripe Payment Sheet com o client_secret
Consumidor paga (cartão ou PIX)
```

### Etapa 2 — Confirmação do pagamento

```
Stripe dispara webhook: payment_intent.succeeded

Edge Function stripe-webhook:
  → Verifica assinatura do webhook
  → Busca o order_id nos metadata do PaymentIntent
  → Atualiza orders.payment_status = 'pago'
  → Atualiza orders.status = 'confirmado' (se ainda estava em 'novo')
  → Registra stripe_payment_intent_id no pedido
```

### Etapa 3 — Entrega concluída

```
Entregador marca entrega como concluída no app

App do entregador atualiza delivery_assignments.status = 'entregue'

Trigger ou Server Action:
  → Atualiza orders.status = 'entregue'
  → O pedido agora é elegível para o repasse do cron
```

### Etapa 4 — Cron de repasses (meia-noite)

```
Supabase Scheduled Edge Function: daily-payouts

Executa toda meia-noite (00:00, horário de Brasília)

Passo 1 — Repasses de entregadores (D+1):
  → Busca delivery_assignments com status = 'entregue'
     entregues ontem (date = CURRENT_DATE - 1)
     para couriers do tipo 'autonomo'
     sem payout já criado
  → Para cada entregador: agrupa pedidos, soma valor_entrega
  → Cria Transfer no Stripe para a Express Account do entregador
  → Registra em payouts { tipo: 'entregador', status: 'concluido' }

Passo 2 — Repasses de lojistas (D+7):
  → Busca orders com status = 'entregue'
     entregues há 7 dias (date = CURRENT_DATE - 7)
     com payment_status = 'pago'
     sem payout já criado
  → Para cada tenant: agrupa pedidos, soma (total - taxa_entrega - platform_fee_amount)
  → Verifica se há payout_advance_request aprovada para este tenant
       Se SIM: executa como antecipação (D+2 já deveria ter sido processado)
       Se NAO: executa repasse normal
  → Cria Transfer no Stripe para a Express Account do lojista
  → Registra em payouts { tipo: 'lojista', status: 'concluido' }

Passo 3 — Antecipações aprovadas (D+2):
  → Busca payout_advance_requests com status = 'aprovada'
     onde data_prevista = CURRENT_DATE
  → Para cada solicitação: calcula desconto, cria Transfer
  → Atualiza payout_advance_requests.status = 'executada'
```

-----

## CALCULO FINANCEIRO DETALHADO

### Taxas Stripe no Brasil (referência — verificar valores atuais no dashboard)

|Método              |Taxa percentual|Taxa fixa|Exemplo em R$60|
|--------------------|---------------|---------|---------------|
|Cartão nacional     |~3,49%         |R$0,39   |~R$2,48        |
|Cartão internacional|~4,99%         |R$0,39   |~R$3,38        |
|PIX                 |~0,99%         |R$0,00   |~R$0,59        |

A taxa Stripe é debitada da conta da plataforma. O lojista não a vê
diretamente — ele recebe o valor líquido após a comissão da plataforma.

### Exemplo com cartão nacional

```
Consumidor paga:         R$60,00
  Produto:               R$50,00
  Taxa de entrega:       R$10,00

Stripe debita:          -R$2,48  (taxa ~3,49% + R$0,39)
Plataforma retém:       -R$1,00  (comissão por pedido — platform_fee_amount)

Saldo a distribuir:      R$56,52

Entregador recebe:       R$10,00  (valor_entrega definido pelo lojista)
  Repasse: D+1 automático

Lojista recebe:          R$46,52  (saldo - valor_entrega)
  Repasse: D+7 automático
  ou D+2 pagando R$0,75 por pedido antecipado
```

### Exemplo com antecipação (lojista antecipa 40 pedidos)

```
Valor bruto a repassar ao lojista:    R$1.860,80  (40 pedidos × R$46,52)
Taxa de antecipação:                 -R$30,00     (40 × R$0,75)
Valor líquido recebido em D+2:        R$1.830,80
```

### Campos no banco que registram esses valores

```
orders.total                  → valor pago pelo consumidor (em centavos)
orders.taxa_entrega           → parte do total destinada ao entregador
orders.platform_fee_amount    → R$100 (R$1,00 em centavos) — fixo
delivery_assignments.valor_entrega → valor que o entregador recebe

payouts.valor_bruto           → soma dos pedidos antes do desconto de antecipação
payouts.taxa_antecipacao      → desconto cobrado (0 se não antecipado)
payouts.valor_liquido         → valor_bruto - taxa_antecipacao
payouts.stripe_transfer_id    → ID do Transfer no Stripe após execução
```

-----

## STRIPE BILLING — ASSINATURA MENSAL

A assinatura mensal do lojista é gerenciada pelo Stripe Billing,
independente do fluxo de Separate Charges.

### Objetos Stripe envolvidos

```
Product (plano)
  → criado uma vez por plano da plataforma
  → ex: "Plano Profissional — Mallora"
  → sincronizado com a tabela plans via stripe_product_id

Price (preço recorrente)
  → vinculado ao Product
  → recorrência: mensal
  → moeda: BRL
  → sincronizado com plans.stripe_price_id

Customer (lojista)
  → criado no onboarding do tenant
  → vinculado ao tenant via tenants.stripe_customer_id
  → usado para cobranças recorrentes

Subscription (assinatura)
  → criada após KYC do lojista concluído
  → vincula Customer ao Price
  → status refletido em tenant_subscriptions.billing_status
```

### Ciclo de vida da assinatura

```
Onboarding concluído
  → Edge Function create-subscription
  → Stripe cria Subscription com trial_period_days = X
  → billing_status = 'trial'

Trial termina
  → Stripe tenta cobrar automaticamente
  → Pagamento bem-sucedido: billing_status = 'ativa'
  → Pagamento falhou: billing_status = 'em_atraso'

Pagamento em atraso
  → Stripe reenvia cobrança (dunning automático — configurar no dashboard)
  → Se regularizado: billing_status = 'ativa'
  → Se não regularizado após X tentativas: billing_status = 'cancelada'
  → Acesso ao dashboard bloqueado via middleware

Cancelamento voluntário
  → Lojista cancela via Stripe Customer Portal
  → Stripe cancela a Subscription
  → billing_status = 'cancelada'
  → Acesso bloqueado no próximo ciclo
```

### Webhooks Stripe Billing relevantes

```
customer.subscription.created    → registrar subscription_id no banco
customer.subscription.updated    → sincronizar billing_status
customer.subscription.deleted    → marcar como cancelada, bloquear acesso
invoice.paid                     → confirmar pagamento, reativar se estava em atraso
invoice.payment_failed           → marcar em_atraso, notificar lojista
invoice.payment_action_required  → lojista precisa autenticar (3D Secure)
```

-----

## ONBOARDING DA EXPRESS ACCOUNT

### Lojista

```
1. Lojista conclui o wizard de onboarding na plataforma
2. Edge Function onboard-tenant:
   → stripe.accounts.create({ type: 'express', country: 'BR' })
   → Salva stripe_account_id em tenants
   → stripe.accountLinks.create({
       account: stripe_account_id,
       refresh_url: 'https://app.mallora.com.br/onboarding/stripe/retry',
       return_url:  'https://app.mallora.com.br/onboarding/stripe/callback',
       type: 'account_onboarding'
     })
   → Retorna o URL de onboarding para o frontend
3. Frontend redireciona para o URL do Stripe
4. Lojista preenche dados bancários e KYC no ambiente Stripe
5. Stripe redireciona para return_url
6. Webhook account.updated → stripe_onboarding_ok = true
7. Edge Function create-subscription é chamada
```

### Entregador

```
1. Entregador conclui o cadastro e é aprovado pelo admin
2. Edge Function onboard-courier:
   → stripe.accounts.create({ type: 'express', country: 'BR' })
   → Salva stripe_account_id em couriers
   → Gera account link para onboarding
3. Entregador preenche dados bancários no Stripe
4. Webhook account.updated → stripe_onboarding_ok = true
5. Entregador já pode receber repasses
```

-----

## TRATAMENTO DE ESTORNOS E CANCELAMENTOS

Com Separate Charges and Transfers, estornos e chargebacks são
responsabilidade da plataforma. O valor debitado sai do saldo da
plataforma — não da conta do lojista ou do entregador.

### Pedido cancelado antes do repasse

```
Consumidor solicita cancelamento
  → orders.status = 'cancelado'
  → Se payment_status = 'pago':
       stripe.refunds.create({ payment_intent: pi_xxx })
       orders.payment_status = 'estornado'
  → O pedido não entra no cálculo do cron (filtro: status = 'entregue')
  → Nenhum Transfer é criado
```

### Pedido cancelado após repasse (raro no D+7)

```
Se o Transfer já foi executado para o lojista:
  → Criar Transfer reversal (stripe.transfers.createReversal)
  → Ou absorver o custo na plataforma (decisão operacional)
  → Registrar manualmente no painel admin
```

### Chargeback

```
Stripe debita da conta da plataforma automaticamente
  → Admin recebe alerta no Stripe Dashboard
  → Plataforma decide se recupera o valor do lojista
     via Transfer reversal ou absorve o custo
  → Registrar ocorrência para histórico
```

-----

## STRIPE RADAR (ANTIFRAUDE)

Configurar no Stripe Dashboard antes do lançamento em produção:

- Bloquear cartões de países fora do Brasil (opcional, dependendo do público)
- Ativar regras de bloqueio para transações acima de determinado valor sem 3DS
- Revisar o score de risco de cada transação nos logs do Dashboard
- Configurar notificações de disputas por email

-----

## CONFIGURACAO DE PIX

PIX precisa ser ativado manualmente no Stripe Dashboard antes de ir
para produção:

```
Stripe Dashboard
  → Settings
  → Payment methods
  → PIX
  → Ativar
```

Após ativação, o Stripe Payment Sheet exibe PIX automaticamente como
opção de pagamento quando `currency = 'brl'` e o dispositivo é
reconhecido como brasileiro.

-----

## VARIAVEIS DE AMBIENTE STRIPE

```bash
# Chave pública — usada no cliente (Expo, Next.js)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Chave secreta — usada apenas no servidor (Edge Functions, Server Actions)
STRIPE_SECRET_KEY=sk_live_xxx

# Secret para verificação de assinatura dos webhooks
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Em desenvolvimento, usar chaves de teste
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx  # gerado pelo stripe listen
```

-----

## CHECKLIST PRE-PRODUCAO STRIPE

- [ ] Conta Stripe verificada e aprovada para o Brasil
- [ ] PIX ativado no Dashboard
- [ ] Express Accounts habilitadas para o Brasil (verificar no Dashboard)
- [ ] Webhook endpoint registrado apontando para a Edge Function stripe-webhook
- [ ] Todos os eventos de webhook selecionados (lista no arquivo 07)
- [ ] Stripe Radar configurado com regras básicas de antifraude
- [ ] Teste completo em modo test com cartões de teste Stripe
- [ ] Teste de onboarding de Express Account em modo test
- [ ] Teste de Transfer para Express Account em modo test
- [ ] Variáveis de ambiente de produção configuradas no Vercel e Supabase

-----

*Arquivo 06 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 07 — Edge Functions de Pagamento*
