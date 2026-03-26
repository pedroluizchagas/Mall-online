import { formatarReais } from '@mallora/lib'

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
