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
    <div className="space-y-5">
      <Bloco titulo="Hoje" kpis={kpisHoje} />
      <Bloco titulo="Este mês" kpis={kpisMes} />
    </div>
  )
}

function Bloco({ titulo, kpis }: { titulo: string; kpis: Kpis | null }) {
  return (
    <div>
      <p className="micro mb-3 text-ink-3">{titulo}</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
  // O líquido é o número que importa: ganha a marquise (zinco + neon) e o
  // valor aceso — o único lugar do bloco onde o lima aparece.
  if (destaque) {
    return (
      <div className="sobre-escuro grao relative isolate overflow-hidden rounded-[20px] bg-marquee p-5 text-white">
        <div aria-hidden className="glow-marquise absolute inset-0 -z-10" />
        <p className="micro text-[color:var(--m-ink-3)]">{label}</p>
        <p className="mt-3 text-[26px] font-bold leading-none tracking-[-0.035em] text-[color:var(--brick)] tabular-nums">
          {valor}
        </p>
      </div>
    )
  }
  return (
    <div className="cartao p-5">
      <p className="micro text-ink-3">{label}</p>
      <p className="mt-3 text-[26px] font-bold leading-none tracking-[-0.035em] text-ink tabular-nums">{valor}</p>
    </div>
  )
}
