import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import type { Database } from '@mallevo/types'
import { getTemplateByStore, TemplateProvider } from '@mallevo/lib'
import { BannerRecebimentosPendente } from '@/components/dashboard/banner-recebimentos-pendente'
import { ToastBoasVindas } from '@/components/dashboard/toast-boas-vindas'
import { SidebarDashboard } from '@/components/dashboard/sidebar'
import { TutorialGate } from '@/components/dashboard/tutorial-gate'
import { Toaster } from '@/components/ui/toast'

type Tenant = Database['public']['Tables']['tenants']['Row']
type Subscription = Database['public']['Tables']['tenant_subscriptions']['Row']

// Categoria embutida na loja para resolver o template do dashboard.
// `categories.slug` foi adicionado na migration 014; o tipo gerado ainda
// não reflete a coluna, então fazemos cast pontual no consumo.
type StoreComCategoria = {
  nome: string | null
  categoria: { id: string; slug: string | null; nome: string; icone: string | null } | null
}

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

  const { data: tenants, error: tenantError } = (await supabase
    .from('tenants')
    .select('id, pagarme_onboarding_status, tutorial_template_visto')
    .limit(1)) as {
    data:
      | (Pick<Tenant, 'id' | 'pagarme_onboarding_status'> & {
          tutorial_template_visto: boolean | null
        })[]
      | null
    error: any
  }

  const tenant = tenants?.[0]

  if (tenantError) redirect('/entrar')
  if (!tenant) redirect('/onboarding')

  const { data: loja } = (await supabase
    .from('stores')
    .select('nome, categoria:categories(id, slug, nome, icone)')
    .eq('tenant_id', tenant.id)
    .single()) as { data: StoreComCategoria | null }

  const template = getTemplateByStore(loja ?? {})

  const { count: pedidosNovosCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)
    .eq('status', 'novo')

  const { data: assinatura } = (await supabase
    .from('tenant_subscriptions')
    .select('billing_status')
    .single()) as { data: Pick<Subscription, 'billing_status'> | null }

  const statusAtivos = ['trial', 'ativa']
  const assinaturaAtiva = assinatura && statusAtivos.includes(assinatura.billing_status)

  return (
    <TemplateProvider value={template}>
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: 'var(--sidebar)' }}
    >
      <SidebarDashboard
        nomeLoja={loja?.nome ?? 'Minha loja'}
        template={template}
        pedidosNovosInicial={pedidosNovosCount ?? 0}
        tenantId={tenant.id}
      />

      <div
        className="flex-1 flex flex-col min-w-0 overflow-hidden"
        style={{ padding: '12px 12px 12px 0' }}
      >
        <div
          className="flex flex-col min-w-0 overflow-hidden rounded-[24px]"
          style={{
            background: 'var(--bg)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 8px 24px -8px rgba(0,0,0,0.35)',
            height: 'calc(100vh - 24px)',
          }}
        >
          {/* Banners no topo do conteúdo */}
          {assinatura?.billing_status === 'em_atraso' && (
            <div
              className="border-b px-9 py-2.5 flex-shrink-0"
              style={{
                background: '#fef3c7',
                borderColor: '#fde68a',
              }}
            >
              <p className="text-sm" style={{ color: '#92400e' }}>
                Sua assinatura está com pagamento em atraso.{' '}
                <a href="/configuracoes/conta" className="underline font-medium">
                  Regularize agora
                </a>
              </p>
            </div>
          )}

          {tenant.pagarme_onboarding_status !== 'active' && <BannerRecebimentosPendente />}

          <main className="flex-1 overflow-y-auto min-h-0">
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
                    href="/configuracoes/conta"
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
      <TutorialGate tutorialVisto={tenant.tutorial_template_visto ?? false} />
      <Toaster />
    </div>
    </TemplateProvider>
  )
}
