/**
 * Gate do lojista — predicados COPIADOS das fontes vigentes, nunca
 * redefinidos (docs/partner-app/04-stage-2-auth-gate.md).
 *
 * Fontes:
 * - Publicação/recebimentos: `pagarme_onboarding_status === 'active'`
 *   (supabase/functions/create-subscription/index.ts:28,
 *    apps/web/lib/actions/financeiro.ts:238, apps/web/lib/actions/home.ts:75)
 * - Operação (assinatura): apps/web/app/(dashboard)/layout.tsx:74-75,130 —
 *   statusAtivos = ['trial','ativa']; `em_atraso` só exibe banner;
 *   somente `cancelada` bloqueia o conteúdo.
 *
 * Consumido pelo Dashboard e pelo Partner App (apps/mobile-partner) para
 * que as duas superfícies nunca divirjam.
 */

/** Status de assinatura considerados plenamente ativos pelo Dashboard. */
export const BILLING_STATUS_ATIVOS = ['trial', 'ativa'] as const

/**
 * Tenant pode publicar conteúdo no Explorar (e receber pagamentos)?
 * Mesmo predicado usado por create-subscription e pelas actions financeiras.
 */
export function tenantPodePublicar(tenant: {
  pagarme_onboarding_status: string | null
}): boolean {
  return tenant.pagarme_onboarding_status === 'active'
}

/**
 * Assinatura permite operar o painel/app?
 * Espelha o Dashboard: apenas `cancelada` bloqueia o conteúdo
 * (assinatura ausente = tenant recém-criado → não bloqueia; `em_atraso`
 * opera com banner de regularização).
 */
export function assinaturaPermiteOperar(
  billingStatus: string | null | undefined
): boolean {
  return billingStatus !== 'cancelada'
}

/** Assinatura em atraso → banner "Regularize agora" (não bloqueia). */
export function assinaturaEmAtraso(
  billingStatus: string | null | undefined
): boolean {
  return billingStatus === 'em_atraso'
}
