'use server'

import Stripe from 'stripe'
import { revalidatePath } from 'next/cache'
import { createSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})

// Verificar se o usuário é admin
async function verificarAdmin(supabase: any): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') {
    throw new Error('Acesso negado')
  }
}

// Métricas globais da plataforma
export async function getMetricasGlobais() {
  const supabase = createSupabaseServer()
  await verificarAdmin(supabase)

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  const [
    resTenants,
    resPedidosHoje,
    resPedidosMes,
    resEntregadores,
    resRepasses,
    resAssinaturas,
  ] = await Promise.all([
    // Tenants ativos
    supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .eq('ativo', true),

    // Pedidos hoje
    supabase
      .from('orders')
      .select('id, total, platform_fee_amount', { count: 'exact' })
      .gte('criado_em', hoje.toISOString())
      .eq('status', 'entregue'),

    // Pedidos do mês
    supabase
      .from('orders')
      .select('id, total, platform_fee_amount', { count: 'exact' })
      .gte('criado_em', inicioMes.toISOString())
      .eq('status', 'entregue'),

    // Entregadores aprovados
    supabase
      .from('couriers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'aprovado'),

    // Repasses pendentes (total a distribuir)
    supabase
      .from('payouts')
      .select('valor_liquido')
      .in('status', ['agendado', 'processando']),

    // Assinaturas ativas
    supabase
      .from('tenant_subscriptions')
      .select('id', { count: 'exact', head: true })
      .in('billing_status', ['ativa', 'trial']),
  ])

  const pedidosHoje = resPedidosHoje.data ?? []
  const pedidosMes = resPedidosMes.data ?? []

  const gmvHoje = pedidosHoje.reduce((acc: number, p: any) => acc + p.total, 0)
  const gmvMes = pedidosMes.reduce((acc: number, p: any) => acc + p.total, 0)

  const receitaComissaoHoje = pedidosHoje.reduce(
    (acc: number, p: any) => acc + p.platform_fee_amount, 0
  )
  const receitaComissaoMes = pedidosMes.reduce(
    (acc: number, p: any) => acc + p.platform_fee_amount, 0
  )

  const totalRepassesPendentes = (resRepasses.data ?? []).reduce(
    (acc: number, r: any) => acc + r.valor_liquido, 0
  )

  return {
    lojistas_ativos: resTenants.count ?? 0,
    entregadores_aprovados: resEntregadores.count ?? 0,
    assinaturas_ativas: resAssinaturas.count ?? 0,
    pedidos_hoje: resPedidosHoje.count ?? 0,
    pedidos_mes: resPedidosMes.count ?? 0,
    gmv_hoje: gmvHoje,
    gmv_mes: gmvMes,
    receita_comissao_hoje: receitaComissaoHoje,
    receita_comissao_mes: receitaComissaoMes,
    repasses_pendentes: totalRepassesPendentes,
  }
}

// Listar tenants com detalhes de assinatura
export async function getTenants(filtro?: {
  billing_status?: string
  busca?: string
}) {
  const supabase = createSupabaseServer()
  await verificarAdmin(supabase)

  let query = supabase
    .from('tenants')
    .select(`
      id, nome_responsavel, email, telefone, ativo,
      stripe_onboarding_ok, criado_em,
      stores (id, nome),
      tenant_subscriptions (
        billing_status, trial_termina_em, periodo_fim,
        plans (nome, preco_mensal)
      )
    `)
    .order('criado_em', { ascending: false })

  if (filtro?.busca) {
    query = query.or(
      `nome_responsavel.ilike.%${filtro.busca}%,email.ilike.%${filtro.busca}%`
    )
  }

  const { data, error } = await query.limit(100)
  if (error) return []

  // Filtrar por billing_status no cliente (join nested)
  if (filtro?.billing_status) {
    return (data ?? []).filter(
      (t: any) =>
        t.tenant_subscriptions?.[0]?.billing_status === filtro.billing_status
    )
  }

  return data ?? []
}

// Ativar ou suspender tenant
export async function atualizarStatusTenant(
  tenant_id: string,
  ativo: boolean
) {
  const supabase = createSupabaseServer()
  await verificarAdmin(supabase)

  const { error } = await supabase
    .from('tenants')
    .update({ ativo })
    .eq('id', tenant_id)

  if (error) return { erro: error.message }

  // Se suspender, marcar assinatura como suspensa
  if (!ativo) {
    await supabase
      .from('tenant_subscriptions')
      .update({ billing_status: 'suspensa' })
      .eq('tenant_id', tenant_id)
  }

  revalidatePath('/admin/lojistas')
  return { sucesso: true }
}

// Listar entregadores com filtro por status
export async function getEntregadores(filtro?: {
  status?: string
  tipo?: string
}) {
  const supabase = createSupabaseServer()
  await verificarAdmin(supabase)

  let query = supabase
    .from('couriers')
    .select(`
      id, nome, telefone, cpf, foto_url, cnh_foto_url,
      tipo, status, veiculo_tipo, veiculo_placa,
      stripe_onboarding_ok, criado_em, aprovado_em,
      tenants (nome_responsavel)
    `)
    .order('criado_em', { ascending: false })

  if (filtro?.status) query = query.eq('status', filtro.status)
  if (filtro?.tipo) query = query.eq('tipo', filtro.tipo)

  const { data, error } = await query.limit(100)
  if (error) return []
  return data ?? []
}

// Aprovar ou reprovar entregador
export async function atualizarStatusEntregador(
  courier_id: string,
  status: 'aprovado' | 'reprovado' | 'suspenso'
) {
  const supabase = createSupabaseServer()
  await verificarAdmin(supabase)

  const { data: { user } } = await supabase.auth.getUser()

  const atualizacao: Record<string, any> = { status }

  if (status === 'aprovado') {
    atualizacao.aprovado_em = new Date().toISOString()
    atualizacao.aprovado_por = user?.id
  }

  const { error } = await supabase
    .from('couriers')
    .update(atualizacao)
    .eq('id', courier_id)

  if (error) return { erro: error.message }

  revalidatePath('/admin/entregadores')
  return { sucesso: true }
}

// Listar planos com sincronização Stripe
export async function getPlanos() {
  const supabase = createSupabaseServer()
  await verificarAdmin(supabase)

  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('preco_mensal')

  if (error) return []
  return data ?? []
}

const schemaPlano = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  descricao: z.string().optional(),
  preco_mensal: z.number().int().min(0),
  max_lojas: z.number().int().min(1),
  max_produtos: z.number().int().min(1),
  max_entregadores: z.number().int().min(1),
  tem_estoque: z.boolean(),
  tem_relatorios: z.boolean(),
  tem_antecipacao: z.boolean(),
  ativo: z.boolean(),
})

// Criar plano com sincronização no Stripe
export async function criarPlano(formData: FormData) {
  const supabase = createSupabaseServer()
  await verificarAdmin(supabase)

  const preco_raw = formData.get('preco_mensal')

  const dados = schemaPlano.safeParse({
    nome: formData.get('nome'),
    descricao: formData.get('descricao') || undefined,
    preco_mensal: preco_raw ? Math.round(parseFloat(String(preco_raw)) * 100) : 0,
    max_lojas: parseInt(String(formData.get('max_lojas') ?? '1')),
    max_produtos: parseInt(String(formData.get('max_produtos') ?? '30')),
    max_entregadores: parseInt(String(formData.get('max_entregadores') ?? '1')),
    tem_estoque: formData.get('tem_estoque') === 'true',
    tem_relatorios: formData.get('tem_relatorios') === 'true',
    tem_antecipacao: formData.get('tem_antecipacao') === 'true',
    ativo: true,
  })

  if (!dados.success) return { erro: dados.error.errors[0].message }

  // Criar Product no Stripe
  const stripeProduct = await stripe.products.create({
    name: dados.data.nome,
    description: dados.data.descricao,
    metadata: { plataforma: 'mallora' },
  })

  // Criar Price recorrente no Stripe
  let stripePrice = null
  if (dados.data.preco_mensal > 0) {
    stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: dados.data.preco_mensal,
      currency: 'brl',
      recurring: { interval: 'month' },
    })
  }

  // Inserir no banco
  const { error } = await supabase.from('plans').insert({
    ...dados.data,
    stripe_product_id: stripeProduct.id,
    stripe_price_id: stripePrice?.id ?? null,
  })

  if (error) return { erro: error.message }

  revalidatePath('/admin/planos')
  return { sucesso: true }
}

// Conciliação financeira
export async function getConciliacaoFinanceira(mes: string) {
  const supabase = createSupabaseServer()
  await verificarAdmin(supabase)

  // mes no formato 'YYYY-MM'
  const inicio = new Date(`${mes}-01T00:00:00.000Z`)
  const fim = new Date(inicio)
  fim.setMonth(fim.getMonth() + 1)

  const [resPedidos, resPayouts] = await Promise.all([
    supabase
      .from('orders')
      .select('total, platform_fee_amount, status, payment_status, forma_pagamento')
      .gte('atualizado_em', inicio.toISOString())
      .lt('atualizado_em', fim.toISOString())
      .eq('status', 'entregue'),

    supabase
      .from('payouts')
      .select('valor_bruto, taxa_antecipacao, valor_liquido, status, tipo, antecipado')
      .gte('criado_em', inicio.toISOString())
      .lt('criado_em', fim.toISOString()),
  ])

  const pedidos = resPedidos.data ?? []
  const payouts = resPayouts.data ?? []

  const gmv_total = pedidos.reduce((acc: number, p: any) => acc + p.total, 0)
  const receita_comissao = pedidos.reduce(
    (acc: number, p: any) => acc + p.platform_fee_amount, 0
  )

  const total_repassado_lojistas = payouts
    .filter((p: any) => p.tipo === 'lojista' && p.status === 'concluido')
    .reduce((acc: number, p: any) => acc + p.valor_liquido, 0)

  const total_repassado_entregadores = payouts
    .filter((p: any) => p.tipo === 'entregador' && p.status === 'concluido')
    .reduce((acc: number, p: any) => acc + p.valor_liquido, 0)

  const receita_antecipacao = payouts
    .filter((p: any) => p.antecipado && p.status === 'concluido')
    .reduce((acc: number, p: any) => acc + p.taxa_antecipacao, 0)

  return {
    gmv_total,
    receita_comissao,
    receita_antecipacao,
    total_pedidos: pedidos.length,
    total_repassado_lojistas,
    total_repassado_entregadores,
    payouts_pendentes: payouts
      .filter((p: any) => ['agendado', 'processando'].includes(p.status))
      .reduce((acc: number, p: any) => acc + p.valor_liquido, 0),
  }
}
