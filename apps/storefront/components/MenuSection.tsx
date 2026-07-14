import { ProductCard, type ProductCardModel } from '@/components/ProductCard'

/**
 * MenuSection — uma seção do cardápio (← bloco "Cardápio" de
 * apps/mobile-consumer/app/loja/[slug].tsx). Título + lista de ProductCards.
 *
 * NOTA (Stage 3a / D2): o título da seção é o `nome` real da categoria,
 * vindo da view pública `public_catalog_categories` (ou "Outros" para o
 * grupo sem categoria). O caller (page.tsx) agrupa/ordena por
 * `categories.ordem` e passa o título pronto.
 *
 * Spec: docs/storefront/05-stage-3-storefront.md §3a (MenuSection).
 */
export function MenuSection({
  titulo,
  produtos,
  onSelect,
}: {
  titulo: string
  produtos: ProductCardModel[]
  /**
   * Stage 3b: ligado pelo `CatalogClient` (client) para abrir o
   * `ProductModal`. Ausente em contextos sem interação.
   */
  onSelect?: (id: string) => void
}) {
  return (
    <section className="mt-section px-screen-x">
      <h2 className="mb-1 font-display text-display-sm font-extrabold tracking-tight text-ink">
        {titulo}
      </h2>
      {produtos.map((p) => (
        <ProductCard key={p.id} produto={p} onSelect={onSelect} />
      ))}
    </section>
  )
}
