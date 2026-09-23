'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  SELECT_POST,
  dadosPostSchema,
  mensagemErroPost,
  novoPostSchemaPara,
  orfaosDoPrefixo,
  tenantPodePublicar,
  type Post,
} from '@mallevo/lib'
import { createSupabaseServer } from '@/lib/supabase/server'

/**
 * Conteúdo do Explorar no dashboard (plano de convergência, Fase 1c): o
 * lojista lista, edita, oculta, remove e publica posts sem o celular.
 *
 * Tudo sob RLS (`store_posts_*_proprio`, bucket `explore-media` por prefixo
 * do tenant) — as actions só acrescentam validação (zod da lib) e a
 * revalidação das rotas. Métricas são SOMENTE LEITURA: quem incrementa é o
 * consumer. Guarda-corpo multi-loja: toda escrita recebe `store_id`
 * explícito e o confere contra o tenant.
 */

const BUCKET = 'explore-media'
const ROTA = '/conteudo'

type ResultadoAcao = { sucesso: true } | { erro: string }
type Supabase = ReturnType<typeof createSupabaseServer>

export interface ContextoConteudo {
  tenantId: string
  /** Recebimentos ativos (Pagar.me) — a mesma trava do Partner App. */
  podePublicar: boolean
  loja: { id: string; nome: string } | null
  /** `plans.max_posts`; `null` = ilimitado. */
  maxPosts: number | null
  /** Posts que contam para o limite (status <> removed). */
  totalPosts: number
}

async function getTenant(supabase: Supabase) {
  const { data } = await supabase
    .from('tenants')
    .select('id, pagarme_onboarding_status')
    .single()
  return (data ?? null) as { id: string; pagarme_onboarding_status: string | null } | null
}

async function lojaDoTenant(supabase: Supabase, tenantId: string, storeId?: string) {
  let q = supabase.from('stores').select('id, nome').eq('tenant_id', tenantId)
  q = storeId ? q.eq('id', storeId) : q.order('criado_em', { ascending: true })
  const { data } = await q.limit(1).maybeSingle()
  return (data ?? null) as { id: string; nome: string } | null
}

export async function getContextoConteudo(): Promise<ContextoConteudo | null> {
  const supabase = createSupabaseServer()
  const tenant = await getTenant(supabase)
  if (!tenant) return null

  const [loja, assinatura, contagem] = await Promise.all([
    lojaDoTenant(supabase, tenant.id),
    supabase.from('tenant_subscriptions').select('plans(max_posts)').eq('tenant_id', tenant.id).maybeSingle(),
    supabase
      .from('store_posts')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .neq('status', 'removed'),
  ])

  const plano = (assinatura.data as { plans?: { max_posts?: number | null } | { max_posts?: number | null }[] } | null)?.plans
  const maxPosts = (Array.isArray(plano) ? plano[0]?.max_posts : plano?.max_posts) ?? null

  return {
    tenantId: tenant.id,
    podePublicar: tenantPodePublicar(tenant),
    loja,
    maxPosts,
    totalPosts: contagem.count ?? 0,
  }
}

/**
 * Todos os posts do tenant que não foram removidos, mais novos primeiro.
 * O filtro de tenant é explícito: a RLS é a segunda linha, não a primeira.
 */
export async function listarPosts(): Promise<Post[]> {
  const supabase = createSupabaseServer()
  const tenant = await getTenant(supabase)
  if (!tenant) return []
  const { data } = await supabase
    .from('store_posts')
    .select(SELECT_POST)
    .eq('tenant_id', tenant.id)
    .neq('status', 'removed')
    .order('criado_em', { ascending: false })
  return (data ?? []) as unknown as Post[]
}

export async function getPost(id: string): Promise<Post | null> {
  if (!z.string().uuid().safeParse(id).success) return null
  const supabase = createSupabaseServer()
  const tenant = await getTenant(supabase)
  if (!tenant) return null
  const { data } = await supabase
    .from('store_posts')
    .select(SELECT_POST)
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .neq('status', 'removed')
    .maybeSingle()
  return (data ?? null) as unknown as Post | null
}

/**
 * Registro do post depois da mídia já estar no bucket (o upload é do
 * navegador — foto simples, vídeo por TUS). O trigger `verificar_limite_posts`
 * aplica o teto do plano; a RLS confere tenant + loja.
 */
export async function criarPost(input: unknown): Promise<{ sucesso: true; id: string } | { erro: string }> {
  // Forma primeiro (sem tenant não dá para saber de qual loja é o `store_id`).
  const storeId = (input as { store_id?: unknown } | null)?.store_id
  if (typeof storeId !== 'string') return { erro: 'Dados inválidos' }

  const supabase = createSupabaseServer()
  const tenant = await getTenant(supabase)
  if (!tenant) return { erro: 'Tenant não encontrado' }
  if (!tenantPodePublicar(tenant)) return { erro: 'Ative seus recebimentos para publicar no Explorar.' }

  const loja = await lojaDoTenant(supabase, tenant.id, storeId)
  if (!loja) return { erro: 'Loja não encontrada' }

  // A-03/R2: caminho sob `{tenant}/{loja}/` e URL igual à pública do bucket
  // `explore-media` para esse caminho. URL externa ou objeto de outro tenant
  // não entra no feed público.
  const parsed = novoPostSchemaPara({
    tenantId: tenant.id,
    storeId: loja.id,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  }).safeParse(input)
  if (!parsed.success) return { erro: parsed.error.errors[0]?.message ?? 'Dados inválidos' }
  const dados = parsed.data

  // O produto vinculado tem que ser desta loja.
  if (dados.product_id) {
    const { data: produto } = await supabase
      .from('products')
      .select('id')
      .eq('id', dados.product_id)
      .eq('store_id', loja.id)
      .maybeSingle()
    if (!produto) return { erro: 'Produto não pertence a esta loja' }
  }

  const { data, error } = await supabase
    .from('store_posts')
    .insert({
      store_id: loja.id,
      tenant_id: tenant.id,
      product_id: dados.product_id,
      tipo: dados.tipo,
      media_path: dados.media_path,
      media_url: dados.media_url,
      thumb_path: dados.thumb_path,
      thumb_url: dados.thumb_url,
      descricao: dados.descricao,
      tags: dados.tags,
      duracao_seg: dados.tipo === 'video' ? dados.duracao_seg : null,
      largura: dados.largura,
      altura: dados.altura,
      bytes: dados.bytes,
      status: 'published', // moderação 'approved' por padrão (Partner Stage 0)
      publicado_em: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !data) return { erro: mensagemErroPost(error?.message ?? 'Falha ao publicar') }

  revalidatePath(ROTA)
  revalidatePath('/')
  return { sucesso: true, id: (data as { id: string }).id }
}

export async function atualizarPost(id: string, dados: unknown): Promise<ResultadoAcao> {
  if (!z.string().uuid().safeParse(id).success) return { erro: 'ID inválido' }
  const parsed = dadosPostSchema.safeParse(dados)
  if (!parsed.success) return { erro: parsed.error.errors[0]?.message ?? 'Dados inválidos' }

  const supabase = createSupabaseServer()
  const tenant = await getTenant(supabase)
  if (!tenant) return { erro: 'Tenant não encontrado' }

  if (parsed.data.product_id) {
    const { data: post } = await supabase.from('store_posts').select('store_id').eq('id', id).maybeSingle()
    const { data: produto } = await supabase
      .from('products')
      .select('id')
      .eq('id', parsed.data.product_id)
      .eq('store_id', (post as { store_id?: string } | null)?.store_id ?? '')
      .maybeSingle()
    if (!produto) return { erro: 'Produto não pertence a esta loja' }
  }

  const { error } = await supabase
    .from('store_posts')
    .update({ ...parsed.data, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }
  revalidatePath(ROTA)
  revalidatePath(`${ROTA}/${id}`)
  return { sucesso: true }
}

/** Visibilidade published ⇄ hidden — some/volta ao feed na hora. */
export async function alternarVisibilidadePost(id: string, ocultar: boolean): Promise<ResultadoAcao> {
  if (!z.string().uuid().safeParse(id).success) return { erro: 'ID inválido' }
  const supabase = createSupabaseServer()
  const tenant = await getTenant(supabase)
  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { error } = await supabase
    .from('store_posts')
    .update({ status: ocultar ? 'hidden' : 'published', atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .in('status', ['published', 'hidden'])

  if (error) return { erro: error.message }
  revalidatePath(ROTA)
  revalidatePath(`${ROTA}/${id}`)
  return { sucesso: true }
}

/**
 * Remoção: soft delete (`status = removed` — sai do feed e da contagem do
 * plano) + remoção best-effort dos objetos no bucket.
 */
export async function removerPost(id: string): Promise<ResultadoAcao> {
  if (!z.string().uuid().safeParse(id).success) return { erro: 'ID inválido' }
  const supabase = createSupabaseServer()
  const tenant = await getTenant(supabase)
  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { data: post } = await supabase
    .from('store_posts')
    .select('media_path, thumb_path')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .maybeSingle()
  if (!post) return { erro: 'Post não encontrado' }

  const { error } = await supabase
    .from('store_posts')
    .update({ status: 'removed', atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenant.id)
  if (error) return { erro: error.message }

  const objetos = [post.media_path, post.thumb_path].filter((p): p is string => typeof p === 'string' && p.length > 0)
  if (objetos.length > 0) {
    const { error: e } = await supabase.storage.from(BUCKET).remove(objetos)
    if (e) console.warn('[conteudo] falha ao remover objetos (limpeza fica p/ órfãos):', e.message)
  }

  revalidatePath(ROTA)
  return { sucesso: true }
}

export interface ProdutoResumo {
  id: string
  nome: string
  preco: number
  foto_url: string | null
}

/** Produtos disponíveis da loja para vincular ao post (até 12, por nome). */
export async function buscarProdutosParaPost(storeId: string, termo: string): Promise<ProdutoResumo[]> {
  if (!z.string().uuid().safeParse(storeId).success) return []
  const supabase = createSupabaseServer()
  const tenant = await getTenant(supabase)
  if (!tenant) return []
  let q = supabase
    .from('products')
    .select('id, nome, preco, foto_url')
    .eq('tenant_id', tenant.id)
    .eq('store_id', storeId)
    .eq('disponivel', true)
    .order('nome')
    .limit(12)
  const t = termo.trim()
  if (t) q = q.ilike('nome', `%${t}%`)
  const { data } = await q
  return (data ?? []) as ProdutoResumo[]
}

export async function getProdutoResumo(id: string | null): Promise<ProdutoResumo | null> {
  if (!id || !z.string().uuid().safeParse(id).success) return null
  const supabase = createSupabaseServer()
  const tenant = await getTenant(supabase)
  if (!tenant) return null
  const { data } = await supabase
    .from('products')
    .select('id, nome, preco, foto_url')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .maybeSingle()
  return (data ?? null) as ProdutoResumo | null
}

/**
 * Objetos no prefixo da loja sem registro em `store_posts` (upload que não
 * virou post). `postsCarregados` evita a segunda consulta quando a página já
 * tem a lista na mão (A-17).
 */
export async function detectarOrfaosConteudo(postsCarregados?: Post[]): Promise<string[]> {
  const supabase = createSupabaseServer()
  const tenant = await getTenant(supabase)
  if (!tenant) return []
  const loja = await lojaDoTenant(supabase, tenant.id)
  if (!loja) return []

  const prefixo = `${tenant.id}/${loja.id}`
  const [{ data: objetos }, posts] = await Promise.all([
    supabase.storage.from(BUCKET).list(prefixo, { limit: 200 }),
    postsCarregados ?? listarPosts(),
  ])
  if (!objetos) return []
  return orfaosDoPrefixo(
    prefixo,
    objetos.map((o) => o.name),
    posts,
  )
}

export async function descartarOrfaosConteudo(caminhos: string[]): Promise<ResultadoAcao> {
  const supabase = createSupabaseServer()
  const tenant = await getTenant(supabase)
  if (!tenant) return { erro: 'Tenant não encontrado' }
  // Só o prefixo do próprio tenant — a policy do bucket também garante.
  const seguros = caminhos.filter((c) => c.startsWith(`${tenant.id}/`))
  if (seguros.length === 0) return { sucesso: true }
  const { error } = await supabase.storage.from(BUCKET).remove(seguros)
  if (error) return { erro: error.message }
  revalidatePath(ROTA)
  return { sucesso: true }
}
