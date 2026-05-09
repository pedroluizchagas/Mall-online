import { getDadosConta } from '@/lib/actions/auth'
import { getDadosAssinatura, getFaturas, getLinkPortalAssinatura } from '@/lib/actions/assinatura'
import { PageHeader } from '@/components/dashboard/page-header'
import { Abas } from '@/components/dashboard/abas'
import { AbaPessoa } from '@/components/dashboard/conta/aba-pessoa'
import { AbaSeguranca } from '@/components/dashboard/conta/aba-seguranca'
import { AbaAssinatura } from '@/components/dashboard/conta/aba-assinatura'
import { AbaFaturas } from '@/components/dashboard/conta/aba-faturas'
import { AbaPrivacidade } from '@/components/dashboard/conta/aba-privacidade'

export default async function PaginaMinhaConta() {
  const [dadosConta, dadosAssinatura, faturas, linkPortal] = await Promise.all([
    getDadosConta(),
    getDadosAssinatura(),
    getFaturas(),
    getLinkPortalAssinatura(),
  ])

  return (
    <div className="p-9 max-w-3xl">
      <PageHeader
        titulo="Minha conta"
        subtitulo="Seus dados pessoais, assinatura e privacidade."
      />
      <Abas
        searchParam="aba"
        defaultId="pessoa"
        defs={[
          {
            id: 'pessoa',
            label: 'Pessoa',
            render: () => <AbaPessoa dados={dadosConta} />,
          },
          {
            id: 'seguranca',
            label: 'Segurança',
            render: () => <AbaSeguranca />,
          },
          {
            id: 'assinatura',
            label: 'Assinatura',
            render: () => (
              <AbaAssinatura assinatura={dadosAssinatura.assinatura} linkPortal={linkPortal} />
            ),
          },
          {
            id: 'faturas',
            label: 'Faturas',
            render: () => <AbaFaturas faturas={faturas} />,
          },
          {
            id: 'privacidade',
            label: 'Privacidade',
            render: () => <AbaPrivacidade />,
          },
        ]}
      />
    </div>
  )
}
