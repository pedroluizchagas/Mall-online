import { getConciliacaoFinanceira } from '@/lib/actions/admin'
import { formatarReais } from '@mallora/lib'
import { BarChart3, TrendingUp, ArrowRightLeft, Clock } from 'lucide-react'

export default async function PaginaFinanceiroAdmin({
  searchParams,
}: {
  searchParams: { mes?: string }
}) {
  const hoje = new Date()
  const mes =
    searchParams.mes ??
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

  const dados = await getConciliacaoFinanceira(mes)

  const receita = dados.receita_comissao + dados.receita_antecipacao

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
            <BarChart3 size={17} className="text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Conciliação financeira</h1>
        </div>

        <input
          type="month"
          defaultValue={mes}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white
            focus:outline-none focus:ring-2 focus:ring-[#4CAF82]/30 text-gray-600 shadow-card"
        />
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={15} className="text-emerald-500" />
            <p className="text-xs font-medium text-gray-500">GMV do período</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatarReais(dados.gmv_total)}
          </p>
          <p className="text-xs text-gray-400 mt-1.5">
            {dados.total_pedidos} pedidos entregues
          </p>
        </div>

        <div className="bg-[#1A4D3A] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={15} className="text-green-300" />
            <p className="text-xs font-medium text-green-300">Receita da plataforma</p>
          </div>
          <p className="text-3xl font-bold text-white">{formatarReais(receita)}</p>
          <div className="text-xs text-green-400 mt-1.5 space-y-0.5">
            <p>Comissões: {formatarReais(dados.receita_comissao)}</p>
            {dados.receita_antecipacao > 0 && (
              <p>Antecipações: {formatarReais(dados.receita_antecipacao)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Repasses */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
        <div className="flex items-center gap-2 mb-5">
          <ArrowRightLeft size={15} className="text-[#4CAF82]" />
          <h2 className="font-semibold text-gray-800">Repasses</h2>
        </div>

        <div className="space-y-3">
          <RepasseRow
            label="Repassado a lojistas"
            valor={formatarReais(dados.total_repassado_lojistas)}
          />
          <RepasseRow
            label="Repassado a entregadores"
            valor={formatarReais(dados.total_repassado_entregadores)}
          />
          <div className="border-t border-gray-100 pt-3">
            <RepasseRow
              label="Total repassado"
              valor={formatarReais(
                dados.total_repassado_lojistas + dados.total_repassado_entregadores
              )}
              bold
            />
          </div>

          {dados.payouts_pendentes > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-amber-500" />
                <span className="text-sm text-amber-700">Pendente de repasse</span>
              </div>
              <span className="font-bold text-amber-700">
                {formatarReais(dados.payouts_pendentes)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RepasseRow({
  label,
  valor,
  bold,
}: {
  label: string
  valor: string
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={bold ? 'font-semibold text-gray-800' : 'text-gray-500'}>{label}</span>
      <span className={bold ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}>
        {valor}
      </span>
    </div>
  )
}
