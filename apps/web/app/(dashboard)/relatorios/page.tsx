import { BarChart3 } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { EmptyState } from '@/components/dashboard/empty-state'

// TODO(dashboard-redesign Fase 2): implementar conforme
// docs/dashboard-redesign/04-novas-paginas.md §4.2
export default function PaginaRelatorios() {
  return (
    <div className="p-9 slide-up">
      <PageHeader
        titulo="Relatórios"
        subtitulo="Análises agregadas: tendências, recortes e comparações."
        badgeCabecalho={{ texto: 'Em breve', cor: 'info' }}
      />
      <EmptyState
        icone={BarChart3}
        titulo="Esta área está chegando"
        descricao="Em breve você terá relatórios analíticos com recortes por período, produto, bairro e ticket médio."
        cta={{ label: 'Voltar para o início', href: '/' }}
      />
    </div>
  )
}
