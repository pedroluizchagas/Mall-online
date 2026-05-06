import { notFound } from 'next/navigation'
import { getPedidoPorId } from '@/lib/actions/pedidos'
import { PedidoCard } from '@/components/dashboard/pedido-card'
import { MapaEntregadorMini } from '@/components/dashboard/mapa-entregador-mini'
import Link from 'next/link'

export default async function PaginaDetalhesPedido({
  params,
}: {
  params: { id: string }
}) {
  const resultado = (await getPedidoPorId(params.id)) as any

  if (resultado.erro || !resultado.pedido) {
    notFound()
  }

  const pedido = resultado.pedido
  const assignment = pedido.delivery_assignments?.[0] as any
  const courierId = assignment?.couriers?.id as string | undefined

  return (
    <div className="p-9 max-w-2xl mx-auto space-y-4">
      <Link
        href="/pedidos"
        className="text-sm font-medium hover:underline"
        style={{ color: 'var(--brick-dk)' }}
      >
        &larr; Voltar para pedidos
      </Link>

      <h1 className="font-display text-[28px] leading-tight text-ink">
        Pedido #{pedido.id.slice(-6).toUpperCase()}
      </h1>

      {pedido.status === 'saiu_para_entrega' && courierId && (
        <MapaEntregadorMini courierId={courierId} />
      )}

      <PedidoCard pedido={pedido} expandidoInicial />

      {pedido.status === 'cancelado' && pedido.motivo_cancelamento && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <p className="text-xs font-medium text-red-500 uppercase mb-1">
            Motivo do cancelamento
          </p>
          <p className="text-sm text-red-700">{pedido.motivo_cancelamento}</p>
          {pedido.cancelado_em && (
            <p className="text-xs text-red-400 mt-1">
              Cancelado em{' '}
              {new Date(pedido.cancelado_em).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
