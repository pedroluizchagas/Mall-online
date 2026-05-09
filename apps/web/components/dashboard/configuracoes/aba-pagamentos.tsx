'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { atualizarMetodosPagamento } from '@/lib/actions/lojas'

const METODOS = [
  {
    id: 'aceita_dinheiro',
    label: 'Dinheiro na entrega',
    descricao: 'Entregador recebe em dinheiro e faz o troco',
  },
  {
    id: 'aceita_pix',
    label: 'PIX na entrega',
    descricao: 'Consumidor paga por PIX direto ao entregador',
  },
  {
    id: 'aceita_cartao_maquininha',
    label: 'Cartão na maquininha',
    descricao: 'Entregador leva a maquininha para o pagamento',
  },
  {
    id: 'aceita_cartao_online',
    label: 'Cartão ou PIX online',
    descricao: 'Pagamento via Pagar.me no app — necessário conta de recebimentos ativa',
  },
]

function BotaoSalvar() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-6 py-2.5 rounded-full text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
      style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
    >
      {pending ? 'Salvando...' : 'Salvar'}
    </button>
  )
}

export function AbaPagamentos({ loja }: { loja: any }) {
  const [estado, dispatch] = useFormState(atualizarMetodosPagamento, null)
  const [metodos, setMetodos] = useState({
    aceita_dinheiro: loja.aceita_dinheiro as boolean,
    aceita_pix: loja.aceita_pix as boolean,
    aceita_cartao_maquininha: loja.aceita_cartao_maquininha as boolean,
    aceita_cartao_online: loja.aceita_cartao_online as boolean,
  })

  return (
    <div
      className="rounded-xl p-5"
      style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}
    >
      <h2 className="font-semibold text-ink mb-4">Métodos de pagamento aceitos</h2>

      <form action={dispatch} className="space-y-3">
        {estado?.erro && (
          <p className="text-sm px-3 py-2 rounded-xl" style={{ background: '#fde8e4', color: 'var(--err)' }}>
            {estado.erro}
          </p>
        )}
        {estado?.sucesso && (
          <p className="text-sm px-3 py-2 rounded-xl" style={{ background: '#e6f7e3', color: 'var(--ok)' }}>
            Métodos de pagamento atualizados.
          </p>
        )}

        <div className="space-y-3 mb-6">
          {METODOS.map((metodo) => {
            const ativo = metodos[metodo.id as keyof typeof metodos]
            return (
              <label
                key={metodo.id}
                className="flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors"
                style={{
                  border: ativo ? '1px solid var(--brick)' : '1px solid var(--line)',
                  background: ativo ? 'rgba(193,241,72,0.08)' : 'transparent',
                }}
              >
                <input
                  type="hidden"
                  name={metodo.id}
                  value={String(ativo)}
                />
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={ativo}
                  onClick={() =>
                    setMetodos((prev) => ({ ...prev, [metodo.id]: !prev[metodo.id as keyof typeof prev] }))
                  }
                  className="w-4 h-4 rounded border-2 flex-shrink-0 transition-colors"
                  style={{
                    background: ativo ? 'var(--brick)' : 'transparent',
                    borderColor: ativo ? 'var(--brick)' : 'var(--line)',
                  }}
                >
                  {ativo && (
                    <svg viewBox="0 0 10 10" className="w-full h-full p-0.5" fill="none">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brick-ink)' }} />
                    </svg>
                  )}
                </button>
                <div>
                  <p className="text-sm font-medium text-ink">{metodo.label}</p>
                  <p className="text-xs text-ink-3 mt-0.5">{metodo.descricao}</p>
                </div>
              </label>
            )
          })}
        </div>

        <BotaoSalvar />
      </form>
    </div>
  )
}
