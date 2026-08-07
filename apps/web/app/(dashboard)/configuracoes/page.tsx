import { getDadosLoja } from '@/lib/actions/lojas'
import { getDadosConta } from '@/lib/actions/auth'
import { PageHeader } from '@/components/dashboard/page-header'
import { Abas } from '@/components/dashboard/abas'
import { AbaIdentificacao } from '@/components/dashboard/configuracoes/aba-identificacao'
import { AbaLocalizacao } from '@/components/dashboard/configuracoes/aba-localizacao'
import { AbaHorarios } from '@/components/dashboard/configuracoes/aba-horarios'
import { AbaEntrega } from '@/components/dashboard/configuracoes/aba-entrega'
import { AbaCarga } from '@/components/dashboard/configuracoes/aba-carga'
import { AbaPagamentos } from '@/components/dashboard/configuracoes/aba-pagamentos'
import { AbaRecebimentos } from '@/components/dashboard/configuracoes/aba-recebimentos'

export default async function PaginaConfiguracoes() {
  const [dadosLoja, dadosConta] = await Promise.all([
    getDadosLoja(),
    getDadosConta(),
  ])

  if (!dadosLoja?.loja) {
    return (
      <div className="p-9">
        <p className="text-ink-3">Loja não encontrada.</p>
      </div>
    )
  }

  const { loja, tenant } = dadosLoja

  return (
    <div className="p-9 max-w-3xl">
      <PageHeader
        titulo="Configurações da loja"
        subtitulo="Como sua loja opera: identificação, horários, entrega e pagamentos."
      />
      <Abas
        searchParam="aba"
        defaultId="identificacao"
        defs={[
          {
            id: 'identificacao',
            label: 'Identificação',
            content: (
              <AbaIdentificacao loja={loja} emailComercial={dadosConta.email} />
            ),
          },
          {
            id: 'localizacao',
            label: 'Localização',
            content: <AbaLocalizacao loja={loja} />,
          },
          {
            id: 'horarios',
            label: 'Horários',
            content: <AbaHorarios horarios={loja.horarios} />,
          },
          {
            id: 'entrega',
            label: 'Entrega',
            content: <AbaEntrega loja={loja} />,
          },
          {
            id: 'carga',
            label: 'Carga',
            content: <AbaCarga loja={loja} />,
          },
          {
            id: 'pagamentos',
            label: 'Pagamentos',
            content: <AbaPagamentos loja={loja} />,
          },
          {
            id: 'recebimentos',
            label: 'Recebimentos',
            content: <AbaRecebimentos tenant={tenant} />,
          },
        ]}
      />
    </div>
  )
}
