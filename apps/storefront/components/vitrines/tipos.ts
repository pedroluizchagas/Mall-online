import type { Store } from '@/lib/tenant'
import type { ProdutoDetalhe, SecaoCatalogo } from '@/lib/catalog'

/** Contrato de toda vitrine web (padrão e por arquétipo). */
export interface VitrineWebProps {
  store: Store
  secoes: SecaoCatalogo[]
  /** modifiers+variants por product_id (Server → ProductModal). */
  detalhes: Record<string, ProdutoDetalhe>
  /** Deep-link de `/produto/[id]`: abre o produto já selecionado. */
  initialProdutoId?: string
}
