'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { FluxoOnboarding } from './fluxo'

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

export default function PaginaOnboarding() {
  const [carregando, setCarregando] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const [splashPhase, setSplashPhase] = useState<number>(0)
  const [contaCriada, setContaCriada] = useState(false)

  useEffect(() => {
    if (!showSplash) return

    if (splashPhase === 0) {
      setTimeout(() => setSplashPhase(1), 200)
    } else if (splashPhase === 1) {
      setTimeout(() => setSplashPhase(2), 1600)
    } else if (splashPhase === 2) {
      setTimeout(() => setSplashPhase(3), 800)
    } else if (splashPhase === 3) {
      setTimeout(() => setSplashPhase(4), 1600)
    } else if (splashPhase === 4) {
      setTimeout(() => setSplashPhase(5), 1600)
    } else if (splashPhase === 5) {
      setTimeout(() => setSplashPhase(6), 1800)
    } else if (splashPhase === 6) {
      setTimeout(() => setShowSplash(false), 800)
    }
  }, [splashPhase, showSplash])

  async function finalizarOnboarding(dadosCompletos: Partial<DadosOnboarding>) {
    setCarregando(true)
    const supabase = createSupabaseClient()

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/onboard-tenant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(dadosCompletos),
        },
      )

      const resultado = await res.json()

      if (!res.ok) {
        throw new Error(resultado?.error || 'Erro ao criar conta. Tente novamente.')
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: dadosCompletos.email!,
        password: dadosCompletos.senha!,
      })

      if (loginError) {
        throw new Error('Conta criada! Acesse a página de login para entrar.')
      }

      if (resultado.store_id && resultado.store_slug) {
        try {
          const dnsRes = await fetch('/api/stores/provision-domain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storeId: resultado.store_id, slug: resultado.store_slug }),
          })
          if (!dnsRes.ok) {
            const dnsErro = await dnsRes.json()
            console.error('Falha ao provisionar DNS:', dnsErro)
          }
        } catch (dnsErr) {
          console.error('Erro de rede ao provisionar DNS:', dnsErr)
        }
      }

      setContaCriada(true)
      setTimeout(() => {
        window.location.href = '/?welcome=1'
      }, 2400)
    } catch (erro: unknown) {
      const message = erro instanceof Error ? erro.message : 'Erro inesperado. Tente novamente.'
      alert(message)
      setCarregando(false)
    }
  }

  return (
    <AnimatePresence mode="wait">
      {contaCriada ? (
        <TelaSucesso key="sucesso" />
      ) : showSplash ? (
        <Splash key="splash" splashPhase={splashPhase} />
      ) : (
        <FluxoOnboarding key="fluxo" carregando={carregando} onFinalizar={finalizarOnboarding} />
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// Splash de abertura (preservada na íntegra)
// ============================================================================

function Splash({ splashPhase }: { splashPhase: number }) {
  return (
    <motion.div
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#09090B] overflow-hidden"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: splashPhase === 6 ? 1 : 0,
          scale: splashPhase === 6 ? 40 : 0,
        }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        className="absolute w-[150px] h-[150px] bg-[#C1F148] rounded-full blur-[60px] z-20 pointer-events-none"
      />

      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
        <AnimatePresence>
          {splashPhase === 1 && (
            <motion.div
              key="logo"
              initial={{ scale: 0, opacity: 0, filter: 'blur(20px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              exit={{ scale: 0.88, opacity: 0, filter: 'blur(14px)' }}
              transition={{ duration: 0.9, type: 'spring', bounce: 0.32 }}
              className="absolute"
            >
              <Image
                src="/brand/mallevo-icon.png"
                alt="Mallevo"
                width={529}
                height={244}
                priority
                className="w-56 md:w-72 h-auto drop-shadow-[0_0_80px_rgba(193,241,72,0.45)]"
              />
            </motion.div>
          )}
        </AnimatePresence>

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
                A nova era do <br />
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
                Construindo o seu <br />
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
                Prepare-se para <br />
                <span className="text-white italic">crescer.</span>
              </motion.h2>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// Tela de sucesso final
// ============================================================================

function TelaSucesso() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090B] overflow-hidden p-6"
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
          <Sparkles className="w-5 h-5 text-[#C1F148]" />
          <span className="text-sm font-semibold text-[#C1F148] tracking-wider uppercase">
            Sua conta está pronta
          </span>
          <Sparkles className="w-5 h-5 text-[#C1F148]" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4 leading-tight"
        >
          Bem-vindo ao <span className="text-[#C1F148]">Mallevo</span>
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
  )
}
