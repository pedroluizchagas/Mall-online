import type { Metadata } from 'next'

import { getStore, getStoreSlug } from '@/lib/tenant'
import { carregarCatalogo, carregarDetalhesCatalogo } from '@/lib/catalog'
import { aplicarRascunho, decodificarRascunho } from '@/lib/rascunho'
import { escolherVitrineWeb } from '@/components/vitrines'
import { StoreThemeRoot } from '@/components/store/StoreThemeRoot'

/**
 * /preview — a loja REAL vestindo um rascunho do editor de Minha Loja
 * (dashboard), em iframe. Mesma página que o cliente vê, com tema e conteúdo
 * substituídos só neste request. Não indexável; nada persiste.
 *
 * O layout do grupo `(loja)` já injeta o tema PUBLICADO no `:root`; o
 * `StoreThemeRoot` aqui escreve o do rascunho depois no documento e vence a
 * cascata — sem duplicar wrapper de coluna.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: { draft?: string; produto?: string }
}) {
  const publicada = await getStore(getStoreSlug())
  const store = aplicarRascunho(publicada, decodificarRascunho(searchParams.draft))

  const secoes = await carregarCatalogo(store.id)
  const produtoIds = secoes.flatMap((s) => s.produtos.map((p) => p.id))
  const detalhes = await carregarDetalhesCatalogo(produtoIds)
  const produto = searchParams.produto && produtoIds.includes(searchParams.produto) ? searchParams.produto : undefined

  const Vitrine = escolherVitrineWeb(store)
  return (
    <StoreThemeRoot theme={store.theme}>
      <Vitrine store={store} secoes={secoes} detalhes={detalhes} initialProdutoId={produto} />
    </StoreThemeRoot>
  )
}
