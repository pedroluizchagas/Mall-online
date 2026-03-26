import { getPedidos } from '@/lib/actions/pedidos'
import { PainelPedidosRealtime } from '@/components/dashboard/painel-pedidos-realtime'

export default async function PaginaPedidos() {
  const { pedidos } = await getPedidos()

  return (
    <div className="p-6 h-full flex flex-col">
      <h1 className="text-2xl font-bold text-[#1A4D3A] mb-6">Pedidos</h1>
      <PainelPedidosRealtime pedidosIniciais={pedidos} />
    </div>
  )
}
