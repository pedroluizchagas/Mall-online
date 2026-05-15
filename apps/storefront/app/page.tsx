import type { Metadata } from 'next'

import { getStore, getStoreSlug, type Store } from '@/lib/tenant'
import { createSupabaseServer } from '@/lib/supabase/server'
import { StoreHeader } from '@/components/StoreHeader'
import { MenuSection } from '@/components/MenuSection'
import { CartFab } from '@/components/cart/CartFab'
import type { ProductCardModel } from '@/components/ProductCard'

/**
 * Catálogo da loja (Stage 3a). Server Component, host-based (D1):
 * slug ← middleware (`x-store-slug`) → `getStore()` (view pública
 * `public_catalog_stores`, Stage 2). Produtos ← `public_catalog_products`
 * por `store_id`, agrupados por categoria; nome/ordem das seções ←
 * `public_catalog_categories` por `store_id`.
 *
 * Funciona ANÔNIMO (D2): só lê views `public_catalog_*`, NUNCA as tabelas
 * base `stores`/`products`/`categories`. Slug ausente / loja inexistente ou inativa →
 * `getStore()` dispara `notFound()` (regressão do Stage 2 preservada).
 *
 * Substitui a page placeholder do Stage 2.
 */
export const dynamic = 'force-dynamic'

type CatalogProduct = {
  id: string
  store_id: string
  category_id: string | null
  nome: string
  descricao: string | null
  preco: number
  preco_promocional: number | null
  foto_url: string | null
  ordem: number | null
}

type CatalogCategory = {
  id: string
  store_id: string
  nome: string
  ordem: number | null
}

type Secao = {
  /** Chave estável (category_id ou sentinela) — usada como React key. */
  chave: string
  titulo: string
  produtos: ProductCardModel[]
}

/** Sentinela para produtos sem categoria / categoria inativa (← mobile 'sem-categoria'). */
const SEM_CATEGORIA = '__sem_categoria__'

/**
 * Agrupa por `category_id` usando nome/ordem reais de
 * `public_catalog_categories` (espelha apps/mobile-consumer/app/loja/[slug].tsx
 * ~85-112). Seções ordenadas por `categories.ordem`; dentro da seção,
 * produtos por `products.ordem` (ordem da query preservada). Produtos com
 * `category_id` null ou sem categoria correspondente → seção "Outros" por
 * último (ordem sentinela 999, como o mobile).
 */
function agruparPorCategoria(
  produtos: CatalogProduct[],
  categorias: CatalogCategory[]
): Secao[] {
  const catPorId = new Map(categorias.map((c) => [c.id, c]))

  const grupos = new Map<
    string,
    { chave: string; titulo: string; ordem: number; produtos: ProductCardModel[] }
  >()

  produtos.forEach((p) => {
    const cat = p.category_id ? catPorId.get(p.category_id) : undefined
    const chave = cat ? cat.id : SEM_CATEGORIA
    const titulo = cat ? cat.nome : 'Outros'
    const ordem = cat ? cat.ordem ?? 999 : 999
    let g = grupos.get(chave)
    if (!g) {
      g = { chave, titulo, ordem, produtos: [] }
      grupos.set(chave, g)
    }
    g.produtos.push({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao,
      preco: p.preco,
      preco_promocional: p.preco_promocional,
      foto_url: p.foto_url,
    })
  })

  return [...grupos.values()]
    .sort((a, b) => a.ordem - b.ordem)
    .map((g) => ({ chave: g.chave, titulo: g.titulo, produtos: g.produtos }))
}

async function carregarProdutos(storeId: string): Promise<CatalogProduct[]> {
  const supabase = createSupabaseServer()
  const { data, error } = await supabase
    .from('public_catalog_products')
    .select(
      'id, store_id, category_id, nome, descricao, preco, preco_promocional, foto_url, ordem'
    )
    .eq('store_id', storeId)
    .order('ordem', { ascending: true, nullsFirst: false })

  if (error || !data) return []
  return data as CatalogProduct[]
}

async function carregarCategorias(storeId: string): Promise<CatalogCategory[]> {
  const supabase = createSupabaseServer()
  const { data, error } = await supabase
    .from('public_catalog_categories')
    .select('id, store_id, nome, ordem')
    .eq('store_id', storeId)
    .order('ordem', { ascending: true, nullsFirst: false })

  if (error || !data) return []
  return data as CatalogCategory[]
}

export async function generateMetadata(): Promise<Metadata> {
  const slug = getStoreSlug()
  if (!slug) return { title: 'Mallevo' }

  let store: Store
  try {
    store = await getStore(slug)
  } catch {
    // getStore() dispara notFound() para slug inválido — metadata genérica.
    return { title: 'Mallevo' }
  }

  const title = store.nome
  const description = store.descricao ?? `Peça online em ${store.nome} · Mallevo`
  const ogImage = store.banner_url ?? store.logo_url ?? undefined

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

export default async function HomePage() {
  const slug = getStoreSlug()
  // Slug ausente/inexistente/inativo → notFound() (Stage 2, via getStore).
  const store = await getStore(slug)
  const [produtos, categorias] = await Promise.all([
    carregarProdutos(store.id),
    carregarCategorias(store.id),
  ])
  const secoes = agruparPorCategoria(produtos, categorias)

  return (
    <main className="min-h-screen bg-canvas pb-24">
      <StoreHeader store={store} />

      {secoes.length > 0 ? (
        secoes.map((s) => (
          <MenuSection key={s.chave} titulo={s.titulo} produtos={s.produtos} />
        ))
      ) : (
        <p className="px-6 py-12 text-center text-sm font-medium text-ink-muted">
          Esta loja ainda não tem produtos disponíveis.
        </p>
      )}

      <CartFab />
    </main>
  )
}
