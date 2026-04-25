import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import type { Database } from '@mallora/types'
import { BannerStripePendente } from '@/components/dashboard/banner-stripe-pendente'
import { ToastBoasVindas } from '@/components/dashboard/toast-boas-vindas'
import { SidebarDashboard } from '@/components/dashboard/sidebar'

type Tenant = Database['public']['Tables']['tenants']['Row']
type Subscription = Database['public']['Tables']['tenant_subscriptions']['Row']
type Store = Database['public']['Tables']['stores']['Row']

export default async function LayoutDashboard({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')

  const { data: tenant } = (await supabase
    .from('tenants')
    .select('id, stripe_onboarding_ok')
    .single()) as { data: Pick<Tenant, 'id' | 'stripe_onboarding_ok'> | null }

  if (!tenant) redirect('/onboarding')

  const { data: loja } = (await supabase
    .from('stores')
    .select('nome')
    .eq('tenant_id', tenant.id)
    .single()) as { data: Pick<Store, 'nome'> | null }

  const { data: assinatura } = (await supabase
    .from('tenant_subscriptions')
    .select('billing_status')
    .single()) as { data: Pick<Subscription, 'billing_status'> | null }

  const statusAtivos = ['trial', 'ativa']
  const assinaturaAtiva = assinatura && statusAtivos.includes(assinatura.billing_status)

  return (
    <div
      className="flex min-h-screen overflow-hidden"
      style={{ background: 'var(--sidebar)' }}
    >
      <SidebarDashboard nomeLoja={loja?.nome ?? 'Minha loja'} />

      <div className="flex-1 flex flex-col min-w-0">
        <div
          className="flex-1 flex flex-col min-w-0 overflow-hidden"
          style={{
            background: 'var(--bg)',
            borderTopLeftRadius: 32,
            boxShadow: '-8px 0 24px -12px rgba(0,0,0,0.4)',
            minHeight: '100vh',
          }}
        >
          {/* Banners no topo do conteúdo */}
          {assinatura?.billing_status === 'em_atraso' && (
            <div
              className="border-b px-9 py-2.5 flex-shrink-0"
              style={{
                background: '#fef3c7',
                borderColor: '#fde68a',
                borderTopLeftRadius: 32,
              }}
            >
              <p className="text-sm" style={{ color: '#92400e' }}>
                Sua assinatura está com pagamento em atraso.{' '}
                <a href="/configuracoes/assinatura" className="underline font-medium">
                  Regularize agora
                </a>
              </p>
            </div>
          )}

          {!tenant.stripe_onboarding_ok && <BannerStripePendente />}

          <main className="flex-1 overflow-y-auto">
            {!assinaturaAtiva && assinatura?.billing_status === 'cancelada' ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-sm">
                  <h2 className="text-xl font-semibold text-ink mb-2">
                    Assinatura cancelada
                  </h2>
                  <p className="text-ink-3 mb-4">
                    Reative sua assinatura para continuar usando a plataforma.
                  </p>
                  <a
                    href="/configuracoes/assinatura"
                    className="px-6 py-2.5 rounded-full font-bold inline-block transition-colors"
                    style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
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
      </div>

      <ToastBoasVindas />
    </div>
  )
}
