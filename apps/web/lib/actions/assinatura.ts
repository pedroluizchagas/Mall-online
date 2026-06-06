'use server'

import Stripe from 'stripe'
import { createSupabaseServer } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})

// Dados da assinatura atual
export async function getDadosAssinatura() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id, pagarme_onboarding_status')
    .single()

  const { data: sub } = await supabase
    .from('tenant_subscriptions')
    .select(`
      billing_status,
      stripe_subscription_id,
      trial_termina_em,
      periodo_inicio,
      periodo_fim,
      cancelado_em,
      plans (nome, preco_mensal, max_lojas, max_produtos, tem_estoque, tem_antecipacao)
    `)
    .single()

  return { tenant, assinatura: sub }
}

// Histórico de faturas via Stripe API
export async function getFaturas() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id')
    .single()

  if (!tenant?.stripe_customer_id) return []

  try {
    const faturas = await stripe.invoices.list({
      customer: tenant.stripe_customer_id,
      limit: 12,
    })

    return faturas.data.map((f) => ({
      id: f.id,
      numero: f.number,
      valor: f.amount_paid,
      status: f.status,
      data: new Date(f.created * 1000).toLocaleDateString('pt-BR'),
      pdf_url: f.invoice_pdf,
      periodo_inicio: f.period_start
        ? new Date(f.period_start * 1000).toLocaleDateString('pt-BR')
        : null,
      periodo_fim: f.period_end
        ? new Date(f.period_end * 1000).toLocaleDateString('pt-BR')
        : null,
    }))
  } catch {
    return []
  }
}

// Gerar link para o Stripe Customer Portal
export async function getLinkPortalAssinatura() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id')
    .single()

  if (!tenant?.stripe_customer_id) return null

  try {
    const sessao = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${process.env.APP_URL}/minha-conta?aba=assinatura`,
    })
    return sessao.url
  } catch {
    return null
  }
}
