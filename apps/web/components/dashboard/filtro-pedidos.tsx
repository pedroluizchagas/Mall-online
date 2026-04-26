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
          className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
          style={
            filtroAtivo === op.valor
              ? { background: 'var(--ink)', color: 'var(--bg)' }
              : { background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink-2)' }
          }
        >
          {op.label}
        </button>
      ))}
    </div>
  )
}
