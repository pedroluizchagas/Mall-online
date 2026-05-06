import { getDadosLoja } from '@/lib/actions/lojas'
import { getDadosConta } from '@/lib/actions/auth'
import { getDadosAssinatura, getFaturas, getLinkPortalAssinatura } from '@/lib/actions/assinatura'
import { ConfiguracoesAbasConta } from '@/components/dashboard/configuracoes-abas-conta'

export default async function PaginaConfiguracoesConta() {
  const [dadosLoja, dadosConta, dadosAssinatura, faturas, linkPortal] = await Promise.all([
    getDadosLoja(),
    getDadosConta(),
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
        assinatura={dadosAssinatura.assinatura}
        faturas={faturas}
        linkPortal={linkPortal}
      />
    </div>
  )
}
