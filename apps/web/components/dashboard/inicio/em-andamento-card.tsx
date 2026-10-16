import Link from 'next/link'
import { money, tempoRelativo } from '@/lib/format'
import { StatusPill, type OrderStatus } from '@/components/ui/status-pill'
import { PartnerIcon } from '@/components/ui/partner-icon'
import type { PedidoVivo } from './cartao-pedido-vivo'
import { codigoDoPedido } from '../pedidos/tipos'

/**
 * Em andamento — os pedidos já confirmados até a entrega, como recibos
 * claros na folha (os novos ficam na marquise, pedindo ação).
 */
export function EmAndamentoCard({ pedidos, total }: { pedidos: PedidoVivo[]; total: number }) {
  if (pedidos.length === 0) {
    return (
      <div className="cartao flex flex-1 flex-col items-start justify-center p-6">
        <span className="flex size-10 items-center justify-center rounded-full bg-bg-2 text-ink">
          <PartnerIcon name="check-double" size={18} strokeWidth={1.9} />
        </span>
        <p className="mt-4 text-[15px] font-semibold text-ink">Nada em preparo ou a caminho</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">
          Os pedidos confirmados aparecem aqui até serem entregues.
        </p>
      </div>
    )
  }

  return (
    <div className="cartao flex flex-1 flex-col p-2">
      <ul className="flex flex-col">
        {pedidos.map((p, i) => {
          const qtd = p.itens.reduce((s, it) => s + it.quantidade, 0)
          return (
            <li key={p.id} className={i > 0 ? 'border-t border-line' : undefined}>
              <Link
                href={`/pedidos/${p.id}`}
                className="group flex items-center gap-3 rounded-[14px] px-3 py-3 transition-colors hover:bg-bg-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[14px] font-semibold text-ink">{p.cliente?.trim() || 'Cliente'}</p>
                    <span className="shrink-0 font-mono text-[11px] text-ink-3">{codigoDoPedido(p.id)}</span>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-ink-3">
                    {qtd} {qtd === 1 ? 'item' : 'itens'} · há {tempoRelativo(p.criado_em)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="text-[13.5px] font-bold text-ink tabular-nums">{money(p.total)}</span>
                  <StatusPill status={p.status as OrderStatus} />
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
      {total > pedidos.length && (
        <Link
          href="/pedidos"
          className="mt-1 flex items-center justify-center gap-1 rounded-[14px] px-3 py-3 text-[13px] font-bold text-ink transition-colors hover:bg-bg-2"
        >
          Mais {total - pedidos.length} em Pedidos
          <PartnerIcon name="chevron-right" size={14} strokeWidth={2.4} />
        </Link>
      )}
    </div>
  )
}
