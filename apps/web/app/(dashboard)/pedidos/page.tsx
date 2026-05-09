import { getPedidos } from '@/lib/actions/pedidos'
import { PainelPedidosRealtime } from '@/components/dashboard/painel-pedidos-realtime'
import { PageHeader } from '@/components/dashboard/page-header'

export default async function PaginaPedidos() {
  const { pedidos } = await getPedidos()
  const ativos = (pedidos as any[]).filter(
    (p) => p.status !== 'entregue' && p.status !== 'cancelado'
  ).length

  return (
    <div className="p-9">
      <PageHeader
        titulo="Pedidos"
        subtitulo={`${ativos} ativos · acompanhe e gerencie em tempo real.`}
      />
      <PainelPedidosRealtime pedidosIniciais={pedidos as any} />
    </div>
  )
}
