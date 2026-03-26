'use client'

import { useTransition } from 'react'
import { formatarReais } from '@mallora/lib'
import { toggleDisponibilidade, excluirProduto } from '@/lib/actions/produtos'

interface Produto {
  id: string
  nome: string
  descricao?: string
  preco: number
  preco_promocional?: number | null
  foto_url?: string | null
  disponivel: boolean
  track_stock: boolean
  stock_quantity?: number | null
  categories?: { nome: string; icone?: string } | null
}

interface Props {
  produtos: Produto[]
  storeId: string
}

export function ListaProdutos({ produtos, storeId }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleToggle(id: string, disponivel: boolean) {
    startTransition(async () => {
      await toggleDisponibilidade(id, !disponivel)
    })
  }

  function handleExcluir(id: string) {
    if (!confirm('Excluir este produto? Esta ação não pode ser desfeita.')) return
    startTransition(async () => {
      await excluirProduto(id)
    })
  }

  if (produtos.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">Nenhum produto cadastrado ainda.</p>
        <p className="text-sm mt-1">
          Clique em &quot;Novo produto&quot; para começar.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {produtos.map((produto) => (
        <div
          key={produto.id}
          className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4"
        >
          {/* Foto */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {produto.foto_url ? (
              <img
                src={produto.foto_url}
                alt={produto.nome}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">
                ?
              </div>
            )}
          </div>

          {/* Dados */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-800 truncate">{produto.nome}</h3>
              {produto.categories && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {produto.categories.icone} {produto.categories.nome}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[#1A4D3A] font-semibold">
                {formatarReais(produto.preco)}
              </span>
              {produto.preco_promocional && (
                <span className="text-xs text-gray-400 line-through">
                  {formatarReais(produto.preco_promocional)}
                </span>
              )}
            </div>
            {produto.track_stock && (
              <p className="text-xs text-gray-400 mt-0.5">
                Estoque: {produto.stock_quantity ?? 0} unidades
              </p>
            )}
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => handleToggle(produto.id, produto.disponivel)}
              disabled={isPending}
              className={`relative w-10 h-6 rounded-full transition-colors ${
                produto.disponivel ? 'bg-[#4CAF82]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  produto.disponivel ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>

            <a
              href={`/dashboard/produtos/${produto.id}`}
              className="text-sm text-[#4CAF82] hover:underline"
            >
              Editar
            </a>

            <button
              onClick={() => handleExcluir(produto.id)}
              disabled={isPending}
              className="text-sm text-red-400 hover:text-red-600"
            >
              Excluir
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
