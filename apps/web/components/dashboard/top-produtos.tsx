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
      <p className="text-sm text-gray-400 text-center py-6">
        Nenhum produto vendido no período.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {produtos.map((produto, i) => (
        <div
          key={produto.nome}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm"
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400 w-5 text-center">
              {i + 1}
            </span>
            <div>
              <p className="font-medium text-gray-700">{produto.nome}</p>
              <p className="text-xs text-gray-400">
                {produto.quantidade} vendido{produto.quantidade !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <span className="font-semibold text-[#1A4D3A]">
            {formatarReais(produto.receita)}
          </span>
        </div>
      ))}
    </div>
  )
}
