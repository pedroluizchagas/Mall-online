// supabase/functions/create-offline-order/index.ts
//
// Cria um pedido OFFLINE (forma_pagamento ∈ {'dinheiro','cartao_maquininha'})
// resolvendo `tenant_id` server-side a partir de `store_id` (D2: o storefront
// não pode ler a tabela base `stores`). Espelha create-pagarme-order para
// auth + validação de itens + modifiers/variants/min-max, mas NÃO chama a
// Pagar.me e NÃO suporta agendamento.
//
// Body:
// {
//   store_id: uuid,
//   itens: [{
//     product_id, quantidade, observacoes?,
//     modifiers?: [{ modifier_id }],
//     variant_id?: uuid | null
//   }],
//   endereco_entrega: jsonb,             // obrigatório em offline
//   observacoes?: string,
//   forma_pagamento: 'dinheiro' | 'cartao_maquininha',
//   troco_para?: number,                 // centavos, só 'dinheiro'
//   origem?: 'storefront' | 'app' | 'dashboard_manual', // default 'storefront'
// }
//
// Resposta: { order_id, total }
import {
  getSupabaseAdmin,
  getAuthenticatedUser,
  corsHeaders,
} from '../helpers/auth.ts'

const PLATFORM_FEE_CENTAVOS = 100 // R$1,00 — comissão fixa Mallevo

const FORMAS_OFFLINE = new Set(['dinheiro', 'cartao_maquininha'])
const ORIGENS_VALIDAS = new Set(['storefront', 'app', 'dashboard_manual'])

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
      forma_pagamento,
      troco_para,
      origem,
    } = body ?? {}

    if (!store_id || !Array.isArray(itens) || itens.length === 0) {
      throw new Error('store_id e itens são obrigatórios')
    }
    if (!FORMAS_OFFLINE.has(forma_pagamento)) {
      throw new Error(
        'forma_pagamento deve ser "dinheiro" ou "cartao_maquininha"',
      )
    }
    if (!endereco_entrega || typeof endereco_entrega !== 'object') {
      throw new Error('endereco_entrega é obrigatório em pedidos offline')
    }
    if (
      (itens as Array<{ agendamento?: unknown }>).some(
        (i) => !!i?.agendamento,
      )
    ) {
      throw new Error('Agendamentos só aceitam pagamento online')
    }

    const origemFinal = origem ?? 'storefront'
    if (!ORIGENS_VALIDAS.has(origemFinal)) {
      throw new Error(
        'origem inválida — esperado app | storefront | dashboard_manual',
      )
    }

    let trocoParaCents: number | null = null
    if (forma_pagamento === 'dinheiro' && troco_para != null) {
      const n = Number(troco_para)
      if (!Number.isInteger(n) || n <= 0) {
        throw new Error('troco_para deve ser inteiro positivo (centavos)')
      }
      trocoParaCents = n
    }

    const supabase = getSupabaseAdmin()

    const { data: consumer } = await supabase
      .from('consumers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!consumer) throw new Error('Consumidor não encontrado')

    // Resolve loja + tenant SERVER-SIDE (service role) — destrava a D2
    // do storefront sem expor tenant_id em view pública.
    const { data: store } = await supabase
      .from('stores')
      .select(
        `id, tenant_id, taxa_entrega, ativo,
         aceita_dinheiro, aceita_cartao_maquininha`,
      )
      .eq('id', store_id)
      .single()

    if (!store || !store.ativo) {
      throw new Error('Loja não encontrada ou inativa')
    }

    if (
      forma_pagamento === 'dinheiro' && !store.aceita_dinheiro
    ) {
      throw new Error('Esta loja não aceita dinheiro')
    }
    if (
      forma_pagamento === 'cartao_maquininha' &&
      !store.aceita_cartao_maquininha
    ) {
      throw new Error('Esta loja não aceita cartão na maquininha')
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
      preco: number // unitário já com modifiers somados
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
      if (
        typeof item.variant_id === 'string' && item.variant_id.length > 0
      ) {
        const { data: variantRow, error: vErr } = await supabase
          .from('product_variants')
          .select(
            `id, product_id, preco, preco_promocional,
             stock_quantity, disponivel`,
          )
          .eq('id', item.variant_id)
          .single()

        if (vErr || !variantRow) throw new Error('Variação inválida')
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
        if (!v.disponivel) throw new Error('Variação indisponível')
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
        .filter(
          (id): id is string => typeof id === 'string' && id.length > 0,
        )

      let modifiersResolvidos: ModifierSnapshot[] = []
      let precoExtraTotal = 0
      const selecionadosPorGrupo = new Map<string, number>()

      if (modifierIds.length > 0) {
        const { data: modifierRows, error: mErr } = await supabase
          .from('product_modifiers')
          .select(
            `id, nome, preco_extra, disponivel, group_id,
             product_modifier_groups (
               id, product_id, nome, min_select, max_select
             )`,
          )
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
          if (acc) acc.count += 1
          else {
            contagensMax.set(grupo.id, {
              count: 1,
              max_select: grupo.max_select,
              nome: grupo.nome,
            })
          }
          selecionadosPorGrupo.set(
            grupo.id,
            (selecionadosPorGrupo.get(grupo.id) ?? 0) + 1,
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
          0,
        )
      }

      // min_select dos grupos obrigatórios do produto.
      const { data: gruposDoProduto, error: gErr } = await supabase
        .from('product_modifier_groups')
        .select('id, nome, min_select')
        .eq('product_id', item.product_id)

      if (gErr) throw gErr

      for (
        const g of (gruposDoProduto ?? []) as Array<{
          id: string
          nome: string
          min_select: number
        }>
      ) {
        if (g.min_select > 0) {
          const count = selecionadosPorGrupo.get(g.id) ?? 0
          if (count < g.min_select) {
            throw new Error(
              `Selecione pelo menos ${g.min_select} em "${g.nome}"`,
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

    if (
      forma_pagamento === 'dinheiro' &&
      trocoParaCents != null &&
      trocoParaCents < total
    ) {
      throw new Error(
        'troco_para deve ser maior ou igual ao total do pedido',
      )
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        consumer_id: consumer.id,
        store_id: store.id,
        tenant_id: store.tenant_id,
        status: 'novo',
        payment_status: 'pendente',
        forma_pagamento,
        subtotal,
        taxa_entrega,
        total,
        platform_fee_amount: platform_fee,
        endereco_entrega,
        observacoes,
        troco_para: trocoParaCents,
        origem: origemFinal,
      })
      .select('id')
      .single()

    if (orderError) throw orderError

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(
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

    if (itemsError) {
      // Atomicidade: itens falharam → cancela o pedido recém-criado.
      await supabase
        .from('orders')
        .update({
          status: 'cancelado',
          motivo_cancelamento: 'Falha ao persistir itens do pedido',
        })
        .eq('id', order.id)
      throw itemsError
    }

    return new Response(
      JSON.stringify({ order_id: order.id, total }),
      {
        headers: {
          ...corsHeaders(),
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: {
          ...corsHeaders(),
          'Content-Type': 'application/json',
        },
      },
    )
  }
})
