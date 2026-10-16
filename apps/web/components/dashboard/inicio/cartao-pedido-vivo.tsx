import Link from 'next/link'
import { money, tempoRelativo } from '@/lib/format'
import { metaDoStatus } from '@/lib/status-pedido'
import { BarraProgresso, CartaoVidro, PontoAoVivo } from '../marquise'
import { ConfirmarPedido } from './confirmar-pedido'
import { HaQuantoTempo } from './ha-quanto-tempo'

export interface PedidoVivo {
  id: string
  status: string
  total: number
  criado_em: string
  cliente: string | null
  itens: { nome: string; quantidade: number }[]
}

/**
 * Cartão de pedido AO VIVO — porte do CartaoPedidoVivo do app do lojista:
 * vidro sobre a marquise, quem pediu e há quanto tempo espera, o status por
 * extenso, a barra de progresso accent e, quando é novo, o "Confirmar"
 * inline. O cartão inteiro abre o pedido (link esticado por baixo da ação).
 */
export function CartaoPedidoVivo({ pedido }: { pedido: PedidoVivo }) {
  const meta = metaDoStatus(pedido.status)
  const cliente = pedido.cliente?.trim() || 'Cliente'
  const itens = pedido.itens.map((i) => `${i.quantidade}× ${i.nome}`).join(', ')

  return (
    <CartaoVidro aceso={pedido.status === 'novo'} className="group relative transition-colors duration-300 hover:bg-[color:var(--m-glass-2)]">
      <Link
        href={`/pedidos/${pedido.id}`}
        className="absolute inset-0 rounded-[22px]"
        aria-label={`${meta.rotuloLongo}, ${cliente}, ${money(pedido.total)}. Abrir pedido`}
      />
      <div className="pointer-events-none flex items-center gap-2.5">
        <PontoAoVivo tom={meta.pedeAcao ? 'acesa' : 'ok'} />
        <span className="micro min-w-0 flex-1 truncate text-[color:var(--m-ink-3)]">{cliente}</span>
        <span className="text-[12px] font-extrabold text-[color:var(--brick)]">
          <HaQuantoTempo iso={pedido.criado_em} inicial={tempoRelativo(pedido.criado_em)} />
        </span>
      </div>

      <p className="pointer-events-none mt-3 text-[21px] font-semibold leading-tight tracking-[-0.03em] text-white">
        {meta.rotuloLongo}
      </p>
      <p className="pointer-events-none mt-1 text-[13px] font-medium text-[color:var(--m-ink-2)]">{meta.descricao}</p>

      <div className="pointer-events-none mt-4 flex items-center gap-3">
        <BarraProgresso fracao={meta.progresso} className="flex-1" />
        <span className="font-mono text-[11px] text-[color:var(--m-ink-3)]">{Math.round(meta.progresso * 100)}%</span>
      </div>

      <div className="pointer-events-none mt-4 flex items-baseline justify-between gap-4">
        <p className="min-w-0 truncate text-[12.5px] text-[color:var(--m-ink-2)]" title={itens || undefined}>
          {itens || 'Itens do pedido'}
        </p>
        <p className="shrink-0 text-[15px] font-bold tracking-[-0.01em] text-white tabular-nums">{money(pedido.total)}</p>
      </div>

      {pedido.status === 'novo' && (
        <div className="pointer-events-none mt-4 flex items-center gap-2">
          <ConfirmarPedido pedidoId={pedido.id} />
          <span className="pointer-events-none hidden text-[12.5px] font-semibold text-[color:var(--m-ink-2)] transition-colors group-hover:text-white sm:inline">
            ou abra para ver tudo
          </span>
        </div>
      )}
    </CartaoVidro>
  )
}
