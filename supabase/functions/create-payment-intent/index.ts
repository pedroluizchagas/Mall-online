// supabase/functions/create-payment-intent/index.ts
import Stripe from 'https://esm.sh/stripe@14'
import { getSupabaseAdmin, getAuthenticatedUser, corsHeaders } from '../helpers/auth.ts'

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
    const { store_id, itens, endereco_entrega, observacoes } = body

    const supabase = getSupabaseAdmin()

    // Buscar consumidor
    const { data: consumer } = await supabase
      .from('consumers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!consumer) throw new Error('Consumidor não encontrado')

    // Buscar loja e tenant
    const { data: store } = await supabase
      .from('stores')
      .select('id, tenant_id, taxa_entrega, ativo')
      .eq('id', store_id)
      .single()

    if (!store || !store.ativo) throw new Error('Loja não encontrada ou inativa')

    // Verificar que o tenant tem assinatura ativa
    const { data: subscription } = await supabase
      .from('tenant_subscriptions')
      .select('billing_status')
      .eq('tenant_id', store.tenant_id)
      .in('billing_status', ['trial', 'ativa'])
      .single()

    if (!subscription) throw new Error('Loja temporariamente indisponível')

    // Calcular total
    let subtotal = 0
    for (const item of itens) {
      const { data: produto } = await supabase
        .from('products')
        .select('preco, disponivel')
        .eq('id', item.product_id)
        .single()

      if (!produto || !produto.disponivel) {
        throw new Error(`Produto indisponível: ${item.product_id}`)
      }

      subtotal += produto.preco * item.quantidade
    }

    const taxa_entrega = store.taxa_entrega
    const total = subtotal + taxa_entrega

    // Criar PaymentIntent na conta da plataforma
    // Sem transfer_data — plataforma retém tudo até o cron de repasses
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: 'brl',
      automatic_payment_methods: { enabled: true },
      metadata: {
        consumer_id: consumer.id,
        store_id: store.id,
        tenant_id: store.tenant_id,
        subtotal: String(subtotal),
        taxa_entrega: String(taxa_entrega),
      },
    })

    // Criar pedido com status 'novo' e payment_status 'pendente'
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        consumer_id: consumer.id,
        store_id: store.id,
        tenant_id: store.tenant_id,
        status: 'novo',
        payment_status: 'pendente',
        forma_pagamento: 'online_cartao',
        subtotal,
        taxa_entrega,
        total,
        platform_fee_amount: 100,
        endereco_entrega,
        observacoes,
        stripe_payment_intent_id: paymentIntent.id,
      })
      .select('id')
      .single()

    if (orderError) throw orderError

    // Criar itens do pedido
    const orderItems = itens.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      nome: item.nome,
      preco_unit: item.preco,
      quantidade: item.quantidade,
      subtotal: item.preco * item.quantidade,
      observacoes: item.observacoes,
    }))

    await supabase.from('order_items').insert(orderItems)

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        order_id: order.id,
        total,
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
