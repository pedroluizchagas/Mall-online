import { numero } from '@/lib/format'
import { CORES_TOM, type Tom } from '@/lib/status'

export interface Segmento {
  id: string
  rotulo: string
  valor: number
  tom: Tom
}

/**
 * Uma barra de 10px partida pelos status (cor só onde ela significa algo: o
 * tom do status) e a legenda com o número de cada fatia. Fatia zerada sai da
 * barra, mas fica na legenda — "0 em atraso" também é informação.
 */
export function BarraDistribuicao({ rotulo, segmentos }: { rotulo: string; segmentos: Segmento[] }) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0)
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="micro text-ink-3">{rotulo}</p>
        <p className="text-[12.5px] font-semibold text-ink-3 tabular-nums">{numero(total)}</p>
      </div>
      <div
        role="img"
        aria-label={`${rotulo}: ${segmentos.map((s) => `${s.valor} ${s.rotulo.toLowerCase()}`).join(', ')}`}
        className="mt-3 flex h-2.5 gap-[3px] overflow-hidden rounded-full bg-bg-2"
      >
        {total > 0 &&
          segmentos
            .filter((s) => s.valor > 0)
            .map((s) => (
              <span
                key={s.id}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${(s.valor / total) * 100}%`, background: CORES_TOM[s.tom].texto }}
              />
            ))}
      </div>
      <ul className="m-0 mt-3.5 grid list-none grid-cols-2 gap-x-4 gap-y-2 p-0">
        {segmentos.map((s) => (
          <li key={s.id} className="flex min-w-0 items-center gap-2 text-[13px]">
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: CORES_TOM[s.tom].texto }} />
            <span className="truncate text-ink-2">{s.rotulo}</span>
            <span className="ml-auto font-semibold text-ink tabular-nums">{numero(s.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
