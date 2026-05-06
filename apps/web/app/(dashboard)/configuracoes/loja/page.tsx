import { getDadosLoja } from '@/lib/actions/lojas'
import { ConfiguracoesAbasLoja } from '@/components/dashboard/configuracoes-abas-loja'

export default async function PaginaConfiguracoesLoja() {
  const dadosLoja = await getDadosLoja()

  if (!dadosLoja?.loja) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loja não encontrada.</p>
      </div>
    )
  }

  return (
    <div className="p-9 max-w-2xl">
      <h1 className="font-display text-[32px] leading-tight text-ink mb-6">
        Configurações da loja
      </h1>
      <ConfiguracoesAbasLoja loja={dadosLoja.loja} />
    </div>
  )
}
