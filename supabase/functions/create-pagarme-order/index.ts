// supabase/functions/create-pagarme-order/index.ts
//
// Cria uma Order no Pagar.me com split entre Mallora e lojista (estágio 1).
// A taxa de entrega é depositada na Mallora em custódia e repassada ao
// entregador via Transfer (estágio 2 — vide transfer-to-courier).
//
// Body:
// {
//   store_id: uuid,
//   itens: [{ product_id, quantidade, observacoes? }],
//   endereco_entrega: jsonb,
//   observacoes?: string,
//   payment_method: 'pix' | 'credit_card',
//   card_token?: string,        // obrigatório para credit_card
//   installments?: number,      // 1..12, apenas credit_card
// }
import {
  getSupabaseAdmin,
  getAuthenticatedUser,
  corsHeaders,
} from '../helpers/auth.ts'
import { pagarmeRequest } from '../helpers/pagarme.ts'

const PLATFORM_FEE_CENTAVOS = 100 // R$1,00 — comissão fixa Mallora

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
    } = body ?? {}

    if (!store_id || !Array.isArray(itens) || itens.length === 0) {
      throw new Error('store_id e itens são obrigatórios')
    }
    if (payment_method !== 'pix' && payment_method !== 'credit_card') {
      throw new Error('payment_method deve ser "pix" ou "credit_card"')
    }
    if (payment_method === 'credit_card' && !card_token) {
      throw new Error('card_token é obrigatório para pagamento com cartão')
    }

    let parcelas = 1
    if (payment_method === 'credit_card') {
      parcelas = Number(installments ?? 1)
      if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 12) {
        throw new Error('installments deve ser inteiro entre 1 e 12')
      }
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

    const tenant = store.tenants as {
      pagarme_recipient_id: string | null
      pagarme_onboarding_status: string | null
    }
    if (
      !tenant?.pagarme_recipient_id ||
      tenant.pagarme_onboarding_status !== 'active'
    ) {
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
    const itensProcessados: Array<{
      product_id: string
      quantidade: number
      observacoes?: string
      preco: number
      nome: string
      subtotal: number
    }> = []

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
      itensProcessados.push({
        product_id: item.product_id,
        quantidade: item.quantidade,
        observacoes: item.observacoes,
        preco: produto.preco,
        nome: produto.nome,
        subtotal: itemSubtotal,
      })
    }

    const taxa_entrega = store.taxa_entrega
    const total = subtotal + taxa_entrega
    const platform_fee = PLATFORM_FEE_CENTAVOS

    // Estágio 1: lojista recebe (subtotal - comissão); Mallora retém comissão +
    // taxa de entrega em custódia até a alocação do entregador.
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
      })),
    )

    const platformRecipientId = Deno.env.get('PAGARME_PLATFORM_RECIPIENT_ID')
    if (!platformRecipientId) {
      throw new Error('PAGARME_PLATFORM_RECIPIENT_ID não configurado')
    }

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

    const pagarmePayload: Record<string, unknown> = {
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
        payment_method: 'credit_card',
        credit_card: {
          card_token,
          installments: parcelas,
          // 'customer' = juros pagos pelo consumidor (parcelado com juros);
          // a Mallora não absorve o custo do parcelamento.
          installment_type: 'customer',
          statement_descriptor: 'Mallora',
        },
        amount: total,
        split: splitRules,
      }]
    }

    const pagarmeRes = await pagarmeRequest<{
      id: string
      charges?: Array<{
        id: string
        status?: string
        last_transaction?: { qr_code?: string; qr_code_url?: string }
      }>
    }>('/orders', { method: 'POST', body: pagarmePayload })

    if (!pagarmeRes.ok) {
      await supabase
        .from('orders')
        .update({ status: 'cancelado', motivo_cancelamento: 'Falha no gateway' })
        .eq('id', order.id)
      throw new Error(`Pagar.me order: ${JSON.stringify(pagarmeRes.data)}`)
    }

    const pagarmeOrder = pagarmeRes.data
    const charge = pagarmeOrder.charges?.[0]

    await supabase
      .from('orders')
      .update({
        pagarme_order_id: pagarmeOrder.id,
        pagarme_charge_id: charge?.id ?? null,
      })
      .eq('id', order.id)

    const responsePayload: Record<string, unknown> = {
      order_id: order.id,
      pagarme_order_id: pagarmeOrder.id,
      pagarme_charge_id: charge?.id ?? null,
      total,
    }

    if (payment_method === 'pix') {
      responsePayload.pix_qr_code = charge?.last_transaction?.qr_code
      responsePayload.pix_qr_code_url = charge?.last_transaction?.qr_code_url
    } else {
      responsePayload.payment_status = charge?.status
      responsePayload.installments = parcelas
    }

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } },
    )
  }
})
