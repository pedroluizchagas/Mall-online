'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { formatarReais } from '@mallora/lib'
import type { DadosOnboarding } from '../page'

interface Props {
  dadosIniciais: Partial<DadosOnboarding>
  onAvancar: (dados: Partial<DadosOnboarding>) => void
  onVoltar: () => void
}

interface Plano {
  id: string
  nome: string
  preco_mensal: number
  max_lojas: number
  max_produtos: number
  tem_estoque: boolean
  tem_relatorios: boolean
  tem_antecipacao: boolean
}

export function EtapaEscolhaPlano({ dadosIniciais, onAvancar, onVoltar }: Props) {
  const [planos, setPlanos] = useState<Plano[]>([])
  const [planoSelecionado, setPlanoSelecionado] = useState(dadosIniciais.plan_id ?? '')
  const [erro, setErro] = useState('')

  useEffect(() => {
    const supabase = createSupabaseClient()
    supabase
      .from('plans')
      .select('*')
      .eq('ativo', true)
      .order('preco_mensal')
      .then(({ data }) => {
        if (data) setPlanos(data as Plano[])
      })
  }, [])

  function handleSubmit() {
    if (!planoSelecionado) {
      setErro('Selecione um plano para continuar')
      return
    }
    setErro('')
    onAvancar({ plan_id: planoSelecionado })
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#1A4D3A] mb-1">
        Escolha seu plano
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Selecione o plano que melhor atende seu negócio
      </p>

      <div className="space-y-4">
        {planos.map(plano => (
          <button
            key={plano.id}
            type="button"
            onClick={() => {
              setPlanoSelecionado(plano.id)
              setErro('')
            }}
            className={`w-full text-left p-5 rounded-xl border-2 transition-colors ${
              planoSelecionado === plano.id
                ? 'border-[#4CAF82] bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-[#1A4D3A]">{plano.nome}</h3>
              <span className="text-lg font-bold text-[#1A4D3A]">
                {formatarReais(plano.preco_mensal)}
                <span className="text-sm font-normal text-gray-400">/mês</span>
              </span>
            </div>

            <ul className="space-y-1 text-sm text-gray-600">
              <li>Até {plano.max_lojas} {plano.max_lojas === 1 ? 'loja' : 'lojas'}</li>
              <li>Até {plano.max_produtos} produtos</li>
              {plano.tem_estoque && <li>Controle de estoque</li>}
              {plano.tem_relatorios && <li>Relatórios avançados</li>}
              {plano.tem_antecipacao && <li>Antecipação de recebíveis</li>}
            </ul>
          </button>
        ))}
      </div>

      {erro && (
        <p className="text-sm text-red-600 mt-4">{erro}</p>
      )}

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={onVoltar}
          className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 bg-[#1A4D3A] text-white py-3 rounded-lg font-medium hover:bg-[#163d2e] transition-colors"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
