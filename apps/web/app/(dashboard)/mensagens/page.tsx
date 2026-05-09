import { Bell } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { EmptyState } from '@/components/dashboard/empty-state'

// TODO(dashboard-redesign Fase 2): implementar conforme
// docs/dashboard-redesign/04-novas-paginas.md §4.3
export default function PaginaMensagens() {
  return (
    <div className="p-9 slide-up">
      <PageHeader
        titulo="Mensagens"
        subtitulo="Converse com seus clientes sem sair do dashboard."
        badgeCabecalho={{ texto: 'Em breve', cor: 'info' }}
      />
      <EmptyState
        icone={Bell}
        titulo="Esta área está chegando"
        descricao="Em breve você poderá responder dúvidas, acompanhar threads por pedido e receber notificações em tempo real."
        cta={{ label: 'Voltar para o início', href: '/' }}
      />
    </div>
  )
}
