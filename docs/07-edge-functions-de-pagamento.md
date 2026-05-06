# 07 — Edge Functions de Pagamento

### Plataforma Delivery Divinópolis

*Versão 2.0 — 29/04/2026 (gateway de pedidos migrado para Pagar.me)*

-----

## VISAO GERAL

Todas as Edge Functions rodam em Deno (runtime padrão do Supabase).
Nenhuma operação Pagar.me acontece no cliente — apenas nas Edge Functions
ou Server Actions do Next.js.

A separação de responsabilidades entre gateways é a seguinte:

|Edge Function          |Gateway usado    |Finalidade                               |
|-----------------------|-----------------|-----------------------------------------|
|`onboard-tenant`       |Pagar.me + Stripe|Cria recipient Pagar.me + Customer Stripe|
|`onboard-courier`      |Pagar.me         |Cria recipient Pagar.me do entregador    |
|`create-pagarme-order` |Pagar.me         |Cria Order com split de pagamento        |
|`transfer-to-courier`  |Pagar.me         |Estágio 2 — repassa taxa de entrega      |
|`pagarme-webhook`      |Pagar.me         |Processa eventos do Pagar.me             |
|`create-subscription`  |Stripe Billing   |Cria assinatura mensal do lojista        |
|`stripe-webhook`       |Stripe Billing   |Processa eventos de assinatura           |
|`request-advance`      |interno          |Solicitação de antecipação (lojista)     |
|`notify-order-update`  |Expo Push        |Notificações push (coberto no doc 23)    |

Localização no repositório:

```
supabase/functions/
  onboard-tenant/          index.ts
  onboard-courier/         index.ts
  create-pagarme-order/    index.ts
  transfer-to-courier/     index.ts
  pagarme-webhook/         index.ts
  create-subscription/     index.ts
  stripe-webhook/          index.ts
  request-advance/         index.ts
  notify-order-update/     index.ts
```

Variáveis de ambiente disponíveis em todas as functions:

```
PAGARME_API_KEY
PAGARME_WEBHOOK_SECRET
PAGARME_PLATFORM_RECIPIENT_ID
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
APP_URL
```

-----

## PADRAO DE AUTENTICACAO

Todas as functions (exceto `pagarme-webhook`, `stripe-webhook` e
`create-subscription`) validam o JWT do usuário autenticado antes de qualquer
operação.

```typescript
// helpers/auth.ts — reutilizado em todas as functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function getSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('Token não fornecido')

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('Token inválido')

  return user
}

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

// Helper para chamadas autenticadas à API Pagar.me
export function pagarmeHeaders() {
  const apiKey = Deno.env.get('PAGARME_API_KEY')!
  const encoded = btoa(`${apiKey}:`)
  return {
    'Authorization': `Basic ${encoded}`,
    'Content-Type': 'application/json',
  }
}

export const PAGARME_BASE_URL = 'https://api.pagar.me/core/v5'
```

-----

## FUNCTION 1 — onboard-tenant

Chamada ao final do wizard de onboarding do lojista. Cria o tenant, a primeira
loja, o recipient Pagar.me (para receber repasses de pedidos) e o Customer
Stripe (para a assinatura mensal via Stripe Billing).

```typescript
// supabase/functions/onboard-tenant/index.ts
import Stripe from 'https://esm.sh/stripe@14'
import { getSupabaseAdmin, getAuthenticatedUser, corsHeaders,
         pagarmeHeaders, PAGARME_BASE_URL } from '../helpers/auth.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const user = await getAuthenticatedUser(req)
    const body = await req.json()
    const {
      nome_responsavel,
      cpf_cnpj,
      telefone,
      email,
      nome_loja,
      endereco,
      plan_id,
      dados_bancarios, // { tipo: 'pix' | 'conta_bancaria', ... }
    } = body

    const supabase = getSupabaseAdmin()

    const { data: tenantExistente } = await supabase
      .from('tenants')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (tenantExistente) {
      return new Response(
        JSON.stringify({ error: 'Lojista já cadastrado' }),
        { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      )
    }

    const { data: plano, error: planoError } = await supabase
      .from('plans')
      .select('id, stripe_price_id')
      .eq('id', plan_id)
      .eq('ativo', true)
      .single()

    if (planoError || !plano) {
      throw new Error('Plano não encontrado ou inativo')
    }

    // Criar recipient no Pagar.me (para receber repasses de pedidos)
    const recipientPayload =
      dados_bancarios.tipo === 'pix'
        ? {
            name: nome_responsavel,
            email,
            document: cpf_cnpj,
            type: cpf_cnpj.replace(/\D/g, '').length <= 11 ? 'individual' : 'company',
            payment_mode: 'pix',
            pix_key: dados_bancarios.chave_pix,
            pix_key_type: dados_bancarios.tipo_chave,
          }
        : {
            name: nome_responsavel,
            email,
            document: cpf_cnpj,
            type: cpf_cnpj.replace(/\D/g, '').length <= 11 ? 'individual' : 'company',
            default_bank_account: {
              holder_name: nome_responsavel,
              holder_document: cpf_cnpj,
              bank: dados_bancarios.banco,
              branch_number: dados_bancarios.agencia,
              account_number: dados_bancarios.conta,
              account_check_digit: dados_bancarios.digito,
              type: dados_bancarios.tipo_conta, // 'checking' | 'savings'
            },
          }

    const pagarmeRes = await fetch(`${PAGARME_BASE_URL}/recipients`, {
      method: 'POST',
      headers: pagarmeHeaders(),
      body: JSON.stringify(recipientPayload),
    })

    const pagarmeData = await pagarmeRes.json()
    if (!pagarmeRes.ok) {
      throw new Error(`Pagar.me recipient: ${JSON.stringify(pagarmeData)}`)
    }

    // Criar Customer no Stripe (para Billing — assinatura mensal)
    const stripeCustomer = await stripe.customers.create({
      email,
      name: nome_responsavel,
      phone: telefone,
      metadata: { user_id: user.id },
    })

    // Criar tenant
    const slug = nome_loja
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        user_id: user.id,
        nome_responsavel,
        cpf_cnpj,
        telefone,
        email,
        slug: `${slug}-${Date.now()}`,
        stripe_customer_id: stripeCustomer.id,
        pagarme_recipient_id: pagarmeData.id,
        pagarme_onboarding_status: pagarmeData.status, // 'pending' | 'active'
      })
      .select('id')
      .single()

    if (tenantError) throw tenantError

    const trialTerminaEm = new Date()
    trialTerminaEm.setDate(trialTerminaEm.getDate() + 14)

    await supabase.from('tenant_subscriptions').insert({
      tenant_id: tenant.id,
      plan_id: plano.id,
      billing_status: 'trial',
      trial_termina_em: trialTerminaEm.toISOString(),
      stripe_price_id: plano.stripe_price_id,
    })

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .insert({
        tenant_id: tenant.id,
        nome: nome_loja,
        slug: `${slug}-${Date.now()}`,
        endereco,
      })
      .select('id')
      .single()

    if (storeError) throw storeError

    // Se recipient já está ativo (PJ verificada automaticamente),
    // criar subscription Stripe imediatamente.
    // Se status = 'pending', aguardar webhook recipient.status.changed.
    if (pagarmeData.status === 'active') {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ tenant_id: tenant.id }),
      })
    }

    return new Response(
      JSON.stringify({
        tenant_id: tenant.id,
        store_id: store.id,
        pagarme_recipient_status: pagarmeData.status,
        kyc_link: pagarmeData.kyc_link ?? null,
      }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  }
})
```

-----

## FUNCTION 2 — onboard-courier

Chamada após aprovação do entregador pelo admin. Cria o recipient Pagar.me e
solicita o link de KYC (Prova de Vida) para o entregador completar no app.

```typescript
// supabase/functions/onboard-courier/index.ts
import { getSupabaseAdmin, getAuthenticatedUser, corsHeaders,
         pagarmeHeaders, PAGARME_BASE_URL } from '../helpers/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const user = await getAuthenticatedUser(req)
    const supabase = getSupabaseAdmin()

    const { data: courier, error: courierError } = await supabase
      .from('couriers')
      .select('id, nome, cpf, status, pagarme_recipient_id')
      .eq('user_id', user.id)
      .single()

    if (courierError || !courier) throw new Error('Entregador não encontrado')
    if (courier.status !== 'aprovado') throw new Error('Entregador ainda não aprovado')

    const body = await req.json()
    const { dados_bancarios } = body

    let recipientId = courier.pagarme_recipient_id

    if (!recipientId) {
      const recipientPayload =
        dados_bancarios.tipo === 'pix'
          ? {
              name: courier.nome,
              document: courier.cpf,
              type: 'individual',
              payment_mode: 'pix',
              pix_key: dados_bancarios.chave_pix,
              pix_key_type: dados_bancarios.tipo_chave,
            }
          : {
              name: courier.nome,
              document: courier.cpf,
              type: 'individual',
              default_bank_account: {
                holder_name: courier.nome,
                holder_document: courier.cpf,
                bank: dados_bancarios.banco,
                branch_number: dados_bancarios.agencia,
                account_number: dados_bancarios.conta,
                account_check_digit: dados_bancarios.digito,
                type: dados_bancarios.tipo_conta,
              },
            }

      const pagarmeRes = await fetch(`${PAGARME_BASE_URL}/recipients`, {
        method: 'POST',
        headers: pagarmeHeaders(),
        body: JSON.stringify(recipientPayload),
      })

      const pagarmeData = await pagarmeRes.json()
      if (!pagarmeRes.ok) {
        throw new Error(`Pagar.me recipient: ${JSON.stringify(pagarmeData)}`)
      }

      recipientId = pagarmeData.id

      await supabase
        .from('couriers')
        .update({
          pagarme_recipient_id: recipientId,
          pagarme_onboarding_status: pagarmeData.status,
        })
        .eq('id', courier.id)
    }

    // Solicitar KYC link (Prova de Vida — exigida pelo Pagar.me para PF)
    const kycRes = await fetch(
      `${PAGARME_BASE_URL}/recipients/${recipientId}/kyc_link`,
      { method: 'POST', headers: pagarmeHeaders() }
    )
    const kycData = await kycRes.json()

    return new Response(
      JSON.stringify({
        pagarme_recipient_id: recipientId,
        kyc_link: kycData.url ?? null,
      }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  }
})
```

-----

## FUNCTION 3 — create-pagarme-order

Chamada pelo app do consumidor ao iniciar o checkout. Cria a Order no Pagar.me
com split entre Mallora e lojista (estágio 1). A taxa de entrega fica
temporariamente no recipient da Mallora até a alocação do entregador.

```typescript
// supabase/functions/create-pagarme-order/index.ts
import { getSupabaseAdmin, getAuthenticatedUser, corsHeaders,
         pagarmeHeaders, PAGARME_BASE_URL } from '../helpers/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const user = await getAuthenticatedUser(req)
    const body = await req.json()
    const {
      store_id,
      itens,
      endereco_entrega,
      observacoes,
      payment_method,
      card_token,
      installments,
    } = body

    // Validacao de parcelas (apenas cartao). Pix nao permite parcelar.
    let parcelas = 1
    if (payment_method === 'credit_card') {
      const valor = Number(installments)
      if (!Number.isInteger(valor) || valor < 1 || valor > 12) {
        throw new Error('Numero de parcelas invalido (1 a 12)')
      }
      parcelas = valor
    }

    if (payment_method === 'credit_card' && !card_token) {
      throw new Error('card_token obrigatorio. Tokenize o cartao no app via Pagar.me /tokens.')
    }

    const supabase = getSupabaseAdmin()

    const { data: consumer } = await supabase
      .from('consumers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!consumer) throw new Error('Consumidor não encontrado')

    const { data: store } = await supabase
      .from('stores')
      .select(`
        id, tenant_id, taxa_entrega, ativo,
        tenants ( pagarme_recipient_id, pagarme_onboarding_status )
      `)
      .eq('id', store_id)
      .single()

    if (!store || !store.ativo) throw new Error('Loja não encontrada ou inativa')

    const tenant = store.tenants as any
    if (tenant.pagarme_onboarding_status !== 'active') {
      throw new Error('Loja temporariamente indisponível para pagamentos online')
    }

    const { data: subscription } = await supabase
      .from('tenant_subscriptions')
      .select('billing_status')
      .eq('tenant_id', store.tenant_id)
      .in('billing_status', ['trial', 'ativa'])
      .single()

    if (!subscription) throw new Error('Loja temporariamente indisponível')

    let subtotal = 0
    const itensProcessados: any[] = []

    for (const item of itens) {
      const { data: produto } = await supabase
        .from('products')
        .select('preco, nome, disponivel')
        .eq('id', item.product_id)
        .single()

      if (!produto || !produto.disponivel) {
        throw new Error(`Produto indisponível: ${item.product_id}`)
      }

      const itemSubtotal = produto.preco * item.quantidade
      subtotal += itemSubtotal
      itensProcessados.push({ ...item, preco: produto.preco, nome: produto.nome, subtotal: itemSubtotal })
    }

    const taxa_entrega = store.taxa_entrega
    const total = subtotal + taxa_entrega
    const platform_fee = 100 // R$1,00

    // Valor do lojista: subtotal - comissão (taxa entrega vai para a Mallora no estágio 1)
    const valorLojista = subtotal - platform_fee

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        consumer_id: consumer.id,
        store_id: store.id,
        tenant_id: store.tenant_id,
        status: 'novo',
        payment_status: 'pendente',
        forma_pagamento: `online_${payment_method}`,
        subtotal,
        taxa_entrega,
        total,
        platform_fee_amount: platform_fee,
        endereco_entrega,
        observacoes,
      })
      .select('id')
      .single()

    if (orderError) throw orderError

    await supabase.from('order_items').insert(
      itensProcessados.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        nome: item.nome,
        preco_unit: item.preco,
        quantidade: item.quantidade,
        subtotal: item.subtotal,
        observacoes: item.observacoes,
      }))
    )

    const platformRecipientId = Deno.env.get('PAGARME_PLATFORM_RECIPIENT_ID')!

    const splitRules = [
      {
        recipient_id: platformRecipientId,
        amount: platform_fee + taxa_entrega,
        type: 'flat',
        options: { charge_processing_fee: false, liable: false },
      },
      {
        recipient_id: tenant.pagarme_recipient_id,
        amount: valorLojista,
        type: 'flat',
        options: { charge_processing_fee: true, liable: true },
      },
    ]

    const pagarmeItems = itensProcessados.map((item) => ({
      amount: item.preco,
      description: item.nome,
      quantity: item.quantidade,
      code: item.product_id,
    }))

    const pagarmePayload: any = {
      code: order.id,
      customer: {
        external_id: consumer.id,
        name: user.email ?? 'Consumidor',
        email: user.email,
      },
      items: pagarmeItems,
      metadata: {
        order_id: order.id,
        tenant_id: store.tenant_id,
        store_id: store.id,
      },
    }

    if (payment_method === 'pix') {
      pagarmePayload.payments = [{
        payment_method: 'pix',
        pix: { expires_in: 3600 },
        amount: total,
        split: splitRules,
      }]
    } else {
      pagarmePayload.payments = [{
        payment_method: payment_method,
        credit_card: {
          card_token: card_token,
          installments: parcelas,
          // 'customer' = juros sao cobrados do consumidor pela Pagar.me
          // a partir da 2a parcela. Mantem o valor liquido do lojista
          // identico ao da venda a vista. Para parcelas sem juros pelo
          // lojista, trocar por 'merchant' e configurar a tabela de
          // juros no painel Pagar.me.
          installment_type: 'customer',
          statement_descriptor: 'Mallora',
        },
        amount: total,
        split: splitRules,
      }]
    }

    const pagarmeRes = await fetch(`${PAGARME_BASE_URL}/orders`, {
      method: 'POST',
      headers: pagarmeHeaders(),
      body: JSON.stringify(pagarmePayload),
    })

    const pagarmeOrder = await pagarmeRes.json()

    if (!pagarmeRes.ok) {
      await supabase
        .from('orders')
        .update({ status: 'cancelado', motivo_cancelamento: 'Falha no gateway' })
        .eq('id', order.id)
      throw new Error(`Pagar.me order: ${JSON.stringify(pagarmeOrder)}`)
    }

    const charge = pagarmeOrder.charges?.[0]

    await supabase
      .from('orders')
      .update({
        pagarme_order_id: pagarmeOrder.id,
        pagarme_charge_id: charge?.id ?? null,
      })
      .eq('id', order.id)

    const responsePayload: any = {
      order_id: order.id,
      pagarme_order_id: pagarmeOrder.id,
      total,
    }

    if (payment_method === 'pix') {
      responsePayload.pix_qr_code = charge?.last_transaction?.qr_code
      responsePayload.pix_qr_code_url = charge?.last_transaction?.qr_code_url
    } else {
      responsePayload.payment_status = charge?.status
    }

    return new Response(
      JSON.stringify(responsePayload),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  }
})
```

-----

## FUNCTION 4 — transfer-to-courier

Chamada quando um entregador autônomo é alocado (estágio 2). Executa o Transfer
Pagar.me da conta Mallora para o recipient do entregador, no valor da taxa de
entrega.

```typescript
// supabase/functions/transfer-to-courier/index.ts
import { getSupabaseAdmin, getAuthenticatedUser, corsHeaders,
         pagarmeHeaders, PAGARME_BASE_URL } from '../helpers/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const user = await getAuthenticatedUser(req)
    const body = await req.json()
    const { assignment_id } = body

    const supabase = getSupabaseAdmin()

    const { data: assignment } = await supabase
      .from('delivery_assignments')
      .select(`
        id, order_id, courier_id, valor_entrega, pagarme_transfer_id,
        couriers!inner ( pagarme_recipient_id, pagarme_onboarding_status, tipo, status ),
        orders!inner ( tenant_id, payment_status )
      `)
      .eq('id', assignment_id)
      .single()

    if (!assignment) throw new Error('Atribuição não encontrada')
    if (assignment.pagarme_transfer_id) throw new Error('Transfer já executado')

    const courier = assignment.couriers as any
    const order = assignment.orders as any

    if (courier.tipo !== 'autonomo') {
      return new Response(
        JSON.stringify({ message: 'Entregador próprio — sem transfer Pagar.me' }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      )
    }

    if (courier.pagarme_onboarding_status !== 'active') {
      throw new Error('Entregador sem KYC concluído')
    }

    if (order.payment_status !== 'pago') {
      throw new Error('Pedido ainda não pago — aguardar confirmação')
    }

    const transferRes = await fetch(`${PAGARME_BASE_URL}/transfers`, {
      method: 'POST',
      headers: pagarmeHeaders(),
      body: JSON.stringify({
        amount: assignment.valor_entrega,
        recipient_id: courier.pagarme_recipient_id,
        metadata: {
          assignment_id: assignment.id,
          order_id: assignment.order_id,
          courier_id: assignment.courier_id,
          tipo: 'taxa_entrega_estagio2',
        },
      }),
    })

    const transferData = await transferRes.json()
    if (!transferRes.ok) {
      throw new Error(`Pagar.me transfer: ${JSON.stringify(transferData)}`)
    }

    await supabase
      .from('delivery_assignments')
      .update({ pagarme_transfer_id: transferData.id })
      .eq('id', assignment.id)

    await supabase.from('payouts').insert({
      tipo: 'entregador',
      courier_id: assignment.courier_id,
      valor_bruto: assignment.valor_entrega,
      taxa_antecipacao: 0,
      valor_liquido: assignment.valor_entrega,
      total_pedidos: 1,
      status: 'concluido',
      antecipado: false,
      data_referencia: new Date().toISOString().split('T')[0],
      data_prevista: new Date().toISOString().split('T')[0],
      pagarme_transfer_id: transferData.id,
      processado_em: new Date().toISOString(),
    })

    return new Response(
      JSON.stringify({ pagarme_transfer_id: transferData.id }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  }
})
```

-----

## FUNCTION 5 — pagarme-webhook

Ponto de entrada para todos os eventos do Pagar.me. Verifica a assinatura HMAC
do webhook antes de processar qualquer evento.

```typescript
// supabase/functions/pagarme-webhook/index.ts
import { getSupabaseAdmin } from '../helpers/auth.ts'

// HMAC-SHA256 hex usando Web Crypto (Deno).
async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Comparacao tempo-constante entre duas strings hex de mesmo tamanho.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('PAGARME_WEBHOOK_SECRET')!

  // Pagar.me v5 envia a assinatura no header x-hub-signature
  // no formato 'sha256=<hex>'. Algumas integracoes usam
  // 'x-pagarme-signature' — lemos os dois para compatibilidade.
  const rawSignature =
    req.headers.get('x-hub-signature') ??
    req.headers.get('x-pagarme-signature') ??
    ''
  const receivedHex = rawSignature.replace(/^sha256=/, '')

  // IMPORTANTE: ler o raw body antes de qualquer parse, para
  // que o HMAC seja calculado sobre exatamente os bytes recebidos.
  const body = await req.text()

  const expectedHex = await hmacSha256Hex(secret, body)

  if (!receivedHex || !timingSafeEqual(receivedHex, expectedHex)) {
    return new Response('Assinatura invalida', { status: 401 })
  }

  const event = JSON.parse(body)
  const supabase = getSupabaseAdmin()

  // Idempotencia: cada evento da Pagar.me tem um id unico.
  // Inserimos em webhook_events_log antes de processar; se ja
  // existia (retry de webhook), apenas confirmamos 200 sem
  // reprocessar os side-effects.
  if (event.id) {
    const { error: dupError } = await supabase
      .from('webhook_events_log')
      .insert({
        event_id: event.id,
        tipo: event.type,
        payload: event,
      })

    // 23505 = unique_violation (Postgres) -> evento ja processado
    if (dupError && (dupError as any).code === '23505') {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  try {
    switch (event.type) {

      case 'order.paid':
      case 'charge.paid': {
        const obj = event.data
        const orderId = obj.metadata?.order_id ?? obj.code
        if (!orderId) break

        await supabase
          .from('orders')
          .update({
            payment_status: 'pago',
            pagarme_order_id: obj.order_id ?? obj.id,
            pagarme_charge_id: obj.id,
            forma_pagamento: mapPaymentMethod(obj.payment_method),
          })
          .eq('id', orderId)
        break
      }

      case 'order.payment_failed':
      case 'charge.payment_failed': {
        const obj = event.data
        const orderId = obj.metadata?.order_id ?? obj.code
        if (!orderId) break

        await supabase
          .from('orders')
          .update({
            status: 'cancelado',
            payment_status: 'pendente',
            motivo_cancelamento: 'Falha no pagamento',
            cancelado_em: new Date().toISOString(),
          })
          .eq('id', orderId)
        break
      }

      case 'charge.refunded': {
        const charge = event.data
        const orderId = charge.metadata?.order_id
        if (!orderId) break

        const isPartial = charge.refunded_amount < charge.amount
        await supabase
          .from('orders')
          .update({ payment_status: isPartial ? 'estornado_parcial' : 'estornado' })
          .eq('id', orderId)
        break
      }

      case 'charge.chargeback.created': {
        const charge = event.data
        const orderId = charge.metadata?.order_id
        if (!orderId) break

        await supabase
          .from('orders')
          .update({ payment_status: 'em_disputa' })
          .eq('id', orderId)
        break
      }

      case 'recipient.status.changed': {
        const recipient = event.data
        const newStatus = recipient.status

        const { data: tenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('pagarme_recipient_id', recipient.id)
          .single()

        if (tenant) {
          await supabase
            .from('tenants')
            .update({ pagarme_onboarding_status: newStatus })
            .eq('id', tenant.id)

          if (newStatus === 'active') {
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/create-subscription`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({ tenant_id: tenant.id }),
            })
          }
        }

        const { data: courier } = await supabase
          .from('couriers')
          .select('id')
          .eq('pagarme_recipient_id', recipient.id)
          .single()

        if (courier) {
          await supabase
            .from('couriers')
            .update({ pagarme_onboarding_status: newStatus })
            .eq('id', courier.id)
        }
        break
      }

      case 'transfer.failed': {
        const transfer = event.data
        await supabase
          .from('payouts')
          .update({
            status: 'falhou',
            erro_mensagem: `Transfer ${transfer.id} falhou`,
          })
          .eq('pagarme_transfer_id', transfer.id)
        break
      }

      default:
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro ao processar webhook Pagar.me:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    )
  }
})

function mapPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    pix: 'online_pix',
    credit_card: 'online_cartao',
    debit_card: 'online_cartao',
    boleto: 'online_boleto',
  }
  return map[method] ?? 'online_cartao'
}
```

-----

## FUNCTION 6 — create-subscription

Chamada após o recipient Pagar.me do lojista atingir status `active`. Cria a
Subscription no Stripe Billing. Inalterada em relação à versão anterior, exceto
pelo campo de verificação: `pagarme_onboarding_status` no lugar de
`stripe_onboarding_ok`.

```typescript
// supabase/functions/create-subscription/index.ts
import Stripe from 'https://esm.sh/stripe@14'
import { getSupabaseAdmin, corsHeaders } from '../helpers/auth.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const body = await req.json()
    const { tenant_id } = body

    const supabase = getSupabaseAdmin()

    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_customer_id, pagarme_onboarding_status')
      .eq('id', tenant_id)
      .single()

    if (!tenant || tenant.pagarme_onboarding_status !== 'active') {
      throw new Error('Tenant sem recipient Pagar.me ativo')
    }

    const { data: sub } = await supabase
      .from('tenant_subscriptions')
      .select('stripe_price_id, stripe_subscription_id, trial_termina_em')
      .eq('tenant_id', tenant_id)
      .single()

    if (!sub || !sub.stripe_price_id) {
      throw new Error('Assinatura ou price não encontrado')
    }

    if (sub.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ message: 'Subscription já existe' }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      )
    }

    const trialEnd = sub.trial_termina_em
      ? Math.floor(new Date(sub.trial_termina_em).getTime() / 1000)
      : undefined

    const subscription = await stripe.subscriptions.create({
      customer: tenant.stripe_customer_id,
      items: [{ price: sub.stripe_price_id }],
      trial_end: trialEnd,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    })

    await supabase
      .from('tenant_subscriptions')
      .update({
        stripe_subscription_id: subscription.id,
        billing_status: subscription.status === 'trialing' ? 'trial' : 'ativa',
        periodo_inicio: new Date(subscription.current_period_start * 1000).toISOString(),
        periodo_fim: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('tenant_id', tenant_id)

    return new Response(
      JSON.stringify({ subscription_id: subscription.id }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  }
})
```

-----

## FUNCTION 7 — stripe-webhook

Processa exclusivamente eventos de Stripe Billing (assinatura mensal). Nenhum
evento de pagamento de pedido chega a este endpoint.

```typescript
// supabase/functions/stripe-webhook/index.ts
import Stripe from 'https://esm.sh/stripe@14'
import { getSupabaseAdmin } from '../helpers/auth.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
})

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch {
    return new Response('Assinatura inválida', { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  try {
    switch (event.type) {

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await supabase
          .from('tenant_subscriptions')
          .update({
            billing_status: mapSubscriptionStatus(sub.status),
            periodo_inicio: new Date(sub.current_period_start * 1000).toISOString(),
            periodo_fim: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await supabase
          .from('tenant_subscriptions')
          .update({ billing_status: 'cancelada', cancelado_em: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          await supabase
            .from('tenant_subscriptions')
            .update({ billing_status: 'ativa' })
            .eq('stripe_subscription_id', invoice.subscription)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          await supabase
            .from('tenant_subscriptions')
            .update({ billing_status: 'em_atraso' })
            .eq('stripe_subscription_id', invoice.subscription)
        }
        break
      }

      default:
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro ao processar webhook Stripe:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})

function mapSubscriptionStatus(status: string): string {
  const map: Record<string, string> = {
    active: 'ativa',
    trialing: 'trial',
    past_due: 'em_atraso',
    canceled: 'cancelada',
    unpaid: 'em_atraso',
    incomplete: 'trial',
    incomplete_expired: 'cancelada',
  }
  return map[status] ?? 'em_atraso'
}
```

-----

## FUNCTION 8 — request-advance

Chamada pelo lojista ao solicitar antecipação via painel financeiro. Ativa a
antecipação automática no recipient Pagar.me e registra a solicitação internamente.

```typescript
// supabase/functions/request-advance/index.ts
import { getSupabaseAdmin, getAuthenticatedUser, corsHeaders,
         pagarmeHeaders, PAGARME_BASE_URL } from '../helpers/auth.ts'

const TAXA_ANTECIPACAO_CENTAVOS = 75 // R$0,75 por pedido

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const user = await getAuthenticatedUser(req)
    const supabase = getSupabaseAdmin()

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, pagarme_recipient_id, pagarme_onboarding_status')
      .eq('user_id', user.id)
      .single()

    if (!tenant) throw new Error('Lojista não encontrado')
    if (tenant.pagarme_onboarding_status !== 'active') {
      throw new Error('Configure sua conta de recebimentos antes de solicitar antecipação')
    }

    const { data: sub } = await supabase
      .from('tenant_subscriptions')
      .select('billing_status, plans!inner(tem_antecipacao)')
      .eq('tenant_id', tenant.id)
      .single()

    if (!sub || !['trial', 'ativa'].includes(sub.billing_status)) {
      throw new Error('Assinatura inativa')
    }

    if (!sub.plans.tem_antecipacao) {
      throw new Error('Seu plano não inclui antecipação de repasses')
    }

    const { data: antecipacaoExistente } = await supabase
      .from('payout_advance_requests')
      .select('id, status')
      .eq('tenant_id', tenant.id)
      .in('status', ['pendente', 'aprovada'])
      .single()

    if (antecipacaoExistente) {
      throw new Error('Já existe uma solicitação de antecipação em andamento')
    }

    const seteDiasAtras = new Date()
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)

    const { data: pedidosElegiveis } = await supabase
      .from('orders')
      .select('id, total, taxa_entrega, platform_fee_amount')
      .eq('tenant_id', tenant.id)
      .eq('status', 'entregue')
      .eq('payment_status', 'pago')
      .gte('atualizado_em', seteDiasAtras.toISOString())

    if (!pedidosElegiveis || pedidosElegiveis.length === 0) {
      throw new Error('Nenhum pedido elegível para antecipação no momento')
    }

    const totalPedidos = pedidosElegiveis.length
    const valorEstimado = pedidosElegiveis.reduce(
      (acc, p) => acc + p.total - p.taxa_entrega - p.platform_fee_amount,
      0
    )
    const taxaTotal = totalPedidos * TAXA_ANTECIPACAO_CENTAVOS
    const valorLiquido = valorEstimado - taxaTotal

    // Ativar antecipação automática no recipient Pagar.me
    await fetch(`${PAGARME_BASE_URL}/recipients/${tenant.pagarme_recipient_id}`, {
      method: 'PUT',
      headers: pagarmeHeaders(),
      body: JSON.stringify({
        automatic_anticipation_enabled: true,
        automatic_anticipation_type: 'full',
        automatic_anticipation_days: 1,
        automatic_anticipation_1025_delay: 15,
      }),
    })

    const { data: solicitacao } = await supabase
      .from('payout_advance_requests')
      .insert({
        tenant_id: tenant.id,
        total_pedidos: totalPedidos,
        taxa_total: taxaTotal,
        valor_estimado: valorEstimado,
        status: 'aprovada',
      })
      .select('id')
      .single()

    return new Response(
      JSON.stringify({
        solicitacao_id: solicitacao?.id,
        total_pedidos: totalPedidos,
        valor_bruto: valorEstimado,
        taxa_antecipacao: taxaTotal,
        valor_liquido: valorLiquido,
        previsao_liquidacao: 'Conforme calendário Pagar.me — D+15 a partir da ativação',
        mensagem: 'Antecipação automática ativada no Pagar.me.',
      }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  }
})
```

-----

## EVENTOS WEBHOOK PAGAR.ME — LISTA PARA REGISTRO

```
order.paid
order.payment_failed
charge.paid
charge.payment_failed
charge.refunded
charge.chargeback.created
recipient.created
recipient.status.changed
transfer.created
transfer.failed
```

Endpoint de destino:

```
https://xxxxxxxxxxxx.supabase.co/functions/v1/pagarme-webhook
```

## EVENTOS WEBHOOK STRIPE — LISTA PARA REGISTRO (BILLING)

```
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
invoice.payment_action_required
```

Endpoint de destino:

```
https://xxxxxxxxxxxx.supabase.co/functions/v1/stripe-webhook
```

-----

## TESTANDO LOCALMENTE

### Pagar.me (sandbox)

```bash
# Usar credenciais sandbox (ak_test_xxx) no .env.local.
# Simular webhook manualmente:

curl -X POST http://localhost:54321/functions/v1/pagarme-webhook \
  -H "Content-Type: application/json" \
  -H "x-hub-signature: sha256=<hmac-sha256 calculado com PAGARME_WEBHOOK_SECRET>" \
  -d '{"type":"order.paid","data":{"id":"ch_test","metadata":{"order_id":"<uuid>"}}}'
```

### Stripe Billing (test mode)

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

stripe trigger customer.subscription.updated
stripe trigger invoice.paid
```

-----

*Arquivo 07 de 30 — Índice Mestre disponível no arquivo 00*
*Próximo: 08 — Estrutura do Monorepo*
