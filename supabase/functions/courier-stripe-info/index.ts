import Stripe from 'https://esm.sh/stripe@14'
import { getSupabaseAdmin, getAuthenticatedUser, corsHeaders } from '../helpers/auth.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const user = await getAuthenticatedUser(req)
    const supabase = getSupabaseAdmin()

    const { data: courier } = await supabase
      .from('couriers')
      .select('id, stripe_account_id, stripe_onboarding_ok')
      .eq('user_id', user.id)
      .single()

    if (!courier?.stripe_account_id || !courier.stripe_onboarding_ok) {
      return new Response(
        JSON.stringify({ saldo: null, link_express: null }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      )
    }

    const [saldoStripe, linkExpress] = await Promise.all([
      stripe.balance.retrieve({
        stripeAccount: courier.stripe_account_id,
      }),
      stripe.accounts.createLoginLink(courier.stripe_account_id),
    ])

    const disponivel = saldoStripe.available.find((b) => b.currency === 'brl')
    const pendente = saldoStripe.pending.find((b) => b.currency === 'brl')

    return new Response(
      JSON.stringify({
        saldo: {
          disponivel: disponivel?.amount ?? 0,
          pendente: pendente?.amount ?? 0,
        },
        link_express: linkExpress.url,
      }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ erro: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  }
})
