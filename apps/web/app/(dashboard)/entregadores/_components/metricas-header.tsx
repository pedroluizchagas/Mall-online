import { CheckCircle2, PauseCircle, Mail, PackageCheck } from 'lucide-react'
import { KPI } from '@/components/ui/kpi'

interface Props {
  ativos: number
  inativos: number
  convitesPendentes: number
  entregues7d: number | null
}

export function MetricasHeader({ ativos, inativos, convitesPendentes, entregues7d }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <KPI label="Ativos" value={String(ativos)} icon={CheckCircle2} />
      <KPI label="Inativos" value={String(inativos)} icon={PauseCircle} />
      <KPI label="Convites pendentes" value={String(convitesPendentes)} icon={Mail} />
      {entregues7d !== null && (
        <KPI label="Entregues (7 dias)" value={String(entregues7d)} icon={PackageCheck} />
      )}
    </div>
  )
}
