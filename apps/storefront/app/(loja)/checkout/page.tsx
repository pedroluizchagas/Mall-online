import type { Metadata } from 'next'

import { buscarStore, getStore, getStoreSlug } from '@/lib/tenant'
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
/**
 * Título das rotas de dentro da loja (A-21): sem `generateMetadata` a aba
 * herdava "Mallevo" do layout raiz e o histórico do navegador não dizia de
 * qual loja era o pedido. `robots: noindex` porque nenhuma delas é conteúdo
 * público — o sitemap só publica a home e os produtos.
 */
export async function generateMetadata(): Promise<Metadata> {
  const store = await buscarStore(getStoreSlug())
  return {
    title: store ? `Finalizar pedido · ${store.nome}` : 'Finalizar pedido',
    robots: { index: false, follow: false },
  }
}

export default async function CheckoutPage() {
  const slug = getStoreSlug()
  // Slug ausente/inexistente/inativo → notFound() (Stage 2, via getStore).
  const store = await getStore(slug)

  // Gateway-only: só `aceita_pix` e `aceita_cartao_online` interessam ao
  // storefront. As flags offline (`aceita_dinheiro`/`aceita_cartao_maquininha`)
  // permanecem no schema/admin mas são ignoradas neste canal.
  const loja: LojaCheckout = {
    id: store.id,
    nome: store.nome,
    taxa_entrega: store.taxa_entrega,
    aceita_pix: store.aceita_pix ?? false,
    aceita_cartao_online: store.aceita_cartao_online ?? false,
  }

  return (
    <main className="bg-canvas">
      <CartPersistence />
      <CheckoutClient loja={loja} />
    </main>
  )
}
