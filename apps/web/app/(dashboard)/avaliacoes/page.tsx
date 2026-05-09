import { Star } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { EmptyState } from '@/components/dashboard/empty-state'

// TODO(dashboard-redesign Fase 2): implementar conforme
// docs/dashboard-redesign/04-novas-paginas.md §4.4
export default function PaginaAvaliacoes() {
  return (
    <div className="p-9 slide-up">
      <PageHeader
        titulo="Avaliações"
        subtitulo="Acompanhe o que seus clientes estão dizendo."
        badgeCabecalho={{ texto: 'Em breve', cor: 'info' }}
      />
      <EmptyState
        icone={Star}
        titulo="Esta área está chegando"
        descricao="Em breve você poderá ler, responder e filtrar avaliações de produtos e da loja."
        cta={{ label: 'Voltar para o início', href: '/' }}
      />
    </div>
  )
}
