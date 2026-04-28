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
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Assinaturas Ativas',
      valor: metricas.assinaturas_ativas.toLocaleString('pt-BR'),
      variacao: 9,
      positivo: false,
      icon: Users,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'GMV Hoje',
      valor: formatarReais(metricas.gmv_hoje),
      variacao: 7.2,
      positivo: true,
      icon: DollarSign,
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
    },
    {
      label: 'Comissões do Mês',
      valor: formatarReais(metricas.receita_comissao_mes),
      variacao: 2,
      positivo: false,
      icon: ShoppingBag,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
  ]

  const mesAtualLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {saudar()}, Admin!
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Aqui está a visão geral da plataforma Mallora.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-card">
          <div className="w-9 h-9 rounded-full bg-[#1A4D3A] flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-800 leading-tight">Super Admin</p>
            <p className="text-[11px] text-gray-400">Mallora Plataforma</p>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.label}
              className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 hover:shadow-card-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm text-gray-500 font-medium leading-tight">{kpi.label}</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpi.iconBg}`}>
                  <Icon size={17} className={kpi.iconColor} />
                </div>
              </div>

              <p className="text-[1.6rem] font-bold text-gray-900 leading-none mb-3">
                {kpi.valor}
              </p>

              <div
                className={`flex items-center gap-1.5 text-xs font-medium ${
                  kpi.positivo ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                {kpi.positivo ? (
                  <TrendingUp size={13} />
                ) : (
                  <TrendingDown size={13} />
                )}
                <span>
                  {kpi.positivo ? '+' : '-'}{kpi.variacao}% do mês passado
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main content: chart + right column */}
      <div className="grid grid-cols-[1fr_300px] gap-4">
        {/* GMV Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-gray-800">Visão Geral do GMV</h2>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">{mesAtualLabel}</p>
            </div>
            <select className="text-xs border border-gray-200 rounded-xl px-3 py-2 text-gray-600
              focus:outline-none focus:ring-2 focus:ring-[#4CAF82]/30 bg-white cursor-pointer">
              <option>Este ano</option>
              <option>6 meses</option>
              <option>3 meses</option>
            </select>
          </div>
          <GraficoGMV />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <MiniCalendario />

          {/* Quick stats */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">Atividade de Hoje</h3>
              <a href="/admin/financeiro" className="text-[11px] text-[#4CAF82] hover:underline flex items-center gap-0.5">
                Ver tudo <ArrowUpRight size={11} />
              </a>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">Pedidos entregues</span>
                  <span className="font-semibold text-gray-700">{metricas.pedidos_hoje}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#4CAF82] to-[#6DD5A5]"
                    style={{ width: '68%' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">Entregadores ativos</span>
                  <span className="font-semibold text-gray-700">{metricas.entregadores_aprovados}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#1A4D3A] to-[#4CAF82]"
                    style={{ width: '42%' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">Lojistas com pedido</span>
                  <span className="font-semibold text-gray-700">{metricas.lojistas_ativos}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: '55%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom stats row */}
      <div className="grid grid-cols-3 gap-4">
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
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Repasses pendentes de processamento</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Serão processados automaticamente pelo cron de meia-noite.
              </p>
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-700 whitespace-nowrap ml-4">
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
  const bg = destaque ? 'bg-[#1A4D3A]' : 'bg-white'
  const border = destaque ? 'border-[#1A4D3A]' : 'border-gray-100'
  const labelColor = destaque ? 'text-green-300' : 'text-gray-500'
  const valorColor = destaque ? 'text-white' : 'text-gray-900'
  const subColor = destaque ? 'text-green-400' : 'text-gray-400'

  return (
    <div className={`rounded-2xl border shadow-card p-5 ${bg} ${border}`}>
      <p className={`text-xs font-medium mb-2 ${labelColor}`}>{label}</p>
      <p className={`text-2xl font-bold mb-1 ${valorColor}`}>{valor}</p>
      <p className={`text-xs ${subColor}`}>{sub}</p>
    </div>
  )
}
