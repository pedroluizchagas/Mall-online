import { Inbox, Clock, CheckCircle2 } from 'lucide-react'
import { KPI } from '@/components/ui/kpi'

interface Props {
  abertos: number
  emAndamento: number
  resolvidos: number
}

export function MetricasHeader({ abertos, emAndamento, resolvidos }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
      <KPI label="Abertos" value={String(abertos)} icon={Inbox} />
      <KPI label="Em andamento" value={String(emAndamento)} icon={Clock} />
      <KPI label="Resolvidos" value={String(resolvidos)} icon={CheckCircle2} />
    </div>
  )
}
