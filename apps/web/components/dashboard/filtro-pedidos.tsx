'use client'

type StatusFiltro = 'todos' | 'ativos' | 'entregues' | 'cancelados'

const opcoes: { valor: StatusFiltro; label: string }[] = [
  { valor: 'ativos', label: 'Ativos' },
  { valor: 'todos', label: 'Todos' },
  { valor: 'entregues', label: 'Entregues' },
  { valor: 'cancelados', label: 'Cancelados' },
]

export function FiltroPedidos({
  filtroAtivo,
  onChange,
}: {
  filtroAtivo: StatusFiltro
  onChange: (f: StatusFiltro) => void
}) {
  return (
    <div className="flex gap-2">
      {opcoes.map((op) => (
        <button
          key={op.valor}
          onClick={() => onChange(op.valor)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filtroAtivo === op.valor
              ? 'bg-[#1A4D3A] text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          {op.label}
        </button>
      ))}
    </div>
  )
}
