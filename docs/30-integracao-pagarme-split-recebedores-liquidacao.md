# 30 — Integração Pagar.me: Split de Pagamentos, Recebedores e Liquidação

### Plataforma Delivery Divinópolis

*Versão 1.0 — 29/04/2026*

-----

## 1. VISAO GERAL DA INTEGRACAO PAGAR.ME

O Pagar.me é o gateway responsável pelo processamento de todos os pagamentos
de pedidos na Mallora. Ele opera como provedor de infraestrutura financeira
no ecossistema brasileiro, suportando:

- Pix (liquidação instantânea)
- Cartão de crédito e débito (múltiplas bandeiras)
- Boleto bancário
- Split de pagamentos entre múltiplos recebedores em uma única transação
- Gestão de recebedores (recipients) sem exigir conta autônoma no gateway
- Antecipação automática de recebíveis configurável por recebedor
- KYC e Prova de Vida integrados para validação de identidade (PF)

A Mallora permanece como Merchant of Record — o consumidor paga para a
conta Mallora, e o Pagar.me executa o rateio (split) automaticamente entre
os recebedores cadastrados (lojista, entregador e própria Mallora) conforme
as regras definidas em cada Order.

O Stripe é mantido exclusivamente para a cobrança da assinatura mensal dos
lojistas via Stripe Billing. Os dois gateways são completamente independentes
e não se sobrepõem.

### Escopo desta integração

```
Pagar.me:
  - Processamento de pagamentos de pedidos
  - Split entre Mallora, lojista e entregador
  - Gestão de recipients (lojistas e entregadores)
  - KYC/Prova de Vida para entregadores autônomos
  - Antecipação automática de recebíveis
  - Transferências (estágio 2 — taxa de entrega ao entregador)
  - Webhooks de status de pagamento e recipient

Stripe (sem alteração):
  - Assinatura mensal do lojista (Stripe Billing)
  - Customer, Subscription, Invoice
  - Webhooks de billing
```

-----

## 2. AUTENTICACAO E CONFIGURACAO DE AMBIENTE

### Credenciais

O Pagar.me usa autenticação HTTP Basic Auth. A API Key vai no campo
`username`; o campo `password` fica vazio.

```
Authorization: Basic base64("ak_live_xxx:")
```

Em código Deno/TypeScript:

```typescript
function pagarmeHeaders() {
  const apiKey = Deno.env.get('PAGARME_API_KEY')!
  const encoded = btoa(`${apiKey}:`)
  return {
    'Authorization': `Basic ${encoded}`,
    'Content-Type': 'application/json',
  }
}
```

### Ambientes

|Ambiente|Base URL                      |Prefix da API Key|
|--------|------------------------------|-----------------|
|Sandbox |`https://api.pagar.me/core/v5`|`ak_test_`       |
|Produção|`https://api.pagar.me/core/v5`|`ak_live_`       |

O endpoint é o mesmo em ambos. A chave determina o ambiente.

### Variáveis de ambiente

```bash
# Chave de API — apenas no servidor (Edge Functions)
PAGARME_API_KEY=ak_test_xxx

# Assinatura HMAC dos webhooks recebidos do Pagar.me
PAGARME_WEBHOOK_SECRET=whsec_xxx

# recipient_id da conta principal da Mallora
# Criado uma vez ao configurar a conta Pagar.me
PAGARME_PLATFORM_RECIPIENT_ID=rp_mallora_xxx
```

### Como obter as credenciais

```
1. Acessar o painel Pagar.me
2. Settings > Chaves de API
3. Copiar a API Key de acordo com o ambiente (test/live)
4. Em Webhooks: criar endpoint e copiar o Signing Secret
```

-----

## 3. CADASTRO DE RECEBEDORES VIA API

### Conceito

Cada lojista e cada entregador autônomo é cadastrado como `recipient` na API
do Pagar.me. O recipient não precisa ter conta própria no gateway — a Mallora
faz o cadastro pela API e o Pagar.me associa a conta bancária ou chave Pix ao
recipient.

O campo `pagarme_recipient_id` (formato `rp_xxx`) é armazenado em:

- `tenants.pagarme_recipient_id` — para lojistas
- `couriers.pagarme_recipient_id` — para entregadores autônomos

### Cadastro com conta bancária

```http
POST /core/v5/recipients
Authorization: Basic base64("ak_test_xxx:")
Content-Type: application/json

{
  "name": "João da Silva",
  "email": "joao@exemplo.com",
  "document": "123.456.789-00",
  "type": "individual",
  "default_bank_account": {
    "holder_name": "João da Silva",
    "holder_document": "12345678900",
    "bank": "341",
    "branch_number": "1234",
    "account_number": "12345",
    "account_check_digit": "6",
    "type": "checking"
  }
}
```

Campos relevantes:

|Campo                 |Tipo  |Descrição                                       |
|----------------------|------|------------------------------------------------|
|`type`                |string|`individual` (CPF) ou `company` (CNPJ)          |
|`bank`                |string|Código COMPE (ex: `341` = Itaú, `033` = Santander)|
|`branch_number`       |string|Agência sem dígito                              |
|`account_number`      |string|Número da conta sem dígito                      |
|`account_check_digit` |string|Dígito verificador                              |
|`type` (account)      |string|`checking` (corrente) ou `savings` (poupança)   |

### Cadastro com chave Pix

```http
POST /core/v5/recipients
Authorization: Basic base64("ak_test_xxx:")
Content-Type: application/json

{
  "name": "João da Silva",
  "email": "joao@exemplo.com",
  "document": "123.456.789-00",
  "type": "individual",
  "payment_mode": "pix",
  "pix_key": "joao@exemplo.com",
  "pix_key_type": "email"
}
```

Tipos de chave Pix aceitos: `cpf`, `cnpj`, `email`, `phone`, `random`.

### Resposta

```json
{
  "id": "rp_abcdef123456",
  "name": "João da Silva",
  "status": "active",
  "kyc_link": null
}
```

O campo `status` pode ser `pending` (aguardando KYC) ou `active` (apto a
receber transferências).

### KYC para Pessoas Físicas

O Pagar.me pode exigir validação de identidade para recipients PF antes de
liberar o recebimento. O processo é iniciado pela API:

```http
POST /core/v5/recipients/{recipient_id}/kyc_link
```

Resposta:

```json
{
  "url": "https://kyc.pagar.me/xxxxx"
}
```

O link é exibido ao usuário no app. O resultado chega via webhook
`recipient.status.changed`.

### Status possíveis do recipient

|Status     |Significado                                          |
|-----------|-----------------------------------------------------|
|`pending`  |Aguardando KYC ou validação de documentos            |
|`active`   |Apto a receber — onboarding concluído                |
|`refused`  |KYC recusado — dados inválidos ou fraude detectada   |
|`suspended`|Conta suspensa pela Mallora ou pelo Pagar.me         |

-----

## 4. CRIACAO DE TRANSACOES COM SPLIT_RULES

### Estrutura da Order

Uma Order no Pagar.me representa um pedido completo. O array `split` dentro
de cada `payment` define como o valor é distribuído.

```http
POST /core/v5/orders
Authorization: Basic base64("ak_test_xxx:")
Content-Type: application/json

{
  "code": "<order_uuid>",
  "customer": {
    "external_id": "<consumer_id>",
    "name": "Maria Consumidora",
    "email": "maria@exemplo.com"
  },
  "items": [
    {
      "amount": 5000,
      "description": "X-Burguer",
      "quantity": 1,
      "code": "<product_id>"
    }
  ],
  "payments": [
    {
      "payment_method": "pix",
      "pix": { "expires_in": 3600 },
      "amount": 6000,
      "split": [
        {
          "recipient_id": "rp_mallora_xxx",
          "amount": 1100,
          "type": "flat",
          "options": { "charge_processing_fee": false, "liable": false }
        },
        {
          "recipient_id": "rp_lojista_xxx",
          "amount": 4900,
          "type": "flat",
          "options": { "charge_processing_fee": true, "liable": true }
        }
      ]
    }
  ],
  "metadata": {
    "order_id": "<order_uuid>",
    "tenant_id": "<tenant_uuid>",
    "store_id": "<store_uuid>"
  }
}
```

A taxa de entrega (R$10,00) fica no split da Mallora no estágio 1. Após
alocação do entregador, a Mallora executa um Transfer separado (estágio 2).

### Resposta

```json
{
  "id": "or_abcdef123456",
  "code": "<order_uuid>",
  "status": "pending",
  "charges": [
    {
      "id": "ch_abcdef123456",
      "status": "pending",
      "payment_method": "pix",
      "last_transaction": {
        "qr_code": "00020126...",
        "qr_code_url": "https://api.pagar.me/core/v5/charges/ch_xxx/qr_code"
      }
    }
  ]
}
```

-----

## 5. PARAMETROS CHARGE_PROCESSING_FEE E LIABLE

### charge_processing_fee

Quando `true`, a taxa percentual do Pagar.me (MDR) incide proporcionalmente
sobre o recebedor no valor do seu split. Quando `false`, o MDR não é cobrado
daquele recebedor e cai inteiramente na conta principal da Mallora.

|Recebedor  |charge_processing_fee|Justificativa                                  |
|-----------|---------------------|-----------------------------------------------|
|Mallora    |`false`              |Comissão fixa de R$1,00 não pode ser reduzida  |
|Lojista    |`true`               |MDR rateado proporcionalmente ao valor recebido|
|Entregador |`true`               |MDR rateado proporcionalmente ao valor recebido|

### liable

Quando `true`, o recebedor responde solidariamente por chargebacks na
proporção do seu split. Quando `false`, o chargeback é absorvido pela conta
principal (Mallora).

|Recebedor  |liable  |Justificativa                                           |
|-----------|--------|--------------------------------------------------------|
|Mallora    |`false` |Comissão fixa não responde por disputas do produto      |
|Lojista    |`true`  |Lojista responde pelo produto entregue                  |
|Entregador |`false` |Taxa de entrega não está em disputa no chargeback típico|

-----

## 6. ARQUITETURA DE DOIS ESTAGIOS

O entregador autônomo é alocado após o lojista aceitar o pedido, mas o
pagamento do consumidor é capturado no momento do checkout.

### Estágio 1 — Captura do pagamento (checkout)

```
Consumidor paga R$60
  ↓
Order Pagar.me criada com split:
  Mallora:  R$11 (R$1 comissão + R$10 taxa de entrega em custódia)
  Lojista:  R$49 (R$50 produto - R$1 comissão)
```

### Estágio 2 — Repasse da taxa de entrega (após alocação do entregador)

```
Lojista aceita e aloca entregador autônomo X
  ↓
Edge Function transfer-to-courier:

  POST /core/v5/transfers
  {
    "amount": 1000,
    "recipient_id": "rp_entregador_xxx",
    "metadata": { "order_id": "...", "assignment_id": "..." }
  }

  → Mallora transfere R$10 do saldo para o entregador.
  → transfer_id salvo em delivery_assignments.pagarme_transfer_id.
  → Registro em payouts (tipo: 'entregador').
```

### Diagrama de fluxo de dinheiro

```
Consumidor paga R$60
        ↓
    Pagar.me processa
        ↓
  Mallora            ← R$11 (R$1 comissão + R$10 custódia)
  Lojista            ← R$49 (produto - comissão)
        ↓
  [Estágio 2 — após alocação do entregador]
        ↓
  Entregador         ← R$10 (transfer da Mallora)
  Mallora retém      ← R$1 (comissão líquida)
```

### Estratégia B (Transfer) em vez de Estratégia A (reconfigurar split)

A Estratégia A (atualizar split antes da captura) exigiria `capture: false`
no cartão e captura posterior — incompatível com Pix (sempre capturado
instantaneamente) e dependente da janela de captura de 5 dias.

A Estratégia B é uniforme para todos os métodos e desacoplada da janela de
captura. Adotada no MVP.

-----

## 7. WEBHOOKS DO PAGAR.ME RELEVANTES

### Configuração do endpoint

```
URL: https://xxxxxxxxxxxx.supabase.co/functions/v1/pagarme-webhook
```

A assinatura HMAC-SHA256 chega no header `x-hub-signature` (ou
`x-pagarme-signature` em alguns ambientes) no formato `sha256=<hex>`.
Verificar usando `PAGARME_WEBHOOK_SECRET` com comparação em tempo
constante. A implementação correta da função HMAC está documentada no
doc 07 (Function 5 — `pagarme-webhook`).

Idempotência: cada evento é registrado em `webhook_events_log` (PK
`event_id`) antes de qualquer side-effect — reentregas do Pagar.me são
detectadas via `unique_violation` e respondidas com 200 sem reprocessar.
Tabela criada na migration_006 (ver doc 04).

### Eventos e ações

|Evento                       |Ação na plataforma                                        |
|-----------------------------|----------------------------------------------------------|
|`order.paid`                 |`payment_status = 'pago'`, salva `pagarme_order_id`      |
|`order.payment_failed`       |`status = 'cancelado'`, `payment_status = 'pendente'`    |
|`charge.paid`                |Idem `order.paid`                                        |
|`charge.payment_failed`      |Idem `order.payment_failed`                              |
|`charge.refunded`            |`payment_status = 'estornado'` ou `'estornado_parcial'`  |
|`charge.chargeback.created`  |`payment_status = 'em_disputa'`                          |
|`recipient.created`          |Log                                                      |
|`recipient.status.changed`   |Atualiza `pagarme_onboarding_status`; se `active`, chama `create-subscription`|
|`transfer.created`           |Log de auditoria                                         |
|`transfer.failed`            |`payouts.status = 'falhou'`, alerta no admin             |

-----

## 8. ANTECIPACAO DE RECEBIVEIS

### Antecipação automática (configuração do recipient)

```http
PUT /core/v5/recipients/{recipient_id}

{
  "automatic_anticipation_enabled": true,
  "automatic_anticipation_type": "full",
  "automatic_anticipation_days": 1,
  "automatic_anticipation_1025_delay": 15
}
```

Após ativação, todos os recebíveis do recipient são liquidados antecipadamente.
A taxa Pagar.me é debitada automaticamente do valor a receber.

### Antecipação manual (lote específico)

```http
POST /core/v5/recipients/{recipient_id}/anticipations

{
  "timeframe": "end",
  "payment_date": "2026-05-01T03:00:00.000Z",
  "requested_amount": 4500000
}
```

Liberação em até 2 dias úteis após análise.

### Prazos de liquidação

|Método              |Prazo padrão        |Com antecipação automática|
|--------------------|--------------------|--------------------------|
|Pix                 |Instantâneo (D+0)   |Não aplicável             |
|Cartão de crédito 1x|D+29 + 2 dias úteis |D+15 (referência)         |
|Cartão parcelado    |D+29+2 por parcela  |D+15 por parcela          |
|Boleto              |D+2 dias úteis      |Não disponível            |

Taxa de antecipação Pagar.me: a partir de 1,25% a.m. (sujeito a contrato).

-----

## 9. TRATAMENTO DE CHARGEBACK E ESTORNO PARCIAL NO CONTEXTO DO SPLIT

### Chargeback

O Pagar.me debita automaticamente os recebedores com `liable: true`.

```
Order R$60:
  Lojista: R$49 (liable: true)  → debitado em chargeback total
  Mallora: R$11 (liable: false) → absorvido pela conta principal

Webhook charge.chargeback.created:
  → orders.payment_status = 'em_disputa'
  → Admin contesta via API ou painel Pagar.me
```

Envio de evidências de entrega:

```http
POST /core/v5/disputes/{dispute_id}/evidence

{
  "files": [
    { "evidence_type": "delivery_proof", "file_id": "<id>" }
  ]
}
```

### Estorno parcial

```http
POST /core/v5/charges/{charge_id}

{
  "amount": 1500,
  "split_rules": [
    { "recipient_id": "rp_mallora_xxx", "amount": 100, "type": "flat" },
    { "recipient_id": "rp_lojista_xxx", "amount": 1400, "type": "flat" }
  ]
}
```

Se `split_rules` for omitido, o Pagar.me estorna proporcionalmente ao split
original. Atualizar `orders.payment_status = 'estornado_parcial'`.

### Estorno do Transfer (estágio 2)

Não há endpoint de rollback automático de Transfer. Em caso de cancelamento
após o Transfer para o entregador, o estorno é operacional (manual via painel
Pagar.me ou absorvido como custo de cancelamento).

-----

## 10. VARIAVEIS DE AMBIENTE E ESTRUTURA DE SEGREDOS

### Servidor (Edge Functions)

```bash
PAGARME_API_KEY=ak_test_xxx
PAGARME_WEBHOOK_SECRET=whsec_xxx
PAGARME_PLATFORM_RECIPIENT_ID=rp_mallora_xxx

STRIPE_SECRET_KEY=sk_test_xxx          # apenas Billing
STRIPE_WEBHOOK_SECRET=whsec_stripe_xxx # apenas Billing

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
APP_URL=https://app.mallora.com.br
```

### Configuração Supabase

```bash
supabase secrets set PAGARME_API_KEY=ak_test_xxx
supabase secrets set PAGARME_WEBHOOK_SECRET=whsec_xxx
supabase secrets set PAGARME_PLATFORM_RECIPIENT_ID=rp_mallora_xxx
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_stripe_xxx
```

### Configuração Vercel

```bash
vercel env add PAGARME_API_KEY production
vercel env add STRIPE_SECRET_KEY production
```

### App mobile

**Compliance PCI — regra absoluta:** o app **nunca** envia número de cartão,
CVV ou data de validade para a Edge Function da Mallora. A captura visual dos
campos do cartão é feita na UI do app, mas eles saem do dispositivo apenas
em uma única chamada HTTPS — direto para a Pagar.me, no endpoint público de
tokens:

```
POST https://api.pagar.me/core/v5/tokens?appId=$EXPO_PUBLIC_PAGARME_APPID
```

Esse endpoint usa o `appId` público (variável `EXPO_PUBLIC_PAGARME_APPID` —
ver doc 09) e retorna um `card_token` no formato `token_xxx`. Esse token é
o **único** dado relacionado ao cartão que o app envia para a Edge Function
`create-pagarme-order`, junto com o número de parcelas:

```json
POST /functions/v1/create-pagarme-order
{
  "store_id": "...",
  "payment_method": "credit_card",
  "card_token": "token_xxx",
  "installments": 3
}
```

Pontos de implementação:

- Não existe SDK obrigatório — basta um `fetch` direto para o endpoint de
  tokens. (O SDK oficial Pagar.me React Native pode ser usado se preferido,
  mas a integração funciona com `fetch` puro.)
- A `EXPO_PUBLIC_PAGARME_APPID` é uma chave pública específica para a rota
  `/tokens`. Ela só permite tokenizar — não dá acesso a Orders, recipients,
  saldos ou qualquer leitura de dados.
- A `PAGARME_API_KEY` (secret, `ak_test_*` / `ak_live_*`) **nunca** é
  embutida no app — fica apenas nas Edge Functions.
- A Edge Function rejeita qualquer payload que contenha número/CVV de
  cartão. **Não** há tokenização server-side.

A implementação concreta do componente `FormularioCartao` está documentada
no doc 17.

-----

## 11. TABELA DE MAPEAMENTO: STRIPE CONNECT X PAGAR.ME

|Campo / Conceito (Stripe Connect)     |Campo / Conceito (Pagar.me)         |Tabela / Coluna                              |
|--------------------------------------|------------------------------------|---------------------------------------------|
|`stripe_account_id` (Express Account)|`pagarme_recipient_id`              |`tenants.pagarme_recipient_id`               |
|`stripe_account_id` (courier)         |`pagarme_recipient_id`              |`couriers.pagarme_recipient_id`              |
|`stripe_onboarding_ok` (boolean)      |`pagarme_onboarding_status` (text)  |`tenants.pagarme_onboarding_status`          |
|`stripe_onboarding_ok` (courier)      |`pagarme_onboarding_status` (text)  |`couriers.pagarme_onboarding_status`         |
|`stripe_payment_intent_id`            |`pagarme_order_id`                  |`orders.pagarme_order_id`                    |
|(sem equivalente direto)              |`pagarme_charge_id`                 |`orders.pagarme_charge_id`                   |
|`stripe_transfer_id` (payouts)        |`pagarme_transfer_id`               |`payouts.pagarme_transfer_id`                |
|(sem equivalente)                     |`pagarme_transfer_id` (assignments) |`delivery_assignments.pagarme_transfer_id`   |
|`PaymentIntent`                       |`Order` + `Charge`                  |—                                            |
|`Transfer` (Separate Charges)         |`Transfer`                          |—                                            |
|`stripe.transfers.create`             |`POST /core/v5/transfers`           |—                                            |
|`stripe.paymentIntents.create`        |`POST /core/v5/orders`              |—                                            |
|`account.updated` (webhook)           |`recipient.status.changed` (webhook)|—                                            |
|`payment_intent.succeeded` (webhook)  |`order.paid` / `charge.paid`        |—                                            |
|`payment_intent.payment_failed`       |`order.payment_failed`              |—                                            |
|`charge.dispute.created`              |`charge.chargeback.created`         |—                                            |
|`charge.refunded`                     |`charge.refunded`                   |—                                            |
|`stripe.transfers.createReversal`     |Estorno manual via painel Pagar.me  |—                                            |
|Express Dashboard (saldo, saque)      |Painel Pagar.me do recipient / API  |—                                            |
|`account_onboarding` link             |`kyc_link` do recipient             |—                                            |
|Stripe Radar (antifraude)             |Clearsale (integrado no Pagar.me)   |—                                            |
|Separate Charges and Transfers        |`split_rules` na Order              |—                                            |
|`stripe_customer_id`                  |`stripe_customer_id` (inalterado)   |`tenants.stripe_customer_id`                 |
|`stripe_subscription_id`              |`stripe_subscription_id` (inalterado)|`tenant_subscriptions.stripe_subscription_id`|
|`stripe_product_id` / `stripe_price_id`|`stripe_product_id` / `stripe_price_id` (inalterado)|`plans.*`                    |

Os campos `stripe_customer_id`, `stripe_subscription_id`, `stripe_product_id`
e `stripe_price_id` permanecem inalterados — são usados pelo Stripe Billing
para a assinatura mensal dos lojistas.

-----

*Arquivo 30 de 30 — Índice Mestre disponível no arquivo 00*
