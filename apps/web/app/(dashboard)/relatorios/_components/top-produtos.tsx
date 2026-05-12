import { Card } from '@/components/ui/card'

export interface ProdutoAgregado {
  productId: string | null
  nome: string
  quantidade: number
  receita: number
}

interface Props { produtos: ProdutoAgregado[] }

function formatarBRL(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function TopProdutos({ produtos }: Props) {
  const totalReceita = produtos.reduce((s, p) => s + p.receita, 0)

  return (
    <Card>
      <h2 className="font-bold text-base text-ink mb-4">Top 10 produtos</h2>
      {produtos.length === 0 ? (
        <p className="text-sm text-ink-3">Sem produtos vendidos no período.</p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink-3">
                <th className="px-2 py-2 font-semibold">#</th>
                <th className="px-2 py-2 font-semibold">Produto</th>
                <th className="px-2 py-2 font-semibold text-right">Qtd</th>
                <th className="px-2 py-2 font-semibold text-right">Receita</th>
                <th className="px-2 py-2 font-semibold text-right">% do total</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p, i) => {
                const pct = totalReceita === 0 ? 0 : (p.receita / totalReceita) * 100
                return (
                  <tr
                    key={`${p.productId ?? 'sem-id'}-${i}`}
                    style={{ borderTop: '1px solid var(--line)' }}
                  >
                    <td className="px-2 py-2 text-ink-3 tabular-nums">{i + 1}</td>
                    <td className="px-2 py-2 text-ink">{p.nome}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{p.quantidade}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatarBRL(p.receita)}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-ink-2">
                      {pct.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
