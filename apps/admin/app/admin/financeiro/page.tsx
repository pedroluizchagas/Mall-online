import { getConciliacaoFinanceira } from '@/lib/actions/admin'
import { formatarReais } from '@mallevo/lib'
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
    <div className="p-9 space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-mustard/10 flex items-center justify-center">
            <BarChart3 size={17} className="text-warn" />
          </div>
          <h1 className="font-bold text-[17px] tracking-tight text-ink">Conciliação financeira</h1>
        </div>

        <input
          type="month"
          defaultValue={mes}
          className="border rounded-md px-3 py-2 text-[13px] bg-bg text-ink-2
            focus:outline-none focus:ring-2 focus:ring-brick"
          style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow-sm)' }}
        />
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-2 gap-[18px]">
        <div className="bg-bg border border-line rounded-lg p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={15} className="text-ok" />
            <p className="text-[13px] font-medium text-ink-3">GMV do período</p>
          </div>
          <p className="font-display text-[34px] leading-none text-ink">
            {formatarReais(dados.gmv_total)}
          </p>
          <p className="text-[13px] text-ink-3 mt-1.5">
            {dados.total_pedidos} pedidos entregues
          </p>
        </div>

        <div
          className="rounded-lg p-5"
          style={{ background: 'var(--sidebar)', border: '1px solid var(--sidebar-2)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={15} className="text-brick" />
            <p className="text-[13px] font-medium text-sidebar-ink-2">Receita da plataforma</p>
          </div>
          <p className="font-display text-[34px] leading-none text-sidebar-ink">
            {formatarReais(receita)}
          </p>
          <div className="text-[13px] text-sidebar-ink-3 mt-1.5 space-y-0.5">
            <p>Comissões: {formatarReais(dados.receita_comissao)}</p>
            {dados.receita_antecipacao > 0 && (
              <p>Antecipações: {formatarReais(dados.receita_antecipacao)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Repasses */}
      <div className="bg-bg border border-line rounded-lg p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2 mb-5">
          <ArrowRightLeft size={15} className="text-brick-dk" />
          <h2 className="font-semibold text-ink">Repasses</h2>
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
          <div className="border-t border-line pt-3">
            <RepasseRow
              label="Total repassado"
              valor={formatarReais(
                dados.total_repassado_lojistas + dados.total_repassado_entregadores
              )}
              bold
            />
          </div>

          {dados.payouts_pendentes > 0 && (
            <div
              className="rounded-md p-3 flex items-center justify-between mt-2"
              style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}
            >
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-warn" />
                <span className="text-[13px] font-medium" style={{ color: '#92400e' }}>
                  Pendente de repasse
                </span>
              </div>
              <span className="font-bold text-[13px]" style={{ color: '#92400e' }}>
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
    <div className="flex items-center justify-between text-[13px]">
      <span className={bold ? 'font-semibold text-ink' : 'text-ink-3'}>{label}</span>
      <span className={bold ? 'font-bold text-ink' : 'font-semibold text-ink-2'}>{valor}</span>
    </div>
  )
}
