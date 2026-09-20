import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PISOS, SUBTITULO_POR_PISO, agruparPorPiso, getPiso } from '@mallevo/lib'

import { ChromeSaguao } from '@/components/saguao/ChromeSaguao'
import { Corredor } from '@/components/saguao/Corredor'
import { Diretorio } from '@/components/saguao/Diretorio'
import { FontesDasLojas } from '@/components/saguao/FontesDasLojas'
import { carregarDestaques, carregarLojas, urlDaLoja, urlDoShopping } from '@/lib/saguao'

/** Página de um piso: todas as lojas dele, com a pele de cada uma. */
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const piso = getPiso(params.slug)
  if (!piso) return { title: 'Mallevo' }
  const title = `${piso.nome} · Mallevo`
  const description = `${SUBTITULO_POR_PISO[piso.slug] ?? piso.nome} de Divinópolis, com entrega e pagamento online.`
  return {
    title,
    description,
    alternates: { canonical: `${urlDoShopping()}/piso/${piso.slug}` },
    openGraph: { title, description, type: 'website' },
  }
}

export default async function PaginaPiso({ params }: { params: { slug: string } }) {
  const piso = getPiso(params.slug)
  if (!piso) notFound()

  const lojas = await carregarLojas()
  const corredores = agruparPorPiso(lojas)
  const corredor = corredores.find((c) => c.piso.slug === piso.slug)
  const itens = corredor?.itens ?? []
  const destaques = await carregarDestaques(itens.map((l) => l.id))
  const pisosComLoja = corredores.map((c) => c.piso)

  return (
    <ChromeSaguao ativo="piso">
      <FontesDasLojas themes={itens.map((l) => l.theme)} />

      <div className="mx-auto w-full max-w-[1200px] px-6 pt-10">
        <Diretorio pisos={pisosComLoja.length > 0 ? pisosComLoja : [...PISOS]} ativo={piso.slug} modo="rota" />
      </div>

      <div className="mx-auto w-full max-w-[1200px] px-6 pt-12">
        {itens.length > 0 ? (
          <Corredor piso={piso} lojas={itens} destaques={destaques} urlDaLoja={urlDaLoja} totalNoPiso={itens.length} prioridade />
        ) : (
          <section className="rounded-[20px] bg-surface px-8 py-16 text-center shadow-soft" aria-label={piso.nome}>
            <p className="text-[11px] font-bold tracking-[1.2px] text-ink-soft">PISO {String(piso.ordem).padStart(2, '0')}</p>
            <h1 className="mt-2 font-display text-[28px] font-extrabold tracking-[-0.5px]">{piso.nome}</h1>
            <p className="mx-auto mt-3 max-w-[40ch] text-[15px] text-ink-muted">
              Ainda não há lojas neste piso. {SUBTITULO_POR_PISO[piso.slug] ? `${SUBTITULO_POR_PISO[piso.slug]} chegam em breve.` : 'Volte em breve.'}
            </p>
          </section>
        )}
      </div>
    </ChromeSaguao>
  )
}
