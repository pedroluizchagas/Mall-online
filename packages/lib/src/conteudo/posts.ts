import { z } from 'zod'

/**
 * Contrato dos posts do Explorar (`store_posts`) — compartilhado pelo
 * dashboard web (`/conteudo`), pelo Partner App e pelo consumer.
 *
 * Origem: apps/mobile-partner/lib/{posts,conteudo}.ts (docs/partner-app/09
 * e 10). Aqui vive só o que é agnóstico de plataforma: tipos, limites,
 * badge de estado, normalização de tag, caminhos no bucket `explore-media`
 * e a leitura do erro do trigger de limite do plano. Upload e captura de
 * mídia ficam em cada superfície (TUS em `./tus`).
 */

export type TipoPost = 'video' | 'foto'
export type StatusPost = 'processing' | 'published' | 'hidden' | 'removed'
export type ModeracaoPost = 'pending' | 'approved' | 'flagged' | 'rejected'

export interface Post {
  id: string
  store_id: string
  tipo: TipoPost
  media_url: string
  media_path: string
  thumb_url: string | null
  thumb_path: string | null
  descricao: string | null
  tags: string[]
  product_id: string | null
  status: StatusPost
  moderacao: ModeracaoPost
  duracao_seg: number | null
  largura: number | null
  altura: number | null
  curtidas: number
  comentarios: number
  views: number
  criado_em: string
  publicado_em: string | null
}

/** Colunas que as telas de gestão leem (o mesmo select do Partner App). */
export const SELECT_POST =
  'id, store_id, tipo, media_url, media_path, thumb_url, thumb_path, descricao, tags, product_id, status, moderacao, duracao_seg, largura, altura, curtidas, comentarios, views, criado_em, publicado_em'

/** Limites do produto (docs/partner-app/09) + rede de segurança do bucket. */
export const LIMITES_POST = {
  legenda: 600,
  tags: 5,
  tag: 30,
  duracaoSeg: 60,
  /** `file_size_limit` do bucket `explore-media`. */
  bytes: 50 * 1024 * 1024,
  /** Mídia principal (foto) normalizada para até esta largura. */
  fotoLargura: 1440,
  /** Thumb (foto e vídeo) para até esta largura. */
  thumbLargura: 720,
} as const

/** MIME aceitos pelo bucket, por tipo de post. */
export const MIME_POST: Record<TipoPost, readonly string[]> = {
  foto: ['image/jpeg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/quicktime'],
}

/** Tipo do post a partir do MIME do arquivo escolhido; `null` = não aceito. */
export function tipoDoArquivo(mime: string): TipoPost | null {
  if (MIME_POST.foto.includes(mime)) return 'foto'
  if (MIME_POST.video.includes(mime)) return 'video'
  return null
}

export interface BadgePost {
  rotulo: 'Publicado' | 'Oculto' | 'Em análise' | 'Sinalizado'
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

/** O post está no feed público agora (published + approved)? */
export function postVisivelNoFeed(post: Pick<Post, 'status' | 'moderacao'>): boolean {
  return post.status === 'published' && post.moderacao === 'approved'
}

/** Normaliza tag: minúscula, sem espaço/acento, sem '#', até 30 chars. */
export function normalizarTag(bruta: string): string {
  return bruta
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, LIMITES_POST.tag)
}

/** Extensão do objeto no bucket a partir do tipo e do MIME. */
export function extensaoDaMidia(tipo: TipoPost, mime?: string | null): 'mp4' | 'mov' | 'jpg' {
  if (tipo === 'foto') return 'jpg'
  return mime === 'video/quicktime' ? 'mov' : 'mp4'
}

/** Bucket dos posts do Explorar (público, policy por prefixo do tenant). */
export const BUCKET_POSTS = 'explore-media'

export interface CaminhosPost {
  /** `{tenant_id}/{store_id}` — o prefixo que a policy do bucket exige. */
  prefixo: string
  mediaPath: string
  thumbPath: string
}

/**
 * Caminhos da mídia e da thumb em `explore-media`:
 * `{tenant_id}/{store_id}/{uuid}.(mp4|mov|jpg)` e `…/{uuid}-thumb.jpg`.
 */
export function caminhosDoPost(
  tenantId: string,
  storeId: string,
  id: string,
  tipo: TipoPost,
  mime?: string | null,
): CaminhosPost {
  const prefixo = `${tenantId}/${storeId}`
  return {
    prefixo,
    mediaPath: `${prefixo}/${id}.${extensaoDaMidia(tipo, mime)}`,
    thumbPath: `${prefixo}/${id}-thumb.jpg`,
  }
}

/** URL pública de um objeto de bucket público (o `getPublicUrl` sem cliente). */
export function urlPublicaDoBucket(supabaseUrl: string, bucket: string, caminho: string): string {
  const base = supabaseUrl.replace(/\/+$/, '')
  return `${base}/storage/v1/object/public/${bucket}/${caminho}`
}

/** Nome anterior de `urlPublicaDoBucket` — mantido para não quebrar imports. */
export const urlPublicaDoObjeto = urlPublicaDoBucket

/**
 * O caminho está sob o prefixo `{tenant_id}/{store_id}/` da convenção de
 * `caminhosDoPost` (a mesma que as policies dos buckets exigem)?
 *
 * Regra R2 do plano: referência a mídia gravada pelo servidor é validada por
 * prefixo do tenant e por bucket — "parece https" não é critério.
 */
export function caminhoPertenceAoTenant(
  caminho: string,
  tenantId: string,
  storeId: string,
): boolean {
  if (!caminho || !tenantId || !storeId) return false
  if (caminho.startsWith('/') || caminho.includes('..')) return false
  const prefixo = `${tenantId}/${storeId}/`
  return caminho.startsWith(prefixo) && caminho.length > prefixo.length
}

/**
 * UUID do objeto no bucket. `crypto.randomUUID` existe no navegador seguro e
 * no Hermes recente; o fallback cobre Expo Go e contextos sem HTTPS.
 */
export function gerarUuid(): string {
  const c = globalThis.crypto as { randomUUID?: () => string } | undefined
  if (c?.randomUUID) return c.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Objetos em `explore-media/{tenant}/{store}/` sem registro em `store_posts`
 * (falha pós-upload — docs/partner-app/09 §6). Recebe os nomes listados no
 * prefixo e os posts conhecidos; devolve os caminhos órfãos.
 */
export function orfaosDoPrefixo(
  prefixo: string,
  nomes: string[],
  posts: Pick<Post, 'media_path' | 'thumb_path'>[],
): string[] {
  const conhecidos = new Set<string>()
  for (const p of posts) {
    conhecidos.add(p.media_path)
    if (p.thumb_path) conhecidos.add(p.thumb_path)
  }
  return nomes
    .filter((nome) => nome && !nome.endsWith('/'))
    .map((nome) => `${prefixo}/${nome}`)
    .filter((caminho) => !conhecidos.has(caminho))
}

/** Mensagem do trigger `verificar_limite_posts` → texto para o lojista. */
export const ERRO_LIMITE_POSTS = 'Limite de posts do seu plano atingido.'

export function mensagemErroPost(mensagem: string): string {
  if (mensagem.includes('Limite de posts')) return ERRO_LIMITE_POSTS
  return mensagem
}

/** Campos editáveis de um post (legenda, tags, produto vinculado). */
export const dadosPostSchema = z.object({
  descricao: z
    .string()
    .trim()
    .max(LIMITES_POST.legenda, `A legenda tem no máximo ${LIMITES_POST.legenda} caracteres`)
    .transform((s) => (s.length === 0 ? null : s))
    .nullable(),
  tags: z
    .array(z.string())
    .max(LIMITES_POST.tags, `No máximo ${LIMITES_POST.tags} tags`)
    .transform((lista) => {
      const vistas = new Set<string>()
      const out: string[] = []
      for (const bruta of lista) {
        const t = normalizarTag(bruta)
        if (!t || vistas.has(t)) continue
        vistas.add(t)
        out.push(t)
      }
      return out.slice(0, LIMITES_POST.tags)
    }),
  product_id: z.string().uuid().nullable(),
})

export type DadosPost = z.infer<typeof dadosPostSchema>

/** Registro completo de um post novo (o que o cliente manda depois do upload). */
export const novoPostSchema = dadosPostSchema.extend({
  store_id: z.string().uuid(),
  tipo: z.enum(['video', 'foto']),
  media_path: z.string().min(1),
  media_url: z.string().url(),
  thumb_path: z.string().min(1).nullable(),
  thumb_url: z.string().url().nullable(),
  duracao_seg: z.number().int().min(1).max(LIMITES_POST.duracaoSeg).nullable(),
  largura: z.number().int().positive().nullable(),
  altura: z.number().int().positive().nullable(),
  bytes: z.number().int().positive().nullable(),
})

export type NovoPost = z.infer<typeof novoPostSchema>

/** De onde a mídia do post PODE vir (A-03 · regra R2). */
export interface OrigemMidiaPost {
  tenantId: string
  storeId: string
  /** `NEXT_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL`. */
  supabaseUrl: string
}

/**
 * `novoPostSchema` + checagem de ORIGEM da mídia: caminho sob
 * `{tenant}/{store}/` e URL exatamente a pública do bucket `explore-media`
 * para aquele caminho. Sem isso um lojista autenticado grava no feed público
 * uma URL externa ou o objeto de outro tenant (A-03).
 *
 * O `novoPostSchema` cru continua valendo para validação de FORMATO no
 * cliente, onde tenant/loja ainda não foram conferidos contra o banco.
 */
export function novoPostSchemaPara({ tenantId, storeId, supabaseUrl }: OrigemMidiaPost) {
  return novoPostSchema.superRefine((dados, ctx) => {
    const erro = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message })

    if (dados.store_id !== storeId) {
      erro('store_id', 'A loja do post não é a loja informada')
    }

    if (!caminhoPertenceAoTenant(dados.media_path, tenantId, storeId)) {
      erro('media_path', 'A mídia não está na pasta desta loja')
    } else if (dados.media_url !== urlPublicaDoBucket(supabaseUrl, BUCKET_POSTS, dados.media_path)) {
      erro('media_url', 'O endereço da mídia não é o do arquivo enviado')
    }

    if (dados.thumb_path === null) {
      if (dados.thumb_url !== null) erro('thumb_url', 'Miniatura sem arquivo correspondente')
      return
    }

    if (!caminhoPertenceAoTenant(dados.thumb_path, tenantId, storeId)) {
      erro('thumb_path', 'A miniatura não está na pasta desta loja')
      return
    }
    if (dados.thumb_url !== urlPublicaDoBucket(supabaseUrl, BUCKET_POSTS, dados.thumb_path)) {
      erro('thumb_url', 'O endereço da miniatura não é o do arquivo enviado')
    }
  })
}

/** "12s", "1:05" — duração de vídeo curta. */
export function formatarDuracaoSeg(segundos: number | null | undefined): string {
  if (!segundos || segundos <= 0) return ''
  if (segundos < 60) return `${Math.round(segundos)}s`
  const m = Math.floor(segundos / 60)
  const s = Math.round(segundos % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
