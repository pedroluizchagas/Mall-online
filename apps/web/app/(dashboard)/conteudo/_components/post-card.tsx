import Link from 'next/link'
import { Eye, Images, Play } from 'lucide-react'
import { badgeDoPost, formatarDuracaoSeg, type Post } from '@mallevo/lib'

const COR_BADGE = {
  success: { bg: 'var(--ok)', fg: 'var(--on-color)' },
  info: { bg: 'var(--sky)', fg: 'var(--on-color)' },
  warning: { bg: 'var(--warn)', fg: 'var(--shell)' },
  danger: { bg: 'var(--err)', fg: 'var(--on-color)' },
} as const

const NUMERO = new Intl.NumberFormat('pt-BR')

/** Cartaz em retrato (9:14) — thumb cheia, pílulas de leitura sobre a foto. */
export function PostCard({ post }: { post: Post }) {
  const badge = badgeDoPost(post)
  const cor = COR_BADGE[badge.corKey]
  const legenda = post.descricao?.trim()

  return (
    <Link
      href={`/conteudo/${post.id}`}
      aria-label={`${post.tipo === 'video' ? 'Vídeo' : 'Foto'}, ${post.views} visualizações, ${badge.rotulo}${legenda ? `: ${legenda}` : ''}`}
      className="group block rounded-md overflow-hidden border border-line bg-bg-2 transition-all hover:border-line-2 hover:shadow-md hover:-translate-y-px"
    >
      <div className="relative w-full" style={{ aspectRatio: '9 / 14' }}>
        {post.thumb_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.thumb_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-ink-3">
            <Images className="w-6 h-6" strokeWidth={1.5} />
          </div>
        )}

        {post.tipo === 'video' && (
          <span
            className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
            style={{ background: 'var(--veil)' }}
          >
            <Play className="w-2.5 h-2.5" fill="currentColor" strokeWidth={0} />
            {formatarDuracaoSeg(post.duracao_seg)}
          </span>
        )}

        <span
          className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
          style={{ background: 'var(--veil)' }}
        >
          <Eye className="w-3 h-3" strokeWidth={2.2} />
          {NUMERO.format(post.views)}
        </span>

        {badge.rotulo !== 'Publicado' && (
          <span
            className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: cor.bg, color: cor.fg }}
          >
            {badge.rotulo}
          </span>
        )}
      </div>

      {legenda && (
        <p className="px-2.5 py-2 text-[12px] leading-snug text-ink-2 line-clamp-2 bg-bg">{legenda}</p>
      )}
    </Link>
  )
}
