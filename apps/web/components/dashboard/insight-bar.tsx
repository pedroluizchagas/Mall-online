import { TrendingUp } from 'lucide-react'

interface Props {
  destaque: string
  bairro: string
  delta: number
  sugestao: string
}

export function InsightBar({ destaque, bairro, delta, sugestao }: Props) {
  return (
    <div
      className="mt-4 rounded-lg flex items-center gap-3.5 p-4"
      style={{ background: 'var(--brick-lt)', border: '1px solid var(--brick)' }}
    >
      <div
        className="w-11 h-11 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
      >
        <TrendingUp className="w-5 h-5" strokeWidth={2} />
      </div>
      <div className="flex-1">
        <div className="text-sm font-bold">
          Seu piso{' '}
          <em
            className="not-italic px-1.5 rounded"
            style={{ background: 'var(--brick)' }}
          >
            {destaque}
          </em>{' '}
          está em alta — <span className="text-ink">+{delta}% no bairro {bairro}</span> esta semana.
        </div>
        <div className="text-xs text-ink-2 mt-1">{sugestao}</div>
      </div>
      <button
        className="px-4 py-2 rounded-full font-semibold text-xs whitespace-nowrap"
        style={{ background: 'var(--ink)', color: 'var(--bg)' }}
      >
        Aplicar
      </button>
    </div>
  )
}
