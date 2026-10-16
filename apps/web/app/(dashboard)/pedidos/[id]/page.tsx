import { notFound } from 'next/navigation'
import { getPedidoPorId } from '@/lib/actions/pedidos'
import { MapaEntregadorMini } from '@/components/dashboard/mapa-entregador-mini'
import { PedidoDetalhe } from '@/components/dashboard/pedidos/pedido-detalhe'
import type { PedidoCompleto } from '@/components/dashboard/pedidos/tipos'
import { Voltar } from '@/components/dashboard/voltar'

export default async function PaginaDetalhesPedido({
  params,
}: {
  params: { id: string }
}) {
  const resultado = await getPedidoPorId(params.id)

  if ('erro' in resultado || !resultado.pedido) {
    notFound()
  }

  const pedido = resultado.pedido as unknown as PedidoCompleto
  const courierId = pedido.delivery_assignments?.[0]?.couriers?.id

  return (
    <div className="mx-auto max-w-2xl p-6 sm:p-9">
      <Voltar href="/pedidos">Pedidos</Voltar>

      {pedido.status === 'saiu_para_entrega' && courierId && (
        <div className="mb-4">
          <MapaEntregadorMini courierId={courierId} />
        </div>
      )}

      <PedidoDetalhe pedido={pedido} />
    </div>
  )
}
