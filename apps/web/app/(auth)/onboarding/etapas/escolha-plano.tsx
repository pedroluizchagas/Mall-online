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

function IconCheck() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
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
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-brand-800 tracking-tight">
          Escolha seu plano
        </h2>
        <p className="text-gray-400 text-sm mt-1.5">
          Selecione o plano que melhor atende seu negócio. Você pode mudar depois.
        </p>
      </div>

      <div className="space-y-3">
        {planos.map(plano => {
          const selecionado = planoSelecionado === plano.id
          return (
            <button
              key={plano.id}
              type="button"
              onClick={() => {
                setPlanoSelecionado(plano.id)
                setErro('')
              }}
              className="w-full text-left rounded-xl transition-all duration-150"
              style={{
                padding: '16px 18px',
                border: selecionado ? '2px solid #4CAF82' : '2px solid #f0f0f0',
                background: selecionado ? 'rgba(76,175,130,0.04)' : '#fafafa',
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2.5">
                  {/* Radio visual */}
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      border: selecionado ? '2px solid #4CAF82' : '2px solid #d1d5db',
                    }}
                  >
                    {selecionado && (
                      <div className="w-2 h-2 rounded-full" style={{ background: '#4CAF82' }} />
                    )}
                  </div>
                  <h3 className="font-semibold text-sm text-brand-800">{plano.nome}</h3>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-brand-800">
                    {formatarReais(plano.preco_mensal)}
                  </span>
                  <span className="text-xs text-gray-400 block">/mês</span>
                </div>
              </div>

              <ul className="space-y-1.5 ml-6">
                {[
                  `Até ${plano.max_lojas} ${plano.max_lojas === 1 ? 'loja' : 'lojas'}`,
                  `Até ${plano.max_produtos} produtos`,
                  ...(plano.tem_estoque ? ['Controle de estoque'] : []),
                  ...(plano.tem_relatorios ? ['Relatórios avançados'] : []),
                  ...(plano.tem_antecipacao ? ['Antecipação de recebíveis'] : []),
                ].map(item => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-xs"
                    style={{ color: selecionado ? '#266f4e' : '#9ca3af' }}
                  >
                    <span style={{ color: selecionado ? '#4CAF82' : '#d1d5db' }}>
                      <IconCheck />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      {erro && (
        <p className="text-xs text-red-500 mt-3">{erro}</p>
      )}

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={onVoltar}
          className="flex-1 border border-gray-200 text-gray-500 py-3 rounded-xl font-medium hover:bg-gray-50 active:scale-[0.98] transition-all duration-150 text-sm"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 btn-primary"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
