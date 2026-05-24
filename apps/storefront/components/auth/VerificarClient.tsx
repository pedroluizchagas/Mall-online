'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { createSupabaseClient } from '@/lib/supabase/client'

/**
 * VerificarClient — port RN→DOM de
 * apps/mobile-consumer/app/(auth)/verificar.tsx (Stage 3e).
 * `verifyOtp({type:'email'})` + reenvio via `signInWithOtp`. Pós-sucesso
 * honra `?next=` (gate do checkout, §3e) em vez do `/(tabs)` do mobile.
 */
export function VerificarClient({
  email,
  next,
}: {
  email: string
  next: string
}) {
  const router = useRouter()
  const [codigo, setCodigo] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const [erro, setErro] = useState<string | undefined>(undefined)

  async function handleVerificar() {
    if (codigo.length !== 6) {
      setErro('Digite os 6 dígitos do código.')
      return
    }

    setCarregando(true)
    setErro(undefined)

    const supabase = createSupabaseClient()
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: codigo,
      type: 'email',
    })

    setCarregando(false)

    if (error) {
      setErro('Código inválido ou expirado. Tente novamente.')
      return
    }

    router.replace(next)
  }

  async function handleReenviar() {
    if (!email) return
    setReenviando(true)
    setErro(undefined)
    const supabase = createSupabaseClient()
    await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setReenviando(false)
    setCodigo('')
  }

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
          Verifique seu email
        </h1>
        <p className="text-[15px] font-medium leading-relaxed text-ink-soft">
          Enviamos um código de 6 dígitos para{' '}
          <span className="font-bold text-white">{email}</span>
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold text-ink-soft">
          Código de verificação
        </label>
        <input
          inputMode="numeric"
          value={codigo}
          onChange={(e) => {
            setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))
            setErro(undefined)
          }}
          placeholder="000000"
          maxLength={6}
          className="h-12 w-full rounded-md border border-line-dark bg-surfaceDarkSoft px-4 text-center text-lg font-bold tracking-[0.4em] text-white outline-none placeholder:text-ink-soft focus:border-accent"
        />
        {erro && (
          <p role="alert" className="mt-1.5 text-[13px] text-danger">
            {erro}
          </p>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleVerificar}
          disabled={carregando || codigo.length !== 6}
          className="h-14 w-full rounded-pill bg-accent text-[15px] font-extrabold text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {carregando ? 'Verificando…' : 'Confirmar'}
        </button>
        <button
          type="button"
          onClick={handleReenviar}
          disabled={reenviando}
          className="h-11 w-full rounded-pill text-sm font-extrabold text-ink-soft transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {reenviando ? 'Reenviando…' : 'Reenviar código'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="h-11 w-full rounded-pill text-sm font-extrabold text-ink-soft transition-opacity hover:opacity-80"
        >
          Voltar e trocar email
        </button>
      </div>
    </div>
  )
}
