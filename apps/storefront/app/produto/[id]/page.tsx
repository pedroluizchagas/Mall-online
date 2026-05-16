import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getStore, getStoreSlug, type Store } from '@/lib/tenant'
import { carregarCatalogo, carregarDetalhesCatalogo } from '@/lib/catalog'
import { StoreHeader } from '@/components/StoreHeader'
import { CartFab } from '@/components/cart/CartFab'
import { CartPersistence } from '@/components/cart/CartPersistence'
import { CatalogClient } from '@/components/store/CatalogClient'

/**
 * /produto/[id] (Stage 3b) — rota mínima de deep-link, mapeada no
 * sitemap do 3a (`app/sitemap.ts`: "a rota passa a existir em 3b").
 *
 * DECISÃO (registrada no RESUMO): NÃO é uma PDP server-rendered própria.
 * Em D1 cada host já é uma loja; o detalhe de produto é o `ProductModal`
 * (3b). Esta rota renderiza o MESMO catálogo (host-based, views públicas,
 * D2) e abre o modal do produto via `initialProdutoId`. Mantém a URL
 * indexável (SEO do sitemap) sem duplicar a PDP nem tocar checkout (3d).
 *
 * Produto inexistente no catálogo público desta loja → `notFound()`
 * (mesma semântica do Stage 2: slug/loja inválida → 404).
 *
 * Spec: docs/storefront/05-stage-3-storefront.md §3b.
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  const slug = getStoreSlug()
  if (!slug) return { title: 'Mallevo' }

  let store: Store
  try {
    store = await getStore(slug)
  } catch {
    return { title: 'Mallevo' }
  }

  const secoes = await carregarCatalogo(store.id)
  const produto = secoes
    .flatMap((s) => s.produtos)
    .find((p) => p.id === params.id)

  if (!produto) return { title: store.nome }

  const title = `${produto.nome} · ${store.nome}`
  const description =
    produto.descricao ?? `${produto.nome} — peça online em ${store.nome}`
  const ogImage = produto.foto_url ?? store.banner_url ?? store.logo_url ?? undefined

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

export default async function ProdutoPage({
  params,
}: {
  params: { id: string }
}) {
  const slug = getStoreSlug()
  // Slug ausente/inexistente/inativo → notFound() (Stage 2, via getStore).
  const store = await getStore(slug)
  const secoes = await carregarCatalogo(store.id)

  const existe = secoes.some((s) => s.produtos.some((p) => p.id === params.id))
  if (!existe) notFound()

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
        initialProdutoId={params.id}
      />

      <CartPersistence />
      <CartFab />
    </main>
  )
}
