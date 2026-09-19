import { PixClient } from '@/components/checkout/PixClient'

/**
 * /checkout/pix — Server Component (Stage 3d). Lê `order_id` do query e
 * delega ao island client `PixClient` (fetch + Realtime de `orders`,
 * sessão = 3e). Estrutural/inerte pré-3e (sem pedido).
 *
 * Spec/decisão: docs/storefront/05-stage-3-storefront.md §3d.
 */
export default function CheckoutPixPage({
  searchParams,
}: {
  searchParams: { order_id?: string }
}) {
  return (
    <main className="bg-canvas">
      <PixClient orderId={searchParams.order_id ?? null} />
    </main>
  )
}
