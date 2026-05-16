import { createSupabaseServer } from '@/lib/supabase/server'

/**
 * Carregador do catálogo da loja (Server). Compartilhado por `app/page.tsx`
 * (Stage 3a) e `app/produto/[id]/page.tsx` (Stage 3b deep-link).
 *
 * Funciona ANÔNIMO (D2): só lê as views `public_catalog_*`, NUNCA as tabelas
 * base. O agrupamento por categoria espelha
 * apps/mobile-consumer/app/loja/[slug].tsx (ordem real de
 * `public_catalog_categories`; sem categoria → "Outros" por último).
 *
 * `metadata` é incluído (exposto pela view do Stage 0) porque o ProductModal
 * (3b) usa `metadata.exige_receita`.
 */

export type ProdutoCatalogo = {
  id: string
  store_id: string
  category_id: string | null
  nome: string
  descricao: string | null
  preco: number
  preco_promocional: number | null
  foto_url: string | null
  ordem: number | null
  metadata: Record<string, unknown> | null
}

type CategoriaCatalogo = {
  id: string
  store_id: string
  nome: string
  ordem: number | null
}

export type SecaoCatalogo = {
  /** Chave estável (category_id ou sentinela) — usada como React key. */
  chave: string
  titulo: string
  produtos: ProdutoCatalogo[]
}

/** Sentinela para produtos sem categoria / categoria inativa. */
const SEM_CATEGORIA = '__sem_categoria__'

/**
 * Agrupa por `category_id` usando nome/ordem reais de
 * `public_catalog_categories`. Seções por `categories.ordem`; dentro da
 * seção, ordem da query (`products.ordem`). Sem categoria → "Outros"
 * (ordem sentinela 999), por último.
 */
export function agruparPorCategoria(
  produtos: ProdutoCatalogo[],
  categorias: CategoriaCatalogo[]
): SecaoCatalogo[] {
  const catPorId = new Map(categorias.map((c) => [c.id, c]))

  const grupos = new Map<
    string,
    { chave: string; titulo: string; ordem: number; produtos: ProdutoCatalogo[] }
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
    g.produtos.push(p)
  })

  return [...grupos.values()]
    .sort((a, b) => a.ordem - b.ordem)
    .map((g) => ({ chave: g.chave, titulo: g.titulo, produtos: g.produtos }))
}

async function carregarProdutos(storeId: string): Promise<ProdutoCatalogo[]> {
  const supabase = createSupabaseServer()
  const { data, error } = await supabase
    .from('public_catalog_products')
    .select(
      'id, store_id, category_id, nome, descricao, preco, preco_promocional, foto_url, ordem, metadata'
    )
    .eq('store_id', storeId)
    .order('ordem', { ascending: true, nullsFirst: false })

  if (error || !data) return []
  return data as ProdutoCatalogo[]
}

async function carregarCategorias(
  storeId: string
): Promise<CategoriaCatalogo[]> {
  const supabase = createSupabaseServer()
  const { data, error } = await supabase
    .from('public_catalog_categories')
    .select('id, store_id, nome, ordem')
    .eq('store_id', storeId)
    .order('ordem', { ascending: true, nullsFirst: false })

  if (error || !data) return []
  return data as CategoriaCatalogo[]
}

export async function carregarCatalogo(
  storeId: string
): Promise<SecaoCatalogo[]> {
  const [produtos, categorias] = await Promise.all([
    carregarProdutos(storeId),
    carregarCategorias(storeId),
  ])
  return agruparPorCategoria(produtos, categorias)
}
