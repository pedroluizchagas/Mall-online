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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">
          {MESES[ref.getMonth()]} {ref.getFullYear()}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={prev}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={14} className="text-gray-400" />
          </button>
          <button
            onClick={next}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <ChevronRight size={14} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {DIAS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">
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
              className={`w-full aspect-square flex items-center justify-center text-xs rounded-full font-medium transition-colors ${
                isHoje(dia)
                  ? 'bg-[#4CAF82] text-white shadow-sm shadow-[#4CAF82]/40'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {dia}
            </button>
          )
        )}
      </div>
    </div>
  )
}
