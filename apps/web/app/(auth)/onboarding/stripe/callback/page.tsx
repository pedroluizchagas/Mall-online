'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import type { Database } from '@mallora/types'

type Tenant = Database['public']['Tables']['tenants']['Row']

export default function PaginaStripeCallback() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const [mensagem, setMensagem] = useState('Verificando sua conta...')

  useEffect(() => {
    let tentativas = 0
    const maxTentativas = 12 // até 60 segundos

    const intervalo = setInterval(async () => {
      tentativas++

      const { data: tenant } = await supabase
        .from('tenants')
        .select('stripe_onboarding_ok')
        .single() as { data: Pick<Tenant, 'stripe_onboarding_ok'> | null }

      if (tenant?.stripe_onboarding_ok) {
        clearInterval(intervalo)
        setMensagem('Conta verificada! Redirecionando...')
        setTimeout(() => router.push('/dashboard'), 1500)
        return
      }

      if (tentativas >= maxTentativas) {
        clearInterval(intervalo)
        setMensagem(
          'A verificação pode demorar alguns minutos. ' +
          'Você receberá um email quando estiver pronta.'
        )
      }
    }, 5000)

    return () => clearInterval(intervalo)
  }, [router, supabase])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8ED]">
      <div className="text-center max-w-sm px-4">
        <div className="w-12 h-12 border-4 border-[#4CAF82] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-xl font-semibold text-[#1A4D3A] mb-2">
          Quase lá!
        </h2>
        <p className="text-gray-500">{mensagem}</p>
      </div>
    </div>
  )
}
