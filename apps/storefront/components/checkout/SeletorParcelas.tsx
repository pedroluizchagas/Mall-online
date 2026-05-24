'use client'

import { formatarReais } from '@/lib/format'

/**
 * SeletorParcelas — port RN→DOM de
 * apps/mobile-consumer/components/SeletorParcelas.tsx (Stage 3d).
 *
 * UI pura. Mesma matemática de juros (Price/PMT) do mobile — valores
 * indicativos; o valor final é definido pelo emissor (igual ao mobile).
 */

interface Props {
  total: number
  selecionado: number
  onSelecionar: (parcelas: number) => void
  maxParcelas?: number
  parcelasSemJuros?: number
}

const TAXA_JUROS_MENSAL = 0.025

function calcularValorParcela(
  total: number,
  parcelas: number,
  semJuros: number
) {
  if (parcelas <= semJuros) {
    return Math.round(total / parcelas)
  }
  const i = TAXA_JUROS_MENSAL
  const fator =
    (i * Math.pow(1 + i, parcelas)) / (Math.pow(1 + i, parcelas) - 1)
  return Math.round(total * fator)
}

export function SeletorParcelas({
  total,
  selecionado,
  onSelecionar,
  maxParcelas = 12,
  parcelasSemJuros = 3,
}: Props) {
  const opcoes = Array.from({ length: maxParcelas }, (_, idx) => {
    const n = idx + 1
    const valorParcela = calcularValorParcela(total, n, parcelasSemJuros)
    const semJuros = n <= parcelasSemJuros
    return { n, valorParcela, semJuros }
  })

  return (
    <div className="px-6 pt-6">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">
        Parcelamento
      </p>

      <div className="max-h-[260px] overflow-y-auto">
        <div className="flex flex-col gap-2">
          {opcoes.map((op) => {
            const ativo = selecionado === op.n
            return (
              <button
                key={op.n}
                type="button"
                onClick={() => onSelecionar(op.n)}
                className={`flex items-center gap-3 rounded-md border p-3.5 text-left transition-colors ${
                  ativo
                    ? 'border-accent bg-accent-soft'
                    : 'border-line bg-surface'
                }`}
              >
                <span
                  className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
                    ativo
                      ? 'border-ink bg-ink text-accent'
                      : 'border-line text-transparent'
                  }`}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                </span>

                <span className="flex flex-1 items-center justify-between">
                  <span className="text-sm font-bold text-ink">
                    {op.n}× de {formatarReais(op.valorParcela)}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      op.semJuros ? 'text-success' : 'text-ink-muted'
                    }`}
                  >
                    {op.semJuros
                      ? 'sem juros'
                      : `total ${formatarReais(op.valorParcela * op.n)}`}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <p className="mt-3 text-xs font-medium text-ink-soft">
        Valores indicativos. O valor final pode variar conforme o emissor do
        cartão.
      </p>
    </div>
  )
}
