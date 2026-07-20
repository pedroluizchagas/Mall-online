import { supabase } from './supabase'
import { comprimirEUploadImagem } from './upload'

// Camada de dados do catálogo — espelho campo a campo de
// apps/web/lib/actions/produtos.ts, categorias.ts e estoque.ts, sob a
// MESMA RLS do Dashboard. Preços sempre em centavos (int).
// docs/partner-app/06-stage-4-catalogo.md

// ————— Produtos —————

export interface ProdutoLista {
  id: string
  nome: string
  descricao: string | null
  preco: number
  preco_promocional: number | null
  foto_url: string | null
  disponivel: boolean
  track_stock: boolean
  stock_quantity: number | null
  stock_minimo: number | null
  ordem: number
  criado_em: string
  categories: { id: string; nome: string; icone: string | null } | null
  product_modifier_groups: { id: string }[]
  product_variants: { id: string }[]
}

export interface UsoPlano {
  atual: number
  maximo: number
  percentual: number
}

/** Mesmo select/uso do getProdutos do Dashboard. */
export async function listarProdutos(storeId: string): Promise<{
  produtos: ProdutoLista[]
  uso: UsoPlano | null
  erro?: string
}> {
  const { data: produtos, error } = await supabase
    .from('products')
    .select(`
      id, nome, descricao, preco, preco_promocional,
      foto_url, disponivel, track_stock, stock_quantity,
      stock_minimo, ordem, criado_em,
      categories (id, nome, icone),
      product_modifier_groups (id),
      product_variants (id)
    `)
    .eq('store_id', storeId)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })

  if (error) return { erro: error.message, produtos: [], uso: null }

  const { data: subscription } = await supabase
    .from('tenant_subscriptions')
    .select('plans(max_produtos)')
    .single()

  const maxProdutos =
    (subscription?.plans as { max_produtos?: number } | null)?.max_produtos ?? 30
  const atual = produtos?.length ?? 0

  return {
    produtos: (produtos ?? []) as unknown as ProdutoLista[],
    uso: {
      atual,
      maximo: maxProdutos,
      percentual: Math.round((atual / maxProdutos) * 100),
    },
  }
}

export interface CamposProduto {
  nome: string
  descricao: string | null
  preco: number // centavos
  preco_promocional: number | null // centavos
  category_id: string | null
  disponivel: boolean
  track_stock: boolean
  stock_quantity: number | null
  stock_minimo: number | null
}

async function uploadFotoProduto(
  tenantId: string,
  fotoUri: string
): Promise<{ url?: string; erro?: string }> {
  // Mesmo path-pattern do Dashboard: {tenant_id}/{timestamp}.jpg
  return comprimirEUploadImagem(fotoUri, 'product-images', `${tenantId}/${Date.now()}.jpg`)
}

export async function criarProduto(
  storeId: string,
  tenantId: string,
  campos: CamposProduto,
  fotoUri: string | null
): Promise<{ sucesso?: true; erro?: string }> {
  if (campos.nome.trim().length < 2) return { erro: 'Nome obrigatório' }
  if (campos.preco < 1) return { erro: 'Preço deve ser maior que zero' }

  let foto_url: string | null = null
  if (fotoUri) {
    const up = await uploadFotoProduto(tenantId, fotoUri)
    if (up.erro) return { erro: up.erro }
    foto_url = up.url ?? null
  }

  const { error } = await supabase.from('products').insert({
    ...campos,
    descricao: campos.descricao || null,
    stock_minimo: campos.stock_minimo ?? 0,
    ordem: 0,
    store_id: storeId,
    tenant_id: tenantId,
    foto_url,
  })

  if (error) {
    // Trigger de limite do plano — mesma UX do Dashboard
    if (error.message.includes('Limite de produtos')) {
      return { erro: 'Limite de produtos do seu plano atingido. Faça upgrade para continuar.' }
    }
    return { erro: error.message }
  }
  return { sucesso: true }
}

export async function atualizarProduto(
  produtoId: string,
  tenantId: string,
  campos: CamposProduto,
  novaFotoUri: string | null
): Promise<{ sucesso?: true; erro?: string }> {
  if (campos.nome.trim().length < 2) return { erro: 'Nome obrigatório' }
  if (campos.preco < 1) return { erro: 'Preço deve ser maior que zero' }

  let foto_url: string | undefined
  if (novaFotoUri) {
    const up = await uploadFotoProduto(tenantId, novaFotoUri)
    if (up.erro) return { erro: up.erro }
    foto_url = up.url
  }

  const { error } = await supabase
    .from('products')
    .update({
      ...campos,
      descricao: campos.descricao || null,
      ...(foto_url ? { foto_url } : {}),
    })
    .eq('id', produtoId)

  if (error) return { erro: error.message }
  return { sucesso: true }
}

export async function toggleDisponibilidade(
  produtoId: string,
  disponivel: boolean
): Promise<{ sucesso?: true; erro?: string }> {
  const { error } = await supabase
    .from('products')
    .update({ disponivel })
    .eq('id', produtoId)

  if (error) return { erro: error.message }
  return { sucesso: true }
}

export async function excluirProduto(produtoId: string): Promise<{ sucesso?: true; erro?: string }> {
  const { error } = await supabase.from('products').delete().eq('id', produtoId)
  if (error) return { erro: error.message }
  return { sucesso: true }
}

// ————— Variações (exibir + editar preço/disponibilidade; estrutura é web-only) —————

export interface VarianteLista {
  id: string
  sku: string | null
  preco: number
  preco_promocional: number | null
  stock_quantity: number | null
  disponivel: boolean
  rotulo: string // "Tamanho: G · Cor: Azul"
}

interface VarianteRaw {
  id: string
  sku: string | null
  preco: number
  preco_promocional: number | null
  stock_quantity: number | null
  disponivel: boolean
  ordem: number
  product_variant_options: Array<{
    product_options: {
      valor: string | null
      product_option_groups: { nome: string | null } | null
    } | null
  }> | null
}

export async function listarVariantes(produtoId: string): Promise<VarianteLista[]> {
  const { data } = await supabase
    .from('product_variants')
    .select(`
      id, sku, preco, preco_promocional, stock_quantity, disponivel, ordem,
      product_variant_options (
        product_options ( valor, product_option_groups ( nome ) )
      )
    `)
    .eq('product_id', produtoId)
    .order('ordem', { ascending: true })
    .returns<VarianteRaw[]>()

  return (data ?? []).map((v) => {
    const opcoes = v.product_variant_options ?? []
    const rotulo = opcoes
      .map((o) => {
        const grupo = o.product_options?.product_option_groups?.nome
        const valor = o.product_options?.valor
        return grupo && valor ? `${grupo}: ${valor}` : valor ?? ''
      })
      .filter(Boolean)
      .join(' · ')
    return {
      id: v.id,
      sku: v.sku,
      preco: v.preco,
      preco_promocional: v.preco_promocional,
      stock_quantity: v.stock_quantity,
      disponivel: v.disponivel,
      rotulo: rotulo || 'Variação',
    }
  })
}

export async function atualizarVariante(
  varianteId: string,
  campos: { preco?: number; disponivel?: boolean }
): Promise<{ sucesso?: true; erro?: string }> {
  const { error } = await supabase
    .from('product_variants')
    .update(campos)
    .eq('id', varianteId)
  if (error) return { erro: error.message }
  return { sucesso: true }
}

// ————— Categorias —————

export interface Categoria {
  id: string
  nome: string
  descricao: string | null
  icone: string | null
  ordem: number
  ativa: boolean
  tenant_id: string | null // null = categoria global (read-only)
}

/** Globais (tenant_id null) + do tenant, como o getCategorias do web. */
export async function listarCategorias(tenantId: string): Promise<Categoria[]> {
  const { data } = await supabase
    .from('categories')
    .select('id, nome, descricao, icone, ordem, ativa, tenant_id')
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
    .eq('ativa', true)
    .order('ordem', { ascending: true })
  return (data ?? []) as Categoria[]
}

export async function criarCategoria(
  tenantId: string,
  campos: { nome: string; icone?: string | null; ordem?: number }
): Promise<{ sucesso?: true; erro?: string }> {
  if (campos.nome.trim().length < 2) return { erro: 'Nome obrigatório' }
  const { error } = await supabase.from('categories').insert({
    nome: campos.nome.trim(),
    icone: campos.icone || null,
    ordem: campos.ordem ?? 0,
    tenant_id: tenantId,
  })
  if (error) return { erro: error.message }
  return { sucesso: true }
}

export async function atualizarCategoria(
  categoriaId: string,
  campos: { nome?: string; icone?: string | null; ordem?: number }
): Promise<{ sucesso?: true; erro?: string }> {
  const { error } = await supabase.from('categories').update(campos).eq('id', categoriaId)
  if (error) return { erro: error.message }
  return { sucesso: true }
}

/** Desvincula produtos antes de excluir — mesma sequência do web. */
export async function excluirCategoria(
  categoriaId: string,
  tenantId: string
): Promise<{ sucesso?: true; erro?: string }> {
  await supabase
    .from('products')
    .update({ category_id: null })
    .eq('category_id', categoriaId)
    .eq('tenant_id', tenantId)

  const { error } = await supabase.from('categories').delete().eq('id', categoriaId)
  if (error) return { erro: error.message }
  return { sucesso: true }
}

// ————— Estoque —————

/** Feature de estoque vem do plano (plans.tem_estoque), como no web. */
export async function verificarAcessoEstoque(): Promise<boolean> {
  const { data } = await supabase
    .from('tenant_subscriptions')
    .select('plans!inner(tem_estoque)')
    .single()
  return (data?.plans as { tem_estoque?: boolean } | null)?.tem_estoque === true
}

export interface ProdutoEstoque {
  id: string
  nome: string
  foto_url: string | null
  disponivel: boolean
  track_stock: boolean
  stock_quantity: number | null
  stock_minimo: number | null
  categories: { nome: string } | null
}

export async function listarProdutosEstoque(): Promise<{
  produtos: ProdutoEstoque[]
  erro?: string
  upgrade?: boolean
}> {
  const temAcesso = await verificarAcessoEstoque()
  if (!temAcesso) {
    return {
      erro: 'Controle de estoque não disponível no seu plano atual.',
      produtos: [],
      upgrade: true,
    }
  }

  const { data, error } = await supabase
    .from('products')
    .select(`
      id, nome, foto_url, disponivel,
      track_stock, stock_quantity, stock_minimo,
      categories (nome)
    `)
    .order('nome')

  if (error) return { erro: error.message, produtos: [] }
  return { produtos: (data ?? []) as unknown as ProdutoEstoque[] }
}

export async function toggleControleEstoque(
  produtoId: string,
  ativar: boolean,
  quantidadeInicial?: number
): Promise<{ sucesso?: true; erro?: string }> {
  const temAcesso = await verificarAcessoEstoque()
  if (!temAcesso) return { erro: 'Plano não inclui controle de estoque' }

  const atualizacao: Record<string, unknown> = { track_stock: ativar }
  if (ativar) {
    atualizacao.stock_quantity = quantidadeInicial ?? 0
  } else {
    atualizacao.stock_quantity = null
    atualizacao.stock_minimo = null
  }

  const { error } = await supabase.from('products').update(atualizacao).eq('id', produtoId)
  if (error) return { erro: error.message }
  return { sucesso: true }
}

async function registrarMovimento(
  produtoId: string,
  tenantId: string,
  tipo: 'entrada' | 'ajuste_positivo' | 'ajuste_negativo',
  quantidade: number,
  motivo: string
): Promise<{ sucesso?: true; erro?: string; quantidadePosterior?: number }> {
  const { data: { user } } = await supabase.auth.getUser()

  const { data: produto } = await supabase
    .from('products')
    .select('id, stock_quantity, track_stock')
    .eq('id', produtoId)
    .single()

  if (!produto) return { erro: 'Produto não encontrado' }
  if (!produto.track_stock) return { erro: 'Este produto não tem controle de estoque ativo' }

  const anterior = produto.stock_quantity ?? 0
  const delta = tipo === 'ajuste_negativo' ? -quantidade : quantidade
  const posterior = Math.max(0, anterior + delta)

  const { error: movError } = await supabase.from('stock_movements').insert({
    product_id: produtoId,
    tenant_id: tenantId,
    tipo,
    quantidade: delta,
    quantidade_anterior: anterior,
    quantidade_posterior: posterior,
    motivo,
    criado_por: user?.id,
  })
  if (movError) return { erro: movError.message }

  const { error: prodError } = await supabase
    .from('products')
    .update({ stock_quantity: posterior })
    .eq('id', produtoId)
  if (prodError) return { erro: prodError.message }

  return { sucesso: true, quantidadePosterior: posterior }
}

/** Entrada de estoque (compra/reposição) — espelha registrarEntradaEstoque. */
export function registrarEntradaEstoque(produtoId: string, tenantId: string, quantidade: number, motivo?: string) {
  if (quantidade < 1) return Promise.resolve({ erro: 'Quantidade deve ser pelo menos 1' })
  return registrarMovimento(produtoId, tenantId, 'entrada', quantidade, motivo || 'Entrada de estoque')
}

/** Ajuste (correção/perda) — motivo obrigatório, espelha registrarAjusteEstoque. */
export function registrarAjusteEstoque(
  produtoId: string,
  tenantId: string,
  tipo: 'ajuste_positivo' | 'ajuste_negativo',
  quantidade: number,
  motivo: string
) {
  if (quantidade < 1) return Promise.resolve({ erro: 'Quantidade deve ser pelo menos 1' })
  if (motivo.trim().length < 3) return Promise.resolve({ erro: 'Informe o motivo do ajuste' })
  return registrarMovimento(produtoId, tenantId, tipo, quantidade, motivo.trim())
}

export async function atualizarEstoqueMinimo(
  produtoId: string,
  stockMinimo: number
): Promise<{ sucesso?: true; erro?: string }> {
  const { error } = await supabase
    .from('products')
    .update({ stock_minimo: stockMinimo })
    .eq('id', produtoId)
  if (error) return { erro: error.message }
  return { sucesso: true }
}

export interface Movimentacao {
  id: string
  tipo: string
  quantidade: number
  quantidade_anterior: number
  quantidade_posterior: number
  motivo: string | null
  criado_em: string
}

export async function historicoMovimentacoes(produtoId: string): Promise<Movimentacao[]> {
  const { data } = await supabase
    .from('stock_movements')
    .select('id, tipo, quantidade, quantidade_anterior, quantidade_posterior, motivo, criado_em')
    .eq('product_id', produtoId)
    .order('criado_em', { ascending: false })
    .limit(50)
  return (data ?? []) as Movimentacao[]
}
