'use client'

import { useState } from 'react'
import { formatarReais } from '@mallevo/lib'
import { cx } from '@/lib/cx'
import { numero } from '@/lib/format'

export interface PontoMes {
  mes: string
  /** "out" — o eixo. */
  curto: string
  /** "outubro de 2026" — o leitor de tela e a etiqueta. */
  longo: string
  gmv: number
  pedidos: number
  comissoes: number
}

type Metrica = 'gmv' | 'pedidos' | 'comissoes'

const METRICAS: { id: Metrica; rotulo: string; formatar: (v: number) => string }[] = [
  { id: 'gmv', rotulo: 'GMV', formatar: formatarReais },
  { id: 'pedidos', rotulo: 'Pedidos', formatar: (v) => `${numero(v)} ${v === 1 ? 'pedido' : 'pedidos'}` },
  { id: 'comissoes', rotulo: 'Comissões', formatar: formatarReais },
]

/**
 * Os últimos 12 meses em barras monocromáticas (a régua do BarChart do
 * painel web): meses passados em grafite, o mês corrente em tinta com o
 * ponto aceso, mês sem pedido em trilho claro. O valor aparece no hover ou
 * no foco — nada piscando sozinho. GMV e comissão vivem em escalas
 * diferentes (R$ 1 por pedido), por isso uma métrica de cada vez.
 */
export function GraficoMeses({ serie }: { serie: PontoMes[] }) {
  const [metrica, setMetrica] = useState<Metrica>('gmv')
  const [ativo, setAtivo] = useState(-1)
  const def = METRICAS.find((m) => m.id === metrica)!
  const valores = serie.map((p) => p[metrica])
  const max = Math.max(...valores, 1)
  const atual = serie.length - 1
  const vazio = valores.every((v) => v === 0)

  const total = valores.reduce((s, v) => s + v, 0)
  const melhor = serie.reduce((a, b, i) => (b[metrica] > serie[a][metrica] ? i : a), 0)

  return (
    <div className="cartao flex flex-1 flex-col p-5 sm:p-6">
      <div role="tablist" aria-label="Métrica do gráfico" className="-m-1 flex gap-1 overflow-x-auto p-1">
        {METRICAS.map((m) => {
          const selecionada = m.id === metrica
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={selecionada}
              onClick={() => setMetrica(m.id)}
              className={cx(
                'flex h-8 shrink-0 items-center rounded-full px-3.5 text-[13px] font-semibold transition-colors duration-200',
                selecionada ? 'bg-ink text-bg' : 'text-ink-2 hover:bg-bg-2 hover:text-ink',
              )}
            >
              {m.rotulo}
            </button>
          )
        })}
      </div>

      <div className="relative mt-6 pt-7">
        <div className="flex h-[168px] items-end gap-1.5 sm:gap-2" onMouseLeave={() => setAtivo(-1)}>
          {serie.map((p, i) => {
            const v = p[metrica]
            const ehAtual = i === atual
            const realcado = i === ativo
            return (
              <div
                key={p.mes}
                className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5 outline-none"
                onMouseEnter={() => setAtivo(i)}
                onFocus={() => setAtivo(i)}
                onBlur={() => setAtivo(-1)}
                tabIndex={0}
                aria-label={`${p.longo}: ${def.formatar(v)}`}
              >
                {realcado && (
                  <span className="pointer-events-none absolute -top-1 left-1/2 z-[1] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold text-bg tabular-nums">
                    {def.formatar(v)}
                  </span>
                )}
                {ehAtual && (
                  <span
                    aria-hidden
                    className="pulso size-1.5 shrink-0 rounded-full"
                    style={{ background: 'var(--brick)', boxShadow: '0 0 0 2px var(--ink)' }}
                  />
                )}
                <div
                  className="w-full rounded-[5px] transition-[height,background-color] duration-500 ease-entrada"
                  style={{
                    // A altura útil desconta o rótulo do mês e o ponto do agora.
                    height: `max(4px, calc((100% - 34px) * ${v / max}))`,
                    background: ehAtual || realcado ? 'var(--ink)' : v === 0 ? 'var(--bg-3)' : 'var(--ink-4)',
                  }}
                />
                <span className={cx('text-[10.5px] font-semibold', ehAtual ? 'text-ink' : 'text-ink-3')}>{p.curto}</span>
              </div>
            )
          })}
        </div>
        {vazio && (
          <p className="pointer-events-none absolute inset-x-0 top-[42%] text-center text-[13.5px] text-ink-3">
            Os meses ganham barra conforme os pedidos são entregues.
          </p>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-line pt-4">
        <div className="min-w-0">
          <dt className="micro text-ink-3">12 meses</dt>
          <dd className="mt-1.5 truncate text-[16px] font-bold tracking-[-0.02em] text-ink tabular-nums">{def.formatar(total)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="micro text-ink-3">Melhor mês</dt>
          <dd className="mt-1.5 truncate text-[16px] font-bold tracking-[-0.02em] text-ink">
            {vazio ? '—' : <span className="capitalize">{`${serie[melhor].curto} ${serie[melhor].mes.slice(0, 4)}`}</span>}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="micro text-ink-3">Este mês</dt>
          <dd className="mt-1.5 truncate text-[16px] font-bold tracking-[-0.02em] text-ink tabular-nums">
            {def.formatar(valores[atual] ?? 0)}
          </dd>
        </div>
      </dl>
    </div>
  )
}
