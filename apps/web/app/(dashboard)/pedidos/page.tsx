import { getPedidos } from '@/lib/actions/pedidos'
import { PainelPedidosRealtime } from '@/components/dashboard/painel-pedidos-realtime'
import { PageHeader } from '@/components/dashboard/page-header'
import type { PedidoCompleto } from '@/components/dashboard/pedidos/tipos'

export default async function PaginaPedidos() {
  const { pedidos } = await getPedidos()
  const lista = pedidos as unknown as PedidoCompleto[]
  const ativos = lista.filter((p) => p.status !== 'entregue' && p.status !== 'cancelado').length

  return (
    <div className="p-6 sm:p-9">
      <PageHeader
        sobrelinha="Operar · ao vivo"
        titulo="Pedidos"
        subtitulo={`${ativos} ${ativos === 1 ? 'pedido em andamento' : 'pedidos em andamento'} — confirme, prepare e despache daqui.`}
      />
      <PainelPedidosRealtime pedidosIniciais={lista} />
    </div>
  )
}
