import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import type { Database } from '@mallora/types'

type Tenant = Database['public']['Tables']['tenants']['Row']
type Subscription = Database['public']['Tables']['tenant_subscriptions']['Row']

export default async function LayoutDashboard({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createSupabaseServer()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')

  // Verificar tenant e onboarding
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, stripe_onboarding_ok')
    .single() as { data: Pick<Tenant, 'id' | 'stripe_onboarding_ok'> | null }

  if (!tenant) redirect('/onboarding')
  if (!tenant.stripe_onboarding_ok) redirect('/onboarding/stripe/retry')

  // Verificar assinatura
  const { data: assinatura } = await supabase
    .from('tenant_subscriptions')
    .select('billing_status')
    .single() as { data: Pick<Subscription, 'billing_status'> | null }

  const statusAtivos = ['trial', 'ativa']
  const assinaturaAtiva = assinatura && statusAtivos.includes(assinatura.billing_status)

  return (
    <div className="flex h-screen bg-[#FFF8ED]">
      <main className="flex-1 overflow-auto">
        {/* Banner de aviso para assinatura em atraso */}
        {assinatura?.billing_status === 'em_atraso' && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
            <p className="text-sm text-amber-800">
              Sua assinatura está com pagamento em atraso.
              <a href="/dashboard/configuracoes/assinatura" className="underline ml-1">
                Regularize agora
              </a>
            </p>
          </div>
        )}

        {/* Bloquear acesso se assinatura cancelada */}
        {!assinaturaAtiva && assinatura?.billing_status === 'cancelada' ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm">
              <h2 className="text-xl font-semibold text-[#1A4D3A] mb-2">
                Assinatura cancelada
              </h2>
              <p className="text-gray-500 mb-4">
                Reative sua assinatura para continuar usando a plataforma.
              </p>
              <a
                href="/dashboard/configuracoes/assinatura"
                className="bg-[#1A4D3A] text-white px-6 py-2 rounded-lg inline-block"
              >
                Reativar assinatura
              </a>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  )
}
