import { HelpCircle } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { EmptyState } from '@/components/dashboard/empty-state'

// TODO(dashboard-redesign Fase 2): implementar conforme
// docs/dashboard-redesign/04-novas-paginas.md §4.5
export default function PaginaAjuda() {
  return (
    <div className="p-9 slide-up">
      <PageHeader
        titulo="Central de ajuda"
        subtitulo="Tutoriais, FAQ e contato com o suporte."
        badgeCabecalho={{ texto: 'Em breve', cor: 'info' }}
      />
      <EmptyState
        icone={HelpCircle}
        titulo="Esta área está chegando"
        descricao="Em breve você terá tutoriais guiados, perguntas frequentes e um canal direto com o suporte da Mallevo."
        cta={{ label: 'Voltar para o início', href: '/' }}
      />
    </div>
  )
}
