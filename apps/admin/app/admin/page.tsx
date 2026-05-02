import { getMetricasGlobais } from '@/lib/actions/admin'
import { formatarReais } from '@mallora/lib'
import { GraficoGMV } from '@/components/admin/grafico-gmv'
import { MiniCalendario } from '@/components/admin/mini-calendario'
import {
  Store,
  Users,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react'

function saudar() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default async function PaginaAdminVisaoGeral() {
  const metricas = await getMetricasGlobais()

  const kpis = [
    {
      label: 'Lojistas Ativos',
      valor: metricas.lojistas_ativos.toLocaleString('pt-BR'),
      variacao: 15,
      positivo: true,
      icon: Store,
      iconBg: 'bg-brick/10',
      iconColor: 'text-brick-dk',
    },
    {
      label: 'Assinaturas Ativas',
      valor: metricas.assinaturas_ativas.toLocaleString('pt-BR'),
      variacao: 9,
      positivo: false,
      icon: Users,
      iconBg: 'bg-sky/10',
      iconColor: 'text-sky',
    },
    {
      label: 'GMV Hoje',
      valor: formatarReais(metricas.gmv_hoje),
      variacao: 7.2,
      positivo: true,
      icon: DollarSign,
      iconBg: 'bg-berry/10',
      iconColor: 'text-berry',
    },
    {
      label: 'Comissões do Mês',
      valor: formatarReais(metricas.receita_comissao_mes),
      variacao: 2,
      positivo: false,
      icon: ShoppingBag,
      iconBg: 'bg-mustard/10',
      iconColor: 'text-warn',
    },
  ]

  const mesAtualLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="p-9 space-y-5 max-w-[1400px]">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-[34px] leading-tight text-ink">
            {saudar()}, Admin!
          </h1>
          <p className="text-[13px] text-ink-3 mt-0.5">
            Aqui está a visão geral da plataforma Mallora.
          </p>
        </div>

        <div
          className="flex items-center gap-3 rounded-lg px-4 py-3 border"
          style={{
            background: 'var(--bg)',
            borderColor: 'var(--line)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(193,241,72,0.15)' }}
          >
            <span className="text-brick-dk text-sm font-bold">A</span>
          </div>
          <div className="text-right">
            <p className="text-[13px] font-semibold text-ink leading-tight">Super Admin</p>
            <p className="text-[11px] text-ink-3">Mallora Plataforma</p>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-[18px]">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.label}
              className="bg-bg border border-line rounded-lg p-5 hover:border-line-2 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <p className="text-[13px] text-ink-3 font-medium leading-tight">{kpi.label}</p>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${kpi.iconBg}`}>
                  <Icon size={15} className={kpi.iconColor} />
                </div>
              </div>

              <p className="font-display text-[34px] leading-none text-ink mb-3">
                {kpi.valor}
              </p>

              <div
                className={`flex items-center gap-1 text-[11px] font-bold ${
                  kpi.positivo ? 'text-ok' : 'text-err'
                }`}
              >
                {kpi.positivo ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span>{kpi.positivo ? '+' : '-'}{kpi.variacao}% do mês passado</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main content: chart + right column */}
      <div className="grid grid-cols-[1fr_300px] gap-[18px]">
        {/* GMV Chart */}
        <div className="bg-bg border border-line rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-[17px] tracking-tight text-ink">Visão Geral do GMV</h2>
              <p className="text-[13px] text-ink-3 mt-0.5 capitalize">{mesAtualLabel}</p>
            </div>
            <select
              className="text-[13px] border rounded-md px-3 py-2 text-ink-2 bg-bg
                focus:outline-none focus:ring-2 focus:ring-brick cursor-pointer"
              style={{ borderColor: 'var(--line)' }}
            >
              <option>Este ano</option>
              <option>6 meses</option>
              <option>3 meses</option>
            </select>
          </div>
          <GraficoGMV />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-[18px]">
          <MiniCalendario />

          {/* Quick stats */}
          <div className="bg-bg border border-line rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-semibold text-ink">Atividade de Hoje</h3>
              <a
                href="/admin/financeiro"
                className="text-[11px] text-brick-dk hover:underline flex items-center gap-0.5"
              >
                Ver tudo <ArrowUpRight size={11} />
              </a>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Pedidos entregues', valor: metricas.pedidos_hoje, pct: '68%', color: 'var(--brick)' },
                { label: 'Entregadores ativos', valor: metricas.entregadores_aprovados, pct: '42%', color: 'var(--leaf)' },
                { label: 'Lojistas com pedido', valor: metricas.lojistas_ativos, pct: '55%', color: 'var(--mustard)' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-[13px] mb-1.5">
                    <span className="text-ink-3">{item.label}</span>
                    <span className="font-semibold text-ink">{item.valor}</span>
                  </div>
                  <div className="h-1.5 bg-bg-3 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: item.pct, background: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom stats row */}
      <div className="grid grid-cols-3 gap-[18px]">
        <MetricaCard
          label="Pedidos este mês"
          valor={metricas.pedidos_mes.toLocaleString('pt-BR')}
          sub="pedidos entregues"
        />
        <MetricaCard
          label="GMV do mês"
          valor={formatarReais(metricas.gmv_mes)}
          sub="volume bruto de mercadorias"
        />
        <MetricaCard
          label="Receita total do mês"
          valor={formatarReais(metricas.receita_comissao_mes)}
          sub="comissões da plataforma"
          destaque
        />
      </div>

      {/* Alert: repasses pendentes */}
      {metricas.repasses_pendentes > 0 && (
        <div
          className="rounded-lg p-5 flex items-center justify-between"
          style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-warn mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[13px] font-semibold" style={{ color: '#92400e' }}>
                Repasses pendentes de processamento
              </p>
              <p className="text-[13px] mt-0.5" style={{ color: '#b45309' }}>
                Serão processados automaticamente pelo cron de meia-noite.
              </p>
            </div>
          </div>
          <p className="font-display text-[22px] whitespace-nowrap ml-4" style={{ color: '#92400e' }}>
            {formatarReais(metricas.repasses_pendentes)}
          </p>
        </div>
      )}
    </div>
  )
}

function MetricaCard({
  label,
  valor,
  sub,
  destaque,
}: {
  label: string
  valor: string
  sub: string
  destaque?: boolean
}) {
  if (destaque) {
    return (
      <div
        className="rounded-lg p-5"
        style={{ background: 'var(--sidebar)', border: '1px solid var(--sidebar-2)' }}
      >
        <p className="text-[10px] uppercase font-semibold tracking-wider mb-2 text-sidebar-ink-3">{label}</p>
        <p className="font-display text-[34px] leading-none mb-1 text-sidebar-ink">{valor}</p>
        <p className="text-[13px] text-sidebar-ink-3">{sub}</p>
      </div>
    )
  }

  return (
    <div className="bg-bg border border-line rounded-lg p-5 shadow-sm">
      <p className="text-[10px] uppercase font-semibold tracking-wider text-ink-3 mb-2">{label}</p>
      <p className="font-display text-[34px] leading-none text-ink mb-1">{valor}</p>
      <p className="text-[13px] text-ink-3">{sub}</p>
    </div>
  )
}
