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
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8ED]">
      <div className="text-center max-w-sm px-4">
        <h2 className="text-xl font-semibold text-[#1A4D3A] mb-2">
          Link expirado
        </h2>
        <p className="text-gray-500 mb-6">
          O link de configuração da Stripe expirou. Clique abaixo para gerar um novo link e continuar a configuração.
        </p>

        {erro && (
          <p className="text-sm text-red-600 mb-4">{erro}</p>
        )}

        <button
          onClick={handleRetry}
          disabled={carregando}
          className="w-full bg-[#1A4D3A] text-white py-3 rounded-lg font-medium hover:bg-[#163d2e] transition-colors disabled:opacity-50"
        >
          {carregando ? 'Gerando novo link...' : 'Tentar novamente'}
        </button>
      </div>
    </div>
  )
}
