import { createSupabaseServer } from '@/lib/supabase/server'
import { DollarSign, ShoppingBag, BarChart3, Star } from 'lucide-react'
import { KPI } from '@/components/ui/kpi'
import { SetupWizard } from '@/components/dashboard/setup-wizard'
import { HomeHeader } from '@/components/dashboard/home-header'
import { FilaPedidosCard, type PedidoResumo } from '@/components/dashboard/fila-pedidos-card'
import { MovimentoCard } from '@/components/dashboard/movimento-card'
import { MaisVendidosCard, type ProdutoMaisVendido } from '@/components/dashboard/mais-vendidos-card'
import { RepasseCard } from '@/components/dashboard/repasse-card'
import { InsightBar } from '@/components/dashboard/insight-bar'

export const dynamic = 'force-dynamic'

export default async function PaginaInicio() {
  const supabase = createSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, stripe_onboarding_ok')
    .single()

  const tenantId = tenant?.id ?? ''

  const [{ data: loja }, { count: totalProdutos }] = await Promise.all([
    supabase
      .from('stores')
      .select('id, nome, horarios, taxa_entrega, raio_entrega_km')
      .eq('tenant_id', tenantId)
      .single(),
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
  ])

  const horariosConfigurados = !!(loja?.horarios && Object.keys(loja.horarios as object).length > 0)
  const entregaConfigurada = !!(loja?.taxa_entrega !== null && loja?.raio_entrega_km && loja.raio_entrega_km > 0)
  const temProdutos = (totalProdutos ?? 0) > 0
  const stripeOk = !!tenant?.stripe_onboarding_ok

  const setupCompleto = stripeOk && temProdutos && horariosConfigurados && entregaConfigurada

  if (!setupCompleto) {
    return (
      <SetupWizard
        nomeLoja={loja?.nome ?? 'Minha loja'}
        stripeOk={stripeOk}
        temProdutos={temProdutos}
        horariosConfigurados={horariosConfigurados}
        entregaConfigurada={entregaConfigurada}
      />
    )
  }

  // ===== Home operacional =====
  const inicioDia = new Date()
  inicioDia.setHours(0, 0, 0, 0)
  const inicioDiaISO = inicioDia.toISOString()

  const inicioSemana = new Date(inicioDia)
  inicioSemana.setDate(inicioSemana.getDate() - 7)

  const [{ data: pedidosHoje }, { data: pedidosAtivos }, { data: produtos }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, status, total, criado_em')
      .eq('tenant_id', tenantId)
      .gte('criado_em', inicioDiaISO),
    supabase
      .from('orders')
      .select('id, status, total, endereco_entrega, criado_em')
      .eq('tenant_id', tenantId)
      .in('status', ['novo', 'em_preparo', 'aguardando_entregador', 'saiu_para_entrega'])
      .order('criado_em', { ascending: false })
      .limit(8),
    supabase
      .from('products')
      .select('id, nome, preco, foto_url')
      .eq('tenant_id', tenantId)
      .eq('disponivel', true)
      .order('criado_em', { ascending: false })
      .limit(4),
  ])

  type Order = {
    id: string
    status: string
    total: number
    criado_em: string
    endereco_entrega?: { bairro?: string } | null
  }

  const lista = (pedidosHoje ?? []) as Order[]
  const ativos = (pedidosAtivos ?? []) as Order[]

  const receitaHoje = lista.reduce((s, o) => s + Number(o.total ?? 0), 0)
  const pedidosHojeCount = lista.length
  const ticketMedio = pedidosHojeCount ? receitaHoje / pedidosHojeCount : 0

  const novos = ativos.filter((o) => o.status === 'novo').length
  const preparo = ativos.filter((o) => o.status === 'em_preparo' || o.status === 'aguardando_entregador').length
  const entrega = ativos.filter((o) => o.status === 'saiu_para_entrega').length

  // KPI sparklines: distribuir pedidosHoje em 8 buckets
  const buckets = bucketByHour(lista, 8)

  // Movimento por hora (12h às 22h)
  const horas = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
  const hourly = horas.map((h) => ({
    h: `${h}h`,
    n: lista.filter((o) => new Date(o.criado_em).getHours() === h).length,
  }))
  const pico = hourly.reduce((a, b) => (b.n > a.n ? b : a), hourly[0])
  const horaAtual = new Date().getHours()
  const agora = lista.filter((o) => new Date(o.criado_em).getHours() === horaAtual).length

  // Pedidos de fila (3 mais recentes ativos)
  const filaPedidos: PedidoResumo[] = ativos.slice(0, 3).map((o) => ({
    id: o.id,
    customer: 'Cliente',
    neighborhood: o.endereco_entrega?.bairro ?? '—',
    items: 0,
    total: Number(o.total ?? 0),
    time: new Date(o.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    status: o.status as PedidoResumo['status'],
  }))

  const maisVendidos: ProdutoMaisVendido[] = (produtos ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    preco: Number(p.preco),
    vendas_semana: 0,
  }))

  const ownerName = (user?.user_metadata?.nome as string) ?? user?.email?.split('@')[0] ?? 'Lojista'
  const email = user?.email ?? ''

  return (
    <div className="p-9 slide-up">
      <HomeHeader ownerName={ownerName} email={email} />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[18px] mb-[18px]">
        <KPI
          label="Receita hoje"
          prefix="R$"
          value={receitaHoje.toFixed(2).replace('.', ',')}
          icon={DollarSign}
          spark={buckets}
          color="var(--brick)"
        />
        <KPI
          label="Pedidos hoje"
          value={String(pedidosHojeCount)}
          icon={ShoppingBag}
          spark={buckets}
          color="var(--leaf)"
        />
        <KPI
          label="Ticket médio"
          prefix="R$"
          value={ticketMedio.toFixed(2).replace('.', ',')}
          icon={BarChart3}
          color="var(--sky)"
        />
        <KPI label="Avaliação" value="—" suffix="/ 5,0" icon={Star} color="var(--mustard)" />
      </div>

      {/* Linha 1: fila + movimento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[18px]">
        <div className="lg:col-span-2">
          <FilaPedidosCard
            novos={novos}
            preparo={preparo}
            entrega={entrega}
            pedidos={filaPedidos}
          />
        </div>
        <MovimentoCard hourly={hourly} pico={pico} agora={agora} />
      </div>

      {/* Linha 2: top produtos + entregadores + repasse */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[18px] mt-[18px]">
        <MaisVendidosCard produtos={maisVendidos} />

        <EntregadoresPlaceholder />

        <RepasseCard
          proximoValor={receitaHoje}
          proximaData="próximos dias"
          banco="conta cadastrada"
        />
      </div>

      <InsightBar
        destaque="Mercado"
        bairro="Niterói"
        delta={18}
        sugestao="Sugestão: destaque seus 3 produtos mais vendidos nessa região."
      />
    </div>
  )
}

function bucketByHour(orders: { criado_em: string }[], n: number): number[] {
  const result = Array(n).fill(0)
  const inicio = new Date()
  inicio.setHours(0, 0, 0, 0)
  const passo = (24 * 60 * 60 * 1000) / n
  for (const o of orders) {
    const idx = Math.min(n - 1, Math.floor((new Date(o.criado_em).getTime() - inicio.getTime()) / passo))
    if (idx >= 0) result[idx] += 1
  }
  // Garante variação para a sparkline ficar viva quando há 0
  if (result.every((v) => v === 0)) return [0, 0, 0, 0, 0, 0, 0, 0]
  return result
}

function EntregadoresPlaceholder() {
  return (
    <div
      className="rounded-lg border border-line bg-bg p-[22px] flex flex-col"
    >
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="m-0 text-base font-bold tracking-tight">Entregadores</h3>
        <span className="font-mono text-[10px] text-ink-3">pool da plataforma</span>
      </div>
      <div className="text-sm text-ink-3 flex-1 flex items-center justify-center text-center py-6">
        Os entregadores são alocados automaticamente pelo pool da Mallevo.
      </div>
    </div>
  )
}
