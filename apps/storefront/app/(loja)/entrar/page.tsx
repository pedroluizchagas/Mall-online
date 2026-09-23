import type { Metadata } from 'next'

import { buscarStore, getStoreSlug } from '@/lib/tenant'
import { EntrarClient } from '@/components/auth/EntrarClient'

/**
 * /entrar — Server Component (Stage 3e). Resolve o destino pós-login a
 * partir de `?next=` (gate do checkout, emitido pelo CheckoutClient no
 * 3d) e delega ao island client `EntrarClient`.
 *
 * Spec/decisão: docs/storefront/05-stage-3-storefront.md §3e.
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
    title: store ? `Entrar · ${store.nome}` : 'Entrar',
    robots: { index: false, follow: false },
  }
}

function destinoSeguro(next?: string): string {
  // Só caminhos internos (evita open redirect): começa com '/' e não é
  // protocol-relative ('//'). Default → home.
  if (next && next.startsWith('/') && !next.startsWith('//')) return next
  return '/'
}

export default function EntrarPage({
  searchParams,
}: {
  searchParams: { next?: string }
}) {
  return (
    <main className="bg-canvas">
      <EntrarClient next={destinoSeguro(searchParams.next)} />
    </main>
  )
}
