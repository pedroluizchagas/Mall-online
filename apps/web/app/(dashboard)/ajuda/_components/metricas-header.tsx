import { KPI } from '@/components/ui/kpi'

interface Props {
  abertos: number
  emAndamento: number
  resolvidos: number
}

export function MetricasHeader({ abertos, emAndamento, resolvidos }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
      <KPI label="Abertos" value={String(abertos)} icon="inbox" />
      <KPI label="Em andamento" value={String(emAndamento)} icon="clock" />
      <KPI label="Resolvidos" value={String(resolvidos)} icon="check-circle" />
    </div>
  )
}
