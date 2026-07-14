'use client'

import { formatarReais } from '@/lib/format'

/**
 * ProductCard — reescrita RN→DOM de apps/mobile-consumer/components/ProdutoCard.tsx
 * (variante 'lista' — a única usada pelo catálogo da loja). Imagem 88x88 à
 * direita, info à esquerda, preço com riscado quando há promocional.
 *
 * `'use client'`: o clique chama `onSelect(id)`. Em 3b o `CatalogClient`
 * liga isso à abertura do `ProductModal` (→ `useCartStore().adicionarItem`).
 *
 * Spec: docs/storefront/05-stage-3-storefront.md §3a/§3b (ProductCard ← ProdutoCard).
 */

export interface ProductCardModel {
  id: string
  nome: string
  descricao: string | null
  preco: number
  preco_promocional: number | null
  foto_url: string | null
}

export function ProductCard({
  produto,
  onSelect,
}: {
  produto: ProductCardModel
  /** Seleção do produto. 3b: abre o `ProductModal` (via `CatalogClient`). */
  onSelect?: (id: string) => void
}) {
  const temPromo =
    produto.preco_promocional != null && produto.preco_promocional > 0
  const precoFinal = temPromo ? produto.preco_promocional! : produto.preco

  return (
    <button
      type="button"
      onClick={() => onSelect?.(produto.id)}
      className="flex w-full items-center gap-3 border-b border-line px-1 py-card text-left transition-opacity hover:opacity-75"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold text-ink">{produto.nome}</p>
        {produto.descricao ? (
          <p className="mt-1 line-clamp-2 text-[13px] font-medium text-ink-muted">
            {produto.descricao}
          </p>
        ) : null}
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[15px] font-extrabold text-ink">
            {formatarReais(precoFinal)}
          </span>
          {temPromo ? (
            <span className="text-[13px] text-ink-soft line-through">
              {formatarReais(produto.preco)}
            </span>
          ) : null}
        </div>
      </div>

      <ProductImage url={produto.foto_url} />
    </button>
  )
}

function ProductImage({ url }: { url: string | null }) {
  if (url) {
    return (
      // Sem next/image: as fotos vêm de Supabase Storage (domínios variados
      // por tenant); <img> simples evita config de remotePatterns por loja.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="h-[88px] w-[88px] flex-shrink-0 rounded-md bg-canvasAlt object-cover"
      />
    )
  }

  return (
    <div className="flex h-[88px] w-[88px] flex-shrink-0 items-center justify-center rounded-md bg-canvasAlt">
      <span className="text-2xl text-ink-soft" aria-hidden>
        &#9634;
      </span>
    </div>
  )
}
