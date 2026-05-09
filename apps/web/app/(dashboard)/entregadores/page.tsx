import { Bike } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { EmptyState } from '@/components/dashboard/empty-state'

// TODO(dashboard-redesign Fase 2): implementar conforme
// docs/dashboard-redesign/04-novas-paginas.md §4.1
export default function PaginaEntregadores() {
  return (
    <div className="p-9 slide-up">
      <PageHeader
        titulo="Entregadores"
        subtitulo="Gerencie quem entrega para sua loja."
        badgeCabecalho={{ texto: 'Em breve', cor: 'info' }}
      />
      <EmptyState
        icone={Bike}
        titulo="Esta área está chegando"
        descricao="Em breve você poderá ver entregadores ativos, convidar próprios e acompanhar entregas em tempo real."
        cta={{ label: 'Voltar para o início', href: '/' }}
      />
    </div>
  )
}
