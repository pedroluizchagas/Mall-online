'use client'

import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { EtapaDadosResponsavel } from './etapas/dados-responsavel'
import { EtapaDadosLoja } from './etapas/dados-loja'
import { EtapaEscolhaPlano } from './etapas/escolha-plano'
import { EtapaConfigurarRecebimentos } from './etapas/configurar-recebimentos'

export interface DadosOnboarding {
  // Etapa 1
  nome_responsavel: string
  cpf_cnpj: string
  telefone: string
  email: string
  // Etapa 2
  nome_loja: string
  categoria_id: string
  endereco: {
    rua: string
    numero: string
    complemento?: string
    bairro: string
    cidade: string
    estado: string
    cep: string
  }
  // Etapa 3
  plan_id: string
}

export default function PaginaOnboarding() {
  const [etapa, setEtapa] = useState(1)
  const [dados, setDados] = useState<Partial<DadosOnboarding>>({})
  const [carregando, setCarregando] = useState(false)

  function avancar(novosDados: Partial<DadosOnboarding>) {
    setDados(prev => ({ ...prev, ...novosDados }))
    setEtapa(prev => prev + 1)
  }

  function voltar() {
    setEtapa(prev => prev - 1)
  }

  async function finalizarOnboarding(dadosFinais: Partial<DadosOnboarding>) {
    setCarregando(true)
    const dadosCompletos = { ...dados, ...dadosFinais }
    const supabase = createSupabaseClient()

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const resposta = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/onboard-tenant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(dadosCompletos),
        }
      )

      const resultado = await resposta.json()

      if (!resposta.ok) {
        throw new Error(resultado.error)
      }

      // Redirecionar para o Stripe Connect Onboarding
      window.location.href = resultado.stripe_onboarding_url
    } catch (erro: unknown) {
      const message = erro instanceof Error ? erro.message : 'Erro inesperado'
      alert(message)
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF8ED]">
      {/* Barra de progresso */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-full bg-[#4CAF82] transition-all duration-300"
          style={{ width: `${(etapa / 4) * 100}%` }}
        />
      </div>

      <div className="max-w-xl mx-auto px-4 py-12">
        {/* Indicador de etapa */}
        <p className="text-sm text-gray-400 mb-2">Etapa {etapa} de 4</p>

        {etapa === 1 && (
          <EtapaDadosResponsavel
            dadosIniciais={dados}
            onAvancar={avancar}
          />
        )}
        {etapa === 2 && (
          <EtapaDadosLoja
            dadosIniciais={dados}
            onAvancar={avancar}
            onVoltar={voltar}
          />
        )}
        {etapa === 3 && (
          <EtapaEscolhaPlano
            dadosIniciais={dados}
            onAvancar={avancar}
            onVoltar={voltar}
          />
        )}
        {etapa === 4 && (
          <EtapaConfigurarRecebimentos
            carregando={carregando}
            onFinalizar={finalizarOnboarding}
            onVoltar={voltar}
          />
        )}
      </div>
    </div>
  )
}
