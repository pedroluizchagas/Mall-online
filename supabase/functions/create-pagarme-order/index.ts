// supabase/functions/create-pagarme-order/index.ts
//
// Cria uma Order no Pagar.me com split entre Mallevo e lojista (estágio 1).
// A taxa de entrega é depositada na Mallevo em custódia e repassada ao
// entregador via Transfer (estágio 2 — vide transfer-to-courier).
//
// Body:
// {
//   store_id: uuid,
//   itens: [{
//     product_id, quantidade, observacoes?,
//     modifiers?: [{ modifier_id }],   // só id; nome/preco vêm do banco
//     variant_id?: uuid | null,        // SKU selecionado (Fase 4b)
//     agendamento?: {                  // Fase 5b2 — services
//       inicio_at: ISO UTC,
//       fim_at: ISO UTC,
//       staff_id: uuid | null          // null = "qualquer profissional"
//     } | null
//   }],
//   endereco_entrega: jsonb | null,    // null em agendamento
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

const PLATFORM_FEE_CENTAVOS = 100 // R$1,00 — comissão fixa Mallevo

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
        id, tenant_id, taxa_entrega, ativo, horarios,
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

    type AgendamentoInput = {
      inicio_at: string
      fim_at: string
      staff_id: string | null
    }

    type AgendamentoResolvido = {
      inicio_at: string
      fim_at: string
      staff_id: string
    }

    // Detecta se algum item carrega agendamento. Se sim, exige que TODOS os
    // itens tenham (na prática a regra de 1-item garante isso, mas o servidor
    // valida defensivamente).
    const ehAgendamento = (itens as Array<{ agendamento?: unknown }>).some(
      (i) => !!i?.agendamento,
    )
    if (ehAgendamento) {
      const todosTemAgendamento = (itens as Array<{ agendamento?: unknown }>)
        .every((i) => !!i?.agendamento)
      if (!todosTemAgendamento) {
        throw new Error('Carrinho misto não suportado: agendamento não pode ser combinado com entrega')
      }
    }

    // Helpers de agendamento (apenas executados se ehAgendamento)
    type Horarios = Record<string, { abre: string; fecha: string } | null>
    const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
    const TZ_OFFSET_MIN = -180
    function epochParaLocalParts(ms: number) {
      const d = new Date(ms + TZ_OFFSET_MIN * 60_000)
      return {
        diaSemana: DIAS[d.getUTCDay()],
        ymd: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`,
        horaMin: d.getUTCHours() * 60 + d.getUTCMinutes(),
      }
    }
    function hhmmParaMin(s: string): number {
      const [h, m] = s.split(':').map((x) => parseInt(x, 10))
      return h * 60 + m
    }
    function sobrepoeMs(aIni: number, aFim: number, bIni: number, bFim: number): boolean {
      return aIni < bFim && aFim > bIni
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
      agendamento: AgendamentoResolvido | null
    }> = []

    // Pré-carrega bloqueios e agendamentos existentes uma vez (não por item)
    // para validar disponibilidade e atribuir staff "qualquer".
    let bloqueiosLoja: Array<{ staff_id: string | null; inicio: number; fim: number }> = []
    let agendamentosExistentes: Array<{ staff_id: string; inicio: number; fim: number }> = []
    let staffAtivos: Array<{ id: string; nome: string }> = []

    if (ehAgendamento) {
      // Janela: do menor inicio_at ao maior fim_at dos itens
      const inputs = (itens as Array<{ agendamento: AgendamentoInput }>).map((i) => ({
        ini: new Date(i.agendamento.inicio_at).getTime(),
        fim: new Date(i.agendamento.fim_at).getTime(),
      }))
      const minIni = Math.min(...inputs.map((x) => x.ini))
      const maxFim = Math.max(...inputs.map((x) => x.fim))
      const minIniIso = new Date(minIni).toISOString()
      const maxFimIso = new Date(maxFim).toISOString()

      const sb = supabase as unknown as { from: (t: string) => any }

      const [staffRes, blocksRes, ordersRes] = await Promise.all([
        sb
          .from('service_staff')
          .select('id, nome')
          .eq('store_id', store.id)
          .eq('ativo', true)
          .order('ordem', { ascending: true }),
        sb
          .from('service_blocks')
          .select('staff_id, inicio_at, fim_at')
          .eq('store_id', store.id)
          .lt('inicio_at', maxFimIso)
          .gt('fim_at', minIniIso),
        sb
          .from('orders')
          .select('staff_id, agendamento_inicio_at, agendamento_fim_at, status')
          .eq('store_id', store.id)
          .eq('tipo', 'agendamento')
          .neq('status', 'cancelado')
          .lt('agendamento_inicio_at', maxFimIso)
          .gt('agendamento_fim_at', minIniIso),
      ])

      staffAtivos = (staffRes.data ?? []) as Array<{ id: string; nome: string }>
      if (staffAtivos.length === 0) {
        throw new Error('Loja sem profissionais ativos para agendamento')
      }

      bloqueiosLoja = ((blocksRes.data ?? []) as Array<{
        staff_id: string | null
        inicio_at: string
        fim_at: string
      }>).map((b) => ({
        staff_id: b.staff_id,
        inicio: new Date(b.inicio_at).getTime(),
        fim: new Date(b.fim_at).getTime(),
      }))

      agendamentosExistentes = ((ordersRes.data ?? []) as Array<{
        staff_id: string | null
        agendamento_inicio_at: string
        agendamento_fim_at: string
      }>)
        .filter((o) => typeof o.staff_id === 'string')
        .map((o) => ({
          staff_id: o.staff_id as string,
          inicio: new Date(o.agendamento_inicio_at).getTime(),
          fim: new Date(o.agendamento_fim_at).getTime(),
        }))
    }

    for (const item of itens) {
      const { data: produto } = await supabase
        .from('products')
        .select('preco, nome, disponivel')
        .eq('id', item.product_id)
        .single()

      if (!produto || !produto.disponivel) {
        throw new Error(`Produto indisponível: ${item.product_id}`)
      }

      // ── Caminho de agendamento (services) ────────────────────
      if (ehAgendamento) {
        const agendamentoInput = item.agendamento as AgendamentoInput | null
        if (!agendamentoInput) {
          throw new Error('Item sem dados de agendamento')
        }
        const inicioMs = new Date(agendamentoInput.inicio_at).getTime()
        const fimMs = new Date(agendamentoInput.fim_at).getTime()
        if (!Number.isFinite(inicioMs) || !Number.isFinite(fimMs) || fimMs <= inicioMs) {
          throw new Error('Janela de agendamento inválida')
        }
        if (inicioMs < Date.now()) {
          throw new Error('Não é possível agendar para o passado')
        }

        // Janela de funcionamento da loja no dia
        const horarios = (store.horarios ?? null) as Horarios | null
        const partesIni = epochParaLocalParts(inicioMs)
        const partesFim = epochParaLocalParts(fimMs)
        if (partesIni.ymd !== partesFim.ymd) {
          throw new Error('Agendamento não pode atravessar dias')
        }
        const janela = horarios ? horarios[partesIni.diaSemana] : null
        if (!janela) {
          throw new Error('Loja fechada nesse dia')
        }
        const abreMin = hhmmParaMin(janela.abre)
        const fechaMin = hhmmParaMin(janela.fecha)
        if (partesIni.horaMin < abreMin) {
          throw new Error('Horário antes da abertura da loja')
        }
        const fimMinDia =
          partesFim.horaMin === 0 && partesIni.horaMin > 0
            ? 24 * 60
            : partesFim.horaMin
        if (fimMinDia > fechaMin) {
          throw new Error('Horário ultrapassa o fechamento da loja')
        }

        // Sem bloqueio sobreposto (loja inteira ou staff)
        const staffIdInput = agendamentoInput.staff_id
        let staffEscolhido: { id: string; nome: string } | null = null

        function staffLivre(staffId: string): boolean {
          // Bloqueio loja toda OU específico do staff
          const blocked = bloqueiosLoja.some(
            (b) =>
              (b.staff_id === null || b.staff_id === staffId) &&
              sobrepoeMs(inicioMs, fimMs, b.inicio, b.fim),
          )
          if (blocked) return false
          // Agendamento existente do mesmo staff
          const ocupado = agendamentosExistentes.some(
            (a) =>
              a.staff_id === staffId &&
              sobrepoeMs(inicioMs, fimMs, a.inicio, a.fim),
          )
          return !ocupado
        }

        if (staffIdInput) {
          const candidato = staffAtivos.find((s) => s.id === staffIdInput)
          if (!candidato) throw new Error('Profissional inválido')
          if (!staffLivre(candidato.id)) {
            throw new Error('Horário não está mais disponível. Por favor, escolha outro.')
          }
          staffEscolhido = candidato
        } else {
          // "qualquer profissional disponível": pega o primeiro livre
          staffEscolhido = staffAtivos.find((s) => staffLivre(s.id)) ?? null
          if (!staffEscolhido) {
            throw new Error('Horário não está mais disponível. Por favor, escolha outro.')
          }
        }

        // Reserva localmente para evitar conflito com itens subsequentes do
        // mesmo carrinho (não relevante hoje pois é 1 item, mas defensivo).
        agendamentosExistentes.push({
          staff_id: staffEscolhido.id,
          inicio: inicioMs,
          fim: fimMs,
        })

        const precoUnit = produto.preco
        const itemSubtotal = precoUnit * (item.quantidade ?? 1)
        subtotal += itemSubtotal
        itensProcessados.push({
          product_id: item.product_id,
          variant_id: null,
          quantidade: item.quantidade ?? 1,
          observacoes: item.observacoes,
          preco: precoUnit,
          nome: produto.nome,
          subtotal: itemSubtotal,
          modifiers: null,
          agendamento: {
            inicio_at: agendamentoInput.inicio_at,
            fim_at: agendamentoInput.fim_at,
            staff_id: staffEscolhido.id,
          },
        })
        continue
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
        agendamento: null,
      })
    }

    const taxa_entrega = ehAgendamento ? 0 : store.taxa_entrega
    const total = subtotal + taxa_entrega
    const platform_fee = PLATFORM_FEE_CENTAVOS

    // Estágio 1 (entrega): lojista recebe (subtotal - comissão); Mallevo retém
    // comissão + taxa de entrega em custódia até a alocação do entregador.
    // Em agendamento não há entrega: Mallevo retém apenas a comissão fixa.
    const valorLojista = subtotal - platform_fee

    const itemAgendado = itensProcessados.find((i) => i.agendamento)?.agendamento ?? null

    const orderInsert: Record<string, unknown> = ehAgendamento
      ? {
          consumer_id: consumer.id,
          store_id: store.id,
          tenant_id: store.tenant_id,
          status: 'novo',
          payment_status: 'pendente',
          forma_pagamento: `online_${payment_method}`,
          subtotal,
          taxa_entrega: 0,
          total,
          platform_fee_amount: platform_fee,
          endereco_entrega: null,
          observacoes,
          tipo: 'agendamento',
          agendamento_inicio_at: itemAgendado?.inicio_at,
          agendamento_fim_at: itemAgendado?.fim_at,
          staff_id: itemAgendado?.staff_id,
        }
      : {
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
        }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderInsert)
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

    const splitRules = ehAgendamento
      ? [
          {
            recipient_id: platformRecipientId,
            amount: platform_fee,
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
      : [
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
          // a Mallevo não absorve o custo do parcelamento.
          installment_type: 'customer',
          statement_descriptor: 'Mallevo',
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
