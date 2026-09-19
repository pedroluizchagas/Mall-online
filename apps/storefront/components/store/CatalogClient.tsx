'use client'

import { MenuSection } from '@/components/MenuSection'
import type { ProductCardModel } from '@/components/ProductCard'
import type { LojaModal } from '@/components/store/ProductModal'
import { ProdutoModalHost } from '@/components/store/ProdutoModalHost'
import { NavSecoes, idDaSecao } from '@/components/vitrines/_base'
import type { ProdutoCatalogo, ProdutoDetalhe, SecaoCatalogo } from '@/lib/catalog'

/**
 * CatalogClient — o catálogo do layout PADRÃO: régua de seções + lista de
 * `MenuSection`/`ProductCard`, com o detalhe de produto no `ProdutoModalHost`.
 * Vitrines por arquétipo desenham os seus próprios cartões e usam o host
 * diretamente.
 */
export function CatalogClient({
  secoes,
  loja,
  detalhes,
  initialProdutoId,
}: {
  secoes: SecaoCatalogo[]
  loja: LojaModal
  /** modifiers+variants por product_id (Server → ProductModal). */
  detalhes: Record<string, ProdutoDetalhe>
  initialProdutoId?: string
}) {
  return (
    <ProdutoModalHost
      secoes={secoes}
      loja={loja}
      detalhes={detalhes}
      initialProdutoId={initialProdutoId}
    >
      {(abrir) =>
        secoes.length > 0 ? (
          <>
            <NavSecoes secoes={secoes.map((s) => ({ chave: s.chave, titulo: s.titulo }))} />
            <div id="catalogo" className="scroll-mt-16">
              {secoes.map((s) => (
                <MenuSection
                  key={s.chave}
                  id={idDaSecao(s.chave)}
                  titulo={s.titulo}
                  produtos={s.produtos.map(toCardModel)}
                  onSelect={abrir}
                />
              ))}
            </div>
          </>
        ) : (
          <p className="px-6 py-12 text-center text-sm font-medium text-ink-muted">
            Esta loja ainda não tem produtos disponíveis.
          </p>
        )
      }
    </ProdutoModalHost>
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
