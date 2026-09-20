import { cache } from 'react'
import { headers } from 'next/headers'

import { createSupabaseServer } from '@/lib/supabase/server'

/**
 * Dados do SAGUÃO — o apex `mallevo.com.br` (plano de convergência, Fase 5):
 * lojas ativas com a pele de cada uma, três destaques por loja e os posts do
 * Explorar. Tudo ANÔNIMO, só pelas views públicas (`public_catalog_stores`,
 * `public_catalog_products`, `public_explore_feed`) — as mesmas que o
 * consumer lê.
 */

export interface LojaSaguao {
  id: string
  slug: string
  nome: string
  descricao: string | null
  logo_url: string | null
  banner_url: string | null
  taxa_entrega: number | null
  /** Minutos. */
  tempo_entrega: number | null
  categoria_slug: string | null
  /** `stores.theme` cru — a fachada resolve a pele. */
  theme: unknown | null
}

export interface DestaqueLoja {
  id: string
  store_id: string
  nome: string
  preco: number
  preco_promocional: number | null
  foto_url: string | null
}

export interface PostSaguao {
  id: string
  tipo: 'video' | 'foto'
  loja_slug: string
  loja_nome: string
  loja_inicial: string
  media_url: string
  thumb_url: string | null
  descricao: string
  tags: string[]
  curtidas: number
  comentarios: number
  views: number
  duracao_seg: number | null
  publicado_em: string
  /** `preco` em CENTAVOS. */
  produto: { id: string; nome: string; preco: number } | null
}

/**
 * Teto alto de propósito: o saguão distribui o resultado nos 9 pisos, e um
 * corte baixo não encurta os corredores — apaga os últimos (mesma lição do
 * consumer). Guarda contra catálogo gigante, não paginação.
 */
const LIMITE_LOJAS = 200
/** Destaques por loja na fachada (3, como no corredor do consumer). */
export const DESTAQUES_POR_LOJA = 3

/** Todas as lojas ativas, na ordem da view. Cache por request. */
export const carregarLojas = cache(async (): Promise<LojaSaguao[]> => {
  const supabase = createSupabaseServer()
  const { data } = await supabase
    .from('public_catalog_stores')
    .select('id, slug, nome, descricao, logo_url, banner_url, taxa_entrega, tempo_entrega, categoria_slug, theme')
    .order('nome', { ascending: true })
    .limit(LIMITE_LOJAS)
  return ((data ?? []) as Partial<LojaSaguao>[])
    .filter((r): r is LojaSaguao & Partial<LojaSaguao> => typeof r.slug === 'string' && typeof r.nome === 'string')
    .map((r) => ({
      id: r.id!,
      slug: r.slug!,
      nome: r.nome!,
      descricao: r.descricao ?? null,
      logo_url: r.logo_url ?? null,
      banner_url: r.banner_url ?? null,
      taxa_entrega: r.taxa_entrega ?? null,
      tempo_entrega: r.tempo_entrega ?? null,
      categoria_slug: r.categoria_slug ?? null,
      theme: r.theme ?? null,
    }))
})

/**
 * Três primeiros produtos (por `ordem`) de cada loja pedida — uma query só,
 * agrupada aqui. A view já filtra `disponivel = true`.
 */
export async function carregarDestaques(storeIds: string[]): Promise<Map<string, DestaqueLoja[]>> {
  const mapa = new Map<string, DestaqueLoja[]>()
  if (storeIds.length === 0) return mapa

  const supabase = createSupabaseServer()
  const { data } = await supabase
    .from('public_catalog_products')
    .select('id, store_id, nome, preco, preco_promocional, foto_url')
    .in('store_id', storeIds)
    .order('ordem', { ascending: true, nullsFirst: false })
    .order('nome', { ascending: true })
    .limit(storeIds.length * 12)

  for (const p of (data ?? []) as DestaqueLoja[]) {
    const lista = mapa.get(p.store_id) ?? []
    if (lista.length >= DESTAQUES_POR_LOJA) continue
    lista.push(p)
    mapa.set(p.store_id, lista)
  }
  return mapa
}

/** Tamanho da página do Explorar (keyset por `publicado_em`). */
export const PAGINA_FEED = 24

export async function carregarFeed(opcoes: { limite?: number; antesDe?: string | null; lojaSlug?: string | null } = {}): Promise<PostSaguao[]> {
  const supabase = createSupabaseServer()
  let q = supabase
    .from('public_explore_feed')
    .select('*')
    .order('publicado_em', { ascending: false })
    .limit(opcoes.limite ?? PAGINA_FEED)
  if (opcoes.antesDe) q = q.lt('publicado_em', opcoes.antesDe)
  if (opcoes.lojaSlug) q = q.eq('loja_slug', opcoes.lojaSlug)
  const { data } = await q
  return ((data ?? []) as Record<string, unknown>[]).map(mapearPost)
}

export async function carregarPost(id: string): Promise<PostSaguao | null> {
  const supabase = createSupabaseServer()
  const { data } = await supabase.from('public_explore_feed').select('*').eq('id', id).maybeSingle()
  return data ? mapearPost(data as Record<string, unknown>) : null
}

function mapearPost(r: Record<string, unknown>): PostSaguao {
  const produto = r.produto as { id: string; nome: string; preco: number } | null | undefined
  return {
    id: String(r.id),
    tipo: r.tipo === 'video' ? 'video' : 'foto',
    loja_slug: String(r.loja_slug ?? ''),
    loja_nome: String(r.loja_nome ?? ''),
    loja_inicial: String(r.loja_inicial ?? ''),
    media_url: String(r.media_url ?? ''),
    thumb_url: (r.thumb_url as string | null) ?? null,
    descricao: String(r.descricao ?? ''),
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    curtidas: Number(r.curtidas ?? 0),
    comentarios: Number(r.comentarios ?? 0),
    views: Number(r.views ?? 0),
    duracao_seg: (r.duracao_seg as number | null) ?? null,
    publicado_em: String(r.publicado_em ?? ''),
    produto: produto && produto.id ? { id: produto.id, nome: produto.nome, preco: Number(produto.preco) } : null,
  }
}

// ─────────────────────────────────────────────────────────────
// Endereços — o saguão manda para `<slug>.<domínio>`
// ─────────────────────────────────────────────────────────────

/**
 * Domínio-base a partir do host do request: `mallevo.com.br` (apex e www)
 * em produção; `mallevo.localhost:3002` no dev (inclusive quando o request
 * chega por `localhost:3002`, que não tem subdomínio).
 */
export function dominioDoShopping(): { proto: 'http' | 'https'; dominio: string } {
  const host = (headers().get('host') ?? 'mallevo.com.br').toLowerCase()
  const [nome, porta] = host.split(':')
  const semWww = nome.replace(/^www\./, '')
  if (semWww === 'localhost' || semWww.endsWith('.localhost')) {
    // `localhost` puro não aceita subdomínio de forma confiável; `*.mallevo.localhost` resolve sozinho.
    const base = semWww === 'localhost' ? 'mallevo.localhost' : semWww
    return { proto: 'http', dominio: porta ? `${base}:${porta}` : base }
  }
  return { proto: 'https', dominio: porta ? `${semWww}:${porta}` : semWww }
}

/** `https://<slug>.mallevo.com.br` (ou o equivalente local). */
export function urlDaLoja(slug: string): string {
  const { proto, dominio } = dominioDoShopping()
  return `${proto}://${slug}.${dominio}`
}

/** URL do apex — para links absolutos e sitemap. */
export function urlDoShopping(): string {
  const { proto, dominio } = dominioDoShopping()
  return `${proto}://${dominio}`
}
