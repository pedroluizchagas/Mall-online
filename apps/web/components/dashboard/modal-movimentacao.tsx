'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  registrarEntradaEstoque,
  registrarAjusteEstoque,
} from '@/lib/actions/estoque'

function BotaoSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 bg-[#1A4D3A] text-white py-2.5 rounded-lg
        text-sm font-medium disabled:opacity-50"
    >
      {pending ? 'Salvando...' : label}
    </button>
  )
}

interface Props {
  produto: { id: string; nome: string; stock_quantity?: number | null }
  tipo: 'entrada' | 'ajuste'
  onFechar: () => void
}

export function ModalMovimentacao({ produto, tipo, onFechar }: Props) {
  const action =
    tipo === 'entrada' ? registrarEntradaEstoque : registrarAjusteEstoque
  const [estado, dispatch] = useActionState(action, null)

  if (estado?.sucesso) {
    onFechar()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-[#1A4D3A] mb-1">
          {tipo === 'entrada' ? 'Entrada de estoque' : 'Ajuste de estoque'}
        </h3>
        <p className="text-sm text-gray-500 mb-4">{produto.nome}</p>
        <p className="text-xs text-gray-400 mb-4">
          Estoque atual: {produto.stock_quantity ?? 0} unidades
        </p>

        <form action={dispatch} className="space-y-4">
          <input type="hidden" name="product_id" value={produto.id} />

          {tipo === 'ajuste' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tipo de ajuste
              </label>
              <select
                name="tipo"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5
                  text-sm focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
              >
                <option value="ajuste_positivo">
                  Adicionar (contagem, correção)
                </option>
                <option value="ajuste_negativo">
                  Remover (perda, vencimento, etc.)
                </option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Quantidade
            </label>
            <input
              name="quantidade"
              type="number"
              min="1"
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5
                text-sm focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {tipo === 'ajuste' ? 'Motivo (obrigatório)' : 'Motivo (opcional)'}
            </label>
            <input
              name="motivo"
              type="text"
              required={tipo === 'ajuste'}
              placeholder={
                tipo === 'entrada'
                  ? 'Ex: Compra do fornecedor'
                  : 'Ex: Produto vencido, contagem física'
              }
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5
                text-sm focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            />
          </div>

          {estado?.erro && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {estado.erro}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onFechar}
              className="flex-1 border border-gray-200 py-2.5 rounded-lg
                text-sm text-gray-600"
            >
              Cancelar
            </button>
            <BotaoSubmit
              label={
                tipo === 'entrada' ? 'Registrar entrada' : 'Registrar ajuste'
              }
            />
          </div>
        </form>
      </div>
    </div>
  )
}
