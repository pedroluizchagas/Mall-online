import { CORES_TOM, metaDoStatus, type StatusPedido } from '@/lib/status-pedido'

export type OrderStatus = StatusPedido

/**
 * Meta de exibição de um status (compatibilidade com quem lê `label`,
 * `color` e `bg`). A fonte é `lib/status-pedido.ts`.
 */
export function getStatusMeta(status: OrderStatus) {
  const meta = metaDoStatus(status)
  const cores = CORES_TOM[meta.tom]
  return { label: meta.rotulo, color: cores.texto, bg: cores.fundo, meta }
}

/**
 * Badge de status (soft 18% + texto no tom). Os momentos que pedem atenção
 * agora — pedido novo e em entrega — levam o ponto que respira.
 */
export function StatusPill({ status }: { status: OrderStatus }) {
  const { label, color, bg, meta } = getStatusMeta(status)
  const aoVivo = status === 'novo' || status === 'saiu_para_entrega'
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold leading-none"
      style={{ background: bg, color }}
    >
      {aoVivo && (
        <span aria-hidden className="pulso inline-block size-1.5 rounded-full" style={{ background: color }} />
      )}
      {meta.rotulo}
    </span>
  )
}
