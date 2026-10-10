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
  id,
  titulo,
  produtos,
  onSelect,
}: {
  /** Âncora da régua de seções (`NavSecoes`). */
  id?: string
  titulo: string
  produtos: ProductCardModel[]
  /**
   * Stage 3b: ligado pelo `CatalogClient` (client) para abrir o
   * `ProductModal`. Ausente em contextos sem interação.
   */
  onSelect?: (id: string) => void
}) {
  return (
    <section id={id} className="mt-section scroll-mt-[calc(var(--inset-top,0px)+64px)] px-screen-x md:mt-12 md:mx-auto md:w-full md:max-w-[1200px] md:px-8">
      <h2 className="mb-1 font-display text-display-sm font-extrabold tracking-tight text-ink md:mb-3 md:text-[28px]">
        {titulo}
      </h2>
      {/* Computador: duas colunas de linhas — a lista do celular, lado a lado. */}
      <div className="md:grid md:grid-cols-2 md:gap-x-10">
        {produtos.map((p) => (
          <ProductCard key={p.id} produto={p} onSelect={onSelect} />
        ))}
      </div>
    </section>
  )
}
