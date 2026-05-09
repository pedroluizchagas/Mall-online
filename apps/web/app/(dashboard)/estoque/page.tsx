import { Boxes } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { EmptyState } from '@/components/dashboard/empty-state'

// TODO(dashboard-redesign Fase 2): implementar listagem geral conforme
// docs/dashboard-redesign/02-arquitetura-de-informacao.md §3
export default function PaginaEstoque() {
  return (
    <div className="p-9 slide-up">
      <PageHeader
        titulo="Estoque"
        subtitulo="Visão geral do estoque dos seus produtos."
        badgeCabecalho={{ texto: 'Em breve', cor: 'info' }}
      />
      <EmptyState
        icone={Boxes}
        titulo="Esta área está chegando"
        descricao="Em breve você terá uma visão consolidada do estoque, alertas de produtos críticos e atalhos para movimentações."
        cta={{ label: 'Voltar para o início', href: '/' }}
      />
    </div>
  )
}
