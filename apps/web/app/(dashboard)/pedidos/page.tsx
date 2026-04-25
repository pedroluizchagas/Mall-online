import { getPedidos } from '@/lib/actions/pedidos'
import { PainelPedidosRealtime } from '@/components/dashboard/painel-pedidos-realtime'

export default async function PaginaPedidos() {
  const { pedidos } = await getPedidos()

  return (
    <div className="p-9">
      <PainelPedidosRealtime pedidosIniciais={pedidos as any} />
    </div>
  )
}
