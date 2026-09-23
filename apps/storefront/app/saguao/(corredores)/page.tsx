import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { agruparPorPiso } from '@mallevo/lib'

import { ChromeSaguao } from '@/components/saguao/ChromeSaguao'
import { Corredor } from '@/components/saguao/Corredor'
import { Diretorio } from '@/components/saguao/Diretorio'
import { CartazPost } from '@/components/saguao/CartazPost'
import { FontesDasLojas } from '@/components/saguao/FontesDasLojas'
import { carregarDestaques, carregarFeed, carregarLojas, urlDaLoja, urlDoShopping } from '@/lib/saguao'

/**
 * Home do saguão: statement, diretório de pisos, um corredor por piso com
 * as fachadas (até 4 por corredor aqui; o resto em `/piso/<slug>`) e a
 * fileira "Agora no Explorar". Desktop nativo desde o início (decisão
 * 2026-09-19): é a página que mais recebe busca em desktop.
 */
export const dynamic = 'force-dynamic'

/** Fachadas por corredor na home. */
const POR_CORREDOR = 4
const POSTS_NA_HOME = 8

export async function generateMetadata(): Promise<Metadata> {
  const base = urlDoShopping()
  const title = 'Mallevo — o shopping digital de Divinópolis'
  const description = 'As lojas da cidade num só lugar: restaurantes, moda, saúde, beleza, pet, casa, mercado e serviços. Peça online e receba em casa.'
  return {
    title,
    description,
    alternates: { canonical: base },
    openGraph: { title, description, type: 'website', url: base, siteName: 'Mallevo' },
    twitter: { card: 'summary', title, description },
  }
}

export default async function PaginaSaguao() {
  const [lojas, posts] = await Promise.all([carregarLojas(), carregarFeed({ limite: POSTS_NA_HOME })])
  const corredores = agruparPorPiso(lojas)
  const visiveis = corredores.flatMap((c) => c.itens.slice(0, POR_CORREDOR))
  const destaques = await carregarDestaques(visiveis.map((l) => l.id))

  return (
    <ChromeSaguao ativo="pisos">
      <FontesDasLojas themes={visiveis.map((l) => l.theme)} />

      {/* ── Statement ── */}
      <section className="mx-auto w-full max-w-[1200px] px-6 pb-8 pt-12 sm:pt-16" aria-label="Boas-vindas">
        <p className="text-[11px] font-bold tracking-[1.4px] text-ink-soft">O SHOPPING DIGITAL DE DIVINÓPOLIS</p>
        <h1 className="mt-3 max-w-[16ch] font-display text-[38px] font-extrabold leading-[1.02] tracking-[-1px] sm:text-[56px]">
          Tudo que a cidade vende, <span className="italic font-semibold" style={{ color: '#7FA61C' }}>num só lugar.</span>
        </h1>
        <p className="mt-4 max-w-[52ch] text-[16px] leading-relaxed text-ink-muted">
          {lojas.length > 0
            ? `${lojas.length} ${lojas.length === 1 ? 'loja aberta' : 'lojas abertas'} em ${corredores.length} ${corredores.length === 1 ? 'piso' : 'pisos'}. Cada uma com a própria vitrine, entrega e pagamento online.`
            : 'As primeiras lojas estão chegando. Volte em breve.'}
        </p>
      </section>

      {corredores.length > 0 && (
        <div className="mx-auto w-full max-w-[1200px] px-6">
          <Diretorio pisos={corredores.map((c) => c.piso)} />
        </div>
      )}

      {/* ── Agora no Explorar ── */}
      {posts.length > 0 && (
        <section className="mx-auto mt-12 w-full max-w-[1200px] px-6" aria-labelledby="letreiro-explorar">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
              <p className="text-[11px] font-bold tracking-[1.2px] text-ink-soft">EM ALTA</p>
              <h2 id="letreiro-explorar" className="mt-1 font-display text-[26px] font-extrabold leading-tight tracking-[-0.5px] sm:text-[30px]">
                Agora no Explorar
              </h2>
            </div>
            <Link href="/explorar" className="inline-flex items-center gap-1 text-[13px] font-bold text-ink underline-offset-4 hover:underline">
              Ver o Explorar
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.2} />
            </Link>
          </div>
          <ul className="-mx-6 flex snap-x gap-3 overflow-x-auto px-6 pb-2 list-none m-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {posts.map((post, i) => (
              <li key={post.id} className="w-[200px] shrink-0 snap-start sm:w-[220px]">
                <CartazPost post={post} prioridade={i < 4} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Corredores ── */}
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-14 px-6 pt-14">
        {corredores.map(({ piso, itens }, i) => (
          <Corredor
            key={piso.slug}
            piso={piso}
            lojas={itens}
            destaques={destaques}
            urlDaLoja={urlDaLoja}
            limite={POR_CORREDOR}
            totalNoPiso={itens.length}
            prioridade={i === 0}
          />
        ))}
      </div>
    </ChromeSaguao>
  )
}
