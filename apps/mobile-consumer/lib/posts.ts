/**
 * Posts das lojas — contrato único da view `public_explore_feed`
 * (docs/partner-app/02 §6), o feed publicado pelo Partner App.
 *
 * DUAS telas leem o mesmo feed e precisam concordar sobre ele:
 * - `(tabs)/explorar` — reels em tela cheia, todas as lojas;
 * - `(tabs)/seguindo` — cards, só as lojas que o usuário segue.
 *
 * Por isso o tipo, o mapeamento e a paginação keyset moram aqui: se a view
 * ganhar uma coluna, muda um arquivo só. Regras da view: anon lê SÓ ela
 * (store_posts é bloqueada por RLS) e `produto.preco` vem em CENTAVOS.
 */

import { Share } from 'react-native'
import { formatarReais } from '@mallevo/lib'
import { supabase } from '@/lib/supabase'

export interface Post {
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
  /** Só em `tipo: 'video'`; nas fotos é null. */
  duracao_seg: number | null
  publicado_em: string
  /** Produto vitrinado no post — `preco` em CENTAVOS. */
  produto?: { id: string; nome: string; preco: number } | null
}

/** Tamanho da página do feed (keyset por `publicado_em`). */
export const PAGINA_POSTS = 20

interface OpcoesFeed {
  /** Keyset: só posts publicados ANTES deste ISO. */
  antesDe?: string
  /**
   * Restringe o feed a estes slugs de loja. Lista vazia devolve `[]` sem ir
   * ao banco — é o caso "não sigo ninguém", não "sigo todo mundo".
   */
  lojas?: string[]
  /**
   * Restringe a estes ids de post. Usado pelos Favoritos para refrescar os
   * snapshots guardados (preço e contadores envelhecem). Lista vazia idem.
   */
  ids?: string[]
  limite?: number
}

export async function carregarPosts({
  antesDe,
  lojas,
  ids,
  limite = PAGINA_POSTS,
}: OpcoesFeed = {}): Promise<Post[]> {
  if (lojas && lojas.length === 0) return []
  if (ids && ids.length === 0) return []

  let query = supabase
    .from('public_explore_feed')
    .select('*')
    .order('publicado_em', { ascending: false })
    .limit(limite)

  if (lojas) query = query.in('loja_slug', lojas)
  if (ids) query = query.in('id', ids)
  if (antesDe) query = query.lt('publicado_em', antesDe)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []).map(mapearPost)
}

/** Linha crua da view → `Post` (colunas da view são todas nuláveis). */
export function mapearPost(linha: Record<string, any>): Post {
  return {
    id: linha.id as string,
    tipo: (linha.tipo as 'video' | 'foto') ?? 'video',
    loja_slug: linha.loja_slug ?? '',
    loja_nome: linha.loja_nome ?? '',
    loja_inicial: linha.loja_inicial ?? '',
    media_url: linha.media_url ?? '',
    thumb_url: linha.thumb_url ?? null,
    descricao: linha.descricao ?? '',
    tags: (linha.tags ?? []).map((t: string) =>
      t.startsWith('#') ? t : `#${t}`,
    ),
    curtidas: linha.curtidas ?? 0,
    comentarios: linha.comentarios ?? 0,
    duracao_seg: linha.duracao_seg ?? null,
    publicado_em: linha.publicado_em ?? '',
    produto: (linha.produto as Post['produto']) ?? null,
  }
}

/** 1842 → "1.8k". Contadores de curtida/comentário não cabem por extenso. */
export function formatarContagem(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

/**
 * Compartilhamento nativo do post. Sem deep link ainda (o app não publica
 * URL pública de post) — vai o texto com loja, legenda e produto.
 */
export async function compartilharPost(post: Post) {
  const partes = [`${post.loja_nome} no Mallevo`, post.descricao]
  if (post.produto) {
    partes.push(`${post.produto.nome} — ${formatarReais(post.produto.preco)}`)
  }
  try {
    await Share.share({ message: partes.filter(Boolean).join('\n\n') })
  } catch {
    // usuário cancelou o share sheet — nada a fazer
  }
}
