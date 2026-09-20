import Link from 'next/link'
import { Eye, Play } from 'lucide-react'
import { formatarDuracaoSeg } from '@mallevo/lib'

import { formatarReais } from '@/lib/format'
import type { PostSaguao } from '@/lib/saguao'

const NUMERO = new Intl.NumberFormat('pt-BR')

/** "há 3 h", "há 2 d" — momento curto do post. */
export function momentoCurto(iso: string, agora = Date.now()): string {
  const diff = Math.max(0, agora - new Date(iso).getTime())
  const min = Math.round(diff / 60_000)
  if (min < 60) return `há ${Math.max(1, min)} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  if (d < 30) return `há ${d} d`
  return `há ${Math.round(d / 30)} m`
}

/**
 * Cartaz em retrato — o `VitrineCard` da marquise do consumer no web: foto
 * em toda a camada, sombra de leitura subindo do pé, sobrelinha com a loja,
 * título = produto do post (senão a legenda), sublinha = preço (senão o
 * momento). Pílulas: duração do vídeo e views. Toque abre o post no
 * Explorar (`?post=`), que é onde o vídeo toca.
 */
export function CartazPost({ post, prioridade = false }: { post: PostSaguao; prioridade?: boolean }) {
  const titulo = post.produto?.nome ?? (post.descricao || `Post de ${post.loja_nome}`)
  const sublinha = post.produto ? formatarReais(post.produto.preco) : momentoCurto(post.publicado_em)

  return (
    <Link
      href={`/explorar?post=${post.id}`}
      scroll={false}
      aria-label={`${post.tipo === 'video' ? 'Vídeo' : 'Foto'} de ${post.loja_nome}: ${titulo}`}
      className="group relative block overflow-hidden rounded-[16px] bg-[#2F3034] text-white shadow-medium transition-transform duration-200 hover:-translate-y-0.5"
      style={{ aspectRatio: '9 / 14' }}
    >
      {post.thumb_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.thumb_url}
          alt=""
          loading={prioridade ? 'eager' : 'lazy'}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : null}
      {/* Sombra de leitura: transparente a 46%, quase opaca na base. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: 'linear-gradient(to top, rgba(17,18,22,0.96) 0%, rgba(17,18,22,0.55) 30%, rgba(17,18,22,0) 54%)' }}
        aria-hidden
      />

      {post.tipo === 'video' && (
        <span
          className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-bold"
          style={{ background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(6px)' }}
        >
          <Play className="h-2.5 w-2.5" fill="currentColor" strokeWidth={0} />
          {formatarDuracaoSeg(post.duracao_seg)}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-3.5">
        <p className="truncate text-[10.5px] font-bold uppercase tracking-[1.1px]" style={{ color: 'rgba(216,255,62,0.95)' }}>
          {post.loja_nome}
        </p>
        <p className="line-clamp-2 font-display text-[16px] font-bold leading-[1.15] tracking-[-0.2px]">{titulo}</p>
        <div className="flex items-center justify-between gap-2 text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.78)' }}>
          <span className="truncate">{sublinha}</span>
          <span className="inline-flex shrink-0 items-center gap-1">
            <Eye className="h-3 w-3" strokeWidth={2.2} />
            {NUMERO.format(post.views)}
          </span>
        </div>
      </div>
    </Link>
  )
}
