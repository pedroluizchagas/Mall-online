import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { buscarStore, getStore, getStoreSlug } from '@/lib/tenant'
import { carregarCatalogo, carregarDetalhesCatalogo } from '@/lib/catalog'
import { escolherVitrineWeb } from '@/components/vitrines'

/**
 * /produto/[id] — deep-link indexável de produto (sitemap).
 *
 * Renderiza a MESMA vitrine da loja com o produto já aberto
 * (`initialProdutoId`). A PDP própria por vitrine entra na Fase 2b do plano
 * de convergência; até lá o detalhe é o `ProductModal`.
 *
 * Produto inexistente no catálogo público desta loja → `notFound()`.
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  const store = await buscarStore(getStoreSlug())
  if (!store) return { title: 'Mallevo' }

  const secoes = await carregarCatalogo(store.id)
  const produto = secoes.flatMap((s) => s.produtos).find((p) => p.id === params.id)
  if (!produto) return { title: store.nome }

  const title = `${produto.nome} · ${store.nome}`
  const description = produto.descricao ?? `${produto.nome} — peça online em ${store.nome}`
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

export default async function ProdutoPage({ params }: { params: { id: string } }) {
  const store = await getStore(getStoreSlug())
  const secoes = await carregarCatalogo(store.id)

  const existe = secoes.some((s) => s.produtos.some((p) => p.id === params.id))
  if (!existe) notFound()

  const produtoIds = secoes.flatMap((s) => s.produtos.map((p) => p.id))
  const detalhes = await carregarDetalhesCatalogo(produtoIds)

  const Vitrine = escolherVitrineWeb(store)
  return (
    <Vitrine store={store} secoes={secoes} detalhes={detalhes} initialProdutoId={params.id} />
  )
}
