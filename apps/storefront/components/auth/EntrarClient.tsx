'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { createSupabaseClient } from '@/lib/supabase/client'

/**
 * EntrarClient — port RN→DOM de apps/mobile-consumer/app/(auth)/entrar.tsx
 * (Stage 3e). Mesmos modos (`entrar`/`cadastrar`/`confirmar`),
 * `signInWithPassword`/`signUp` com `options.data.role: 'consumer'`.
 *
 * Diferença de plataforma (decisão TL §3e): o mobile faz
 * `router.replace('/(tabs)')`; o storefront honra `?next=` (gate do
 * checkout do 3d) e cai em `/` por padrão. A tela "confirme seu email"
 * espelha o mobile e oferece também acesso ao `/verificar` (OTP).
 */

const inputBase =
  'h-12 w-full rounded-md border border-line-dark bg-surfaceDarkSoft px-4 text-sm font-medium text-white outline-none placeholder:text-ink-soft focus:border-accent'

export function EntrarClient({ next }: { next: string }) {
  const router = useRouter()
  const [modo, setModo] = useState<'entrar' | 'cadastrar' | 'confirmar'>(
    'entrar'
  )
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function validar() {
    if (!email.trim()) return 'Digite seu email.'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return 'Email inválido.'
    if (!senha) return 'Digite sua senha.'
    if (modo === 'cadastrar' && senha.length < 6)
      return 'A senha deve ter pelo menos 6 caracteres.'
    return null
  }

  async function handleSubmit() {
    const erroValidacao = validar()
    if (erroValidacao) {
      setErro(erroValidacao)
      return
    }

    setCarregando(true)
    setErro(null)

    // Client-only (handler): singleton compartilhado com o AuthProvider,
    // que observa este sign-in via onAuthStateChange.
    const supabase = createSupabaseClient()

    if (modo === 'cadastrar') {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: senha,
        options: { data: { role: 'consumer' } },
      })
      setCarregando(false)
      if (error) {
        setErro(
          error.message === 'User already registered'
            ? 'Este email já está cadastrado.'
            : 'Não foi possível criar a conta. Tente novamente.'
        )
        return
      }
      if (!data.session) {
        setErro(null)
        setModo('confirmar')
        return
      }
      router.replace(next)
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      })
      setCarregando(false)
      if (error) {
        setErro('Email ou senha incorretos.')
        return
      }
      router.replace(next)
    }
  }

  if (modo === 'confirmar') {
    const verificarHref = `/verificar?email=${encodeURIComponent(
      email
    )}&next=${encodeURIComponent(next)}`
    return (
      <div className="flex min-h-screen flex-col bg-surfaceDark px-6 pb-8 pt-24">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-6 flex h-20 w-20 items-center justify-center rounded-pill bg-accent-soft text-accent">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M8.5 12.5l2.5 2.5 4.5-5" />
            </svg>
          </span>
          <h1 className="mb-3 text-[26px] font-extrabold tracking-tight text-white">
            Confirme seu email
          </h1>
          <p className="text-[15px] font-medium leading-relaxed text-ink-soft">
            Enviamos um link de confirmação para{' '}
            <span className="font-bold text-white">{email}</span>. Após
            confirmar, volte aqui e faça login.
          </p>
        </div>

        <div className="flex-1" />

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setModo('entrar')
              setSenha('')
            }}
            className="h-14 w-full rounded-pill bg-accent text-[15px] font-extrabold text-ink transition-opacity hover:opacity-90"
          >
            Ir para o login
          </button>
          <a
            href={verificarHref}
            className="flex h-11 w-full items-center justify-center rounded-pill text-sm font-extrabold text-ink-soft transition-opacity hover:opacity-80"
          >
            Tenho um código de verificação
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-surfaceDark px-6 pb-8 pt-14">
      <span className="mb-8 flex h-14 w-14 items-center justify-center rounded-pill bg-accent-soft text-accent">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 7h12l-1 13H7L6 7Z" />
          <path d="M9 7a3 3 0 0 1 6 0" />
        </svg>
      </span>

      <h1 className="mb-2.5 whitespace-pre-line text-[30px] font-extrabold leading-tight tracking-tight text-white">
        {modo === 'entrar' ? 'Bem-vindo\nde volta' : 'Criar\nconta'}
      </h1>
      <p className="mb-9 text-[15px] font-medium leading-relaxed text-ink-soft">
        {modo === 'entrar'
          ? 'Acesse sua conta com email e senha.'
          : 'Preencha seus dados para começar.'}
      </p>

      <div className="flex flex-col gap-3.5">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-ink-soft">
            Email
          </label>
          <input
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setErro(null)
            }}
            placeholder="seu@email.com"
            className={inputBase}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-ink-soft">
            Senha
          </label>
          <input
            type="password"
            value={senha}
            onChange={(e) => {
              setSenha(e.target.value)
              setErro(null)
            }}
            placeholder={
              modo === 'cadastrar' ? 'Mínimo 6 caracteres' : '••••••••'
            }
            className={inputBase}
          />
        </div>

        {erro && (
          <p role="alert" className="-mt-1 text-[13px] text-danger">
            {erro}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={carregando}
          className="mt-2 h-14 w-full rounded-pill bg-accent text-[15px] font-extrabold text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {carregando
            ? 'Aguarde…'
            : modo === 'entrar'
            ? 'Entrar'
            : 'Criar conta'}
        </button>

        <button
          type="button"
          onClick={() => {
            setModo(modo === 'entrar' ? 'cadastrar' : 'entrar')
            setErro(null)
          }}
          className="h-11 w-full rounded-pill text-sm font-extrabold text-ink-soft transition-opacity hover:opacity-80"
        >
          {modo === 'entrar'
            ? 'Não tem conta? Criar conta'
            : 'Já tem conta? Entrar'}
        </button>
      </div>

      <div className="flex-1" />

      <p className="mt-8 text-center text-xs font-medium leading-relaxed text-ink-soft">
        Ao continuar, você concorda com os Termos de Uso e a Política de
        Privacidade da plataforma.
      </p>
    </div>
  )
}
