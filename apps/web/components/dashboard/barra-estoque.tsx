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
      ? 'bg-red-500'
      : atual <= minimo
      ? 'bg-amber-400'
      : 'bg-[#4CAF82]'

  return (
    <div className="space-y-1">
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${cor}`}
          style={{ width: `${percentual}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>Mínimo: {minimo}</span>
        <span>{percentual}%</span>
      </div>
    </div>
  )
}
