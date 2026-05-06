import Link from 'next/link'
import { ArrowRight, MapPin } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { StatusPill, type OrderStatus } from '@/components/ui/status-pill'
import { StatusBucket } from './status-bucket'
import { money } from '@/lib/format'

export interface PedidoResumo {
  id: string
  customer: string
  neighborhood: string
  items: number
  total: number
  time: string
  status: OrderStatus
}

interface Props {
  novos: number
  preparo: number
  entrega: number
  pedidos: PedidoResumo[]
}

export function FilaPedidosCard({ novos, preparo, entrega, pedidos }: Props) {
  const ativos = novos + preparo + entrega
  return (
    <Card className="!p-[22px]">
      <div className="flex items-center justify-between mb-[18px]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="m-0 text-[17px] font-bold tracking-tight">Fila de pedidos</h3>
            <span
              className="pulse-dot inline-block w-2 h-2 rounded-full"
              style={{ background: 'var(--brick-dk)' }}
            />
          </div>
          <div className="text-ink-3 text-xs mt-0.5">
            {ativos} ativos · atualizando em tempo real
          </div>
        </div>
        <Link
          href="/pedidos"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-line bg-bg text-xs font-semibold hover:bg-bg-2 transition-colors"
        >
          Ver todos <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-[18px]">
        <StatusBucket label="Novos" count={novos} color="var(--brick-ink)" bg="var(--brick)" live />
        <StatusBucket label="Em preparo" count={preparo} color="#8a6a00" bg="#fbe8a0" />
        <StatusBucket label="Saiu p/ entrega" count={entrega} color="#2a4d7a" bg="#d1e1f5" live />
      </div>

      <div className="flex flex-col gap-2">
        {pedidos.length === 0 && (
          <div className="text-center text-ink-3 text-sm py-8">
            Sem pedidos ativos no momento.
          </div>
        )}
        {pedidos.map((o) => (
          <div
            key={o.id}
            className="flex items-center gap-3 rounded-[14px]"
            style={{ padding: '12px 14px', background: 'var(--bg-2)' }}
          >
            <Avatar name={o.customer} size={34} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[13px]">{o.customer}</span>
                <span className="font-mono text-[11px] text-ink-3">#{o.id.slice(0, 6)}</span>
              </div>
              <div className="text-[11px] text-ink-3 flex items-center gap-1 mt-0.5">
                <MapPin className="w-2.5 h-2.5" /> {o.neighborhood} · {o.items} itens · {o.time}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-sm">{money(o.total)}</div>
              <StatusPill status={o.status} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
