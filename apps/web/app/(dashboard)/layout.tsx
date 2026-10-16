import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import type { Database } from '@mallevo/types'
import { getTemplateByStore, TemplateProvider } from '@mallevo/lib'
import { BannerRecebimentosPendente } from '@/components/dashboard/banner-recebimentos-pendente'
import { AvisoMoldura } from '@/components/dashboard/aviso-moldura'
import { ToastBoasVindas } from '@/components/dashboard/toast-boas-vindas'
import { SidebarDashboard } from '@/components/dashboard/sidebar'
import { MobileTopbar } from '@/components/dashboard/mobile-topbar'
import { Superficie } from '@/components/dashboard/superficie'
import { TutorialGate } from '@/components/dashboard/tutorial-gate'
import { CommandPalette } from '@/components/dashboard/command-palette'
import { AtalhosTeclado } from '@/components/dashboard/atalhos-teclado'
import { construirComandos } from '@/components/dashboard/comandos'
import { Toaster } from '@/components/ui/toast'
import { PartnerIcon } from '@/components/ui/partner-icon'

type Tenant = Database['public']['Tables']['tenants']['Row']
type Subscription = Database['public']['Tables']['tenant_subscriptions']['Row']

// Categoria embutida na loja para resolver o template do dashboard.
// `categories.slug` foi adicionado na migration 014; o tipo gerado ainda
// não reflete a coluna, então fazemos cast pontual no consumo.
type StoreComCategoria = {
  nome: string | null
  slug: string | null
  logo_url: string | null
  horarios: unknown
  ativo: boolean | null
  categoria: { id: string; slug: string | null; nome: string; icone: string | null } | null
}

/**
 * O painel é o balcão no computador: a MOLDURA é a marquise (zinco com o
 * neon lima vazando, grão de filme), a sidebar é a portaria transparente
 * sobre ela, e o conteúdo é a FOLHA clara recortada com cantos de 24px. Avisos
 * que bloqueiam a operação moram na moldura, acima da folha.
 */
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
    .select('nome, slug, logo_url, horarios, ativo, categoria:categories!stores_categoria_id_fkey(id, slug, nome, icone)')
    .eq('tenant_id', tenant.id)
    .limit(1)
    .maybeSingle()) as { data: StoreComCategoria | null }

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
  const assinaturaCancelada = !assinaturaAtiva && assinatura?.billing_status === 'cancelada'

  const comandos = construirComandos(template)
  const nomeLoja = loja?.nome ?? 'Minha loja'

  return (
    <TemplateProvider value={template}>
      <a href="#conteudo-principal" className="skip-link">
        Pular para o conteúdo
      </a>
      <div className="grao relative isolate flex h-[100dvh] overflow-hidden bg-marquee">
        <div aria-hidden className="glow-marquise pointer-events-none absolute inset-0 -z-10" />

        <SidebarDashboard
          nomeLoja={nomeLoja}
          slugLoja={loja?.slug ?? null}
          logoLoja={loja?.logo_url ?? null}
          horarios={loja?.horarios ?? null}
          lojaAtiva={loja?.ativo ?? true}
          template={template}
          pedidosNovosInicial={pedidosNovosCount ?? 0}
          tenantId={tenant.id}
        />

        <div className="relative z-[1] flex min-w-0 flex-1 flex-col gap-3 md:py-3 md:pr-3">
          <MobileTopbar nomeLoja={nomeLoja} />

          {(assinatura?.billing_status === 'em_atraso' || tenant.pagarme_onboarding_status !== 'active') && (
            <div className="flex flex-col gap-2 px-3 md:px-0">
              {assinatura?.billing_status === 'em_atraso' && (
                <AvisoMoldura
                  tom="alerta"
                  icone="clock"
                  titulo="Sua assinatura está com pagamento em atraso."
                  texto="Regularize para manter a loja aberta no shopping."
                  cta={{ label: 'Regularizar agora', href: '/minha-conta?aba=assinatura' }}
                />
              )}
              {tenant.pagarme_onboarding_status !== 'active' && <BannerRecebimentosPendente />}
            </div>
          )}

          <main
            id="conteudo-principal"
            tabIndex={-1}
            className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-t-[24px] outline-none md:rounded-[24px]"
          >
            {/* Cancelada: o aviso ganha a própria folha — no Início não há folha do layout. */}
            {assinaturaCancelada ? (
              <div className="vidro-fosco min-h-full">
                <AssinaturaCancelada />
              </div>
            ) : (
              <Superficie>{children}</Superficie>
            )}
          </main>
        </div>

        <CommandPalette comandos={comandos} />
        <AtalhosTeclado comandos={comandos} />
        <ToastBoasVindas />
        <TutorialGate tutorialVisto={tenant.tutorial_template_visto ?? false} />
        <Toaster />
      </div>
    </TemplateProvider>
  )
}

function AssinaturaCancelada() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-bg-3 text-ink">
          <PartnerIcon name="store" size={24} strokeWidth={1.8} />
        </span>
        <h1 className="mt-6 text-[34px] font-semibold leading-[1] tracking-[-0.04em] text-ink">
          Sua assinatura
          <span className="mt-1 block italic">
            <span className="marca-texto">foi cancelada.</span>
          </span>
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-3">
          Reative para abrir a loja de novo no shopping e voltar a usar o painel.
        </p>
        <Link
          href="/minha-conta?aba=assinatura"
          className="mt-7 inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-bold transition-colors"
          style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
        >
          Reativar assinatura
          <PartnerIcon name="chevron-right" size={16} strokeWidth={2.4} />
        </Link>
      </div>
    </div>
  )
}
