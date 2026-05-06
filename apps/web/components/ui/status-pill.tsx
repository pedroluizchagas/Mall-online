export type OrderStatus =
  | 'novo'
  | 'confirmado'
  | 'em_preparo'
  | 'aguardando_entregador'
  | 'saiu_para_entrega'
  | 'entregue'
  | 'cancelado'

const META: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  novo: { label: 'Novo', color: '#1d1d1b', bg: 'var(--brick)' },
  confirmado: { label: 'Confirmado', color: '#2a4d7a', bg: '#d1e1f5' },
  em_preparo: { label: 'Em preparo', color: '#8a6a00', bg: '#fbe8a0' },
  aguardando_entregador: { label: 'Aguardando entregador', color: '#8a6a00', bg: '#fbe8a0' },
  saiu_para_entrega: { label: 'Saiu p/ entrega', color: '#2a4d7a', bg: '#d1e1f5' },
  entregue: { label: 'Entregue', color: '#2a6e1a', bg: '#dff0cc' },
  cancelado: { label: 'Cancelado', color: '#a83820', bg: '#fbd9cf' },
}

export function getStatusMeta(status: OrderStatus) {
  return META[status] ?? { label: status, color: '#888', bg: '#eee' }
}

export function StatusPill({ status }: { status: OrderStatus }) {
  const meta = getStatusMeta(status)
  const isLive = status === 'novo' || status === 'saiu_para_entrega'
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
      style={{ background: meta.bg, color: meta.color }}
    >
      {isLive && (
        <span
          className="pulse-dot inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: meta.color }}
        />
      )}
      {meta.label}
    </span>
  )
}
