import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/sidebar'
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

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, stripe_onboarding_ok')
    .single() as { data: Pick<Tenant, 'id' | 'stripe_onboarding_ok'> | null }

  if (!tenant) redirect('/onboarding')
  if (!tenant.stripe_onboarding_ok) redirect('/onboarding/stripe/retry')

  const { data: lojaRaw } = await supabase
    .from('stores')
    .select('nome')
    .eq('tenant_id', tenant.id)
    .single()
  const nomeLoja = (lojaRaw as { nome?: string } | null)?.nome ?? null

  const { data: assinatura } = await supabase
    .from('tenant_subscriptions')
    .select('billing_status')
    .single() as { data: Pick<Subscription, 'billing_status'> | null }

  const statusAtivos = ['trial', 'ativa']
  const assinaturaAtiva = assinatura && statusAtivos.includes(assinatura.billing_status)

  return (
    /* Outer shell: fundo escuro da sidebar se estende pela tela toda */
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: '#151515', padding: '12px 12px 12px 0' }}
    >
      {/* Sidebar fixa, encostada na borda esquerda */}
      <Sidebar nomeLoja={nomeLoja} />

      {/* Main-wrap: área principal com cantos arredondados, efeito "tela flutuante" */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ background: '#EFEFEF', borderRadius: 20 }}
      >
        {/* Banner: assinatura em atraso */}
        {assinatura?.billing_status === 'em_atraso' && (
          <div className="flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-6 py-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <path d="M12 9v4"/><path d="M12 17h.01"/>
            </svg>
            <p className="text-sm text-amber-800">
              Sua assinatura está com pagamento em atraso.{' '}
              <a href="/configuracoes/assinatura" className="font-semibold underline underline-offset-2">
                Regularize agora
              </a>
            </p>
          </div>
        )}

        {/* Conteúdo ou bloqueio */}
        {!assinaturaAtiva && assinatura?.billing_status === 'cancelada' ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm px-6">
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mx-auto mb-5 shadow-card">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="m15 9-6 6"/><path d="m9 9 6 6"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-brand-800 mb-2">Assinatura cancelada</h2>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Reative sua assinatura para continuar usando a plataforma Mallora.
              </p>
              <a
                href="/configuracoes/assinatura"
                className="btn-primary inline-flex items-center gap-2"
              >
                Reativar assinatura
              </a>
            </div>
          </div>
        ) : (
          <main className="flex-1 overflow-y-auto main-scroll">
            {children}
          </main>
        )}
      </div>
    </div>
  )
}
