import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

/**
 * Tabela genérica dos relatórios (abas Produtos/Clientes/Bairros) —
 * mesmo idioma visual da tabela de TopProdutos.
 */
export interface ColunaTabela {
  titulo: string
  alinhar?: 'left' | 'right'
}

export function TabelaRelatorio({
  titulo,
  descricao,
  colunas,
  linhas,
  vazio,
}: {
  titulo: string
  descricao?: string
  colunas: ColunaTabela[]
  /** Cada linha é um array de células na ordem das colunas. */
  linhas: ReactNode[][]
  vazio?: string
}) {
  return (
    <Card>
      <h2 className="font-bold text-base text-ink mb-1">{titulo}</h2>
      {descricao && <p className="text-xs text-ink-3 mb-4">{descricao}</p>}
      {!descricao && <div className="mb-3" />}
      {linhas.length === 0 ? (
        <p className="text-sm text-ink-3">{vazio ?? 'Sem dados no período.'}</p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink-3">
                {colunas.map((c) => (
                  <th
                    key={c.titulo}
                    className={`px-2 py-2 font-semibold ${c.alinhar === 'right' ? 'text-right' : ''}`}
                  >
                    {c.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                  {linha.map((celula, j) => (
                    <td
                      key={j}
                      className={`px-2 py-2 tabular-nums ${
                        colunas[j]?.alinhar === 'right' ? 'text-right' : ''
                      }`}
                    >
                      {celula}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
