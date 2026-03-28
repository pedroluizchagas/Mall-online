import { getDadosLoja } from '@/lib/actions/lojas'
import { getLinkExpressDashboard } from '@/lib/actions/financeiro'
import { ConfiguracoesAbas } from '@/components/dashboard/configuracoes-abas'

export default async function PaginaConfiguracoes() {
  const [dadosLoja, linkExpress] = await Promise.all([
    getDadosLoja(),
    getLinkExpressDashboard(),
  ])

  if (!dadosLoja?.loja) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loja não encontrada.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-[#1A4D3A] mb-6">
        Configurações
      </h1>
      <ConfiguracoesAbas
        loja={dadosLoja.loja}
        tenant={dadosLoja.tenant}
        linkExpress={linkExpress}
      />
    </div>
  )
}
