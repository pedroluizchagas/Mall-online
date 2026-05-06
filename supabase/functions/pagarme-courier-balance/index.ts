import { getSupabaseAdmin, getAuthenticatedUser, corsHeaders } from '../helpers/auth.ts'

const PAGARME_BASE_URL = 'https://api.pagar.me/core/v5'

function pagarmeAuthHeader() {
  const apiKey = Deno.env.get('PAGARME_API_KEY')
  if (!apiKey) throw new Error('PAGARME_API_KEY não configurada')
  return 'Basic ' + btoa(`${apiKey}:`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const user = await getAuthenticatedUser(req)
    const supabase = getSupabaseAdmin()

    const { data: courier } = await supabase
      .from('couriers')
      .select('id, pagarme_recipient_id, pagarme_onboarding_status')
      .eq('user_id', user.id)
      .single()

    if (
      !courier?.pagarme_recipient_id ||
      courier.pagarme_onboarding_status !== 'active'
    ) {
      return new Response(
        JSON.stringify({ saldo: null }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      )
    }

    const res = await fetch(
      `${PAGARME_BASE_URL}/recipients/${courier.pagarme_recipient_id}/balance`,
      { headers: { Authorization: pagarmeAuthHeader() } }
    )

    if (!res.ok) {
      const erro = await res.text()
      throw new Error(`Pagar.me balance: ${erro}`)
    }

    const saldo = await res.json()

    return new Response(
      JSON.stringify({
        saldo: {
          disponivel: saldo.available_amount ?? 0,
          a_receber: saldo.waiting_funds_amount ?? 0,
          transferido: saldo.transferred_amount ?? 0,
        },
      }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ erro: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  }
})
