import { ArrowUp, ArrowDown, DollarSign, TrendingUp, ShoppingBag, Receipt } from 'lucide-react'
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
  const cor = positivo ? '#2a6e1a' : negativo ? '#a83820' : 'var(--ink-3)'
  const bg = positivo ? '#dff0cc' : negativo ? '#fbd9cf' : 'var(--bg-2)'
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold"
      style={{ color: cor, background: bg }}
    >
      {positivo && <ArrowUp className="w-2.5 h-2.5" strokeWidth={2.5} />}
      {negativo && <ArrowDown className="w-2.5 h-2.5" strokeWidth={2.5} />}
      {Math.abs(valor)}%
    </span>
  )
}

function MetricaCard({
  label,
  valor,
  delta,
  icone: Icone,
}: {
  label: string
  valor: string
  delta: number | null
  icone: typeof DollarSign
}) {
  return (
    <Card>
      <div className="flex items-start justify-between mb-2.5">
        <div className="text-[13px] text-ink-2 font-medium">{label}</div>
        <div className="w-7 h-7 rounded-full bg-bg-2 flex items-center justify-center">
          <Icone className="w-3.5 h-3.5 text-ink-2" strokeWidth={1.75} />
        </div>
      </div>
      <div className="font-display text-[28px] leading-none text-ink">{valor}</div>
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
        icone={DollarSign}
      />
      <MetricaCard
        label="Faturamento líquido"
        valor={formatarBRL(atual.faturamentoLiquido)}
        delta={calcularDelta(atual.faturamentoLiquido, anterior.faturamentoLiquido)}
        icone={TrendingUp}
      />
      <MetricaCard
        label="Pedidos concluídos"
        valor={String(atual.pedidosConcluidos)}
        delta={calcularDelta(atual.pedidosConcluidos, anterior.pedidosConcluidos)}
        icone={ShoppingBag}
      />
      <MetricaCard
        label="Ticket médio"
        valor={formatarBRL(atual.ticketMedio)}
        delta={calcularDelta(atual.ticketMedio, anterior.ticketMedio)}
        icone={Receipt}
      />
    </div>
  )
}
