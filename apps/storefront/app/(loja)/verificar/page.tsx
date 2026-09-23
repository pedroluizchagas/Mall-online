import type { Metadata } from 'next'

import { buscarStore, getStoreSlug } from '@/lib/tenant'
import { VerificarClient } from '@/components/auth/VerificarClient'

/**
 * /verificar — Server Component (Stage 3e). Lê `email`/`next` do query e
 * delega ao island client `VerificarClient` (`verifyOtp`).
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
    title: store ? `Confirmar código · ${store.nome}` : 'Confirmar código',
    robots: { index: false, follow: false },
  }
}

function destinoSeguro(next?: string): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next
  return '/'
}

export default function VerificarPage({
  searchParams,
}: {
  searchParams: { email?: string; next?: string }
}) {
  return (
    <main className="bg-canvas">
      <VerificarClient
        email={searchParams.email ?? ''}
        next={destinoSeguro(searchParams.next)}
      />
    </main>
  )
}
