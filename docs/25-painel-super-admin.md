# 25 — Painel Super Admin

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

O painel super admin é a interface operacional da plataforma usada
por Pedro para gerenciar lojistas, entregadores, planos e acompanhar
as métricas do negócio. É uma área restrita do dashboard Next.js,
acessível apenas para usuários com `role = 'admin'` no JWT.

O middleware já protege as rotas `/admin/*` (arquivo 08). O layout
do grupo `(admin)` faz uma segunda verificação server-side.

-----

## ESTRUTURA DE ROTAS

```
app/(admin)/
  layout.tsx                Layout admin — verificação de role
  admin/
    page.tsx                Visão geral — métricas globais
    lojistas/
      page.tsx              Listagem de tenants
      [id]/
        page.tsx            Detalhes do tenant
    entregadores/
      page.tsx              Listagem e aprovações pendentes
      [id]/
        page.tsx            Detalhes do entregador
    planos/
      page.tsx              Gestão de planos Stripe
    financeiro/
      page.tsx              Conciliação financeira
```

-----

## LAYOUT DO ADMIN

### app/(admin)/layout.tsx

```typescript
import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'

export default async function LayoutAdmin({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createSupabaseServer()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')

  const role = user.user_metadata?.role
  if (role !== 'admin') redirect('/dashboard')

  return (
    <div className="flex h-screen bg-[#FFF8ED]">
      <SidebarAdmin />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}

function SidebarAdmin() {
  const links = [
    { href: '/admin', label: 'Visão geral' },
    { href: '/admin/lojistas', label: 'Lojistas' },
    { href: '/admin/entregadores', label: 'Entregadores' },
    { href: '/admin/planos', label: 'Planos' },
    { href: '/admin/financeiro', label: 'Financeiro' },
  ]

  return (
    <aside className="w-52 bg-[#1A4D3A] flex flex-col py-6">
      <div className="px-5 mb-8">
        <p className="text-white font-bold text-base">Admin</p>
        <p className="text-green-300 text-xs mt-0.5">Plataforma</p>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-green-200 hover:text-white hover:bg-white/10
              px-3 py-2 rounded-lg text-sm transition-colors"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </aside>
  )
}
```

-----

## SERVER ACTIONS — ADMIN

### lib/actions/admin.ts

```typescript
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

// Metricas globais da plataforma
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
      pagarme_onboarding_status, criado_em,
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
      pagarme_onboarding_status, criado_em, aprovado_em,
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
    metadata: { plataforma: 'mallevo' },
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

// Conciliacao financeira
export async function getConciliacaoFinanceira(mes: string) {
  const supabase = createSupabaseServer()
  await verificarAdmin(supabase)

  // mes no formato 'YYYY-MM'
  const inicio = new Date(`${mes}-01T00:00:00.000Z`)
  const fim = new Date(inicio)
  fim.setMonth(fim.getMonth() + 1)

  const [resPedidos, resPayouts, resAssinaturas] = await Promise.all([
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

    // Receita de assinaturas via Stripe API
    null,
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
```

-----

## PAGINA VISAO GERAL

### app/(admin)/admin/page.tsx

```typescript
import { getMetricasGlobais } from '@/lib/actions/admin'
import { formatarReais } from '@mallevo/lib'

export default async function PaginaAdminVisaoGeral() {
  const metricas = await getMetricasGlobais()

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-[#1A4D3A]">Visão geral</h1>

      {/* Plataforma */}
      <section>
        <p className="text-sm font-semibold text-gray-500 uppercase mb-3">
          Plataforma
        </p>
        <div className="grid grid-cols-3 gap-3">
          <CardMetrica label="Lojistas ativos" valor={String(metricas.lojistas_ativos)} />
          <CardMetrica label="Assinaturas ativas" valor={String(metricas.assinaturas_ativas)} />
          <CardMetrica label="Entregadores" valor={String(metricas.entregadores_aprovados)} />
        </div>
      </section>

      {/* Hoje */}
      <section>
        <p className="text-sm font-semibold text-gray-500 uppercase mb-3">Hoje</p>
        <div className="grid grid-cols-3 gap-3">
          <CardMetrica
            label="Pedidos entregues"
            valor={String(metricas.pedidos_hoje)}
          />
          <CardMetrica
            label="GMV"
            valor={formatarReais(metricas.gmv_hoje)}
          />
          <CardMetrica
            label="Comissões"
            valor={formatarReais(metricas.receita_comissao_hoje)}
            destaque
          />
        </div>
      </section>

      {/* Este mês */}
      <section>
        <p className="text-sm font-semibold text-gray-500 uppercase mb-3">
          Este mês
        </p>
        <div className="grid grid-cols-3 gap-3">
          <CardMetrica
            label="Pedidos entregues"
            valor={String(metricas.pedidos_mes)}
          />
          <CardMetrica
            label="GMV"
            valor={formatarReais(metricas.gmv_mes)}
          />
          <CardMetrica
            label="Comissões"
            valor={formatarReais(metricas.receita_comissao_mes)}
            destaque
          />
        </div>
      </section>

      {/* Repasses pendentes */}
      {metricas.repasses_pendentes > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800">
            Repasses pendentes
          </p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {formatarReais(metricas.repasses_pendentes)}
          </p>
          <p className="text-xs text-amber-600 mt-1">
            Serão processados pelo cron de meia-noite.
          </p>
        </div>
      )}
    </div>
  )
}

function CardMetrica({
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
          ? 'bg-[#1A4D3A] border-[#1A4D3A]'
          : 'bg-white border-gray-100'
      }`}
    >
      <p className={`text-xs mb-1 ${destaque ? 'text-green-200' : 'text-gray-500'}`}>
        {label}
      </p>
      <p className={`text-xl font-bold ${destaque ? 'text-white' : 'text-[#1A4D3A]'}`}>
        {valor}
      </p>
    </div>
  )
}
```

-----

## PAGINA DE LOJISTAS

### app/(admin)/admin/lojistas/page.tsx

```typescript
import { getTenants } from '@/lib/actions/admin'
import { TabelaTenants } from '@/components/admin/tabela-tenants'

export default async function PaginaLojistas({
  searchParams,
}: {
  searchParams: { status?: string; busca?: string }
}) {
  const tenants = await getTenants({
    billing_status: searchParams.status,
    busca: searchParams.busca,
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1A4D3A]">Lojistas</h1>
        <span className="text-sm text-gray-400">{tenants.length} encontrado(s)</span>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {[
          { label: 'Todos', valor: '' },
          { label: 'Ativos', valor: 'ativa' },
          { label: 'Trial', valor: 'trial' },
          { label: 'Em atraso', valor: 'em_atraso' },
          { label: 'Cancelados', valor: 'cancelada' },
        ].map((f) => (
          <a
            key={f.valor}
            href={`/admin/lojistas${f.valor ? `?status=${f.valor}` : ''}`}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              (searchParams.status ?? '') === f.valor
                ? 'bg-[#1A4D3A] text-white border-[#1A4D3A]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <TabelaTenants tenants={tenants} />
    </div>
  )
}
```

### components/admin/tabela-tenants.tsx

```typescript
'use client'

import { useTransition } from 'react'
import { atualizarStatusTenant } from '@/lib/actions/admin'

const CORES_BILLING: Record<string, string> = {
  trial: 'bg-blue-100 text-blue-700',
  ativa: 'bg-green-100 text-green-700',
  em_atraso: 'bg-amber-100 text-amber-700',
  cancelada: 'bg-red-100 text-red-700',
  suspensa: 'bg-gray-100 text-gray-700',
}

const LABELS_BILLING: Record<string, string> = {
  trial: 'Trial',
  ativa: 'Ativa',
  em_atraso: 'Em atraso',
  cancelada: 'Cancelada',
  suspensa: 'Suspensa',
}

export function TabelaTenants({ tenants }: { tenants: any[] }) {
  const [isPending, startTransition] = useTransition()

  function handleToggle(id: string, ativo: boolean) {
    startTransition(async () => {
      await atualizarStatusTenant(id, !ativo)
    })
  }

  if (tenants.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        Nenhum lojista encontrado.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              Lojista
            </th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              Plano
            </th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              Assinatura
            </th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              Pagar.me KYC
            </th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              Cadastro
            </th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant: any) => {
            const sub = tenant.tenant_subscriptions?.[0]
            const plano = sub?.plans

            return (
              <tr
                key={tenant.id}
                className="border-b border-gray-50 hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">
                    {tenant.nome_responsavel}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{tenant.email}</p>
                  {tenant.stores?.[0] && (
                    <p className="text-xs text-gray-400">
                      {tenant.stores[0].nome}
                    </p>
                  )}
                </td>

                <td className="px-4 py-3">
                  <span className="text-gray-700">
                    {plano?.nome ?? '—'}
                  </span>
                </td>

                <td className="px-4 py-3">
                  {sub ? (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${CORES_BILLING[sub.billing_status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {LABELS_BILLING[sub.billing_status] ?? sub.billing_status}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">Sem assinatura</span>
                  )}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium ${
                      tenant.pagarme_onboarding_status === 'active'
                        ? 'text-green-600'
                        : 'text-amber-500'
                    }`}
                  >
                    {tenant.pagarme_onboarding_status === 'active' ? 'Verificado' : 'Pendente'}
                  </span>
                </td>

                <td className="px-4 py-3 text-xs text-gray-400">
                  {new Date(tenant.criado_em).toLocaleDateString('pt-BR')}
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <a
                      href={`/admin/lojistas/${tenant.id}`}
                      className="text-xs text-[#4CAF82] hover:underline"
                    >
                      Ver
                    </a>
                    <button
                      onClick={() => handleToggle(tenant.id, tenant.ativo)}
                      disabled={isPending}
                      className={`text-xs px-2 py-1 rounded-lg border transition-colors
                        disabled:opacity-50 ${
                        tenant.ativo
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-green-200 text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {tenant.ativo ? 'Suspender' : 'Reativar'}
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

-----

## PAGINA DE ENTREGADORES

### app/(admin)/admin/entregadores/page.tsx

```typescript
import { getEntregadores } from '@/lib/actions/admin'
import { TabelaEntregadores } from '@/components/admin/tabela-entregadores'

export default async function PaginaEntregadores({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const status = searchParams.status ?? 'pendente'
  const entregadores = await getEntregadores({ status })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1A4D3A]">Entregadores</h1>
        <span className="text-sm text-gray-400">
          {entregadores.length} encontrado(s)
        </span>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {[
          { label: 'Pendentes', valor: 'pendente' },
          { label: 'Aprovados', valor: 'aprovado' },
          { label: 'Reprovados', valor: 'reprovado' },
          { label: 'Suspensos', valor: 'suspenso' },
        ].map((f) => (
          <a
            key={f.valor}
            href={`/admin/entregadores?status=${f.valor}`}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              status === f.valor
                ? 'bg-[#1A4D3A] text-white border-[#1A4D3A]'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <TabelaEntregadores entregadores={entregadores} />
    </div>
  )
}
```

### components/admin/tabela-entregadores.tsx

```typescript
'use client'

import { useTransition } from 'react'
import { atualizarStatusEntregador } from '@/lib/actions/admin'

export function TabelaEntregadores({
  entregadores,
}: {
  entregadores: any[]
}) {
  const [isPending, startTransition] = useTransition()

  function handleAprovar(id: string) {
    startTransition(async () => {
      await atualizarStatusEntregador(id, 'aprovado')
    })
  }

  function handleReprovar(id: string) {
    startTransition(async () => {
      await atualizarStatusEntregador(id, 'reprovado')
    })
  }

  function handleSuspender(id: string) {
    startTransition(async () => {
      await atualizarStatusEntregador(id, 'suspenso')
    })
  }

  if (entregadores.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        Nenhum entregador encontrado com este status.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              Entregador
            </th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              Tipo
            </th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              Veículo
            </th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              CNH
            </th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              Pagar.me
            </th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              Cadastro
            </th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {entregadores.map((courier: any) => (
            <tr
              key={courier.id}
              className="border-b border-gray-50 hover:bg-gray-50"
            >
              <td className="px-4 py-3">
                <p className="font-medium text-gray-800">{courier.nome}</p>
                <p className="text-xs text-gray-400 mt-0.5">{courier.telefone}</p>
                {courier.tenants && (
                  <p className="text-xs text-gray-400">
                    Lojista: {courier.tenants.nome_responsavel}
                  </p>
                )}
              </td>

              <td className="px-4 py-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    courier.tipo === 'autonomo'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {courier.tipo === 'autonomo' ? 'Autônomo' : 'Próprio'}
                </span>
              </td>

              <td className="px-4 py-3 text-gray-600 capitalize">
                {courier.veiculo_tipo?.replace('_', ' ') ?? '—'}
                {courier.veiculo_placa && (
                  <span className="text-gray-400 ml-1">
                    ({courier.veiculo_placa})
                  </span>
                )}
              </td>

              <td className="px-4 py-3">
                {courier.cnh_foto_url ? (
                  <a
                    href={courier.cnh_foto_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#4CAF82] hover:underline"
                  >
                    Ver foto
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">Não enviada</span>
                )}
              </td>

              <td className="px-4 py-3">
                <span
                  className={`text-xs font-medium ${
                    courier.pagarme_onboarding_status === 'active'
                      ? 'text-green-600'
                      : 'text-amber-500'
                  }`}
                >
                  {courier.pagarme_onboarding_status === 'active' ? 'OK' : 'Pendente'}
                </span>
              </td>

              <td className="px-4 py-3 text-xs text-gray-400">
                {new Date(courier.criado_em).toLocaleDateString('pt-BR')}
              </td>

              <td className="px-4 py-3">
                <div className="flex gap-1.5">
                  {courier.status === 'pendente' && (
                    <>
                      <button
                        onClick={() => handleAprovar(courier.id)}
                        disabled={isPending}
                        className="text-xs px-2 py-1 bg-green-50 border border-green-200
                          text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleReprovar(courier.id)}
                        disabled={isPending}
                        className="text-xs px-2 py-1 bg-red-50 border border-red-200
                          text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50"
                      >
                        Reprovar
                      </button>
                    </>
                  )}
                  {courier.status === 'aprovado' && (
                    <button
                      onClick={() => handleSuspender(courier.id)}
                      disabled={isPending}
                      className="text-xs px-2 py-1 border border-gray-200
                        text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Suspender
                    </button>
                  )}
                  {['reprovado', 'suspenso'].includes(courier.status) && (
                    <button
                      onClick={() => handleAprovar(courier.id)}
                      disabled={isPending}
                      className="text-xs px-2 py-1 bg-green-50 border border-green-200
                        text-green-700 rounded-lg disabled:opacity-50"
                    >
                      Reativar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

-----

## PAGINA DE CONCILIACAO FINANCEIRA

### app/(admin)/admin/financeiro/page.tsx

```typescript
import { getConciliacaoFinanceira } from '@/lib/actions/admin'
import { formatarReais } from '@mallevo/lib'

export default async function PaginaFinanceiroAdmin({
  searchParams,
}: {
  searchParams: { mes?: string }
}) {
  const hoje = new Date()
  const mes = searchParams.mes ??
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

  const dados = await getConciliacaoFinanceira(mes)

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1A4D3A]">
          Conciliação financeira
        </h1>

        {/* Seletor de mês */}
        <input
          type="month"
          defaultValue={mes}
          onChange={(e) => {
            window.location.href = `/admin/financeiro?mes=${e.target.value}`
          }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
        />
      </div>

      {/* Resumo do mês */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">GMV do período</p>
          <p className="text-2xl font-bold text-[#1A4D3A]">
            {formatarReais(dados.gmv_total)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {dados.total_pedidos} pedidos entregues
          </p>
        </div>

        <div className="bg-[#1A4D3A] rounded-xl p-5">
          <p className="text-xs text-green-200 mb-1">Receita da plataforma</p>
          <p className="text-2xl font-bold text-white">
            {formatarReais(dados.receita_comissao + dados.receita_antecipacao)}
          </p>
          <p className="text-xs text-green-300 mt-1">
            Comissões: {formatarReais(dados.receita_comissao)}
            {dados.receita_antecipacao > 0 && (
              <> · Antecipações: {formatarReais(dados.receita_antecipacao)}</>
            )}
          </p>
        </div>
      </div>

      {/* Repasses */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-[#1A4D3A] mb-4">Repasses</h2>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Repassado a lojistas</span>
            <span className="font-semibold text-gray-800">
              {formatarReais(dados.total_repassado_lojistas)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Repassado a entregadores</span>
            <span className="font-semibold text-gray-800">
              {formatarReais(dados.total_repassado_entregadores)}
            </span>
          </div>
          <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
            <span className="text-gray-500">Total repassado</span>
            <span className="font-bold text-gray-800">
              {formatarReais(
                dados.total_repassado_lojistas + dados.total_repassado_entregadores
              )}
            </span>
          </div>
          {dados.payouts_pendentes > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-amber-600">Pendente de repasse</span>
              <span className="font-semibold text-amber-700">
                {formatarReais(dados.payouts_pendentes)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

-----

## PAGINA DE PLANOS

### app/(admin)/admin/planos/page.tsx

```typescript
import { getPlanos } from '@/lib/actions/admin'
import { FormularioPlano } from '@/components/admin/formulario-plano'
import { formatarReais } from '@mallevo/lib'

export default async function PaginaPlanos() {
  const planos = await getPlanos()

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-[#1A4D3A]">Planos</h1>

      {/* Lista de planos */}
      <div className="space-y-3">
        {planos.map((plano: any) => (
          <div
            key={plano.id}
            className={`bg-white rounded-xl border p-4 ${
              plano.ativo ? 'border-gray-100' : 'border-gray-100 opacity-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-semibold text-gray-800">{plano.nome}</p>
                {plano.descricao && (
                  <p className="text-xs text-gray-400 mt-0.5">{plano.descricao}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-[#1A4D3A]">
                  {formatarReais(plano.preco_mensal)}/mês
                </p>
                {!plano.ativo && (
                  <span className="text-xs text-gray-400">Inativo</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              <span>{plano.max_lojas} loja(s)</span>
              <span>·</span>
              <span>{plano.max_produtos} produto(s)</span>
              <span>·</span>
              <span>{plano.max_entregadores} entregador(es)</span>
              {plano.tem_estoque && <><span>·</span><span>Estoque</span></>}
              {plano.tem_antecipacao && <><span>·</span><span>Antecipação</span></>}
            </div>

            {plano.stripe_price_id && (
              <p className="text-xs text-gray-300 font-mono mt-2">
                {plano.stripe_price_id}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Formulário de novo plano */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-[#1A4D3A] mb-4">Novo plano</h2>
        <FormularioPlano />
      </div>
    </div>
  )
}
```

-----

## CHECKLIST DO MODULO

- [ ] Usuário admin criado no Supabase com `user_metadata.role = 'admin'`
  via Supabase Dashboard > Authentication > Users > editar metadados
- [ ] Middleware protege `/admin/*` verificando role no JWT (arquivo 08)
- [ ] Layout do grupo `(admin)` faz segunda verificação server-side
- [ ] `verificarAdmin()` chamada em todas as Server Actions admin
- [ ] Criação de plano sincroniza com Stripe Products e Prices
- [ ] Suspender tenant atualiza `billing_status = 'suspensa'` na assinatura
- [ ] Aprovação de entregador registra `aprovado_em` e `aprovado_por`
- [ ] Tabelas paginadas — limite de 100 registros por query
- [ ] Conciliação financeira filtrada por mês com seletor no header
- [ ] Repasses pendentes exibidos na visão geral com alerta visual
- [ ] Link de foto da CNH abre em nova aba para revisão do admin
- [ ] Métricas globais carregadas com `Promise.all` para performance

-----

*Arquivo 25 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 26 — Testes e Qualidade*
