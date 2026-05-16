'use client'

import { useEffect, useState } from 'react'

import { MenuSection } from '@/components/MenuSection'
import type { ProductCardModel } from '@/components/ProductCard'
import { ProductModal, type LojaModal } from '@/components/store/ProductModal'
import { TrocaLojaDialog } from '@/components/cart/TrocaLojaDialog'
import type { SecaoCatalogo, ProdutoCatalogo } from '@/lib/catalog'

/**
 * CatalogClient — ilha client do catálogo (Stage 3b). Recebe as seções já
 * agrupadas/ordenadas no Server (page.tsx, D2/3a) e liga
 * `ProductCard.onSelect` ao `ProductModal`. Hospeda também o
 * `TrocaLojaDialog` (single-store) no nível do catálogo, para que sobreviva
 * ao fechamento do modal.
 *
 * `initialProdutoId`: deep-link de `/produto/[id]` (3b) — abre o modal já
 * com o produto correspondente.
 *
 * Spec: docs/storefront/05-stage-3-storefront.md §3b (wiring ProductCard →
 * ProductModal; estado client na página de catálogo).
 */
export function CatalogClient({
  secoes,
  loja,
  initialProdutoId,
}: {
  secoes: SecaoCatalogo[]
  loja: LojaModal
  initialProdutoId?: string
}) {
  const [selecionadoId, setSelecionadoId] = useState<string | null>(
    initialProdutoId ?? null
  )

  useEffect(() => {
    if (initialProdutoId) setSelecionadoId(initialProdutoId)
  }, [initialProdutoId])

  const produtoSelecionado: ProdutoCatalogo | null = selecionadoId
    ? secoes
        .flatMap((s) => s.produtos)
        .find((p) => p.id === selecionadoId) ?? null
    : null

  return (
    <>
      {secoes.length > 0 ? (
        secoes.map((s) => (
          <MenuSection
            key={s.chave}
            titulo={s.titulo}
            produtos={s.produtos.map(toCardModel)}
            onSelect={setSelecionadoId}
          />
        ))
      ) : (
        <p className="px-6 py-12 text-center text-sm font-medium text-ink-muted">
          Esta loja ainda não tem produtos disponíveis.
        </p>
      )}

      {produtoSelecionado ? (
        <ProductModal
          produto={{
            id: produtoSelecionado.id,
            nome: produtoSelecionado.nome,
            descricao: produtoSelecionado.descricao,
            preco: produtoSelecionado.preco,
            preco_promocional: produtoSelecionado.preco_promocional,
            foto_url: produtoSelecionado.foto_url,
            metadata: produtoSelecionado.metadata,
          }}
          loja={loja}
          onFechar={() => setSelecionadoId(null)}
        />
      ) : null}

      <TrocaLojaDialog />
    </>
  )
}

function toCardModel(p: ProdutoCatalogo): ProductCardModel {
  return {
    id: p.id,
    nome: p.nome,
    descricao: p.descricao,
    preco: p.preco,
    preco_promocional: p.preco_promocional,
    foto_url: p.foto_url,
  }
}
