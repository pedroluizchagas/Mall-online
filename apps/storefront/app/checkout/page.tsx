import { getStore, getStoreSlug } from '@/lib/tenant'
import { CartPersistence } from '@/components/cart/CartPersistence'
import {
  CheckoutClient,
  type LojaCheckout,
} from '@/components/checkout/CheckoutClient'

/**
 * /checkout — Server Component (Stage 3d). Resolve a loja pela view
 * pública `public_catalog_stores` (D2, via `getStore`/tenant.ts),
 * substituindo o `supabase.from('stores')` da base que o mobile faz, e
 * passa só os campos seguros ao island client `CheckoutClient`.
 *
 * `CartPersistence` é montado aqui também para reidratar o carrinho num
 * load/refresh direto de `/checkout` (sessionStorage, §3c).
 *
 * Spec/decisão: docs/storefront/05-stage-3-storefront.md §3d.
 */
export default async function CheckoutPage() {
  const slug = getStoreSlug()
  // Slug ausente/inexistente/inativo → notFound() (Stage 2, via getStore).
  const store = await getStore(slug)

  const loja: LojaCheckout = {
    id: store.id,
    nome: store.nome,
    taxa_entrega: store.taxa_entrega,
    aceita_dinheiro: store.aceita_dinheiro ?? false,
    aceita_pix: store.aceita_pix ?? false,
    aceita_cartao_maquininha: store.aceita_cartao_maquininha ?? false,
    aceita_cartao_online: store.aceita_cartao_online ?? false,
  }

  return (
    <main className="bg-canvas">
      <CartPersistence />
      <CheckoutClient loja={loja} />
    </main>
  )
}
