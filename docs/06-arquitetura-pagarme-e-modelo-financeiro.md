# 06 — Arquitetura Pagar.me e Modelo Financeiro

### Plataforma Delivery Divinópolis

*Versão 2.0 — 29/04/2026 (substitui Stripe Connect por Pagar.me)*

-----

## VISAO GERAL

A plataforma usa o Pagar.me como gateway de processamento de todos os pagamentos
de pedidos. O Pagar.me opera nativamente no ecossistema brasileiro: aceita Pix,
cartão de crédito/débito e boleto, e oferece split de pagamentos em múltiplos
recebedores via API com liquidação compatível com o Banco Central. Os recebedores
podem usar contas bancárias brasileiras ou chave Pix sem a exigência de criar
uma conta autônoma no gateway — o cadastro é feito pela API da Mallora.

O Stripe permanece exclusivamente como ferramenta de Stripe Billing para a
cobrança da assinatura mensal dos lojistas. Nada relacionado a pagamento de
pedidos passa mais pelo Stripe.

A Mallora continua sendo o Merchant of Record das transações. O consumidor paga
para a Mallora, o split é configurado na criação da Order no Pagar.me, e o
gateway é responsável pela liquidação direta para cada recebedor — lojista,
entregador e Mallora — sem que a Mallora precise armazenar dados bancários.

Por que Pagar.me e não Stripe Connect:

1. O Stripe Connect não suporta contas bancárias brasileiras como recebedores
   de split. O Pagar.me suporta nativamente.
1. O Pagar.me oferece Pix, antecipação automática e regras de split em uma
   única API — não exige onboarding de Express Account por recebedor.
1. A liquidação fica sob o domínio do Banco Central do Brasil, simplificando
   compliance fiscal e bancário regional.

-----

## ATORES E SUAS CONTAS NO PAGAR.ME

### Conta principal (merchant da Mallora)

Conta Pagar.me da plataforma. Recebe a credencial de API. Todas as Orders são
criadas sob essa conta. As taxas fixas de gateway são pagas pela conta principal.

### Recebedores (recipients)

Cada lojista e cada entregador autônomo é cadastrado como `recipient` via API
do Pagar.me. Não precisa criar conta própria no gateway. O cadastro contém:

- Tipo de conta bancária (corrente / poupança) ou chave Pix
- Dados do titular (nome, CPF/CNPJ)
- Configuração de antecipação automática (opcional)

Para entregadores autônomos, o Pagar.me exige validação de identidade
(KYC e Prova de Vida) antes que o recipient fique apto a receber transferências.
O fluxo de onboarding do app de entregador coleta os documentos e submete a API
de KYC do Pagar.me.

-----

## ESTRUTURA DE SPLIT POR PEDIDO

Cada Order do Pagar.me carrega um array `split_rules` definindo como o valor
da transação é distribuído entre recebedores. Em cada pedido entregue há três
recebedores envolvidos:

1. **Mallora (plataforma)** — comissão por pedido (R$1,00, ou outro valor
   configurado por plano). O `recipient_id` da Mallora é o recebedor padrão
   da conta principal.
1. **Lojista** — valor do produto menos a comissão da plataforma.
1. **Entregador autônomo** — taxa de entrega definida pela loja.

A taxa percentual do Pagar.me (MDR) é rateada entre os recebedores via
`charge_processing_fee = true`. As taxas fixas de gateway ficam sob a conta
principal da Mallora.

```json
{
  "amount": 6000,
  "split_rules": [
    {
      "recipient_id": "rp_mallora_xxx",
      "amount": 100,
      "type": "flat",
      "options": { "charge_processing_fee": false, "liable": false }
    },
    {
      "recipient_id": "rp_lojista_xxx",
      "amount": 4900,
      "type": "flat",
      "options": { "charge_processing_fee": true, "liable": true }
    },
    {
      "recipient_id": "rp_entregador_xxx",
      "amount": 1000,
      "type": "flat",
      "options": { "charge_processing_fee": true, "liable": false }
    }
  ]
}
```

Notas:

- `liable: true` no lojista significa que o lojista responde solidariamente
  por chargebacks proporcionais à sua participação no split.
- A Mallora carrega `liable: false` na sua comissão — chargebacks não consomem
  a comissão fixa.
- O entregador também opera como `liable: false` no MVP — a Mallora absorve
  o risco da taxa de entrega em caso de chargeback.

-----

## FLUXO COMPLETO DE PAGAMENTO

### Etapa 1 — Consumidor finaliza o pedido (estagio 1: split sem entregador)

```
App do consumidor chama a Edge Function create-pagarme-order

Edge Function consulta:
  - Loja (taxa_entrega, recipient_id do lojista)
  - Itens do carrinho (preço, quantidade)
  - Comissão da plataforma (platform_fee_amount)

Edge Function cria Order no Pagar.me:
  POST /core/v5/orders
  {
    items: [...],
    customer: { ... },
    payments: [{ payment_method: 'pix' | 'credit_card' }],
    split_rules: [
      { recipient_id: rp_mallora,    amount: 100, ... },
      { recipient_id: rp_lojista,    amount: 4900, ... },
      { recipient_id: rp_mallora,    amount: 1000, ... }
    ],
    metadata: {
      order_id: 'uuid-do-pedido',
      tenant_id: 'uuid-do-tenant',
      store_id: 'uuid-da-loja'
    }
  }

  → Note: a parcela de R$10 (taxa de entrega) fica temporariamente no
    recipient da Mallora. Estagio 1 do modelo de dois estagios — o
    entregador sera alocado apos a confirmacao do lojista e a Mallora
    repassara a taxa de entrega via Transfer (estagio 2).
```

A Edge Function retorna o `qr_code` (Pix) ou os dados de pagamento equivalentes
para o app do consumidor renderizar a tela de pagamento.

### Etapa 2 — Consumidor paga

```
Pix:
  → Cliente paga via app bancário escaneando o QR.
  → Pagar.me dispara webhook order.paid (e charge.paid).

Cartão:
  → Cliente preenche dados em formulário próprio do app
    (FormularioCartao). O app chama POST /core/v5/tokens?appId=...
    direto na Pagar.me e recebe um card_token (PCI — número/CVV
    nunca passam pelo backend Mallora).
  → App envia card_token + installments (1..12) para a Edge
    Function create-pagarme-order.
  → Pagar.me autoriza e captura conforme installment_type:
    'customer' (juros pela Pagar.me a partir da 2a parcela).
  → Webhook order.paid / charge.paid disparado.
```

A Edge Function `pagarme-webhook` valida a assinatura HMAC do webhook,
busca o `order_id` interno via metadata e atualiza:

```
orders.payment_status        = 'pago'
orders.status                = 'confirmado'
orders.pagarme_order_id      = 'or_xxx'
orders.pagarme_charge_id     = 'ch_xxx'
```

### Etapa 3 — Lojista aceita e aloca o entregador (estagio 2)

```
Lojista aceita o pedido no dashboard:
  → orders.status = 'em_preparo'

Plataforma (ou lojista) atribui um entregador autonomo:
  → INSERT em delivery_assignments
  → Edge Function transfer-to-courier:

  POST /core/v5/transfers
  {
    amount: 1000,                              // valor da taxa de entrega
    recipient_id: rp_entregador_xxx,
    metadata: {
      order_id: 'uuid-do-pedido',
      assignment_id: 'uuid-da-atribuicao'
    }
  }
```

**Particularidade operacional — modelo de dois estagios.** O entregador é
conhecido somente após o lojista confirmar o pedido. O Pagar.me oferece duas
abordagens possíveis:

**Estratégia A — Reconfigurar split antes da captura.** Quando o pagamento
é em cartão com pré-autorização (`capture: false` no momento da Order), a
Edge Function pode atualizar `split_rules` da charge antes de chamar a
captura. Funciona apenas para cartão e introduz dependência de janela de
captura (geralmente 5 dias).

**Estratégia B — Transferência direta após captura.** Para Pix (capturado
instantaneamente) e para cartão capturado no checkout, a taxa de entrega
permanece inicialmente no recebedor da Mallora. Após a alocação do entregador,
a Edge Function executa um `POST /core/v5/transfers` saindo da Mallora para
o recipient do entregador, no valor da taxa de entrega.

O MVP adota **Estratégia B** por simplicidade — uniforme entre Pix e cartão e
desacoplada da janela de captura. As regras finais de split ficam refletidas
nos relatórios via tabela `payouts`, que registra cada Transfer executado
no estágio 2.

### Etapa 4 — Entrega concluída

```
Entregador marca entrega como concluida no app
  → delivery_assignments.status = 'entregue'
  → orders.status = 'entregue'
```

O pedido fica elegível para o ciclo de liquidação do Pagar.me. Diferente do
modelo Stripe Connect, **não há cron de repasses operado pela Mallora** — o
Pagar.me faz a liquidação automaticamente conforme o calendário do método
de pagamento e o plano de antecipação configurado por recebedor.

### Etapa 5 — Liquidação (gerenciada pelo Pagar.me)

```
Pix:
  → Saldo do recebedor cresce instantaneamente apos order.paid.
  → Liquidacao para a conta bancaria conforme regra do recebedor
    (geralmente D+0 com antecipacao Pix).

Cartao a vista:
  → Saldo aparece como recebivel.
  → Liquidacao em D+29 corridos + 2 dias uteis (padrao Pagar.me).
  → Se o recebedor tem antecipacao automatica configurada,
    liquidacao em D+15 ou conforme plano contratado, com taxa.

Cartao parcelado:
  → Cada parcela liquida em D+29 + 2 dias uteis a partir da
    data da parcela anterior.

Boleto:
  → Liquidacao em ate 2 dias uteis apos compensacao.
```

Para o MVP, a Mallora configura no painel admin:

- Lojistas com `tem_antecipacao = false` (plano básico): liquidação padrão
  D+29+2 (cartão) / D+0 (Pix).
- Lojistas com `tem_antecipacao = true` (planos pagos): antecipação automática
  configurada via API com taxa repassada ao lojista (referência inicial: taxa
  de antecipação Pagar.me a partir de 1,25% a.m., ajustável por contrato).
- Entregadores: liquidação padrão D+1 nos casos de cartão, instantânea para Pix
  (configurada por recipient).

-----

## CALCULO FINANCEIRO DETALHADO

### Taxas Pagar.me no Brasil (referência — verificar tabela atual em contrato)

|Método              |Taxa percentual (MDR)|Taxa fixa|Exemplo em R$60|
|--------------------|---------------------|---------|---------------|
|Pix                 |~0,99%               |R$0,00   |~R$0,59        |
|Cartão crédito 1x   |~3,15% a 3,99%       |R$0,00   |~R$1,89 a R$2,39|
|Cartão débito       |~1,99%               |R$0,00   |~R$1,19        |
|Boleto              |R$3,49 fixo          |—        |R$3,49         |

A taxa percentual (MDR) é rateada entre recebedores via `charge_processing_fee`.
A taxa fixa de gateway, quando existe, fica na conta principal da Mallora.

### Exemplo com cartão de crédito à vista

```
Consumidor paga:               R$60,00
  Produto:                     R$50,00
  Taxa de entrega:             R$10,00

Pagar.me debita MDR:           ~R$2,28 (rateado entre recebedores que
                                pagam taxa)

Mallora (recipient principal): R$1,00 (split flat — comissao por pedido,
                                charge_processing_fee = false)
Lojista (recipient):           ~R$48,11  (R$49,00 - taxa proporcional)
Entregador (alocado depois):   ~R$9,61  (R$10,00 - taxa proporcional,
                                via Transfer estagio 2)

Liquidacao automatica do Pagar.me:
  Lojista:     D+29+2 (ou D+15 com antecipacao automatica)
  Entregador:  D+1 (configuracao padrao do recipient)
  Mallora:     liquidacao default da conta principal
```

### Exemplo com Pix

```
Consumidor paga:               R$60,00 (Pix)

Pagar.me debita MDR ~0,99%:    ~R$0,59

Mallora:                       R$1,00
Lojista:                       ~R$48,52
Entregador:                    ~R$9,89

Liquidacao:
  Pix sem prazo de compensacao — saldos creditados imediatamente.
  Pagamento para conta bancaria conforme cronograma do recipient.
```

### Antecipação de recebíveis

Lojistas em planos com `tem_antecipacao = true` podem:

- Configurar **antecipação automática** no recipient (recommended — opera por
  default em todas as charges futuras).
- Solicitar **antecipação manual** via API para um lote específico de
  recebíveis ainda não liquidados.

A taxa de antecipação varia conforme volume e contrato (referência inicial:
1,25% ao mês, sujeita a renegociação por volume). A Mallora repassa a taxa
integralmente ao lojista — não há margem adicional cobrada pela plataforma
sobre a antecipação no MVP.

### Campos no banco que registram esses valores

```
orders.total                  → valor pago pelo consumidor (em centavos)
orders.taxa_entrega           → parte do total destinada ao entregador
orders.platform_fee_amount    → R$1,00 em centavos (parametrizavel por plano)
orders.pagarme_order_id       → or_xxx
orders.pagarme_charge_id      → ch_xxx
delivery_assignments.valor_entrega   → valor que o entregador recebe
delivery_assignments.pagarme_transfer_id → tr_xxx (estagio 2)

payouts.valor_bruto           → soma dos pedidos antes de taxas
payouts.taxa_antecipacao      → desconto cobrado quando aplicavel
payouts.valor_liquido         → valor_bruto - taxa_antecipacao
payouts.pagarme_transfer_id   → tr_xxx (estagio 2 — repasse de taxa de entrega)
```

-----

## STRIPE BILLING — ASSINATURA MENSAL (INALTERADO)

A assinatura mensal do lojista permanece no Stripe Billing. Não há sobreposição
entre Stripe e Pagar.me — cada gateway tem sua função:

|Cobrança                        |Gateway        |
|--------------------------------|---------------|
|Assinatura mensal do lojista    |Stripe Billing |
|Pagamentos de pedidos           |Pagar.me       |

### Objetos Stripe envolvidos (assinatura)

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
  → criada após onboarding completo do lojista
  → vincula Customer ao Price
  → status refletido em tenant_subscriptions.billing_status
```

### Ciclo de vida da assinatura

```
Onboarding concluído (recipient Pagar.me ativo + dados do tenant)
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

## ONBOARDING DE RECEBEDORES (PAGAR.ME)

### Lojista

```
1. Lojista conclui o wizard de onboarding na plataforma (dados pessoais,
   loja, plano).
2. Wizard coleta dados bancarios:
   - Tipo de conta (corrente / poupanca) com banco / agencia / conta
     OU chave Pix do recebedor
   - Nome do titular e CPF/CNPJ
3. Edge Function onboard-tenant:
   → POST /core/v5/recipients
     {
       name, email, document, type: 'individual' | 'company',
       default_bank_account: {
         holder_name, holder_document,
         bank, branch_number, account_number, account_check_digit, type
       }
       OU
       payment_mode: 'pix', pix_key, pix_key_type
     }
   → Salva pagarme_recipient_id em tenants.
   → Cria Stripe Customer (para Billing — assinatura mensal).
4. KYC para Pessoa Juridica: Pagar.me valida documentos automaticamente.
   Pessoa Fisica em alguns casos exige envio de comprovantes (selfie,
   documento de identidade) via API /recipients/{id}/kyc_link.
5. Webhook recipient.created e recipient.status.changed atualizam
   tenants.pagarme_onboarding_status.
6. Quando status = 'active', Edge Function create-subscription cria
   a assinatura no Stripe Billing.
```

### Entregador

```
1. Entregador conclui o cadastro no app (nome, CPF, CNH, foto).
2. Admin aprova o cadastro no painel super admin.
3. App do entregador coleta dados financeiros:
   - Conta bancaria OU chave Pix
   - Aceite dos termos
4. Edge Function onboard-courier:
   → POST /core/v5/recipients (type: 'individual')
   → Solicita kyc_link para validacao de identidade (Prova de Vida)
   → Salva pagarme_recipient_id em couriers.
5. Entregador faz Prova de Vida e envio de documentos via link Pagar.me.
6. Webhook recipient.status.changed -> 'active' marca
   couriers.pagarme_onboarding_status = 'active'.
7. Entregador ja pode receber transfers da plataforma.
```

-----

## TRATAMENTO DE ESTORNOS, CHARGEBACKS E CANCELAMENTOS

Com split de pagamentos, o Pagar.me debita proporcionalmente cada recebedor
no momento do estorno, conforme `liable` configurado em cada split rule.

### Pedido cancelado antes da liquidação

```
Consumidor solicita cancelamento
  → orders.status = 'cancelado'
  → Se payment_status = 'pago':
       POST /core/v5/charges/{charge_id}
       (cancela a charge — equivalente a refund total)
       orders.payment_status = 'estornado'
  → Pagar.me reverte saldos a creditar de todos os recebedores
    (Mallora, lojista; entregador se a transferencia ja ocorreu, exige
    estorno explicito do transfer ou debito do saldo do entregador).
  → Nenhum repasse adicional acontece.
```

### Pedido cancelado após liquidação parcial

```
Se Pix ja liquidou para o lojista mas o pedido foi cancelado:
  → Refund parcial via API: POST /core/v5/charges/{charge_id}
    com 'amount' especifico.
  → Pagar.me debita o valor do saldo do recebedor; se saldo insuficiente,
    saldo fica negativo ate proxima liquidacao.
  → Mallora absorve o custo se nao for possivel debitar do lojista
    e registra ocorrencia em payouts com status 'estornado'.
```

### Chargeback

```
Cartao em disputa:
  → Webhook charge.chargeback.created
  → Pagar.me debita os recebedores 'liable: true' proporcionalmente
  → Lojista e debitado do valor do produto + taxa proporcional
  → Mallora recebe alerta no painel admin para responder a disputa
    (envio de comprovantes via API ou painel Pagar.me)

Pix devolvido (MED — Mecanismo Especial de Devolucao):
  → Webhook charge.refunded
  → Lojista responde solidariamente conforme 'liable' do split
```

### Estorno parcial

```
Consumidor pede reembolso parcial (ex.: produto avariado):
  POST /core/v5/charges/{charge_id}
  body: { amount: 1500 }   // R$15,00 em centavos
  → Pagar.me debita proporcionalmente cada recebedor
  → orders.payment_status = 'estornado_parcial'
  → Registrar valor estornado em campo orders.valor_estornado
```

-----

## ANTIFRAUDE

O Pagar.me oferece antifraude integrado via Clearsale (custo adicional
contratado por transação ou pacote). Configuração no painel Pagar.me:

- Score mínimo aceito por valor de transação
- Cartões bloqueados manualmente (BIN, número, e-mail)
- 3D Secure obrigatório para transações acima de determinado valor

Para o MVP, o antifraude pode permanecer desativado e ser ativado conforme
volume e exposição a fraudes. A decisão fica registrada no checklist de
go-live no doc 27.

-----

## CONFIGURACAO DE PIX

Pix está habilitado por padrão na conta Pagar.me ao concluir o cadastro
empresarial. Não há etapa adicional como no Stripe. Para emitir QR Code Pix
em uma Order:

```json
{
  "items": [...],
  "payments": [{
    "payment_method": "pix",
    "pix": {
      "expires_in": 3600
    }
  }]
}
```

A resposta inclui `qr_code` (string copia-e-cola) e `qr_code_url` (imagem
para renderização no app).

-----

## VARIAVEIS DE AMBIENTE PAGAR.ME

```bash
# Chave secreta da API — usada apenas no servidor
PAGARME_API_KEY=ak_test_xxx          # ou ak_live_xxx em producao

# Chave de assinatura HMAC dos webhooks
PAGARME_WEBHOOK_SECRET=whsec_xxx

# recipient_id da conta Mallora (recebedor padrao da plataforma)
PAGARME_PLATFORM_RECIPIENT_ID=rp_xxx

# Em desenvolvimento, usar credenciais sandbox
PAGARME_API_KEY=ak_test_xxx
PAGARME_WEBHOOK_SECRET=whsec_xxx
```

As chaves Stripe permanecem **somente para Stripe Billing** (assinatura).
Detalhes em `09 — Variáveis de Ambiente & Secrets`.

-----

## CHECKLIST PRE-PRODUCAO PAGAR.ME

- [ ] Conta Pagar.me empresarial aprovada
- [ ] recipient_id da Mallora criado e validado como recebedor padrão
- [ ] Webhook endpoint registrado apontando para a Edge Function `pagarme-webhook`
- [ ] Eventos selecionados: `order.paid`, `order.payment_failed`,
      `charge.paid`, `charge.refunded`, `charge.chargeback.created`,
      `recipient.created`, `recipient.status.changed`, `transfer.created`,
      `transfer.failed`
- [ ] Antifraude (Clearsale) configurado se aplicável
- [ ] Plano de antecipação automática configurado por recipient (lojistas
      em plano com `tem_antecipacao = true`)
- [ ] Teste de criação de Order Pix em sandbox (com QR válido)
- [ ] Teste de criação de Order com cartão de crédito em sandbox
- [ ] Teste de split com 3 recebedores em sandbox
- [ ] Teste de transfer (estágio 2 — taxa de entrega para entregador) em sandbox
- [ ] Teste de chargeback simulado em sandbox
- [ ] Variáveis de ambiente de produção configuradas no Vercel e Supabase
- [ ] Monitoramento de webhooks (Pagar.me dashboard + logs no Supabase)

Permanece o checklist independente para **Stripe Billing**:

- [ ] Stripe Customer criado por tenant
- [ ] Stripe Products/Prices sincronizados com a tabela `plans`
- [ ] Webhook endpoint Stripe registrado para eventos de subscription/invoice

-----

*Arquivo 06 de 30 — Índice Mestre disponível no arquivo 00*
*Próximo: 07 — Edge Functions de Pagamento*
