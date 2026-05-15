import { ProductCard, type ProductCardModel } from '@/components/ProductCard'

/**
 * MenuSection — uma seção do cardápio (← bloco "Cardápio" de
 * apps/mobile-consumer/app/loja/[slug].tsx). Título + lista de ProductCards.
 *
 * NOTA (Stage 0 / D2): a view pública `public_catalog_products` expõe
 * `category_id` mas NÃO o nome da categoria — não existe
 * `public_catalog_categories`. Por isso o título da seção é fornecido pelo
 * caller a partir do que é seguro/derivável (ver page.tsx + RESUMO:
 * decisão PENDENTE sobre rótulo de categoria).
 *
 * Spec: docs/storefront/05-stage-3-storefront.md §3a (MenuSection).
 */
export function MenuSection({
  titulo,
  produtos,
}: {
  titulo: string
  produtos: ProductCardModel[]
}) {
  return (
    <section className="mt-4 px-6">
      <h2 className="mb-1 text-lg font-extrabold tracking-tight text-ink">
        {titulo}
      </h2>
      {produtos.map((p) => (
        <ProductCard key={p.id} produto={p} />
      ))}
    </section>
  )
}
