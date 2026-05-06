import { getDadosLoja } from '@/lib/actions/lojas'
import { getDadosConta } from '@/lib/actions/auth'
import { getLinkExpressDashboard } from '@/lib/actions/financeiro'
import { getDadosAssinatura, getFaturas, getLinkPortalAssinatura } from '@/lib/actions/assinatura'
import { ConfiguracoesAbasConta } from '@/components/dashboard/configuracoes-abas-conta'

export default async function PaginaConfiguracoesConta() {
  const [dadosLoja, dadosConta, linkExpress, dadosAssinatura, faturas, linkPortal] = await Promise.all([
    getDadosLoja(),
    getDadosConta(),
    getLinkExpressDashboard(),
    getDadosAssinatura(),
    getFaturas(),
    getLinkPortalAssinatura(),
  ])

  return (
    <div className="p-9 max-w-2xl">
      <h1 className="font-display text-[32px] leading-tight text-ink mb-6">
        Minha conta
      </h1>
      <ConfiguracoesAbasConta
        dadosConta={dadosConta}
        tenant={dadosLoja?.tenant}
        linkExpress={linkExpress}
        assinatura={dadosAssinatura.assinatura}
        faturas={faturas}
        linkPortal={linkPortal}
      />
    </div>
  )
}
