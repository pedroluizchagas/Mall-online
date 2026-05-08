// supabase/functions/create-pagarme-order/index.ts
//
// Cria uma Order no Pagar.me com split entre Mallora e lojista (estágio 1).
// A taxa de entrega é depositada na Mallora em custódia e repassada ao
// entregador via Transfer (estágio 2 — vide transfer-to-courier).
//
// Body:
// {
//   store_id: uuid,
//   itens: [{
//     product_id, quantidade, observacoes?,
//     modifiers?: [{ modifier_id }],   // só id; nome/preco vêm do banco
//     variant_id?: uuid | null         // SKU selecionado (Fase 4b)
//   }],
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

    type ModifierSnapshot = {
      modifier_id: string
      nome: string
      preco_extra: number
    }

    let subtotal = 0
    const itensProcessados: Array<{
      product_id: string
      variant_id: string | null
      quantidade: number
      observacoes?: string
      preco: number          // preço unitário já com modifiers somados
      nome: string
      subtotal: number
      modifiers: ModifierSnapshot[] | null
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

      // Variant: substitui produto.preco e valida estoque/disponibilidade.
      let precoBase = produto.preco
      let variantId: string | null = null
      if (typeof item.variant_id === 'string' && item.variant_id.length > 0) {
        const { data: variantRow, error: vErr } = await supabase
          .from('product_variants')
          .select(
            `
            id, product_id, preco, preco_promocional,
            stock_quantity, disponivel
          `
          )
          .eq('id', item.variant_id)
          .single()

        if (vErr || !variantRow) {
          throw new Error('Variação inválida')
        }
        const v = variantRow as {
          id: string
          product_id: string
          preco: number
          preco_promocional: number | null
          stock_quantity: number | null
          disponivel: boolean
        }
        if (v.product_id !== item.product_id) {
          throw new Error('Variação inválida')
        }
        if (!v.disponivel) {
          throw new Error('Variação indisponível')
        }
        if (
          v.stock_quantity != null &&
          v.stock_quantity < item.quantidade
        ) {
          throw new Error('Estoque insuficiente para a variação')
        }
        precoBase = v.preco_promocional ?? v.preco
        variantId = v.id
      }

      const modifiersInput = Array.isArray(item.modifiers)
        ? (item.modifiers as Array<{ modifier_id: string }>)
        : []
      const modifierIds = modifiersInput
        .map((m) => m?.modifier_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)

      let modifiersResolvidos: ModifierSnapshot[] = []
      let precoExtraTotal = 0
      const selecionadosPorGrupo = new Map<string, number>()

      if (modifierIds.length > 0) {
        const { data: modifierRows, error: mErr } = await supabase
          .from('product_modifiers')
          .select(`
            id, nome, preco_extra, disponivel, group_id,
            product_modifier_groups (
              id, product_id, nome, min_select, max_select
            )
          `)
          .in('id', modifierIds)

        if (mErr) throw mErr

        const rows = (modifierRows ?? []) as Array<{
          id: string
          nome: string
          preco_extra: number
          disponivel: boolean
          group_id: string
          product_modifier_groups: {
            id: string
            product_id: string
            nome: string
            min_select: number
            max_select: number
          } | null
        }>

        if (rows.length !== modifierIds.length) {
          throw new Error('Modificador inválido')
        }

        const contagensMax = new Map<
          string,
          { count: number; max_select: number; nome: string }
        >()
        for (const row of rows) {
          const grupo = row.product_modifier_groups
          if (!grupo || grupo.product_id !== item.product_id) {
            throw new Error('Modificador inválido')
          }
          if (!row.disponivel) {
            throw new Error(`Modificador indisponível: ${row.nome}`)
          }
          const acc = contagensMax.get(grupo.id)
          if (acc) {
            acc.count += 1
          } else {
            contagensMax.set(grupo.id, {
              count: 1,
              max_select: grupo.max_select,
              nome: grupo.nome,
            })
          }
          selecionadosPorGrupo.set(
            grupo.id,
            (selecionadosPorGrupo.get(grupo.id) ?? 0) + 1
          )
        }
        for (const g of contagensMax.values()) {
          if (g.count > g.max_select) {
            throw new Error(`Limite máximo excedido em "${g.nome}"`)
          }
        }

        modifiersResolvidos = rows.map((r) => ({
          modifier_id: r.id,
          nome: r.nome,
          preco_extra: r.preco_extra,
        }))
        precoExtraTotal = modifiersResolvidos.reduce(
          (acc, m) => acc + m.preco_extra,
          0
        )
      }

      // min_select: carrega TODOS os grupos do produto para validar grupos
      // obrigatórios mesmo quando o cliente não envia nada.
      const { data: gruposDoProduto, error: gErr } = await supabase
        .from('product_modifier_groups')
        .select('id, nome, min_select')
        .eq('product_id', item.product_id)

      if (gErr) throw gErr

      for (const g of (gruposDoProduto ?? []) as Array<{
        id: string
        nome: string
        min_select: number
      }>) {
        if (g.min_select > 0) {
          const count = selecionadosPorGrupo.get(g.id) ?? 0
          if (count < g.min_select) {
            throw new Error(
              `Selecione pelo menos ${g.min_select} em "${g.nome}"`
            )
          }
        }
      }

      const precoUnit = precoBase + precoExtraTotal
      const itemSubtotal = precoUnit * item.quantidade
      subtotal += itemSubtotal
      itensProcessados.push({
        product_id: item.product_id,
        variant_id: variantId,
        quantidade: item.quantidade,
        observacoes: item.observacoes,
        preco: precoUnit,
        nome: produto.nome,
        subtotal: itemSubtotal,
        modifiers:
          modifiersResolvidos.length > 0 ? modifiersResolvidos : null,
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
        variant_id: item.variant_id,
        nome: item.nome,
        preco_unit: item.preco,
        quantidade: item.quantidade,
        subtotal: item.subtotal,
        observacoes: item.observacoes,
        modifiers: item.modifiers,
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
