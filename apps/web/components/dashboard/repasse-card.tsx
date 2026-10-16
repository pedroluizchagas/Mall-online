import Link from 'next/link'
import { money, partesDoValor } from '@/lib/format'
import { PartnerIcon } from '@/components/ui/partner-icon'

interface Props {
  /** Repasses agendados ou processando (centavos). */
  aReceber: number
  /** Líquido dos pedidos entregues hoje — total − taxa de entrega − comissão (centavos). */
  liquidoHoje: number
  entreguesHoje: number
  /** Recebedor Pagar.me ativo. Sem ele, o cartão vira o passo que falta. */
  recebimentosAtivos: boolean
}

/**
 * Recebimentos no Início: o que está a caminho da conta e o líquido do dia —
 * números de repasse e de pedido entregue, nada estimado.
 */
export function RepasseCard({ aReceber, liquidoHoje, entreguesHoje, recebimentosAtivos }: Props) {
  if (!recebimentosAtivos) {
    return (
      <div className="cartao flex flex-1 flex-col items-start justify-center p-6">
        <span className="flex size-10 items-center justify-center rounded-full bg-bg-2 text-ink">
          <PartnerIcon name="wallet" size={18} strokeWidth={1.9} />
        </span>
        <p className="mt-4 text-[15px] font-semibold text-ink">Recebimentos ainda não ativos</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">
          Conclua a verificação Pagar.me para receber pelos pedidos pagos online.
        </p>
        <Link
          href="/configuracoes?aba=recebimentos"
          className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-bold text-bg transition-opacity hover:opacity-90"
        >
          Configurar recebimentos
          <PartnerIcon name="chevron-right" size={14} strokeWidth={2.4} />
        </Link>
      </div>
    )
  }

  const valor = partesDoValor(aReceber)

  return (
    <div className="cartao flex flex-1 flex-col p-6">
      <p className="micro text-ink-3">A receber</p>
      <p className="mt-3 flex items-baseline gap-1 text-ink">
        <span className="text-[16px] font-semibold text-ink-3">R$</span>
        <span className="text-[38px] font-bold leading-none tracking-[-0.04em] tabular-nums">{valor.inteiro}</span>
        <span className="text-[20px] font-bold tracking-[-0.03em] text-ink-3 tabular-nums">{valor.decimal}</span>
      </p>
      <p className="mt-2 text-[13px] text-ink-3">em repasses agendados ou processando</p>

      <div className="mt-auto border-t border-line pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="micro whitespace-nowrap text-ink-3">Líquido hoje</p>
          <p className="text-[16px] font-bold tracking-[-0.02em] text-ink tabular-nums">{money(liquidoHoje)}</p>
        </div>
        <p className="mt-1.5 text-[12.5px] leading-snug text-ink-3">
          {entreguesHoje} {entreguesHoje === 1 ? 'pedido entregue' : 'pedidos entregues'}, sem a taxa de entrega e a
          comissão.
        </p>
      </div>
    </div>
  )
}
