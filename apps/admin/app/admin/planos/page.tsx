import { getPlanos } from '@/lib/actions/admin'
import { FormularioPlano } from '@/components/admin/formulario-plano'
import { formatarReais } from '@mallora/lib'
import { CreditCard, CheckCircle2, XCircle, Plus } from 'lucide-react'

export default async function PaginaPlanos() {
  const planos = await getPlanos()

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
          <CreditCard size={17} className="text-violet-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Planos</h1>
      </div>

      {/* Planos list */}
      <div className="space-y-3">
        {planos.map((plano: any) => (
          <div
            key={plano.id}
            className={`bg-white rounded-2xl border shadow-card p-5 transition-opacity ${
              plano.ativo ? 'border-gray-100' : 'border-gray-100 opacity-50'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                {plano.ativo ? (
                  <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                ) : (
                  <XCircle size={16} className="text-gray-300 flex-shrink-0" />
                )}
                <div>
                  <p className="font-semibold text-gray-800">{plano.nome}</p>
                  {plano.descricao && (
                    <p className="text-xs text-gray-400 mt-0.5">{plano.descricao}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-[#1A4D3A]">
                  {formatarReais(plano.preco_mensal)}
                  <span className="text-sm font-normal text-gray-400">/mês</span>
                </p>
                {!plano.ativo && (
                  <span className="text-xs text-gray-400">Inativo</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                `${plano.max_lojas} loja(s)`,
                `${plano.max_produtos} produto(s)`,
                `${plano.max_entregadores} entregador(es)`,
                ...(plano.tem_estoque ? ['Estoque'] : []),
                ...(plano.tem_antecipacao ? ['Antecipação'] : []),
              ].map((item) => (
                <span
                  key={item}
                  className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg"
                >
                  {item}
                </span>
              ))}
            </div>

            {plano.stripe_price_id && (
              <p className="text-[10px] text-gray-300 font-mono mt-3 truncate">
                {plano.stripe_price_id}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Novo plano */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Plus size={16} className="text-[#4CAF82]" />
          <h2 className="font-semibold text-gray-800">Novo plano</h2>
        </div>
        <FormularioPlano />
      </div>
    </div>
  )
}
