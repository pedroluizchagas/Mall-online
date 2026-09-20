'use client'

import { useCallback, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowUpRight, Eye, Heart, MessageCircle, X } from 'lucide-react'

import { formatarReais } from '@/lib/format'
import type { PostSaguao } from '@/lib/saguao'
import { momentoCurto } from './CartazPost'

const NUMERO = new Intl.NumberFormat('pt-BR')

/**
 * Visor do post — o reel do Explorar no web: abre com `?post=<id>` sobre a
 * grade, toca o vídeo (ou mostra a foto) em retrato, legenda, tags e os
 * dois caminhos que o post oferece: a loja e o produto vitrinado, ambos em
 * `<slug>.mallevo.com.br`. Esc/backdrop fecham e limpam o `?post`.
 */
export function VisorPost({ posts, urlsDasLojas }: { posts: PostSaguao[]; urlsDasLojas: Record<string, string> }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const id = searchParams.get('post')
  const post = id ? posts.find((p) => p.id === id) ?? null : null

  const fechar = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('post')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  useEffect(() => {
    if (!post) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar()
    }
    window.addEventListener('keydown', onKey)
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = anterior
    }
  }, [post, fechar])

  if (!post) return null

  const urlLoja = urlsDasLojas[post.loja_slug] ?? '#'
  const titulo = post.produto?.nome ?? post.loja_nome

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${post.tipo === 'video' ? 'Vídeo' : 'Foto'} de ${post.loja_nome}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(17,18,22,0.78)', backdropFilter: 'blur(8px)' }}
      onMouseDown={fechar}
    >
      <div
        className="grid w-full max-w-[920px] overflow-hidden rounded-[24px] bg-[#18181B] text-white shadow-floating md:grid-cols-[minmax(0,380px)_1fr]"
        style={{ maxHeight: 'min(92vh, 760px)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative bg-black" style={{ aspectRatio: '9 / 16', maxHeight: 'min(92vh, 760px)' }}>
          {post.tipo === 'video' ? (
            <video
              key={post.id}
              src={post.media_url}
              poster={post.thumb_url ?? undefined}
              controls
              autoPlay
              playsInline
              loop
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.media_url} alt="" className="absolute inset-0 h-full w-full object-contain" />
          )}
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar"
            className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full md:hidden"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-col overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[1.2px]" style={{ color: '#D8FF3E' }}>
                {post.loja_nome}
              </p>
              <h2 className="mt-1 font-display text-[22px] font-extrabold leading-tight tracking-[-0.4px]">{titulo}</h2>
              {post.produto && <p className="mt-1 text-[15px] font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>{formatarReais(post.produto.preco)}</p>}
            </div>
            <button
              type="button"
              onClick={fechar}
              aria-label="Fechar"
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full md:flex"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {post.descricao && (
            <p className="mt-4 whitespace-pre-line text-[14px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {post.descricao}
            </p>
          )}

          {post.tags.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5 list-none p-0 m-0" aria-label="Tags">
              {post.tags.map((t) => (
                <li key={t} className="rounded-pill px-2.5 py-1 text-[11.5px] font-semibold" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  #{t}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex items-center gap-4 text-[12.5px] font-semibold" style={{ color: 'rgba(255,255,255,0.62)' }}>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> {NUMERO.format(post.views)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5" /> {NUMERO.format(post.curtidas)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5" /> {NUMERO.format(post.comentarios)}
            </span>
            <span className="ml-auto">{momentoCurto(post.publicado_em)}</span>
          </div>

          <div className="mt-auto flex flex-col gap-2 pt-6 sm:flex-row">
            {post.produto && (
              <a
                href={`${urlLoja}/produto/${post.produto.id}`}
                className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-pill text-[14px] font-bold"
                style={{ background: '#D8FF3E', color: '#111216' }}
              >
                Ver produto
                <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} />
              </a>
            )}
            <a
              href={urlLoja}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-pill text-[14px] font-bold"
              style={post.produto ? { background: 'rgba(255,255,255,0.1)', color: '#fff' } : { background: '#D8FF3E', color: '#111216' }}
            >
              Entrar na loja
              <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
