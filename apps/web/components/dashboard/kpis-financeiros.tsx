import { formatarReais } from '@mallevo/lib'
import { Card } from '@/components/ui/card'

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
    <div className="space-y-5">
      <Bloco titulo="Hoje" kpis={kpisHoje} />
      <Bloco titulo="Este mês" kpis={kpisMes} />
    </div>
  )
}

function Bloco({ titulo, kpis }: { titulo: string; kpis: Kpis | null }) {
  return (
    <div>
      <p
        className="text-[10px] font-semibold uppercase tracking-wider mb-2.5"
        style={{ color: 'var(--ink-3)' }}
      >
        {titulo}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[14px]">
        <CardKpi label="Faturamento bruto" valor={formatarReais(kpis?.faturamento_bruto ?? 0)} />
        <CardKpi
          label="Faturamento líquido"
          valor={formatarReais(kpis?.faturamento_liquido ?? 0)}
          destaque
        />
        <CardKpi label="Pedidos entregues" valor={String(kpis?.total_pedidos ?? 0)} />
        <CardKpi label="Ticket médio" valor={formatarReais(kpis?.ticket_medio ?? 0)} />
      </div>
    </div>
  )
}

function CardKpi({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  if (destaque) {
    return (
      <div
        className="rounded-lg border p-5"
        style={{ background: 'var(--ink)', borderColor: 'var(--ink)', color: 'var(--bg)' }}
      >
        <p className="text-xs mb-1" style={{ opacity: 0.6 }}>
          {label}
        </p>
        <p className="font-display text-[22px] tracking-tight" style={{ color: 'var(--brick)' }}>
          {valor}
        </p>
      </div>
    )
  }
  return (
    <Card>
      <p className="text-xs mb-1 text-ink-3">{label}</p>
      <p className="font-display text-[22px] text-ink tracking-tight">{valor}</p>
    </Card>
  )
}
