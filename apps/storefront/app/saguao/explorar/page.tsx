import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import { ChromeSaguao } from '@/components/saguao/ChromeSaguao'
import { CartazPost } from '@/components/saguao/CartazPost'
import { VisorPost } from '@/components/saguao/VisorPost'
import { PAGINA_FEED, carregarFeed, carregarPost, urlDaLoja, urlDoShopping } from '@/lib/saguao'

/**
 * Explorar — os posts publicados pelas lojas (`public_explore_feed`) em
 * grade de cartazes; o visor (`?post=`) toca o vídeo e leva à loja e ao
 * produto. Paginação keyset por `publicado_em` (`?antes=`), sem login.
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const title = 'Explorar · Mallevo'
  const description = 'Vídeos e fotos das lojas de Divinópolis: o que está saindo do forno, chegando na vitrine e em oferta agora.'
  return {
    title,
    description,
    alternates: { canonical: `${urlDoShopping()}/explorar` },
    openGraph: { title, description, type: 'website' },
  }
}

export default async function PaginaExplorar({ searchParams }: { searchParams: { antes?: string; post?: string } }) {
  const antesDe = searchParams.antes && !Number.isNaN(Date.parse(searchParams.antes)) ? searchParams.antes : null
  const posts = await carregarFeed({ limite: PAGINA_FEED, antesDe })

  // Deep-link para um post fora desta página (link compartilhado): busca à parte.
  const aberto = searchParams.post && !posts.some((p) => p.id === searchParams.post) ? await carregarPost(searchParams.post) : null
  const todos = aberto ? [aberto, ...posts] : posts

  const urlsDasLojas = Object.fromEntries(Array.from(new Set(todos.map((p) => p.loja_slug))).map((slug) => [slug, urlDaLoja(slug)]))
  const ultimo = posts[posts.length - 1]
  const temMais = posts.length === PAGINA_FEED && ultimo

  return (
    <ChromeSaguao ativo="explorar">
      <section className="mx-auto w-full max-w-[1200px] px-6 pb-8 pt-12" aria-label="Explorar">
        <p className="text-[11px] font-bold tracking-[1.4px] text-ink-soft">EXPLORAR</p>
        <h1 className="mt-3 max-w-[18ch] font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.8px] sm:text-[46px]">
          O que as lojas estão mostrando agora.
        </h1>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ink-muted">
          Vídeos e fotos publicados pelas próprias lojas. Toque num cartaz para ver, e entre na loja para pedir.
        </p>
      </section>

      <div className="mx-auto w-full max-w-[1200px] px-6">
        {posts.length === 0 ? (
          <section className="rounded-[20px] bg-surface px-8 py-16 text-center shadow-soft">
            <h2 className="font-display text-[24px] font-extrabold tracking-[-0.4px]">
              {antesDe ? 'Chegou ao fim' : 'Nada publicado ainda'}
            </h2>
            <p className="mx-auto mt-3 max-w-[40ch] text-[15px] text-ink-muted">
              {antesDe ? 'Não há posts mais antigos.' : 'Quando as lojas publicarem, os cartazes aparecem aqui.'}
            </p>
            <Link href={antesDe ? '/explorar' : '/'} className="mt-6 inline-flex h-10 items-center rounded-pill bg-ink px-5 text-[13.5px] font-bold text-canvas">
              {antesDe ? 'Voltar ao início do Explorar' : 'Ver os pisos'}
            </Link>
          </section>
        ) : (
          <>
            <ul className="grid list-none grid-cols-2 gap-3 p-0 m-0 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-label="Posts das lojas">
              {posts.map((post, i) => (
                <li key={post.id} className="min-w-0">
                  <CartazPost post={post} prioridade={i < 5} />
                </li>
              ))}
            </ul>
            <div className="mt-8 flex items-center justify-center gap-3">
              {antesDe && (
                <Link href="/explorar" className="inline-flex h-10 items-center rounded-pill bg-surface px-5 text-[13.5px] font-bold text-ink shadow-soft">
                  Mais recentes
                </Link>
              )}
              {temMais && (
                <Link
                  href={`/explorar?antes=${encodeURIComponent(ultimo.publicado_em)}`}
                  className="inline-flex h-10 items-center gap-1 rounded-pill bg-ink px-5 text-[13.5px] font-bold text-canvas"
                >
                  Posts anteriores
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.2} />
                </Link>
              )}
            </div>
          </>
        )}
      </div>

      <VisorPost posts={todos} urlsDasLojas={urlsDasLojas} />
    </ChromeSaguao>
  )
}
