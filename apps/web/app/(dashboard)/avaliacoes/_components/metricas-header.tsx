import { Star, MessageCircle, Calendar, Flag } from 'lucide-react'
import { KPI } from '@/components/ui/kpi'

interface Props {
  mediaMes: number | null
  taxaRespostaMes: number
  totalMes: number
  sinalizadasPendentes: number
}

export function MetricasHeader({ mediaMes, taxaRespostaMes, totalMes, sinalizadasPendentes }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <KPI label="Média do mês" value={mediaMes !== null ? mediaMes.toFixed(1) : '—'} suffix={mediaMes !== null ? '★' : undefined} icon={Star} />
      <KPI label="Taxa de resposta" value={String(Math.round(taxaRespostaMes))} suffix="%" icon={MessageCircle} />
      <KPI label="Total no mês" value={String(totalMes)} icon={Calendar} />
      <KPI label="Sinalizadas pendentes" value={String(sinalizadasPendentes)} icon={Flag} />
    </div>
  )
}
