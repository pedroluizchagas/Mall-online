'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { EtapaDadosResponsavel } from './etapas/dados-responsavel'
import { EtapaDadosLoja } from './etapas/dados-loja'
import { EtapaEscolhaPlano } from './etapas/escolha-plano'
import { AnimatePresence, motion } from 'framer-motion'
import { Store, User, CreditCard, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
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
]

export default function PaginaOnboarding() {
  const [etapa, setEtapa] = useState(1)
  const [dados, setDados] = useState<Partial<DadosOnboarding>>({})
  const [carregando, setCarregando] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const [splashPhase, setSplashPhase] = useState<number>(0)
  const [contaCriada, setContaCriada] = useState(false)

  useEffect(() => {
    if (!showSplash) return

    if (splashPhase === 0) {
      setTimeout(() => setSplashPhase(1), 200)
    } else if (splashPhase === 1) { // Logo transform & show
      setTimeout(() => setSplashPhase(2), 1600)
    } else if (splashPhase === 2) { // Logo exits
      setTimeout(() => setSplashPhase(3), 800)
    } else if (splashPhase === 3) { // Phrase 1
      setTimeout(() => setSplashPhase(4), 1600)
    } else if (splashPhase === 4) { // Phrase 2
      setTimeout(() => setSplashPhase(5), 1600)
    } else if (splashPhase === 5) { // Phrase 3
      setTimeout(() => setSplashPhase(6), 1800)
    } else if (splashPhase === 6) { // Flash out
      setTimeout(() => setShowSplash(false), 800)
    }
  }, [splashPhase, showSplash])

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

      setContaCriada(true)
      // Pequeno delay para o usuário ver a tela de sucesso antes do redirect
      setTimeout(() => {
        window.location.href = '/?welcome=1'
      }, 2400)
    } catch (erro: unknown) {
      const message = erro instanceof Error ? erro.message : 'Erro inesperado'
      alert(message)
      setCarregando(false)
    }
  }

  return (
    <>
      <AnimatePresence mode="wait">
      {contaCriada ? (
        <motion.div
          key="sucesso"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#09090B] via-[#18181B] to-[#1A4D3A] overflow-hidden p-6"
        >
          <motion.div
            initial={{ opacity: 0.4, scale: 0 }}
            animate={{ opacity: [0.4, 0.6, 0.5], scale: [0, 5, 6] }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="absolute w-[200px] h-[200px] bg-[#C1F148] rounded-full blur-[100px] pointer-events-none"
          />

          <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, type: 'spring', bounce: 0.5 }}
              className="w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-[#C1F148] flex items-center justify-center mb-8 shadow-[0_0_80px_rgba(193,241,72,0.5)]"
            >
              <CheckCircle2 className="w-12 h-12 md:w-14 md:h-14 text-[#09090B]" strokeWidth={2.5} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex items-center gap-2 mb-4"
            >
              <Sparkles className="w-5 h-5 text-[#F5A623]" />
              <span className="text-sm font-semibold text-[#F5A623] tracking-wider uppercase">
                Sua conta está pronta
              </span>
              <Sparkles className="w-5 h-5 text-[#F5A623]" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4 leading-tight"
            >
              Bem-vindo à <span className="text-[#C1F148]">Mallora</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.7 }}
              className="text-zinc-400 text-lg leading-relaxed mb-10"
            >
              Estamos abrindo seu painel e tudo que você precisa para configurar o seu negócio.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="flex items-center gap-3 text-zinc-500 text-sm"
            >
              <div className="w-4 h-4 border-2 border-[#C1F148] border-t-transparent rounded-full animate-spin" />
              <span>Preparando seu dashboard…</span>
            </motion.div>
          </div>
        </motion.div>
      ) : showSplash ? (
        <motion.div
          key="splash"
          exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#09090B] overflow-hidden"
        >
          {/* Luz intensa no final (Fade out effect with glow) */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: splashPhase === 6 ? 1 : 0, 
              scale: splashPhase === 6 ? 40 : 0 
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute w-[150px] h-[150px] bg-[#C1F148] rounded-full blur-[60px] z-20 pointer-events-none"
          />
          
          <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
            {/* Logo morphing animation */}
            <AnimatePresence>
              {splashPhase === 1 && (
                <motion.div
                  key="logo"
                  initial={{ scale: 0, borderRadius: "100%", rotate: 180 }}
                  animate={{ scale: 1, borderRadius: "32px", rotate: 0 }}
                  exit={{ scale: 0, opacity: 0, filter: 'blur(10px)', rotate: -45 }}
                  transition={{ duration: 1, type: "spring", bounce: 0.4 }}
                  className="absolute w-32 h-32 md:w-40 md:h-40 bg-[#C1F148] flex items-center justify-center shadow-[0_0_100px_rgba(193,241,72,0.4)]"
                >
                  <motion.span 
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.6, type: "spring" }}
                    className="text-[#09090B] font-bold text-7xl md:text-8xl"
                  >
                    M
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scrolling Huge Phrases */}
            <div className="relative flex items-center justify-center w-full h-full px-6">
              <AnimatePresence>
                {splashPhase === 3 && (
                  <motion.h2
                    key="phrase1"
                    initial={{ opacity: 0, y: 150, filter: 'blur(20px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -150, filter: 'blur(20px)', scale: 0.95 }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute text-5xl md:text-7xl lg:text-8xl font-semibold text-white text-center tracking-tight leading-[1.1]"
                  >
                    A nova era do <br/>
                    <span className="text-zinc-500">comércio digital</span>
                  </motion.h2>
                )}
                {splashPhase === 4 && (
                  <motion.h2
                    key="phrase2"
                    initial={{ opacity: 0, y: 150, filter: 'blur(20px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -150, filter: 'blur(20px)', scale: 0.95 }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute text-5xl md:text-7xl lg:text-8xl font-semibold text-white text-center tracking-tight leading-[1.1]"
                  >
                    Construindo o seu <br/>
                    <span className="text-[#C1F148]">ecossistema</span>
                  </motion.h2>
                )}
                {splashPhase === 5 && (
                  <motion.h2
                    key="phrase3"
                    initial={{ opacity: 0, y: 150, filter: 'blur(20px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -150, filter: 'blur(20px)', scale: 0.95 }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute text-5xl md:text-7xl lg:text-8xl font-semibold text-white text-center tracking-tight leading-[1.1]"
                  >
                    Prepare-se para <br/>
                    <span className="text-white italic">crescer.</span>
                  </motion.h2>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="onboarding"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="min-h-screen flex w-full bg-[#18181B] font-sans"
        >
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
            style={{ width: `${(etapa / 3) * 100}%` }}
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
                    carregando={carregando}
                    onAvancar={finalizarOnboarding}
                    onVoltar={voltar}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
      </motion.div>
      )}
      </AnimatePresence>
    </>
  )
}
