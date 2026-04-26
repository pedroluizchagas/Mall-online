'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  registrarEntradaEstoque,
  registrarAjusteEstoque,
} from '@/lib/actions/estoque'

const inputClass =
  'w-full border rounded-xl px-4 py-2.5 text-sm text-ink bg-bg focus:outline-none focus:ring-2 focus:ring-brick transition-shadow'

function BotaoSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 py-2.5 rounded-full text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
      style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
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
  const action = tipo === 'entrada' ? registrarEntradaEstoque : registrarAjusteEstoque
  const [estado, dispatch] = useActionState(action, null)

  if (estado?.sucesso) {
    onFechar()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: 'var(--bg)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
      >
        <h3 className="font-semibold text-ink mb-1">
          {tipo === 'entrada' ? 'Entrada de estoque' : 'Ajuste de estoque'}
        </h3>
        <p className="text-sm text-ink-3 mb-1">{produto.nome}</p>
        <p className="text-xs text-ink-3 mb-4">
          Estoque atual: {produto.stock_quantity ?? 0} unidades
        </p>

        <form action={dispatch} className="space-y-4">
          <input type="hidden" name="product_id" value={produto.id} />

          {tipo === 'ajuste' && (
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1">Tipo de ajuste</label>
              <select
                name="tipo"
                className={inputClass}
                style={{ borderColor: 'var(--line)' }}
              >
                <option value="ajuste_positivo">Adicionar (contagem, correção)</option>
                <option value="ajuste_negativo">Remover (perda, vencimento, etc.)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1">Quantidade</label>
            <input
              name="quantidade"
              type="number"
              min="1"
              required
              className={inputClass}
              style={{ borderColor: 'var(--line)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1">
              {tipo === 'ajuste' ? 'Motivo (obrigatório)' : 'Motivo (opcional)'}
            </label>
            <input
              name="motivo"
              type="text"
              required={tipo === 'ajuste'}
              placeholder={
                tipo === 'entrada' ? 'Ex: Compra do fornecedor' : 'Ex: Produto vencido, contagem física'
              }
              className={inputClass}
              style={{ borderColor: 'var(--line)' }}
            />
          </div>

          {estado?.erro && (
            <p className="text-sm px-3 py-2 rounded-xl" style={{ background: '#fde8e4', color: 'var(--err)' }}>
              {estado.erro}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onFechar}
              className="flex-1 py-2.5 rounded-full text-sm font-medium"
              style={{ border: '1px solid var(--line)', color: 'var(--ink-2)' }}
            >
              Cancelar
            </button>
            <BotaoSubmit label={tipo === 'entrada' ? 'Registrar entrada' : 'Registrar ajuste'} />
          </div>
        </form>
      </div>
    </div>
  )
}
