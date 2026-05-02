'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function MiniCalendario() {
  const hoje = new Date()
  const [ref, setRef] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1))

  const primeiroDia = ref.getDay()
  const diasNoMes = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(primeiroDia).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ]

  const prev = () => setRef(new Date(ref.getFullYear(), ref.getMonth() - 1, 1))
  const next = () => setRef(new Date(ref.getFullYear(), ref.getMonth() + 1, 1))

  const isHoje = (dia: number) =>
    dia === hoje.getDate() &&
    ref.getMonth() === hoje.getMonth() &&
    ref.getFullYear() === hoje.getFullYear()

  return (
    <div className="bg-bg border border-line rounded-lg p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-ink">
          {MESES[ref.getMonth()]} {ref.getFullYear()}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={prev}
            className="w-7 h-7 rounded-sm hover:bg-bg-2 flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={14} className="text-ink-3" />
          </button>
          <button
            onClick={next}
            className="w-7 h-7 rounded-sm hover:bg-bg-2 flex items-center justify-center transition-colors"
          >
            <ChevronRight size={14} className="text-ink-3" />
          </button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {DIAS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-ink-3 py-1 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((dia, i) =>
          !dia ? (
            <div key={`empty-${i}`} />
          ) : (
            <button
              key={i}
              className={`w-full aspect-square flex items-center justify-center text-[11px] rounded-full font-medium transition-colors ${
                isHoje(dia)
                  ? 'text-brick-ink font-bold'
                  : 'text-ink-2 hover:bg-bg-2'
              }`}
              style={isHoje(dia) ? { background: 'var(--brick)' } : {}}
            >
              {dia}
            </button>
          )
        )}
      </div>
    </div>
  )
}
