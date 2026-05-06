// supabase/functions/stripe-webhook/index.ts
//
// Processa exclusivamente eventos de Stripe Billing (assinatura mensal do
// lojista). Eventos relacionados a pagamentos de pedidos, repasses ou contas
// Connect passaram a viver no `pagarme-webhook` — aqui são apenas ignorados
// com log "evento não tratado".
import Stripe from 'https://esm.sh/stripe@14'
import { getSupabaseAdmin } from '../helpers/auth.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
})

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event | null = null
  let verified = false

  for (const secret of [Deno.env.get('STRIPE_WEBHOOK_SECRET')].filter(Boolean) as string[]) {
    try {
      event = stripe.webhooks.constructEvent(body, signature!, secret)
      verified = true
      break
    } catch {
      // tenta o próximo secret (caso múltiplos venham a ser configurados)
    }
  }

  if (!verified || !event) {
    return new Response('Assinatura inválida', { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await supabase
          .from('tenant_subscriptions')
          .update({
            billing_status: mapSubscriptionStatus(sub.status),
            periodo_inicio: new Date(sub.current_period_start * 1000).toISOString(),
            periodo_fim: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', sub.id)
        break
      }

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

      case 'invoice.payment_action_required': {
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
        console.log(`stripe-webhook: evento não tratado (${event.type})`)
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro ao processar webhook Stripe:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
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
