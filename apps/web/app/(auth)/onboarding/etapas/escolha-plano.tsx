'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { formatarReais } from '@mallora/lib'
import type { DadosOnboarding } from '../page'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

interface Props {
  dadosIniciais: Partial<DadosOnboarding>
  carregando: boolean
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

export function EtapaEscolhaPlano({ dadosIniciais, carregando, onAvancar, onVoltar }: Props) {
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
    <div className="w-full">
      <div className="mb-10 text-center lg:text-left">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 mb-3">
          Escolha seu Plano
        </h2>
        <p className="text-zinc-500 text-lg">
          Selecione o plano ideal para escalar o seu negócio.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {planos.map(plano => {
          const isSelected = planoSelecionado === plano.id
          const isPremium = plano.preco_mensal > 50 // Just a simple logic to highlight a plan

          return (
            <button
              key={plano.id}
              type="button"
              onClick={() => {
                setPlanoSelecionado(plano.id)
                setErro('')
              }}
              className={`relative w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 ${
                isSelected
                  ? 'border-[#C1F148] bg-[#C1F148]/[0.05] shadow-[0_8px_30px_rgba(193,241,72,0.15)] scale-[1.02]'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
              }`}
            >
              {isPremium && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-900 text-[#C1F148] px-3 py-1 text-xs font-semibold rounded-full tracking-wide">
                  MAIS POPULAR
                </div>
              )}
              
              <div className="mb-6">
                <h3 className={`font-semibold text-lg mb-2 ${isSelected ? 'text-zinc-900' : 'text-zinc-900'}`}>
                  {plano.nome}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-zinc-900">
                    {plano.preco_mensal === 0 ? 'Sob Consulta' : formatarReais(plano.preco_mensal)}
                  </span>
                  {plano.preco_mensal > 0 && <span className="text-zinc-500 font-medium">/mês</span>}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 rounded-full p-0.5 ${isSelected ? 'bg-[#C1F148] text-zinc-900' : 'bg-gray-100 text-gray-400'}`}>
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-zinc-600 text-sm">
                    Até <strong className="font-semibold text-zinc-900">{plano.max_lojas}</strong> {plano.max_lojas === 1 ? 'loja' : 'lojas'}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 rounded-full p-0.5 ${isSelected ? 'bg-[#C1F148] text-zinc-900' : 'bg-gray-100 text-gray-400'}`}>
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-zinc-600 text-sm">
                    Até <strong className="font-semibold text-zinc-900">{plano.max_produtos}</strong> produtos
                  </span>
                </div>
                {plano.tem_estoque && (
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 rounded-full p-0.5 ${isSelected ? 'bg-[#C1F148] text-zinc-900' : 'bg-gray-100 text-gray-400'}`}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-zinc-600 text-sm">Controle de estoque</span>
                  </div>
                )}
                {plano.tem_relatorios && (
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 rounded-full p-0.5 ${isSelected ? 'bg-[#C1F148] text-zinc-900' : 'bg-gray-100 text-gray-400'}`}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-zinc-600 text-sm">Relatórios avançados</span>
                  </div>
                )}
                {plano.tem_antecipacao && (
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 rounded-full p-0.5 ${isSelected ? 'bg-[#C1F148] text-zinc-900' : 'bg-gray-100 text-gray-400'}`}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-zinc-600 text-sm">Antecipação de recebíveis</span>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {erro && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium text-center border border-red-100">
          {erro}
        </div>
      )}

      <div className="pt-4 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onVoltar}
          className="flex items-center gap-2 px-6 py-4 rounded-xl font-medium text-zinc-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={carregando}
          className="flex items-center gap-2 bg-[#C1F148] text-zinc-900 px-8 py-4 rounded-xl font-semibold hover:bg-[#aee623] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#C1F148]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {carregando ? (
            <>
              Criando conta...
              <div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
            </>
          ) : (
            <>
              Configurar Conta
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
