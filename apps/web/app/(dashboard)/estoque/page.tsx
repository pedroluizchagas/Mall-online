import { Boxes } from 'lucide-react'
import { getProdutosEstoque } from '@/lib/actions/estoque'
import { PageHeader } from '@/components/dashboard/page-header'
import { PainelEstoque } from '@/components/dashboard/painel-estoque'
import { TelaUpgradeEstoque } from '@/components/dashboard/tela-upgrade-estoque'
import { EmptyState } from '@/components/dashboard/empty-state'

export default async function PaginaEstoque() {
  const { produtos, upgrade, erro } = (await getProdutosEstoque()) as {
    produtos: any[]
    upgrade?: boolean
    erro?: string
  }

  return (
    <div className="p-9 max-w-3xl slide-up">
      <PageHeader
        titulo="Estoque"
        subtitulo="Acompanhe o estoque dos seus produtos, registre entradas e ajustes."
      />

      {upgrade ? (
        <TelaUpgradeEstoque mensagem={erro} />
      ) : produtos.length === 0 ? (
        <EmptyState
          icone={Boxes}
          titulo="Nenhum produto ainda"
          descricao="Cadastre produtos e ative o controle de estoque na edição de cada um para acompanhá-los aqui."
          cta={{ label: 'Cadastrar produto', href: '/produtos/novo' }}
        />
      ) : (
        <PainelEstoque produtos={produtos} />
      )}
    </div>
  )
}
