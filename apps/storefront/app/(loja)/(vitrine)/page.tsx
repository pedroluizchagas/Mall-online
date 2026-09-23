import type { Metadata } from 'next'

import { buscarStore, getStore, getStoreSlug } from '@/lib/tenant'
import { carregarCatalogo, carregarDetalhesCatalogo } from '@/lib/catalog'
import { escolherVitrineWeb } from '@/components/vitrines'

/**
 * Página da loja. Server Component, host-based (D1): slug ← middleware
 * (`x-store-slug`) → `getStore()` (view pública `public_catalog_stores`).
 * Produtos ← `public_catalog_products` por `store_id`, agrupados por
 * categoria; nome/ordem das seções ← `public_catalog_categories`.
 *
 * A pele vem do layout do grupo `(loja)`; o LAYOUT vem de
 * `escolherVitrineWeb` — a vitrine do arquétipo para esta categoria ou o
 * padrão premium (mesma decisão do consumer, via `VITRINES` de @mallevo/lib).
 *
 * Funciona ANÔNIMO (D2): só lê views `public_catalog_*`. Slug ausente / loja
 * inexistente ou inativa → `getStore()` dispara `notFound()`.
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const store = await buscarStore(getStoreSlug())
  if (!store) return { title: 'Mallevo' }

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
  const store = await getStore(getStoreSlug())
  const secoes = await carregarCatalogo(store.id)
  const produtoIds = secoes.flatMap((s) => s.produtos.map((p) => p.id))
  const detalhes = await carregarDetalhesCatalogo(produtoIds)

  const Vitrine = escolherVitrineWeb(store)
  return <Vitrine store={store} secoes={secoes} detalhes={detalhes} />
}
