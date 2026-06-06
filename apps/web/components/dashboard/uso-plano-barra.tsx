'use client'

interface Props {
  atual: number
  maximo: number
  percentual: number
}

export function UsoPlanoBarra({ atual, maximo, percentual }: Props) {
  const cor =
    percentual >= 90
      ? 'var(--err)'
      : percentual >= 70
        ? 'var(--warn)'
        : 'var(--brick-dk)'

  return (
    <div
      className="rounded-md p-4 border"
      style={{ background: 'var(--bg)', borderColor: 'var(--line)' }}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-ink-2">Produtos cadastrados</span>
        <span className="text-sm font-semibold text-ink">
          {atual} / {maximo}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-2)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(percentual, 100)}%`, background: cor }}
        />
      </div>
      {percentual >= 90 && (
        <p className="text-xs mt-2" style={{ color: 'var(--err)' }}>
          Limite quase atingido.{' '}
          <a href="/minha-conta?aba=assinatura" className="underline">
            Faça upgrade do seu plano.
          </a>
        </p>
      )}
    </div>
  )
}
