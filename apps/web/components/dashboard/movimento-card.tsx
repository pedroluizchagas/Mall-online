import { BarChart } from '@/components/ui/bar-chart'

interface Props {
  hourly: { h: string; n: number }[]
  pico: { h: string; n: number }
  /** Pedidos na hora em curso. */
  agora: number
  /** Índice da hora em curso em `hourly` (-1 = fora do expediente). */
  indiceAgora?: number
  totalHoje: number
}

/** Movimento do dia: pedidos por hora do expediente e o resumo embaixo. */
export function MovimentoCard({ hourly, pico, agora, indiceAgora = -1, totalHoje }: Props) {
  return (
    <div className="cartao flex flex-1 flex-col p-5 sm:p-6">
      <div className="relative pt-6">
        <BarChart data={hourly} agora={indiceAgora} height={150} />
        {totalHoje === 0 && (
          <p className="pointer-events-none absolute inset-x-0 top-[38%] text-center text-[13.5px] text-ink-3">
            O movimento aparece aqui conforme os pedidos chegam.
          </p>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-line pt-4">
        <div>
          <dt className="micro text-ink-3">Hoje</dt>
          <dd className="mt-1.5 text-[17px] font-bold tracking-[-0.02em] text-ink tabular-nums">
            {totalHoje} {totalHoje === 1 ? 'pedido' : 'pedidos'}
          </dd>
        </div>
        <div>
          <dt className="micro text-ink-3">Pico</dt>
          <dd className="mt-1.5 text-[17px] font-bold tracking-[-0.02em] text-ink tabular-nums">
            {pico.n > 0 ? (
              <>
                {pico.h} <span className="font-medium text-ink-3">· {pico.n}</span>
              </>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div>
          <dt className="micro text-ink-3">Nesta hora</dt>
          <dd className="mt-1.5 text-[17px] font-bold tracking-[-0.02em] text-ink tabular-nums">
            {indiceAgora >= 0 ? `${agora} ${agora === 1 ? 'pedido' : 'pedidos'}` : 'Fora do expediente'}
          </dd>
        </div>
      </dl>
    </div>
  )
}
