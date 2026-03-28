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
    formData.set('usa_entregadores_proprios',
      String(loja.usa_entregadores_proprios))

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
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-800 mb-4">
        Métodos de pagamento aceitos
      </h2>

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">
          {erro}
        </p>
      )}
      {sucesso && (
        <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg mb-4">
          Métodos de pagamento atualizados.
        </p>
      )}

      <div className="space-y-3 mb-6">
        {METODOS.map((metodo) => (
          <label
            key={metodo.id}
            className="flex items-center gap-4 p-3 border border-gray-100
              rounded-xl cursor-pointer hover:border-gray-200 transition-colors"
          >
            <input
              type="checkbox"
              checked={(metodos as any)[metodo.id]}
              onChange={(e) =>
                setMetodos((prev) => ({
                  ...prev,
                  [metodo.id]: e.target.checked,
                }))
              }
              className="w-4 h-4 accent-[#1A4D3A]"
            />
            <div>
              <p className="text-sm font-medium text-gray-700">{metodo.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{metodo.descricao}</p>
            </div>
          </label>
        ))}
      </div>

      <button
        onClick={handleSalvar}
        disabled={isPending}
        className="bg-[#1A4D3A] text-white px-6 py-2.5 rounded-lg text-sm
          font-medium disabled:opacity-50 hover:bg-[#163d2e] transition-colors"
      >
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  )
}
