import { KPI } from '@/components/ui/kpi'

interface Props {
  totalConversas: number
  naoLidas: number
  mensagensHoje: number
}

export function MetricasHeader({ totalConversas, naoLidas, mensagensHoje }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
      <KPI label="Conversas" value={String(totalConversas)} icon="chat" />
      <KPI label="Não lidas" value={String(naoLidas)} icon="inbox" />
      <KPI label="Mensagens hoje" value={String(mensagensHoje)} icon="calendar" />
    </div>
  )
}
