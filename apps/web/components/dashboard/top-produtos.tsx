import { formatarReais } from '@mallora/lib'

interface Produto {
  nome: string
  quantidade: number
  receita: number
}

interface Props {
  produtos: Produto[]
}

export function TopProdutos({ produtos }: Props) {
  if (produtos.length === 0) {
    return (
      <p className="text-sm text-ink-3 text-center py-6">
        Nenhum produto vendido no período.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {produtos.map((produto, i) => (
        <div
          key={produto.nome}
          className="flex items-center justify-between p-3 rounded-xl text-sm"
          style={{ background: 'var(--bg-2)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-ink-3 w-5 text-center">{i + 1}</span>
            <div>
              <p className="font-medium text-ink">{produto.nome}</p>
              <p className="text-xs text-ink-3">
                {produto.quantidade} vendido{produto.quantidade !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <span className="font-semibold text-ink">{formatarReais(produto.receita)}</span>
        </div>
      ))}
    </div>
  )
}
