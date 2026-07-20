import { calcularTaxaAntecipacao } from '@mallevo/lib'
import { supabase } from './supabase'

// Camada financeira — espelho campo a campo de
// apps/web/lib/actions/financeiro.ts, sob a mesma RLS. Operações
// financeiras passam SEMPRE pelas Edge Functions existentes
// (request-advance, pagarme-balance); nenhum cálculo de repasse no
// cliente além de exibição. Valores em centavos.
// docs/partner-app/07-stage-5-financeiro-relatorios.md

export type PeriodoFinanceiro = 'hoje' | 'semana' | 'mes'

export interface KpisFinanceiros {
  faturamento_bruto: number
  faturamento_liquido: number
  total_pedidos: number
  ticket_medio: number
  pedidos_online: number
}

function inicioDoPeriodo(periodo: PeriodoFinanceiro): Date {
  const agora = new Date()
  const inicio = new Date(agora)
  if (periodo === 'hoje') {
    inicio.setHours(0, 0, 0, 0)
  } else if (periodo === 'semana') {
    inicio.setDate(agora.getDate() - 7)
  } else {
    inicio.setDate(1)
    inicio.setHours(0, 0, 0, 0)
  }
  return inicio
}

/** KPIs do período — pedidos entregues, mesma conta do Dashboard. */
export async function getKpisFinanceiros(periodo: PeriodoFinanceiro): Promise<KpisFinanceiros> {
  const { data: pedidos } = await supabase
    .from('orders')
    .select('total, taxa_entrega, platform_fee_amount, status, payment_status')
    .eq('status', 'entregue')
    .gte('atualizado_em', inicioDoPeriodo(periodo).toISOString())

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
  const faturamento_liquido = pedidos.reduce(
    (acc, p) => acc + p.total - p.taxa_entrega - (p.platform_fee_amount ?? 0),
    0
  )

  return {
    faturamento_bruto,
    faturamento_liquido,
    total_pedidos: pedidos.length,
    ticket_medio: Math.round(faturamento_bruto / pedidos.length),
    pedidos_online: pedidos.filter((p) => p.payment_status === 'pago').length,
  }
}

export interface FaturamentoDia {
  data: string
  bruto: number
  liquido: number
}

/** Últimos 30 dias agrupados por dia — mesmo agrupamento do Dashboard. */
export async function getFaturamentoDiario(): Promise<FaturamentoDia[]> {
  const trintaDiasAtras = new Date()
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)

  const { data: pedidos } = await supabase
    .from('orders')
    .select('total, taxa_entrega, platform_fee_amount, atualizado_em')
    .eq('status', 'entregue')
    .gte('atualizado_em', trintaDiasAtras.toISOString())
    .order('atualizado_em')

  if (!pedidos) return []

  const porDia: Record<string, FaturamentoDia> = {}
  for (const pedido of pedidos) {
    const data = new Date(pedido.atualizado_em).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    })
    if (!porDia[data]) porDia[data] = { data, bruto: 0, liquido: 0 }
    porDia[data].bruto += pedido.total
    porDia[data].liquido += pedido.total - pedido.taxa_entrega - (pedido.platform_fee_amount ?? 0)
  }
  return Object.values(porDia)
}

export interface Repasse {
  id: string
  status: string
  valor_bruto: number
  valor_liquido: number
  taxa_antecipacao: number | null
  total_pedidos: number | null
  antecipado: boolean | null
  data_referencia: string | null
  data_prevista: string | null
  processado_em: string | null
  criado_em: string
}

export async function getRepasses(): Promise<{
  repasses: Repasse[]
  total_pendente: number
  total_recebido: number
}> {
  const { data: repasses } = await supabase
    .from('payouts')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(50)

  const lista = (repasses ?? []) as unknown as Repasse[]
  const total_pendente = lista
    .filter((r) => ['agendado', 'processando'].includes(r.status))
    .reduce((acc, r) => acc + r.valor_liquido, 0)
  const total_recebido = lista
    .filter((r) => r.status === 'concluido')
    .reduce((acc, r) => acc + r.valor_liquido, 0)

  return { repasses: lista, total_pendente, total_recebido }
}

export interface SaldoRecipient {
  available: number
  waiting_funds: number
  transferred: number
}

/** Saldo Pagar.me via Edge Function (gate de recipient ativo já no chamador). */
export async function getSaldoRecipient(): Promise<SaldoRecipient | null> {
  try {
    const { data, error } = await supabase.functions.invoke<SaldoRecipient>('pagarme-balance', {
      method: 'GET',
    })
    if (error || !data) return null
    return data
  } catch {
    return null
  }
}

export interface Elegibilidade {
  elegivel: boolean
  motivo: string | null
  pedidos: number
  valor_bruto: number
  taxa: number
  valor_liquido: number
}

/** Elegibilidade de antecipação — mesmos gates e conta do Dashboard. */
export async function getPedidosElegiveis(tenant: {
  id: string
  pagarme_onboarding_status: string
}): Promise<Elegibilidade> {
  const nao = (motivo: string): Elegibilidade => ({
    elegivel: false, motivo, pedidos: 0, valor_bruto: 0, taxa: 0, valor_liquido: 0,
  })

  if (tenant.pagarme_onboarding_status !== 'active') {
    return nao('Configure sua conta de recebimentos primeiro')
  }

  const { data: sub } = await supabase
    .from('tenant_subscriptions')
    .select('billing_status, plans!inner(tem_antecipacao)')
    .single()

  if (!sub || !['trial', 'ativa'].includes(sub.billing_status)) return nao('Assinatura inativa')
  if (!(sub.plans as { tem_antecipacao?: boolean } | null)?.tem_antecipacao) {
    return nao('Seu plano não inclui antecipação')
  }

  const { data: antecipacaoExistente } = await supabase
    .from('payout_advance_requests')
    .select('id')
    .eq('tenant_id', tenant.id)
    .in('status', ['pendente', 'aprovada'])
    .maybeSingle()

  if (antecipacaoExistente) return nao('Já existe uma antecipação em andamento')

  const seteDiasAtras = new Date()
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)

  const { data: pedidos } = await supabase
    .from('orders')
    .select('total, taxa_entrega, platform_fee_amount')
    .eq('status', 'entregue')
    .eq('payment_status', 'pago')
    .gte('atualizado_em', seteDiasAtras.toISOString())

  if (!pedidos || pedidos.length === 0) return nao('Nenhum pedido elegível no momento')

  const valor_bruto = pedidos.reduce(
    (acc, p) => acc + p.total - p.taxa_entrega - (p.platform_fee_amount ?? 0),
    0
  )
  const taxa = calcularTaxaAntecipacao(pedidos.length)

  return {
    elegivel: true,
    motivo: null,
    pedidos: pedidos.length,
    valor_bruto,
    taxa,
    valor_liquido: valor_bruto - taxa,
  }
}

/** Solicita antecipação — SEMPRE via Edge Function request-advance. */
export async function solicitarAntecipacao(): Promise<{ sucesso?: true; erro?: string }> {
  const { error } = await supabase.functions.invoke('request-advance', { method: 'POST' })
  if (error) {
    return { erro: error.message ?? 'Não foi possível solicitar a antecipação' }
  }
  return { sucesso: true }
}
