import { SELECT_POST, orfaosDoPrefixo, type Post } from '@mallevo/lib'
import { supabase } from './supabase'

// Gestão dos posts do Explorar (docs/partner-app/10): listar/editar/
// ocultar/remover sob RLS (store_posts_*_proprio). Métricas são
// SOMENTE LEITURA — quem incrementa é o consumer (Stage 9).

/** Contrato compartilhado em @mallevo/lib (`status`/`moderacao` tipados). */
export type { Post } from '@mallevo/lib'

export async function listarPosts(): Promise<Post[]> {
  const { data } = await supabase
    .from('store_posts')
    .select(SELECT_POST)
    .neq('status', 'removed')
    .order('criado_em', { ascending: false })
  return (data ?? []) as Post[]
}

/** Badge de estado do card — contrato compartilhado em @mallevo/lib. */
export { badgeDoPost, type BadgePost } from '@mallevo/lib'

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
  // A regra de "o que é órfão" é do contrato (@mallevo/lib), não desta tela.
  return orfaosDoPrefixo(
    prefixo,
    data.map((obj) => obj.name),
    posts
  )
}

export async function descartarOrfaos(caminhos: string[]): Promise<Resultado> {
  if (caminhos.length === 0) return { sucesso: true }
  const { error } = await supabase.storage.from('explore-media').remove(caminhos)
  if (error) return { erro: error.message }
  return { sucesso: true }
}
