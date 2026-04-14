'use client'

import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { EtapaDadosResponsavel } from './etapas/dados-responsavel'
import { EtapaDadosLoja } from './etapas/dados-loja'
import { EtapaEscolhaPlano } from './etapas/escolha-plano'
import { EtapaConfigurarRecebimentos } from './etapas/configurar-recebimentos'

export interface DadosOnboarding {
  nome_responsavel: string
  cpf_cnpj: string
  telefone: string
  email: string
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
  plan_id: string
}

const TOTAL_ETAPAS = 4

const etapas = [
  { label: 'Responsável',    desc: 'Quem administra a conta' },
  { label: 'Sua loja',       desc: 'Dados do estabelecimento' },
  { label: 'Plano',          desc: 'Escolha seu plano de assinatura' },
  { label: 'Recebimentos',   desc: 'Conta bancária via Stripe' },
]

function IconCheck() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
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
      let { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError || !refreshed.session?.access_token) {
          throw new Error('Sessão expirada. Faça login novamente.')
        }
        session = refreshed.session
      }

      const resposta = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/onboard-tenant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(dadosCompletos),
        }
      )

      const resultado = await resposta.json()
      if (!resposta.ok) throw new Error(resultado.error)

      window.location.href = resultado.stripe_onboarding_url
    } catch (erro: unknown) {
      const message = erro instanceof Error ? erro.message : 'Erro inesperado'
      alert(message)
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Painel esquerdo: progresso vertical ─────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-72 flex-shrink-0 flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #1A4D3A 0%, #0f2e22 100%)' }}
      >
        {/* Textura sutil */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3 px-8 pt-8 pb-10">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4CAF82 0%, #2d8a60 100%)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span className="text-white font-bold text-lg tracking-tight relative">Mallora</span>
        </div>

        {/* Timeline de etapas */}
        <div className="relative flex-1 px-8">
          <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest mb-7">
            Configuração
          </p>

          <div className="space-y-0">
            {etapas.map((e, i) => {
              const num = i + 1
              const concluida = num < etapa
              const ativa = num === etapa
              const ultima = i === etapas.length - 1

              return (
                <div key={e.label} className="flex gap-4">
                  {/* Coluna do indicador + linha */}
                  <div className="flex flex-col items-center">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold transition-all duration-300"
                      style={{
                        background: ativa
                          ? '#4CAF82'
                          : concluida
                          ? 'rgba(76,175,130,0.2)'
                          : 'rgba(255,255,255,0.07)',
                        color: ativa
                          ? '#fff'
                          : concluida
                          ? '#4CAF82'
                          : 'rgba(255,255,255,0.2)',
                      }}
                    >
                      {concluida ? <IconCheck /> : num}
                    </div>
                    {!ultima && (
                      <div
                        className="w-px my-1.5 transition-all duration-500"
                        style={{
                          height: 36,
                          background: num < etapa
                            ? 'rgba(76,175,130,0.35)'
                            : 'rgba(255,255,255,0.07)',
                        }}
                      />
                    )}
                  </div>

                  {/* Texto */}
                  <div className={`pb-${ultima ? '0' : '0'} pt-0.5 mb-${ultima ? '0' : '9'}`} style={{ marginBottom: ultima ? 0 : 36 }}>
                    <p
                      className="text-sm font-semibold leading-none transition-colors duration-300"
                      style={{
                        color: ativa ? '#fff' : concluida ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)',
                      }}
                    >
                      {e.label}
                    </p>
                    <p
                      className="text-[11px] mt-1 leading-snug transition-colors duration-300"
                      style={{
                        color: ativa ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.15)',
                      }}
                    >
                      {e.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Progresso numérico */}
          <div className="mt-10 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-white/25 text-[10px] uppercase tracking-widest mb-2">Progresso</p>
            <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${((etapa - 1) / TOTAL_ETAPAS) * 100}%`, background: '#4CAF82' }}
              />
            </div>
            <p className="text-white/30 text-[10px] mt-1.5">
              Etapa {etapa} de {TOTAL_ETAPAS}
            </p>
          </div>
        </div>

        {/* Rodapé */}
        <p className="relative text-white/20 text-[11px] px-8 py-6">
          © {new Date().getFullYear()} Mallora. Todos os direitos reservados.
        </p>
      </div>

      {/* ── Painel direito: formulário ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto" style={{ background: '#EFEFEF' }}>

        {/* Logo mobile */}
        <div className="flex lg:hidden items-center gap-2.5 pt-8 mb-6">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4CAF82 0%, #2d8a60 100%)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span className="text-brand-800 font-bold text-lg tracking-tight">Mallora</span>
        </div>

        {/* Indicador mobile de etapas */}
        <div className="flex lg:hidden items-center gap-1.5 mb-6">
          {etapas.map((_, i) => {
            const num = i + 1
            return (
              <div
                key={num}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: num === etapa ? 24 : 8,
                  background: num < etapa ? '#4CAF82' : num === etapa ? '#1A4D3A' : '#d1d5db',
                }}
              />
            )
          })}
        </div>

        {/* Card do formulário */}
        <div className="w-full max-w-lg px-4 py-8 lg:py-12">
          <div
            className="bg-white rounded-[20px] p-8 animate-slide-up"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 20px rgba(0,0,0,0.06)' }}
          >
            {etapa === 1 && (
              <EtapaDadosResponsavel dadosIniciais={dados} onAvancar={avancar} />
            )}
            {etapa === 2 && (
              <EtapaDadosLoja dadosIniciais={dados} onAvancar={avancar} onVoltar={voltar} />
            )}
            {etapa === 3 && (
              <EtapaEscolhaPlano dadosIniciais={dados} onAvancar={avancar} onVoltar={voltar} />
            )}
            {etapa === 4 && (
              <EtapaConfigurarRecebimentos carregando={carregando} onFinalizar={finalizarOnboarding} onVoltar={voltar} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
