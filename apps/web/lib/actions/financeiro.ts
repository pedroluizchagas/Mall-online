'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServer } from '@/lib/supabase/server'
import { calcularTaxaAntecipacao } from '@mallora/lib'

async function chamarEdgeFunction<T>(nome: string): Promise<T | null> {
  const supabase = createSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  try {
    const resposta = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${nome}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      }
    )
    if (!resposta.ok) return null
    return (await resposta.json()) as T
  } catch {
    return null
  }
}

// KPIs financeiros do período
export async function getKpisFinanceiros(periodo: 'hoje' | 'semana' | 'mes') {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return null

  const agora = new Date()
  let dataInicio: Date

  if (periodo === 'hoje') {
    dataInicio = new Date(agora)
    dataInicio.setHours(0, 0, 0, 0)
  } else if (periodo === 'semana') {
    dataInicio = new Date(agora)
    dataInicio.setDate(agora.getDate() - 7)
  } else {
    dataInicio = new Date(agora)
    dataInicio.setDate(1)
    dataInicio.setHours(0, 0, 0, 0)
  }

  const { data: pedidos } = await supabase
    .from('orders')
    .select('total, taxa_entrega, platform_fee_amount, status, payment_status')
    .eq('tenant_id', tenant.id)
    .eq('status', 'entregue')
    .gte('atualizado_em', dataInicio.toISOString())

  if (!pedidos || pedidos.length === 0) {
    return {
      faturamento_bruto: 0,
      faturamento_liquido: 0,
      total_pedidos: 0,
      ticket_medio: 0,
      pedidos_online: 0,
    }
  }

  const faturamento_bruto = pedidos.reduce((acc, p) => acc + p.total, 0)

  // Líquido = bruto - taxa_entrega (vai para entregador) - platform_fee (vai para plataforma)
  const faturamento_liquido = pedidos.reduce(
    (acc, p) => acc + p.total - p.taxa_entrega - p.platform_fee_amount,
    0
  )

  const pedidos_online = pedidos.filter(
    (p) => p.payment_status === 'pago'
  ).length

  return {
    faturamento_bruto,
    faturamento_liquido,
    total_pedidos: pedidos.length,
    ticket_medio: Math.round(faturamento_bruto / pedidos.length),
    pedidos_online,
  }
}

// Dados para o gráfico temporal (últimos 30 dias)
export async function getFaturamentoDiario() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return []

  const trintaDiasAtras = new Date()
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)

  const { data: pedidos } = await supabase
    .from('orders')
    .select('total, taxa_entrega, platform_fee_amount, atualizado_em')
    .eq('tenant_id', tenant.id)
    .eq('status', 'entregue')
    .gte('atualizado_em', trintaDiasAtras.toISOString())
    .order('atualizado_em')

  if (!pedidos) return []

  // Agrupar por dia
  const porDia: Record<string, { data: string; bruto: number; liquido: number }> = {}

  for (const pedido of pedidos) {
    const data = new Date(pedido.atualizado_em)
      .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

    if (!porDia[data]) {
      porDia[data] = { data, bruto: 0, liquido: 0 }
    }

    porDia[data].bruto += pedido.total
    porDia[data].liquido +=
      pedido.total - pedido.taxa_entrega - pedido.platform_fee_amount
  }

  return Object.values(porDia)
}

// Top produtos mais vendidos
export async function getTopProdutos(limite = 5) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return []

  const trintaDiasAtras = new Date()
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)

  const { data } = await supabase
    .from('order_items')
    .select(`
      nome,
      quantidade,
      subtotal,
      orders!inner (
        tenant_id,
        status,
        atualizado_em
      )
    `)
    .eq('orders.tenant_id', tenant.id)
    .eq('orders.status', 'entregue')
    .gte('orders.atualizado_em', trintaDiasAtras.toISOString())

  if (!data) return []

  // Agrupar por nome do produto
  const porProduto: Record<string, { nome: string; quantidade: number; receita: number }> = {}

  for (const item of data) {
    if (!porProduto[item.nome]) {
      porProduto[item.nome] = { nome: item.nome, quantidade: 0, receita: 0 }
    }
    porProduto[item.nome].quantidade += item.quantidade
    porProduto[item.nome].receita += item.subtotal
  }

  return Object.values(porProduto)
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, limite)
}

// Repasses do lojista
export async function getRepasses(filtro: 'pendentes' | 'concluidos' | 'todos' = 'todos') {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { repasses: [], total_pendente: 0, total_recebido: 0 }

  let query = supabase
    .from('payouts')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('criado_em', { ascending: false })

  if (filtro === 'pendentes') {
    query = query.in('status', ['agendado', 'processando'])
  } else if (filtro === 'concluidos') {
    query = query.eq('status', 'concluido')
  }

  const { data: repasses } = await query.limit(50)

  const total_pendente = (repasses ?? [])
    .filter((r) => ['agendado', 'processando'].includes(r.status))
    .reduce((acc, r) => acc + r.valor_liquido, 0)

  const total_recebido = (repasses ?? [])
    .filter((r) => r.status === 'concluido')
    .reduce((acc, r) => acc + r.valor_liquido, 0)

  return {
    repasses: repasses ?? [],
    total_pendente,
    total_recebido,
  }
}

// Saldo do recipient Pagar.me do lojista (em centavos)
export async function getRecipientBalance() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('pagarme_recipient_id, pagarme_onboarding_status')
    .single() as {
      data: {
        pagarme_recipient_id: string | null
        pagarme_onboarding_status: string
      } | null
    }

  if (!tenant || tenant.pagarme_onboarding_status !== 'active' || !tenant.pagarme_recipient_id) {
    return null
  }

  return chamarEdgeFunction<{
    available: number
    waiting_funds: number
    transferred: number
  }>('pagarme-balance')
}

// Antecipações (anticipations) do recipient Pagar.me
export async function listAnticipations() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('pagarme_recipient_id, pagarme_onboarding_status')
    .single() as {
      data: {
        pagarme_recipient_id: string | null
        pagarme_onboarding_status: string
      } | null
    }

  if (!tenant || tenant.pagarme_onboarding_status !== 'active' || !tenant.pagarme_recipient_id) {
    return []
  }

  const resultado = await chamarEdgeFunction<{
    anticipations: Array<{
      id: string
      amount: number
      status: string
      created_at: string
      payment_date: string | null
    }>
  }>('pagarme-anticipations')

  return resultado?.anticipations ?? []
}

// Pedidos elegíveis para antecipação
export async function getPedidosElegiveis() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, pagarme_onboarding_status')
    .single() as {
      data: {
        id: string
        pagarme_onboarding_status: string
      } | null
    }

  if (!tenant || tenant.pagarme_onboarding_status !== 'active') {
    return { elegivel: false, motivo: 'Configure sua conta de recebimentos primeiro', pedidos: 0, valor_bruto: 0, taxa: 0, valor_liquido: 0 }
  }

  // Verificar se plano permite antecipação
  const { data: sub } = await supabase
    .from('tenant_subscriptions')
    .select('billing_status, plans!inner(tem_antecipacao)')
    .single()

  if (!sub || !['trial', 'ativa'].includes(sub.billing_status)) {
    return { elegivel: false, motivo: 'Assinatura inativa', pedidos: 0, valor_bruto: 0, taxa: 0, valor_liquido: 0 }
  }

  if (!(sub.plans as any)?.tem_antecipacao) {
    return { elegivel: false, motivo: 'Seu plano não inclui antecipação', pedidos: 0, valor_bruto: 0, taxa: 0, valor_liquido: 0 }
  }

  // Verificar se já tem antecipação pendente
  const { data: antecipacaoExistente } = await supabase
    .from('payout_advance_requests')
    .select('id')
    .eq('tenant_id', tenant.id)
    .in('status', ['pendente', 'aprovada'])
    .single()

  if (antecipacaoExistente) {
    return { elegivel: false, motivo: 'Já existe uma antecipação em andamento', pedidos: 0, valor_bruto: 0, taxa: 0, valor_liquido: 0 }
  }

  const seteDiasAtras = new Date()
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)

  const { data: pedidos } = await supabase
    .from('orders')
    .select('total, taxa_entrega, platform_fee_amount')
    .eq('tenant_id', tenant.id)
    .eq('status', 'entregue')
    .eq('payment_status', 'pago')
    .gte('atualizado_em', seteDiasAtras.toISOString())

  if (!pedidos || pedidos.length === 0) {
    return { elegivel: false, motivo: 'Nenhum pedido elegível no momento', pedidos: 0, valor_bruto: 0, taxa: 0, valor_liquido: 0 }
  }

  const valor_bruto = pedidos.reduce(
    (acc, p) => acc + p.total - p.taxa_entrega - p.platform_fee_amount,
    0
  )
  const taxa = calcularTaxaAntecipacao(pedidos.length)
  const valor_liquido = valor_bruto - taxa

  return {
    elegivel: true,
    motivo: null,
    pedidos: pedidos.length,
    valor_bruto,
    taxa,
    valor_liquido,
  }
}

// Solicitar antecipação (chama a Edge Function)
export async function solicitarAntecipacao() {
  const supabase = createSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return { erro: 'Não autenticado' }

  const resposta = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/request-advance`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    }
  )

  const resultado = await resposta.json()

  if (!resposta.ok) return { erro: resultado.error }

  revalidatePath('/dashboard/financeiro')
  return { sucesso: true, dados: resultado }
}
