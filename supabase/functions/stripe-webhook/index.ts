// supabase/functions/stripe-webhook/index.ts
import Stripe from 'https://esm.sh/stripe@14'
import { getSupabaseAdmin } from '../helpers/auth.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
})

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch {
    return new Response('Assinatura inválida', { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  try {
    switch (event.type) {

      // Pagamento confirmado pelo consumidor
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        await supabase
          .from('orders')
          .update({
            payment_status: 'pago',
            forma_pagamento: pi.payment_method_types[0] === 'pix'
              ? 'online_pix'
              : 'online_cartao',
          })
          .eq('stripe_payment_intent_id', pi.id)
        break
      }

      // Pagamento falhou
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        await supabase
          .from('orders')
          .update({
            status: 'cancelado',
            payment_status: 'pendente',
            motivo_cancelamento: 'Falha no pagamento',
            cancelado_em: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', pi.id)
        break
      }

      // KYC da Express Account concluído
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        const onboardingOk =
          account.charges_enabled &&
          account.payouts_enabled &&
          account.details_submitted

        if (onboardingOk) {
          // Verificar se é lojista ou entregador
          const { data: tenant } = await supabase
            .from('tenants')
            .select('id')
            .eq('stripe_account_id', account.id)
            .single()

          if (tenant) {
            await supabase
              .from('tenants')
              .update({ stripe_onboarding_ok: true })
              .eq('id', tenant.id)

            // Criar subscription Stripe Billing
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/create-subscription`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({ tenant_id: tenant.id }),
            })
          }

          const { data: courier } = await supabase
            .from('couriers')
            .select('id')
            .eq('stripe_account_id', account.id)
            .single()

          if (courier) {
            await supabase
              .from('couriers')
              .update({ stripe_onboarding_ok: true })
              .eq('id', courier.id)
          }
        }
        break
      }

      // Assinatura atualizada
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const billingStatus = mapSubscriptionStatus(sub.status)

        await supabase
          .from('tenant_subscriptions')
          .update({
            billing_status: billingStatus,
            periodo_inicio: new Date(sub.current_period_start * 1000).toISOString(),
            periodo_fim: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      // Assinatura cancelada
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await supabase
          .from('tenant_subscriptions')
          .update({
            billing_status: 'cancelada',
            cancelado_em: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      // Fatura paga (renovação ou ativação)
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          await supabase
            .from('tenant_subscriptions')
            .update({ billing_status: 'ativa' })
            .eq('stripe_subscription_id', invoice.subscription)
        }
        break
      }

      // Fatura com falha no pagamento
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          await supabase
            .from('tenant_subscriptions')
            .update({ billing_status: 'em_atraso' })
            .eq('stripe_subscription_id', invoice.subscription)
        }
        break
      }

      default:
        // Evento não tratado — ignorar silenciosamente
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro ao processar webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    )
  }
})

function mapSubscriptionStatus(status: string): string {
  const map: Record<string, string> = {
    active: 'ativa',
    trialing: 'trial',
    past_due: 'em_atraso',
    canceled: 'cancelada',
    unpaid: 'em_atraso',
    incomplete: 'trial',
    incomplete_expired: 'cancelada',
  }
  return map[status] ?? 'em_atraso'
}
