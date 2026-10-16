'use client'

import { useState } from 'react'

interface Bar {
  h: string
  n: number
}

interface Props {
  data: Bar[]
  height?: number
  /** Índice da barra do agora (a hora em curso). */
  agora?: number
}

/**
 * Barras por hora, monocromáticas: horas passadas em grafite (≥ 3:1 sobre
 * branco), o agora em tinta com o ponto aceso em cima, horas que ainda não
 * chegaram em trilho claro. O número aparece no hover/foco — nada piscando
 * sozinho.
 */
export function BarChart({ data, height = 120, agora = -1 }: Props) {
  const [ativo, setAtivo] = useState(-1)
  const max = Math.max(...data.map((d) => d.n), 1)

  return (
    <div className="flex items-end gap-1.5" style={{ height }} onMouseLeave={() => setAtivo(-1)}>
      {data.map((d, i) => {
        const futuro = agora >= 0 && i > agora
        const ehAgora = i === agora
        const realcado = i === ativo
        return (
          <div
            key={d.h}
            className="relative flex h-full flex-1 flex-col items-center justify-end gap-1.5 outline-none"
            onMouseEnter={() => setAtivo(i)}
            onFocus={() => setAtivo(i)}
            onBlur={() => setAtivo(-1)}
            tabIndex={0}
            aria-label={`${d.h}: ${d.n} ${d.n === 1 ? 'pedido' : 'pedidos'}`}
          >
            {realcado && (
              <span className="pointer-events-none absolute -top-1 left-1/2 z-[1] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-ink px-2 py-1 text-[10.5px] font-bold text-bg">
                {d.n} {d.n === 1 ? 'pedido' : 'pedidos'}
              </span>
            )}
            {ehAgora && (
              <span aria-hidden className="pulso size-1.5 shrink-0 rounded-full" style={{ background: 'var(--brick)', boxShadow: '0 0 0 2px var(--ink)' }} />
            )}
            <div
              className="w-full rounded-[5px] transition-[height,background-color] duration-500 ease-entrada"
              style={{
                // A altura útil desconta o rótulo da hora e o ponto do agora (≈34px),
                // senão as barras mais altas batem no teto e empatam.
                height: futuro ? 4 : `max(4px, calc((100% - 34px) * ${d.n / max}))`,
                background: futuro
                  ? 'var(--bg-3)'
                  : ehAgora || realcado
                    ? 'var(--ink)'
                    : d.n === 0
                      ? 'var(--bg-3)'
                      : 'var(--ink-4)',
              }}
            />
            <span className={`text-[10px] font-semibold ${ehAgora ? 'text-ink' : 'text-ink-3'}`}>{d.h}</span>
          </div>
        )
      })}
    </div>
  )
}
