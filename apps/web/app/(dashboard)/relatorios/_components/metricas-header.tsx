import { PartnerIcon, type PartnerIconName } from '@/components/ui/partner-icon'
import { Card } from '@/components/ui/card'

function formatarBRL(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function calcularDelta(atual: number, anterior: number): number | null {
  if (anterior === 0) return atual === 0 ? 0 : null
  return Math.round(((atual - anterior) / anterior) * 100)
}

function Delta({ valor }: { valor: number | null }) {
  if (valor === null) {
    return <span className="text-[11px] text-ink-3 font-medium">sem base</span>
  }
  const positivo = valor > 0
  const negativo = valor < 0
  const cor = positivo ? 'var(--ok)' : negativo ? 'var(--err)' : 'var(--ink-3)'
  const bg = positivo ? 'var(--ok-lt)' : negativo ? 'var(--err-lt)' : 'var(--bg-2)'
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold"
      style={{ color: cor, background: bg }}
    >
      {positivo && <PartnerIcon name="chevron-up" size={10} strokeWidth={2.5} />}
      {negativo && <PartnerIcon name="chevron-down" size={10} strokeWidth={2.5} />}
      {Math.abs(valor)}%
    </span>
  )
}

function MetricaCard({
  label,
  valor,
  delta,
  icone,
}: {
  label: string
  valor: string
  delta: number | null
  icone: PartnerIconName
}) {
  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="micro pt-1 text-ink-3">{label}</div>
        <div className="flex size-8 items-center justify-center rounded-full bg-bg-2 text-ink">
          <PartnerIcon name={icone} size={16} strokeWidth={1.9} />
        </div>
      </div>
      <div className="text-[28px] font-bold leading-none tracking-[-0.035em] text-ink tabular-nums">{valor}</div>
      <div className="flex items-center gap-1.5 mt-2.5">
        <Delta valor={delta} />
        <span className="text-[11px] text-ink-3">vs período anterior</span>
      </div>
    </Card>
  )
}

export interface ResumoMetricas {
  faturamentoBruto: number
  faturamentoLiquido: number
  pedidosConcluidos: number
  ticketMedio: number
}

interface Props { atual: ResumoMetricas; anterior: ResumoMetricas }

export function MetricasHeader({ atual, anterior }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <MetricaCard
        label="Faturamento bruto"
        valor={formatarBRL(atual.faturamentoBruto)}
        delta={calcularDelta(atual.faturamentoBruto, anterior.faturamentoBruto)}
        icone="cash"
      />
      <MetricaCard
        label="Faturamento líquido"
        valor={formatarBRL(atual.faturamentoLiquido)}
        delta={calcularDelta(atual.faturamentoLiquido, anterior.faturamentoLiquido)}
        icone="trend"
      />
      <MetricaCard
        label="Pedidos concluídos"
        valor={String(atual.pedidosConcluidos)}
        delta={calcularDelta(atual.pedidosConcluidos, anterior.pedidosConcluidos)}
        icone="bag"
      />
      <MetricaCard
        label="Ticket médio"
        valor={formatarBRL(atual.ticketMedio)}
        delta={calcularDelta(atual.ticketMedio, anterior.ticketMedio)}
        icone="orders"
      />
    </div>
  )
}
