import { Bell } from 'lucide-react'
import { EmptyState } from '@/components/dashboard/empty-state'

export function AbaNotificacoes() {
  return (
    <EmptyState
      icone={Bell}
      titulo="Preferências de notificação em breve"
      descricao="Em breve você poderá escolher se quer som de pedido novo, alertas de avaliação baixa, e-mails de resumo diário e mais."
    />
  )
}
