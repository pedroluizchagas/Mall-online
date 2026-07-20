import { supabase } from './supabase'

// Gestão dos posts do Explorar (docs/partner-app/10): listar/editar/
// ocultar/remover sob RLS (store_posts_*_proprio). Métricas são
// SOMENTE LEITURA — quem incrementa é o consumer (Stage 9).

export interface Post {
  id: string
  store_id: string
  tipo: string
  media_url: string
  media_path: string
  thumb_url: string | null
  thumb_path: string | null
  descricao: string | null
  tags: string[]
  product_id: string | null
  status: string
  moderacao: string
  duracao_seg: number | null
  curtidas: number
  comentarios: number
  views: number
  criado_em: string
  publicado_em: string | null
}

export async function listarPosts(): Promise<Post[]> {
  const { data } = await supabase
    .from('store_posts')
    .select(
      'id, store_id, tipo, media_url, media_path, thumb_url, thumb_path, descricao, tags, product_id, status, moderacao, duracao_seg, curtidas, comentarios, views, criado_em, publicado_em'
    )
    .neq('status', 'removed')
    .order('criado_em', { ascending: false })
  return (data ?? []) as Post[]
}

export interface BadgePost {
  rotulo: string
  corKey: 'success' | 'warning' | 'danger' | 'info'
}

/** Badge de estado do card (docs/partner-app/10 §grade). */
export function badgeDoPost(post: Pick<Post, 'status' | 'moderacao'>): BadgePost {
  if (post.moderacao === 'flagged' || post.moderacao === 'rejected') {
    return { rotulo: 'Sinalizado', corKey: 'danger' }
  }
  if (post.status === 'processing' || post.moderacao === 'pending') {
    return { rotulo: 'Em análise', corKey: 'warning' }
  }
  if (post.status === 'hidden') return { rotulo: 'Oculto', corKey: 'info' }
  return { rotulo: 'Publicado', corKey: 'success' }
}

type Resultado = { sucesso?: true; erro?: string }

export async function atualizarPost(
  postId: string,
  campos: { descricao?: string | null; tags?: string[]; product_id?: string | null }
): Promise<Resultado> {
  const { error } = await supabase
    .from('store_posts')
    .update({ ...campos, atualizado_em: new Date().toISOString() })
    .eq('id', postId)
  if (error) return { erro: error.message }
  return { sucesso: true }
}

/** Visibilidade published ⇄ hidden — some/volta ao feed na hora. */
export async function alternarVisibilidade(postId: string, ocultar: boolean): Promise<Resultado> {
  const { error } = await supabase
    .from('store_posts')
    .update({ status: ocultar ? 'hidden' : 'published' })
    .eq('id', postId)
  if (error) return { erro: error.message }
  return { sucesso: true }
}

/**
 * Remoção: soft delete (status='removed' — a view do feed filtra
 * published, então some imediatamente e sai da contagem do limite do
 * plano) + best-effort remove dos objetos no Storage.
 */
export async function removerPost(post: Pick<Post, 'id' | 'media_path' | 'thumb_path'>): Promise<Resultado> {
  const { error } = await supabase
    .from('store_posts')
    .update({ status: 'removed' })
    .eq('id', post.id)
  if (error) return { erro: error.message }

  // Best-effort: em rede móvel a remoção física pode falhar — não bloqueia.
  const objetos = [post.media_path, post.thumb_path].filter((p): p is string => !!p)
  if (objetos.length > 0) {
    void supabase.storage.from('explore-media').remove(objetos).then(({ error: e }) => {
      if (e) console.warn('Falha ao remover objetos (limpeza fica p/ job):', e.message)
    })
  }
  return { sucesso: true }
}

/**
 * Órfãos: objetos em explore-media/{tenant}/{store}/ sem registro em
 * store_posts (falha pós-upload — docs/partner-app/09 §6). Detecta e
 * permite descartar.
 */
export async function detectarOrfaos(
  tenantId: string,
  storeId: string,
  posts: Post[]
): Promise<string[]> {
  const prefixo = `${tenantId}/${storeId}`
  const { data } = await supabase.storage.from('explore-media').list(prefixo, { limit: 100 })
  if (!data) return []

  const conhecidos = new Set<string>()
  for (const p of posts) {
    conhecidos.add(p.media_path)
    if (p.thumb_path) conhecidos.add(p.thumb_path)
  }

  return data
    .filter((obj) => obj.name && !obj.name.endsWith('/'))
    .map((obj) => `${prefixo}/${obj.name}`)
    .filter((caminho) => !conhecidos.has(caminho))
}

export async function descartarOrfaos(caminhos: string[]): Promise<Resultado> {
  if (caminhos.length === 0) return { sucesso: true }
  const { error } = await supabase.storage.from('explore-media').remove(caminhos)
  if (error) return { erro: error.message }
  return { sucesso: true }
}
