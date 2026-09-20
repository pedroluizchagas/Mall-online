import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { SUBTITULO_POR_PISO, type Piso } from '@mallevo/lib'

import { Fachada } from '@/components/vitrines/_base/Fachada'
import type { DestaqueLoja, LojaSaguao } from '@/lib/saguao'

/**
 * Corredor de um piso: LETREIRO (sobrelinha, nome, subtítulo — só texto,
 * como o consumer decidiu) + a fileira de FACHADAS, cada uma vestindo a pele
 * da própria loja. Desktop nativo: grade de 2 a 4 colunas; no celular, uma
 * fachada por linha.
 */
export function Corredor({
  piso,
  lojas,
  destaques,
  urlDaLoja,
  limite,
  totalNoPiso,
  prioridade = false,
}: {
  piso: Piso
  lojas: LojaSaguao[]
  destaques: Map<string, DestaqueLoja[]>
  urlDaLoja: (slug: string) => string
  /** Quantas fachadas mostrar aqui (a home corta; a página do piso mostra tudo). */
  limite?: number
  totalNoPiso: number
  /** Primeiro corredor da página: as fachadas estão acima da dobra. */
  prioridade?: boolean
}) {
  const visiveis = limite ? lojas.slice(0, limite) : lojas
  const restantes = totalNoPiso - visiveis.length
  const numero = String(piso.ordem).padStart(2, '0')

  return (
    <section id={`piso-${piso.slug}`} className="scroll-mt-24" aria-labelledby={`letreiro-${piso.slug}`}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-[1.2px] text-ink-soft">
            PISO {numero} · {totalNoPiso} {totalNoPiso === 1 ? 'LOJA' : 'LOJAS'}
          </p>
          <h2 id={`letreiro-${piso.slug}`} className="mt-1 font-display text-[26px] font-extrabold leading-tight tracking-[-0.5px] sm:text-[30px]">
            {piso.nome}
          </h2>
          {SUBTITULO_POR_PISO[piso.slug] && <p className="mt-1 text-[14px] text-ink-muted">{SUBTITULO_POR_PISO[piso.slug]}</p>}
        </div>
        {restantes > 0 && (
          <Link
            href={`/piso/${piso.slug}`}
            className="inline-flex items-center gap-1 text-[13px] font-bold text-ink underline-offset-4 hover:underline"
          >
            Ver todas as {totalNoPiso} lojas
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.2} />
          </Link>
        )}
      </div>

      <ul className="grid list-none grid-cols-1 gap-4 p-0 m-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visiveis.map((loja, i) => (
          <li key={loja.id} className="min-w-0">
            <Fachada
              loja={loja}
              pisoSlug={piso.slug}
              pisoOrdem={piso.ordem}
              destaques={destaques.get(loja.id) ?? []}
              href={urlDaLoja(loja.slug)}
              prioridade={prioridade && i < 4}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
