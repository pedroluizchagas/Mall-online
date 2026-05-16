import type { Metadata } from 'next'

import { getStore, getStoreSlug, type Store } from '@/lib/tenant'
import { carregarCatalogo, carregarDetalhesCatalogo } from '@/lib/catalog'
import { StoreHeader } from '@/components/StoreHeader'
import { CartFab } from '@/components/cart/CartFab'
import { CatalogClient } from '@/components/store/CatalogClient'

/**
 * Catálogo da loja (Stage 3a). Server Component, host-based (D1):
 * slug ← middleware (`x-store-slug`) → `getStore()` (view pública
 * `public_catalog_stores`, Stage 2). Produtos ← `public_catalog_products`
 * por `store_id`, agrupados por categoria; nome/ordem das seções ←
 * `public_catalog_categories` por `store_id`.
 *
 * Funciona ANÔNIMO (D2): só lê views `public_catalog_*`, NUNCA as tabelas
 * base `stores`/`products`/`categories`. Slug ausente / loja inexistente ou inativa →
 * `getStore()` dispara `notFound()` (regressão do Stage 2 preservada).
 *
 * Substitui a page placeholder do Stage 2.
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const slug = getStoreSlug()
  if (!slug) return { title: 'Mallevo' }

  let store: Store
  try {
    store = await getStore(slug)
  } catch {
    // getStore() dispara notFound() para slug inválido — metadata genérica.
    return { title: 'Mallevo' }
  }

  const title = store.nome
  const description = store.descricao ?? `Peça online em ${store.nome} · Mallevo`
  const ogImage = store.banner_url ?? store.logo_url ?? undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
    },
  }
}

export default async function HomePage() {
  const slug = getStoreSlug()
  // Slug ausente/inexistente/inativo → notFound() (Stage 2, via getStore).
  const store = await getStore(slug)
  const secoes = await carregarCatalogo(store.id)
  const produtoIds = secoes.flatMap((s) => s.produtos.map((p) => p.id))
  const detalhes = await carregarDetalhesCatalogo(produtoIds)

  return (
    <main className="min-h-screen bg-canvas pb-24">
      <StoreHeader store={store} />

      <CatalogClient
        secoes={secoes}
        loja={{
          id: store.id,
          nome: store.nome,
          taxa_entrega: store.taxa_entrega ?? 0,
        }}
        detalhes={detalhes}
      />

      <CartFab />
    </main>
  )
}
