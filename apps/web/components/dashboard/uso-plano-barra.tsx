'use client'

interface Props {
  atual: number
  maximo: number
  percentual: number
}

export function UsoPlanoBarra({ atual, maximo, percentual }: Props) {
  const cor =
    percentual >= 90 ? 'bg-red-500' :
    percentual >= 70 ? 'bg-amber-400' :
    'bg-[#4CAF82]'

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-600">Produtos cadastrados</span>
        <span className="text-sm font-medium text-[#1A4D3A]">
          {atual} / {maximo}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${cor}`}
          style={{ width: `${Math.min(percentual, 100)}%` }}
        />
      </div>
      {percentual >= 90 && (
        <p className="text-xs text-red-600 mt-2">
          Limite quase atingido.{' '}
          <a href="/dashboard/configuracoes/assinatura" className="underline">
            Faça upgrade do seu plano.
          </a>
        </p>
      )}
    </div>
  )
}
