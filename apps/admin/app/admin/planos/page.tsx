import { getPlanos } from '@/lib/actions/admin'
import { FormularioPlano } from '@/components/admin/formulario-plano'
import { formatarReais } from '@mallora/lib'

export default async function PaginaPlanos() {
  const planos = await getPlanos()

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-[#1A4D3A]">Planos</h1>

      <div className="space-y-3">
        {planos.map((plano: any) => (
          <div
            key={plano.id}
            className={`bg-white rounded-xl border p-4 ${
              plano.ativo ? 'border-gray-100' : 'border-gray-100 opacity-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-semibold text-gray-800">{plano.nome}</p>
                {plano.descricao && (
                  <p className="text-xs text-gray-400 mt-0.5">{plano.descricao}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-[#1A4D3A]">
                  {formatarReais(plano.preco_mensal)}/mês
                </p>
                {!plano.ativo && <span className="text-xs text-gray-400">Inativo</span>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              <span>{plano.max_lojas} loja(s)</span>
              <span>·</span>
              <span>{plano.max_produtos} produto(s)</span>
              <span>·</span>
              <span>{plano.max_entregadores} entregador(es)</span>
              {plano.tem_estoque && <><span>·</span><span>Estoque</span></>}
              {plano.tem_antecipacao && <><span>·</span><span>Antecipação</span></>}
            </div>

            {plano.stripe_price_id && (
              <p className="text-xs text-gray-300 font-mono mt-2">{plano.stripe_price_id}</p>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-[#1A4D3A] mb-4">Novo plano</h2>
        <FormularioPlano />
      </div>
    </div>
  )
}
