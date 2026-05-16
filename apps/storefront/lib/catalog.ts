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

/* ============================================================
 * Detalhe do produto — modifiers + variants (2ª passada do 3b)
 *
 * RN→DOM dos carregamentos de apps/mobile-consumer/components/
 * ModalProduto.tsx. O mobile lê as tabelas base com select aninhado;
 * aqui, ANÔNIMO (D2), só as novas views públicas do Stage 0
 * (20260516160000): *_modifier_groups / *_modifiers /
 * *_option_groups / *_options / *_variants / *_variant_options.
 *
 * PostgREST não tem relacionamento embutido entre views → as junções
 * (grupo↔itens, variant↔options) são feitas em JS, como no mobile que
 * já reordena `product_modifiers`/`product_options` por `ordem` no
 * cliente. Carregamento em lote por loja (não por modal): N produtos →
 * 6 queries fixas, agrupadas por `product_id`.
 *
 * `stock_quantity`/`sku` NÃO existem nas views públicas (D2 — sem
 * estoque/SKU) → o aviso "Apenas N em estoque" do mobile não é
 * portável (ver RESUMO → Fora de escopo / paridade parcial).
 * ============================================================ */

export type ModifierItemCatalogo = {
  id: string
  nome: string
  preco_extra: number
  disponivel: boolean
  ordem: number
}

export type ModifierGrupoCatalogo = {
  id: string
  nome: string
  min_select: number
  max_select: number
  obrigatorio: boolean
  ordem: number
  modifiers: ModifierItemCatalogo[]
}

export type OptionItemCatalogo = {
  id: string
  valor: string
  hex_color: string | null
  ordem: number
}

export type OptionGrupoCatalogo = {
  id: string
  nome: string
  ordem: number
  options: OptionItemCatalogo[]
}

export type VariantCatalogo = {
  id: string
  preco: number
  preco_promocional: number | null
  foto_url: string | null
  /** option_ids que compõem este variant (de variant_options). */
  option_ids: string[]
}

export type ProdutoDetalhe = {
  modifierGroups: ModifierGrupoCatalogo[]
  optionGroups: OptionGrupoCatalogo[]
  variants: VariantCatalogo[]
}

/**
 * Carrega modifiers+variants de todos os produtos do catálogo em lote,
 * indexados por `product_id` (Server → CatalogClient → ProductModal).
 * Só lê views `public_catalog_*` (D2). Produtos sem dados ficam fora do
 * mapa — o consumidor cai em `DETALHE_VAZIO`.
 */
export async function carregarDetalhesCatalogo(
  produtoIds: string[]
): Promise<Record<string, ProdutoDetalhe>> {
  if (produtoIds.length === 0) return {}

  const supabase = createSupabaseServer()

  const [gruposRes, optionGruposRes, variantsRes] = await Promise.all([
    supabase
      .from('public_catalog_product_modifier_groups')
      .select('id, product_id, nome, min_select, max_select, obrigatorio, ordem')
      .in('product_id', produtoIds)
      .order('ordem', { ascending: true, nullsFirst: false }),
    supabase
      .from('public_catalog_product_option_groups')
      .select('id, product_id, nome, ordem')
      .in('product_id', produtoIds)
      .order('ordem', { ascending: true, nullsFirst: false }),
    supabase
      .from('public_catalog_product_variants')
      .select('id, product_id, preco, preco_promocional, foto_url, ordem')
      .in('product_id', produtoIds)
      .order('ordem', { ascending: true, nullsFirst: false }),
  ])

  type GrupoRow = {
    id: string
    product_id: string
    nome: string
    min_select: number
    max_select: number
    obrigatorio: boolean
    ordem: number | null
  }
  type OptionGrupoRow = {
    id: string
    product_id: string
    nome: string
    ordem: number | null
  }
  type VariantRow = {
    id: string
    product_id: string
    preco: number
    preco_promocional: number | null
    foto_url: string | null
    ordem: number | null
  }

  const grupos = (gruposRes.data ?? []) as GrupoRow[]
  const optionGrupos = (optionGruposRes.data ?? []) as OptionGrupoRow[]
  const variants = (variantsRes.data ?? []) as VariantRow[]

  const grupoIds = grupos.map((g) => g.id)
  const optionGrupoIds = optionGrupos.map((g) => g.id)
  const variantIds = variants.map((v) => v.id)

  const [modifiersRes, optionsRes, variantOptionsRes] = await Promise.all([
    grupoIds.length > 0
      ? supabase
          .from('public_catalog_product_modifiers')
          .select('id, group_id, nome, preco_extra, disponivel, ordem')
          .in('group_id', grupoIds)
          .order('ordem', { ascending: true, nullsFirst: false })
      : Promise.resolve({ data: [] as unknown[] }),
    optionGrupoIds.length > 0
      ? supabase
          .from('public_catalog_product_options')
          .select('id, group_id, valor, hex_color, ordem')
          .in('group_id', optionGrupoIds)
          .order('ordem', { ascending: true, nullsFirst: false })
      : Promise.resolve({ data: [] as unknown[] }),
    variantIds.length > 0
      ? supabase
          .from('public_catalog_product_variant_options')
          .select('variant_id, option_id')
          .in('variant_id', variantIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ])

  type ModifierRow = {
    id: string
    group_id: string
    nome: string
    preco_extra: number
    disponivel: boolean
    ordem: number | null
  }
  type OptionRow = {
    id: string
    group_id: string
    valor: string
    hex_color: string | null
    ordem: number | null
  }
  type VariantOptionRow = { variant_id: string; option_id: string }

  const modifiers = (modifiersRes.data ?? []) as ModifierRow[]
  const options = (optionsRes.data ?? []) as OptionRow[]
  const variantOptions = (variantOptionsRes.data ?? []) as VariantOptionRow[]

  const modifiersPorGrupo = new Map<string, ModifierItemCatalogo[]>()
  for (const m of modifiers) {
    const arr = modifiersPorGrupo.get(m.group_id) ?? []
    arr.push({
      id: m.id,
      nome: m.nome,
      preco_extra: m.preco_extra,
      disponivel: m.disponivel,
      ordem: m.ordem ?? 0,
    })
    modifiersPorGrupo.set(m.group_id, arr)
  }

  const optionsPorGrupo = new Map<string, OptionItemCatalogo[]>()
  for (const o of options) {
    const arr = optionsPorGrupo.get(o.group_id) ?? []
    arr.push({
      id: o.id,
      valor: o.valor,
      hex_color: o.hex_color,
      ordem: o.ordem ?? 0,
    })
    optionsPorGrupo.set(o.group_id, arr)
  }

  const optionIdsPorVariant = new Map<string, string[]>()
  for (const vo of variantOptions) {
    const arr = optionIdsPorVariant.get(vo.variant_id) ?? []
    arr.push(vo.option_id)
    optionIdsPorVariant.set(vo.variant_id, arr)
  }

  const out: Record<string, ProdutoDetalhe> = {}

  function detalhe(productId: string): ProdutoDetalhe {
    let d = out[productId]
    if (!d) {
      d = { modifierGroups: [], optionGroups: [], variants: [] }
      out[productId] = d
    }
    return d
  }

  for (const g of grupos) {
    detalhe(g.product_id).modifierGroups.push({
      id: g.id,
      nome: g.nome,
      min_select: g.min_select,
      max_select: g.max_select,
      obrigatorio: g.obrigatorio,
      ordem: g.ordem ?? 0,
      modifiers: modifiersPorGrupo.get(g.id) ?? [],
    })
  }

  for (const og of optionGrupos) {
    detalhe(og.product_id).optionGroups.push({
      id: og.id,
      nome: og.nome,
      ordem: og.ordem ?? 0,
      options: optionsPorGrupo.get(og.id) ?? [],
    })
  }

  for (const v of variants) {
    detalhe(v.product_id).variants.push({
      id: v.id,
      preco: v.preco,
      preco_promocional: v.preco_promocional,
      foto_url: v.foto_url,
      option_ids: optionIdsPorVariant.get(v.id) ?? [],
    })
  }

  return out
}
