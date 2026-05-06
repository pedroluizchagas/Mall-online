interface Props {
  atual: number
  minimo: number
  maximo?: number
}

export function BarraEstoque({ atual, minimo, maximo }: Props) {
  const referencia = maximo ?? Math.max(atual, minimo) * 2
  const percentual =
    referencia > 0 ? Math.min(100, Math.round((atual / referencia) * 100)) : 0

  const cor =
    atual === 0
      ? 'var(--err)'
      : atual <= minimo
      ? 'var(--warn)'
      : 'var(--brick)'

  return (
    <div className="space-y-1">
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--bg-3)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percentual}%`, background: cor }}
        />
      </div>
      <div className="flex justify-between text-xs text-ink-3">
        <span>Mínimo: {minimo}</span>
        <span>{percentual}%</span>
      </div>
    </div>
  )
}
