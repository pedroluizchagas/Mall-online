'use client'

import { useEffect, useState, type ReactNode } from 'react'

import { ProductModal, type LojaModal } from '@/components/store/ProductModal'
import { TrocaLojaDialog } from '@/components/cart/TrocaLojaDialog'
import type { ProdutoCatalogo, ProdutoDetalhe, SecaoCatalogo } from '@/lib/catalog'

/**
 * Host do detalhe de produto para QUALQUER layout de loja (padrão ou vitrine):
 * dono do estado "produto aberto", renderiza o `ProductModal` (variações,
 * modificadores, sacola) e o `TrocaLojaDialog` no nível do catálogo, para
 * sobreviverem ao fechamento do modal.
 *
 * O layout recebe `abrir(id)` por render-prop e desenha os cartões como
 * quiser. `initialProdutoId` é o deep-link de `/produto/[id]`.
 *
 * Fase 2b: as PDPs próprias por vitrine (ProdutoForno, ProdutoSmash…) entram
 * aqui como alternativa ao ProductModal quando o produto não tem variações.
 */
export function ProdutoModalHost({
  secoes,
  loja,
  detalhes,
  initialProdutoId,
  children,
}: {
  secoes: SecaoCatalogo[]
  loja: LojaModal
  detalhes: Record<string, ProdutoDetalhe>
  initialProdutoId?: string
  children: (abrir: (id: string) => void) => ReactNode
}) {
  const [selecionadoId, setSelecionadoId] = useState<string | null>(initialProdutoId ?? null)

  useEffect(() => {
    if (initialProdutoId) setSelecionadoId(initialProdutoId)
  }, [initialProdutoId])

  const produto: ProdutoCatalogo | null = selecionadoId
    ? secoes.flatMap((s) => s.produtos).find((p) => p.id === selecionadoId) ?? null
    : null

  return (
    <>
      {children(setSelecionadoId)}

      {produto ? (
        <ProductModal
          produto={{
            id: produto.id,
            nome: produto.nome,
            descricao: produto.descricao,
            preco: produto.preco,
            preco_promocional: produto.preco_promocional,
            foto_url: produto.foto_url,
            metadata: produto.metadata,
          }}
          loja={loja}
          detalhe={detalhes[produto.id]}
          onFechar={() => setSelecionadoId(null)}
        />
      ) : null}

      <TrocaLojaDialog />
    </>
  )
}
