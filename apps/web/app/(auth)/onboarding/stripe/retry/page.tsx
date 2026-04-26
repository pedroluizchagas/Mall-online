'use client'

import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'

export default function PaginaStripeRetry() {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleRetry() {
    setCarregando(true)
    setErro(null)
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
          body: JSON.stringify({}),
        }
      )

      const resultado = await resposta.json()

      if (!resposta.ok) {
        throw new Error(resultado.error)
      }

      window.location.href = resultado.stripe_onboarding_url
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro inesperado'
      setErro(message)
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--sidebar)' }}>
      <div className="text-center max-w-sm px-4">
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--bg)' }}>
          Link expirado
        </h2>
        <p className="mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
          O link de configuração da Stripe expirou. Clique abaixo para gerar um novo link e continuar a configuração.
        </p>

        {erro && (
          <p className="text-sm mb-4" style={{ color: 'var(--err)' }}>{erro}</p>
        )}

        <button
          onClick={handleRetry}
          disabled={carregando}
          className="w-full py-3 rounded-full font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
        >
          {carregando ? 'Gerando novo link...' : 'Tentar novamente'}
        </button>
      </div>
    </div>
  )
}
