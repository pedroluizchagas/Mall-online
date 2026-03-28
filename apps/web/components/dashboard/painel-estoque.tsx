'use client'

import { useState } from 'react'
import { BarraEstoque } from './barra-estoque'
import { ModalMovimentacao } from './modal-movimentacao'

interface Produto {
  id: string
  nome: string
  foto_url?: string | null
  disponivel: boolean
  track_stock: boolean
  stock_quantity?: number | null
  stock_minimo?: number | null
  categories?: { nome: string } | null
}

interface Props {
  produtos: Produto[]
}

export function PainelEstoque({ produtos }: Props) {
  const produtosComEstoque = produtos.filter((p) => p.track_stock)
  const semEstoque = produtos.filter((p) => !p.track_stock)
  const alertas = produtosComEstoque.filter(
    (p) => (p.stock_quantity ?? 0) <= (p.stock_minimo ?? 0)
  )

  return (
    <div className="space-y-6">
      {alertas.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-2">
            {alertas.length} produto{alertas.length !== 1 ? 's' : ''} com
            estoque baixo
          </p>
          <div className="space-y-1">
            {alertas.map((p) => (
              <p key={p.id} className="text-sm text-amber-700">
                {p.nome} —{' '}
                {p.stock_quantity ?? 0} unidade
                {(p.stock_quantity ?? 0) !== 1 ? 's' : ''} restante
                {(p.stock_quantity ?? 0) !== 1 ? 's' : ''}
              </p>
            ))}
          </div>
        </div>
      )}

      {produtosComEstoque.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Com controle de estoque
          </p>
          <div className="space-y-3">
            {produtosComEstoque.map((produto) => (
              <CardEstoque key={produto.id} produto={produto} />
            ))}
          </div>
        </div>
      )}

      {semEstoque.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Sem controle de estoque
          </p>
          <div className="space-y-2">
            {semEstoque.map((produto) => (
              <div
                key={produto.id}
                className="bg-white rounded-xl border border-gray-100
                  px-4 py-3 flex items-center justify-between"
              >
                <span className="text-sm text-gray-700">{produto.nome}</span>
                <span className="text-xs text-gray-400">
                  Controle desativado
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CardEstoque({ produto }: { produto: Produto }) {
  const [modalAberto, setModalAberto] = useState<'entrada' | 'ajuste' | null>(
    null
  )

  const estaAbaixoMinimo =
    (produto.stock_quantity ?? 0) <= (produto.stock_minimo ?? 0)
  const estaZerado = (produto.stock_quantity ?? 0) === 0

  return (
    <>
      <div
        className={`bg-white rounded-xl border p-4 ${
          estaZerado
            ? 'border-red-200'
            : estaAbaixoMinimo
            ? 'border-amber-200'
            : 'border-gray-100'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">{produto.nome}</p>
            {produto.categories?.nome && (
              <p className="text-xs text-gray-400 mt-0.5">
                {produto.categories.nome}
              </p>
            )}
          </div>
          <div className="text-right">
            <p
              className={`text-2xl font-bold ${
                estaZerado
                  ? 'text-red-600'
                  : estaAbaixoMinimo
                  ? 'text-amber-600'
                  : 'text-[#1A4D3A]'
              }`}
            >
              {produto.stock_quantity ?? 0}
            </p>
            <p className="text-xs text-gray-400">unidades</p>
          </div>
        </div>

        {produto.stock_minimo != null && produto.stock_minimo > 0 && (
          <BarraEstoque
            atual={produto.stock_quantity ?? 0}
            minimo={produto.stock_minimo}
          />
        )}

        {estaZerado && (
          <p className="text-xs text-red-600 mt-2">
            Produto indisponível — estoque zerado
          </p>
        )}
        {!estaZerado && estaAbaixoMinimo && (
          <p className="text-xs text-amber-600 mt-2">
            Estoque abaixo do mínimo ({produto.stock_minimo} unidades)
          </p>
        )}

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setModalAberto('entrada')}
            className="flex-1 bg-[#1A4D3A] text-white py-2 rounded-lg text-sm font-medium
              hover:bg-[#163d2e] transition-colors"
          >
            Entrada
          </button>
          <button
            onClick={() => setModalAberto('ajuste')}
            className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg
              text-sm font-medium hover:border-gray-300 transition-colors"
          >
            Ajuste
          </button>
          <a
            href={`/dashboard/estoque/${produto.id}`}
            className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg
              text-sm font-medium hover:border-gray-300 transition-colors text-center"
          >
            Histórico
          </a>
        </div>
      </div>

      {modalAberto && (
        <ModalMovimentacao
          produto={produto}
          tipo={modalAberto}
          onFechar={() => setModalAberto(null)}
        />
      )}
    </>
  )
}
