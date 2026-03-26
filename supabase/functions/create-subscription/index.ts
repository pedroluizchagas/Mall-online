// supabase/functions/create-subscription/index.ts
import Stripe from 'https://esm.sh/stripe@14'
import { getSupabaseAdmin, corsHeaders } from '../helpers/auth.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    // Chamada interna — autenticada via service_role no header
    const body = await req.json()
    const { tenant_id } = body

    const supabase = getSupabaseAdmin()

    // Buscar tenant e assinatura
    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_customer_id, stripe_onboarding_ok')
      .eq('id', tenant_id)
      .single()

    if (!tenant || !tenant.stripe_onboarding_ok) {
      throw new Error('Tenant sem KYC concluído')
    }

    const { data: sub } = await supabase
      .from('tenant_subscriptions')
      .select('stripe_price_id, stripe_subscription_id, trial_termina_em')
      .eq('tenant_id', tenant_id)
      .single()

    if (!sub || !sub.stripe_price_id) {
      throw new Error('Assinatura ou price não encontrado')
    }

    // Não criar novamente se já existe
    if (sub.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ message: 'Subscription já existe' }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      )
    }

    // Calcular dias de trial restantes
    const trialEnd = sub.trial_termina_em
      ? Math.floor(new Date(sub.trial_termina_em).getTime() / 1000)
      : undefined

    const subscription = await stripe.subscriptions.create({
      customer: tenant.stripe_customer_id,
      items: [{ price: sub.stripe_price_id }],
      trial_end: trialEnd,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    })

    await supabase
      .from('tenant_subscriptions')
      .update({
        stripe_subscription_id: subscription.id,
        billing_status: subscription.status === 'trialing' ? 'trial' : 'ativa',
        periodo_inicio: new Date(subscription.current_period_start * 1000).toISOString(),
        periodo_fim: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('tenant_id', tenant_id)

    return new Response(
      JSON.stringify({ subscription_id: subscription.id }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  }
})
