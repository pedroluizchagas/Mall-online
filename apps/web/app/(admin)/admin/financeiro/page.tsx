import { getConciliacaoFinanceira } from '@/lib/actions/admin'
import { formatarReais } from '@mallora/lib'

export default async function PaginaFinanceiroAdmin({
  searchParams,
}: {
  searchParams: { mes?: string }
}) {
  const hoje = new Date()
  const mes = searchParams.mes ??
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

  const dados = await getConciliacaoFinanceira(mes)

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1A4D3A]">
          Conciliação financeira
        </h1>

        {/* Seletor de mês */}
        <input
          type="month"
          defaultValue={mes}
          onChange={(e) => {
            window.location.href = `/admin/financeiro?mes=${e.target.value}`
          }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
        />
      </div>

      {/* Resumo do mês */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">GMV do período</p>
          <p className="text-2xl font-bold text-[#1A4D3A]">
            {formatarReais(dados.gmv_total)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {dados.total_pedidos} pedidos entregues
          </p>
        </div>

        <div className="bg-[#1A4D3A] rounded-xl p-5">
          <p className="text-xs text-green-200 mb-1">Receita da plataforma</p>
          <p className="text-2xl font-bold text-white">
            {formatarReais(dados.receita_comissao + dados.receita_antecipacao)}
          </p>
          <p className="text-xs text-green-300 mt-1">
            Comissões: {formatarReais(dados.receita_comissao)}
            {dados.receita_antecipacao > 0 && (
              <> · Antecipações: {formatarReais(dados.receita_antecipacao)}</>
            )}
          </p>
        </div>
      </div>

      {/* Repasses */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-[#1A4D3A] mb-4">Repasses</h2>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Repassado a lojistas</span>
            <span className="font-semibold text-gray-800">
              {formatarReais(dados.total_repassado_lojistas)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Repassado a entregadores</span>
            <span className="font-semibold text-gray-800">
              {formatarReais(dados.total_repassado_entregadores)}
            </span>
          </div>
          <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
            <span className="text-gray-500">Total repassado</span>
            <span className="font-bold text-gray-800">
              {formatarReais(
                dados.total_repassado_lojistas + dados.total_repassado_entregadores
              )}
            </span>
          </div>
          {dados.payouts_pendentes > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-amber-600">Pendente de repasse</span>
              <span className="font-semibold text-amber-700">
                {formatarReais(dados.payouts_pendentes)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
