import { Card } from '@/components/ui/card'

export interface ItemDistribuicao {
  rotulo: string
  valor: number
}

interface Props {
  titulo: string
  itens: ItemDistribuicao[]
  formatarValor?: (valor: number) => string
  vazio?: string
}

function formatarPercentual(parcial: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((parcial / total) * 100)}%`
}

export function BarraDistribuicao({ titulo, itens, formatarValor, vazio }: Props) {
  const total = itens.reduce((s, i) => s + i.valor, 0)
  const ordenados = [...itens].sort((a, b) => b.valor - a.valor)

  return (
    <Card>
      <h2 className="font-bold text-base text-ink mb-4">{titulo}</h2>
      {ordenados.length === 0 || total === 0 ? (
        <p className="text-sm text-ink-3">{vazio ?? 'Sem dados no período.'}</p>
      ) : (
        <ul className="space-y-3">
          {ordenados.map((item) => {
            const pct = total === 0 ? 0 : (item.valor / total) * 100
            return (
              <li key={item.rotulo}>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-[13px] text-ink font-medium truncate">{item.rotulo}</span>
                  <span className="text-[12px] text-ink-3 whitespace-nowrap">
                    {formatarValor ? formatarValor(item.valor) : item.valor}
                    {' · '}
                    <span className="text-ink-2 font-semibold">{formatarPercentual(item.valor, total)}</span>
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: 'var(--bg-2)' }}
                  role="progressbar"
                  aria-valuenow={Math.round(pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: 'var(--brick)' }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
