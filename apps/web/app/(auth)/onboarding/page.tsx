'use client'

import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { EtapaDadosResponsavel } from './etapas/dados-responsavel'
import { EtapaDadosLoja } from './etapas/dados-loja'
import { EtapaEscolhaPlano } from './etapas/escolha-plano'
import { EtapaConfigurarRecebimentos } from './etapas/configurar-recebimentos'
import { AnimatePresence, motion } from 'framer-motion'
import { Store, User, CreditCard, CheckCircle2, ArrowRight } from 'lucide-react'
import { logout } from '@/lib/actions/auth'

export interface DadosOnboarding {
  nome_responsavel: string
  cpf_cnpj: string
  telefone: string
  email: string
  senha?: string
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

const STEPS = [
  { id: 1, title: 'Responsável', description: 'Seus dados pessoais', icon: User },
  { id: 2, title: 'Loja', description: 'Detalhes do negócio', icon: Store },
  { id: 3, title: 'Plano', description: 'Escolha a assinatura', icon: CreditCard },
  { id: 4, title: 'Recebimentos', description: 'Conta bancária', icon: CheckCircle2 },
]

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

      // Se não há sessão, o usuário precisa ser registrado
      if (!session && dadosCompletos.email && dadosCompletos.senha) {
        const { data, error } = await supabase.auth.signUp({
          email: dadosCompletos.email,
          password: dadosCompletos.senha,
          options: {
            data: {
              nome: dadosCompletos.nome_responsavel,
              role: 'tenant',
            },
          },
        })
        
        if (error) {
          if (error.message.includes('already registered')) {
             throw new Error('Este email já está cadastrado. Faça login na plataforma.')
          }
          throw error
        }
        
        session = data.session
      }

      if (!session) {
         throw new Error('Não foi possível autenticar o usuário para criar a loja.')
      }

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

      window.location.href = resultado.stripe_onboarding_url
    } catch (erro: unknown) {
      const message = erro instanceof Error ? erro.message : 'Erro inesperado'
      alert(message)
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen flex w-full bg-[#18181B] font-sans">
      {/* Left Column - Branding & Progress */}
      <div className="hidden lg:flex w-[400px] xl:w-[460px] flex-col justify-between p-8 text-zinc-50 relative shrink-0">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-[#C1F148] flex items-center justify-center shadow-lg shadow-[#C1F148]/20">
              <span className="text-[#18181B] font-bold text-xl">M</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Mallevo</span>
          </div>

          <div className="space-y-4 mb-12">
            <h1 className="text-3xl font-semibold tracking-tight leading-tight">
              Crie sua loja em poucos minutos.
            </h1>
            <p className="text-zinc-400 text-base leading-relaxed">
              Siga os passos para configurar seu negócio e começar a vender online imediatamente.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex-1">
          <div className="space-y-8">
            {STEPS.map((step) => {
              const Icon = step.icon
              const isCompleted = etapa > step.id
              const isCurrent = etapa === step.id

              return (
                <div key={step.id} className="flex items-start gap-5 relative">
                  {step.id !== STEPS.length && (
                    <div className={`absolute top-10 left-[1.15rem] w-px h-10 -ml-px transition-colors duration-500 ${isCompleted ? 'bg-[#C1F148]' : 'bg-zinc-800'}`} />
                  )}
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10 shrink-0 ${
                      isCompleted 
                        ? 'border-[#C1F148] bg-[#C1F148] text-[#18181B]' 
                        : isCurrent 
                          ? 'border-[#C1F148] text-[#C1F148] bg-zinc-900/50 shadow-[0_0_15px_rgba(193,241,72,0.15)]' 
                          : 'border-zinc-800 text-zinc-600 bg-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="pt-2">
                    <h3 className={`text-sm font-semibold transition-colors duration-500 ${isCurrent || isCompleted ? 'text-zinc-50' : 'text-zinc-500'}`}>
                      {step.title}
                    </h3>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        <div className="relative z-10 mt-8 space-y-6">
           <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
             <p className="text-sm text-zinc-400 mb-3">Já possui uma loja cadastrada?</p>
             <form action={logout}>
               <button type="submit" className="flex items-center gap-2 text-[#C1F148] font-medium text-sm hover:underline">
                 Sair e fazer login
                 <ArrowRight className="w-4 h-4" />
               </button>
             </form>
           </div>
           <p className="text-xs text-zinc-600 font-medium">© 2026 Mallevo. Todos os direitos reservados.</p>
        </div>
      </div>

      {/* Right Column - Form Steps (Rounded Container) */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-white lg:rounded-[2.5rem] lg:m-4 lg:ml-0 shadow-2xl">
        {/* Mobile Header */}
        <div className="lg:hidden p-6 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-20">
           <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C1F148] flex items-center justify-center">
              <span className="text-[#18181B] font-bold text-lg">M</span>
            </div>
            <span className="font-bold tracking-tight">Mallevo</span>
          </div>
          <form action={logout}>
            <button type="submit" className="text-sm font-medium text-zinc-600 underline">
              Sair e fazer login
            </button>
          </form>
        </div>

        {/* Mobile Progress Bar */}
        <div className="h-1 bg-gray-100 lg:hidden sticky top-[73px] z-20">
          <div
            className="h-full bg-[#C1F148] transition-all duration-500 ease-out"
            style={{ width: `${(etapa / 4) * 100}%` }}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-4xl mx-auto p-6 py-12 lg:p-12 xl:p-24 flex flex-col justify-center min-h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={etapa}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
              >
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
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
