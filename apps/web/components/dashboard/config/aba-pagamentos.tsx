'use client'

import { useState, useTransition } from 'react'
import { atualizarDadosLoja } from '@/lib/actions/lojas'

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
    descricao: 'Pagamento via Stripe no app — necessário conta Stripe ativa',
  },
]

export function AbaPagamentos({ loja }: { loja: any }) {
  const [metodos, setMetodos] = useState({
    aceita_dinheiro: loja.aceita_dinheiro,
    aceita_pix: loja.aceita_pix,
    aceita_cartao_maquininha: loja.aceita_cartao_maquininha,
    aceita_cartao_online: loja.aceita_cartao_online,
  })
  const [isPending, startTransition] = useTransition()
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function handleSalvar() {
    setSucesso(false)
    setErro(null)

    const formData = new FormData()
    formData.set('nome', loja.nome)
    formData.set('descricao', loja.descricao ?? '')
    formData.set('telefone', loja.telefone ?? '')
    formData.set('taxa_entrega', (loja.taxa_entrega / 100).toFixed(2))
    formData.set('tempo_entrega', String(loja.tempo_entrega ?? 45))
    formData.set('raio_entrega_km', String(loja.raio_entrega_km ?? 5))
    formData.set('usa_entregadores_proprios', String(loja.usa_entregadores_proprios))

    Object.entries(metodos).forEach(([chave, valor]) => {
      formData.set(chave, String(valor))
    })

    startTransition(async () => {
      const resultado = await atualizarDadosLoja(null, formData)
      if (resultado.erro) setErro(resultado.erro)
      else setSucesso(true)
    })
  }

  return (
    <div
      className="rounded-xl p-5"
      style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}
    >
      <h2 className="font-semibold text-ink mb-4">Métodos de pagamento aceitos</h2>

      {erro && (
        <p className="text-sm px-3 py-2 rounded-xl mb-4" style={{ background: '#fde8e4', color: 'var(--err)' }}>
          {erro}
        </p>
      )}
      {sucesso && (
        <p className="text-sm px-3 py-2 rounded-xl mb-4" style={{ background: '#e6f7e3', color: 'var(--ok)' }}>
          Métodos de pagamento atualizados.
        </p>
      )}

      <div className="space-y-3 mb-6">
        {METODOS.map((metodo) => {
          const ativo = (metodos as any)[metodo.id]
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
                type="checkbox"
                checked={ativo}
                onChange={(e) =>
                  setMetodos((prev) => ({ ...prev, [metodo.id]: e.target.checked }))
                }
                className="w-4 h-4 accent-brick"
              />
              <div>
                <p className="text-sm font-medium text-ink">{metodo.label}</p>
                <p className="text-xs text-ink-3 mt-0.5">{metodo.descricao}</p>
              </div>
            </label>
          )
        })}
      </div>

      <button
        onClick={handleSalvar}
        disabled={isPending}
        className="px-6 py-2.5 rounded-full text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
        style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
      >
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  )
}
