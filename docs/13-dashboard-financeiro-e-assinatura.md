# 13 — Dashboard — Financeiro e Assinatura

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

O módulo financeiro do dashboard dá ao lojista visibilidade completa
sobre faturamento, repasses recebidos e pendentes, e o status da sua
assinatura. Há duas seções principais:

1. Financeiro — faturamento, repasses, solicitação de antecipação
1. Assinatura — status do plano, próxima cobrança, faturas, Stripe Customer Portal

Os dados financeiros vêm do banco (tabelas `orders` e `payouts`). O saldo
do recipient e os recebíveis pendentes vêm da API Pagar.me via Server Action
(`/recipients/{id}/balance` e `/payables`). O histórico de faturas da
assinatura vem da API Stripe Billing.

-----

## SERVER ACTIONS — FINANCEIRO

### lib/actions/financeiro.ts

```typescript
'use server'

import Stripe from 'stripe'
import { revalidatePath } from 'next/cache'
import { createSupabaseServer } from '@/lib/supabase/server'
import { formatarReais, calcularTaxaAntecipacao } from '@mallevo/lib'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})

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

// Saldo do recipient Pagar.me do lojista
export async function getSaldoPagarme() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('pagarme_recipient_id, pagarme_onboarding_status')
    .single()

  if (
    !tenant ||
    tenant.pagarme_onboarding_status !== 'active' ||
    !tenant.pagarme_recipient_id
  ) {
    return null
  }

  try {
    const apiKey = process.env.PAGARME_API_KEY!
    const auth = 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64')

    const res = await fetch(
      `https://api.pagar.me/core/v5/recipients/${tenant.pagarme_recipient_id}/balance`,
      { headers: { Authorization: auth } }
    )
    if (!res.ok) return null
    const saldo = await res.json()

    return {
      disponivel: saldo.available_amount ?? 0,
      pendente: saldo.waiting_funds_amount ?? 0,
      transferido: saldo.transferred_amount ?? 0,
    }
  } catch {
    return null
  }
}

// Pedidos elegíveis para antecipação manual (consulta limites no Pagar.me)
export async function getPedidosElegiveis() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, pagarme_recipient_id, pagarme_onboarding_status')
    .single()

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

  // Consultar limites de antecipação direto na API Pagar.me
  try {
    const apiKey = process.env.PAGARME_API_KEY!
    const auth = 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64')
    const hoje = new Date().toISOString().split('T')[0]

    const res = await fetch(
      `https://api.pagar.me/core/v5/recipients/${tenant.pagarme_recipient_id}/anticipation_limits?timeframe=start&payment_date=${hoje}`,
      { headers: { Authorization: auth } }
    )
    if (!res.ok) {
      return { elegivel: false, motivo: 'Não foi possível consultar limites no Pagar.me', pedidos: 0, valor_bruto: 0, taxa: 0, valor_liquido: 0 }
    }
    const limite = await res.json()
    const valor_bruto = limite?.maximum?.amount ?? 0
    const taxa = limite?.maximum?.anticipation_fee ?? 0
    const valor_liquido = valor_bruto - taxa

    if (valor_bruto <= 0) {
      return { elegivel: false, motivo: 'Nenhum recebível elegível para antecipação no momento', pedidos: 0, valor_bruto: 0, taxa: 0, valor_liquido: 0 }
    }

    return {
      elegivel: true,
      motivo: null,
      pedidos: pedidos?.length ?? 0,
      valor_bruto,
      taxa,
      valor_liquido,
    }
  } catch {
    return { elegivel: false, motivo: 'Erro ao consultar Pagar.me', pedidos: 0, valor_bruto: 0, taxa: 0, valor_liquido: 0 }
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
```

-----

## SERVER ACTIONS — ASSINATURA

### lib/actions/assinatura.ts

```typescript
'use server'

import Stripe from 'stripe'
import { createSupabaseServer } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})

// Dados da assinatura atual
export async function getDadosAssinatura() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id, pagarme_onboarding_status')
    .single()

  const { data: sub } = await supabase
    .from('tenant_subscriptions')
    .select(`
      billing_status,
      stripe_subscription_id,
      trial_termina_em,
      periodo_inicio,
      periodo_fim,
      cancelado_em,
      plans (nome, preco_mensal, max_lojas, max_produtos, tem_estoque, tem_antecipacao)
    `)
    .single()

  return { tenant, assinatura: sub }
}

// Histórico de faturas via Stripe API
export async function getFaturas() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id')
    .single()

  if (!tenant?.stripe_customer_id) return []

  try {
    const faturas = await stripe.invoices.list({
      customer: tenant.stripe_customer_id,
      limit: 12,
    })

    return faturas.data.map((f) => ({
      id: f.id,
      numero: f.number,
      valor: f.amount_paid,
      status: f.status,
      data: new Date(f.created * 1000).toLocaleDateString('pt-BR'),
      pdf_url: f.invoice_pdf,
      periodo_inicio: f.period_start
        ? new Date(f.period_start * 1000).toLocaleDateString('pt-BR')
        : null,
      periodo_fim: f.period_end
        ? new Date(f.period_end * 1000).toLocaleDateString('pt-BR')
        : null,
    }))
  } catch {
    return []
  }
}

// Gerar link para o Stripe Customer Portal
export async function getLinkPortalAssinatura() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id')
    .single()

  if (!tenant?.stripe_customer_id) return null

  try {
    const sessao = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${process.env.APP_URL}/dashboard/configuracoes/assinatura`,
    })
    return sessao.url
  } catch {
    return null
  }
}
```

-----

## PAGINA FINANCEIRO

### app/(dashboard)/financeiro/page.tsx

```typescript
import {
  getKpisFinanceiros,
  getFaturamentoDiario,
  getTopProdutos,
  getRepasses,
  getSaldoPagarme,
  getPedidosElegiveis,
} from '@/lib/actions/financeiro'
import { KpisFinanceiros } from '@/components/dashboard/kpis-financeiros'
import { GraficoFaturamento } from '@/components/dashboard/grafico-faturamento'
import { ListaRepasses } from '@/components/dashboard/lista-repasses'
import { CardAntecipacao } from '@/components/dashboard/card-antecipacao'
import { CardSaldoPagarme } from '@/components/dashboard/card-saldo-pagarme'
import { TopProdutos } from '@/components/dashboard/top-produtos'

export default async function PaginaFinanceiro() {
  // Carregar tudo em paralelo
  const [
    kpisHoje,
    kpisMes,
    faturamentoDiario,
    topProdutos,
    repasses,
    saldoPagarme,
    pedidosElegiveis,
  ] = await Promise.all([
    getKpisFinanceiros('hoje'),
    getKpisFinanceiros('mes'),
    getFaturamentoDiario(),
    getTopProdutos(),
    getRepasses(),
    getSaldoPagarme(),
    getPedidosElegiveis(),
  ])

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-[#1A4D3A]">Financeiro</h1>

      {/* KPIs do dia e do mês */}
      <KpisFinanceiros kpisHoje={kpisHoje} kpisMes={kpisMes} />

      {/* Gráfico de faturamento dos últimos 30 dias */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-[#1A4D3A] mb-4">
          Faturamento — últimos 30 dias
        </h2>
        <GraficoFaturamento dados={faturamentoDiario} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Saldo no recipient Pagar.me */}
        <CardSaldoPagarme saldo={saldoPagarme} />

        {/* Antecipação de recebíveis (Pagar.me) */}
        <CardAntecipacao elegibilidade={pedidosElegiveis} />
      </div>

      {/* Top produtos */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-[#1A4D3A] mb-4">
          Produtos mais vendidos — últimos 30 dias
        </h2>
        <TopProdutos produtos={topProdutos} />
      </div>

      {/* Histórico de repasses */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-[#1A4D3A] mb-4">Repasses</h2>
        <ListaRepasses
          repasses={repasses.repasses}
          totalPendente={repasses.total_pendente}
          totalRecebido={repasses.total_recebido}
        />
      </div>
    </div>
  )
}
```

-----

## COMPONENTES FINANCEIROS

### components/dashboard/kpis-financeiros.tsx

```typescript
import { formatarReais } from '@mallevo/lib'

interface Kpis {
  faturamento_bruto: number
  faturamento_liquido: number
  total_pedidos: number
  ticket_medio: number
  pedidos_online: number
}

interface Props {
  kpisHoje: Kpis | null
  kpisMes: Kpis | null
}

export function KpisFinanceiros({ kpisHoje, kpisMes }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-3">Hoje</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <CardKpi
            label="Faturamento bruto"
            valor={formatarReais(kpisHoje?.faturamento_bruto ?? 0)}
          />
          <CardKpi
            label="Faturamento líquido"
            valor={formatarReais(kpisHoje?.faturamento_liquido ?? 0)}
            destaque
          />
          <CardKpi
            label="Pedidos entregues"
            valor={String(kpisHoje?.total_pedidos ?? 0)}
          />
          <CardKpi
            label="Ticket médio"
            valor={formatarReais(kpisHoje?.ticket_medio ?? 0)}
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-500 mb-3">Este mês</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <CardKpi
            label="Faturamento bruto"
            valor={formatarReais(kpisMes?.faturamento_bruto ?? 0)}
          />
          <CardKpi
            label="Faturamento líquido"
            valor={formatarReais(kpisMes?.faturamento_liquido ?? 0)}
            destaque
          />
          <CardKpi
            label="Pedidos entregues"
            valor={String(kpisMes?.total_pedidos ?? 0)}
          />
          <CardKpi
            label="Ticket médio"
            valor={formatarReais(kpisMes?.ticket_medio ?? 0)}
          />
        </div>
      </div>
    </div>
  )
}

function CardKpi({
  label,
  valor,
  destaque,
}: {
  label: string
  valor: string
  destaque?: boolean
}) {
  return (
    <div
      className={`rounded-xl p-4 border ${
        destaque
          ? 'bg-[#1A4D3A] border-[#1A4D3A] text-white'
          : 'bg-white border-gray-100'
      }`}
    >
      <p
        className={`text-xs mb-1 ${
          destaque ? 'text-green-200' : 'text-gray-500'
        }`}
      >
        {label}
      </p>
      <p
        className={`text-xl font-bold ${
          destaque ? 'text-white' : 'text-[#1A4D3A]'
        }`}
      >
        {valor}
      </p>
    </div>
  )
}
```

### components/dashboard/grafico-faturamento.tsx

```typescript
'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatarReais } from '@mallevo/lib'

interface Props {
  dados: { data: string; bruto: number; liquido: number }[]
}

export function GraficoFaturamento({ dados }: Props) {
  if (dados.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        Nenhum dado disponível ainda.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="data"
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
        />
        <YAxis
          tickFormatter={(v) => `R$${(v / 100).toFixed(0)}`}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
        />
        <Tooltip
          formatter={(value: number) => [formatarReais(value), '']}
          labelStyle={{ color: '#374151' }}
        />
        <Line
          type="monotone"
          dataKey="bruto"
          name="Bruto"
          stroke="#4CAF82"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="liquido"
          name="Líquido"
          stroke="#1A4D3A"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

### components/dashboard/card-saldo-pagarme.tsx

```typescript
import { formatarReais } from '@mallevo/lib'

interface Props {
  saldo: { disponivel: number; pendente: number; transferido: number } | null
}

export function CardSaldoPagarme({ saldo }: Props) {
  if (!saldo) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-[#1A4D3A] mb-2">
          Conta de recebimentos
        </h3>
        <p className="text-sm text-gray-400">
          Configure sua conta de recebimentos para ver o saldo.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="font-semibold text-[#1A4D3A] mb-4">
        Conta de recebimentos (Pagar.me)
      </h3>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Disponível para liquidação</span>
          <span className="text-lg font-bold text-[#1A4D3A]">
            {formatarReais(saldo.disponivel)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">A receber (recebíveis futuros)</span>
          <span className="text-base font-medium text-gray-600">
            {formatarReais(saldo.pendente)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Já transferido</span>
          <span className="text-base font-medium text-gray-600">
            {formatarReais(saldo.transferido)}
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        Liquidação automática Pagar.me — Pix instantâneo, cartão D+29+2 ou
        D+15 com antecipação automática.
      </p>
    </div>
  )
}
```

### components/dashboard/card-antecipacao.tsx

```typescript
'use client'

import { useState, useTransition } from 'react'
import { formatarReais } from '@mallevo/lib'
import { solicitarAntecipacao } from '@/lib/actions/financeiro'

interface Elegibilidade {
  elegivel: boolean
  motivo: string | null
  pedidos: number
  valor_bruto: number
  taxa: number
  valor_liquido: number
}

export function CardAntecipacao({ elegibilidade }: { elegibilidade: Elegibilidade }) {
  const [confirmando, setConfirmando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSolicitar() {
    setErro(null)
    startTransition(async () => {
      const resultado = await solicitarAntecipacao()
      if (resultado.erro) {
        setErro(resultado.erro)
      } else {
        setSucesso(true)
        setConfirmando(false)
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="font-semibold text-[#1A4D3A] mb-1">
        Antecipar repasse
      </h3>
      <p className="text-xs text-gray-400 mb-4">
        Receba em D+2 em vez de D+7. Taxa de R$0,75 por pedido.
      </p>

      {sucesso ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-800">
            Antecipação solicitada com sucesso.
          </p>
          <p className="text-xs text-green-600 mt-1">
            O repasse será processado no próximo ciclo (D+2).
          </p>
        </div>
      ) : !elegibilidade.elegivel ? (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500">{elegibilidade.motivo}</p>
        </div>
      ) : !confirmando ? (
        <div>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Pedidos elegíveis</span>
              <span className="font-medium">{elegibilidade.pedidos}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Valor bruto</span>
              <span className="font-medium">
                {formatarReais(elegibilidade.valor_bruto)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Taxa de antecipação</span>
              <span className="font-medium text-amber-600">
                -{formatarReais(elegibilidade.taxa)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-2">
              <span>Você recebe</span>
              <span className="text-[#1A4D3A]">
                {formatarReais(elegibilidade.valor_liquido)}
              </span>
            </div>
          </div>

          <button
            onClick={() => setConfirmando(true)}
            className="w-full bg-[#F5A623] text-white py-2.5 rounded-lg text-sm
              font-medium hover:bg-[#e09520] transition-colors"
          >
            Solicitar antecipação
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-700 mb-4">
            Confirma a antecipação de {formatarReais(elegibilidade.valor_liquido)}
            {' '}com desconto de {formatarReais(elegibilidade.taxa)}?
          </p>

          {erro && (
            <p className="text-sm text-red-600 mb-3">{erro}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setConfirmando(false)}
              disabled={isPending}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600"
            >
              Cancelar
            </button>
            <button
              onClick={handleSolicitar}
              disabled={isPending}
              className="flex-1 py-2 bg-[#F5A623] text-white rounded-lg text-sm
                font-medium disabled:opacity-50"
            >
              {isPending ? 'Aguarde...' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

### components/dashboard/lista-repasses.tsx

```typescript
import { formatarReais } from '@mallevo/lib'

const LABELS_STATUS: Record<string, string> = {
  agendado: 'Agendado',
  processando: 'Processando',
  concluido: 'Concluído',
  falhou: 'Falhou',
}

const CORES_STATUS: Record<string, string> = {
  agendado: 'bg-amber-100 text-amber-700',
  processando: 'bg-blue-100 text-blue-700',
  concluido: 'bg-green-100 text-green-700',
  falhou: 'bg-red-100 text-red-700',
}

interface Props {
  repasses: any[]
  totalPendente: number
  totalRecebido: number
}

export function ListaRepasses({ repasses, totalPendente, totalRecebido }: Props) {
  return (
    <div>
      {/* Totais */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
          <p className="text-xs text-amber-600 mb-1">A receber</p>
          <p className="text-lg font-bold text-amber-800">
            {formatarReais(totalPendente)}
          </p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-3">
          <p className="text-xs text-green-600 mb-1">Já recebido</p>
          <p className="text-lg font-bold text-green-800">
            {formatarReais(totalRecebido)}
          </p>
        </div>
      </div>

      {/* Tabela de repasses */}
      {repasses.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          Nenhum repasse registrado ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {repasses.map((repasse) => (
            <div
              key={repasse.id}
              className="flex items-center justify-between p-3
                bg-gray-50 rounded-xl text-sm"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${CORES_STATUS[repasse.status]}`}
                  >
                    {LABELS_STATUS[repasse.status]}
                  </span>
                  {repasse.antecipado && (
                    <span className="text-xs bg-[#F5A623]/20 text-[#F5A623] px-2 py-0.5 rounded-full">
                      Antecipado
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  {repasse.total_pedidos} pedidos ·{' '}
                  Previsto para{' '}
                  {new Date(repasse.data_prevista + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
                {repasse.taxa_antecipacao > 0 && (
                  <p className="text-xs text-amber-600 mt-0.5">
                    Taxa antecipação: -{formatarReais(repasse.taxa_antecipacao)}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-[#1A4D3A]">
                  {formatarReais(repasse.valor_liquido)}
                </p>
                {repasse.pagarme_transfer_id && (
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">
                    {repasse.pagarme_transfer_id.slice(0, 12)}...
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

-----

## PAGINA DE ASSINATURA

### app/(dashboard)/configuracoes/assinatura/page.tsx

```typescript
import { getDadosAssinatura, getFaturas, getLinkPortalAssinatura } from '@/lib/actions/assinatura'
import { formatarReais } from '@mallevo/lib'

const LABELS_BILLING: Record<string, string> = {
  trial: 'Período de teste',
  ativa: 'Ativa',
  em_atraso: 'Pagamento em atraso',
  cancelada: 'Cancelada',
  suspensa: 'Suspensa',
}

const CORES_BILLING: Record<string, string> = {
  trial: 'bg-blue-100 text-blue-700',
  ativa: 'bg-green-100 text-green-700',
  em_atraso: 'bg-amber-100 text-amber-700',
  cancelada: 'bg-red-100 text-red-700',
  suspensa: 'bg-gray-100 text-gray-700',
}

export default async function PaginaAssinatura() {
  const [{ assinatura }, faturas, linkPortal] = await Promise.all([
    getDadosAssinatura(),
    getFaturas(),
    getLinkPortalAssinatura(),
  ])

  const plano = assinatura?.plans as any

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-[#1A4D3A]">Assinatura</h1>

      {/* Card do plano atual */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">
              {plano?.nome ?? 'Plano atual'}
            </h2>
            {plano?.preco_mensal && (
              <p className="text-sm text-gray-500 mt-0.5">
                {formatarReais(plano.preco_mensal)} / mês
              </p>
            )}
          </div>
          {assinatura?.billing_status && (
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium
                ${CORES_BILLING[assinatura.billing_status]}`}
            >
              {LABELS_BILLING[assinatura.billing_status]}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Lojas</p>
            <p className="font-medium mt-0.5">{plano?.max_lojas ?? '—'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Produtos</p>
            <p className="font-medium mt-0.5">{plano?.max_produtos ?? '—'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Controle de estoque</p>
            <p className="font-medium mt-0.5">
              {plano?.tem_estoque ? 'Incluído' : 'Não incluído'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Antecipação de repasse</p>
            <p className="font-medium mt-0.5">
              {plano?.tem_antecipacao ? 'Incluído' : 'Não incluído'}
            </p>
          </div>
        </div>

        {assinatura?.billing_status === 'trial' && assinatura.trial_termina_em && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-700">
              Período de teste até{' '}
              {new Date(assinatura.trial_termina_em).toLocaleDateString('pt-BR')}
            </p>
          </div>
        )}

        {assinatura?.periodo_fim && assinatura.billing_status === 'ativa' && (
          <p className="text-xs text-gray-400 mb-4">
            Próxima cobrança em{' '}
            {new Date(assinatura.periodo_fim).toLocaleDateString('pt-BR')}
          </p>
        )}

        {linkPortal && (
          <a
            href={linkPortal}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center border border-[#1A4D3A] text-[#1A4D3A]
              py-2.5 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors"
          >
            Gerenciar assinatura
          </a>
        )}
      </div>

      {/* Histórico de faturas */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-[#1A4D3A] mb-4">Faturas</h2>

        {faturas.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma fatura encontrada.</p>
        ) : (
          <div className="space-y-2">
            {faturas.map((fatura) => (
              <div
                key={fatura.id}
                className="flex items-center justify-between p-3
                  bg-gray-50 rounded-xl text-sm"
              >
                <div>
                  <p className="font-medium text-gray-700">
                    {fatura.numero ?? fatura.id.slice(0, 12)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {fatura.data}
                    {fatura.periodo_inicio && fatura.periodo_fim && (
                      <> · {fatura.periodo_inicio} a {fatura.periodo_fim}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      fatura.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {fatura.status === 'paid' ? 'Pago' : 'Pendente'}
                  </span>
                  <span className="font-semibold text-[#1A4D3A]">
                    {formatarReais(fatura.valor)}
                  </span>
                  {fatura.pdf_url && (
                    <a
                      href={fatura.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#4CAF82] underline"
                    >
                      PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

-----

## CHECKLIST DO MODULO

- [ ] Chaves `PAGARME_API_KEY` e `STRIPE_SECRET_KEY` configuradas no servidor (nunca no cliente)
- [ ] `getSaldoPagarme` consulta `/recipients/{id}/balance` — requer recipient `active`
- [ ] `getPedidosElegiveis` consulta `/recipients/{id}/anticipation_limits` — requer recipient `active` e plano com `tem_antecipacao`
- [ ] `stripe.billingPortal.sessions.create` — requer Customer Portal ativado no Stripe Dashboard
- [ ] `Promise.all` na página para carregar dados em paralelo (performance)
- [ ] Gráfico de faturamento usa Recharts — importado como Client Component
- [ ] Valores monetários sempre em centavos no banco, convertidos com `formatarReais` na exibição
- [ ] Card de antecipação com fluxo de confirmação em dois passos para evitar clique acidental
- [ ] Repasses com `pagarme_transfer_id` exibem parte do ID para auditoria fácil
- [ ] Ativar Customer Portal no Stripe Dashboard antes de usar em produção:
  Stripe Dashboard > Billing > Customer Portal > Activate

-----

*Arquivo 13 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 14 — Dashboard — Configurações da Loja*
