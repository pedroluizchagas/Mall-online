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
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--sidebar)' }}>
      <div className="text-center max-w-sm px-4">
        <div
          className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-6"
          style={{ borderColor: 'var(--brick)', borderTopColor: 'transparent' }}
        />
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--bg)' }}>
          Quase lá!
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>{mensagem}</p>
      </div>
    </div>
  )
}
