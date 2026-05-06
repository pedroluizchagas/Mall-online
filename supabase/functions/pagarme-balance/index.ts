// supabase/functions/pagarme-balance/index.ts
// Devolve o saldo do recipient Pagar.me do tenant autenticado.
// Resposta: { available, waiting_funds, transferred } em centavos.
import { getSupabaseAdmin, getAuthenticatedUser, corsHeaders } from '../helpers/auth.ts'

const PAGARME_API_KEY = Deno.env.get('PAGARME_API_KEY')!
const PAGARME_BASE_URL = 'https://api.pagar.me/core/v5'

function basicAuth(apiKey: string): string {
  return 'Basic ' + btoa(`${apiKey}:`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const user = await getAuthenticatedUser(req)
    const supabase = getSupabaseAdmin()

    const { data: tenant } = await supabase
      .from('tenants')
      .select('pagarme_recipient_id, pagarme_onboarding_status')
      .eq('user_id', user.id)
      .single()

    if (!tenant?.pagarme_recipient_id) {
      return new Response(
        JSON.stringify({ available: 0, waiting_funds: 0, transferred: 0 }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      )
    }

    const respostaPagarme = await fetch(
      `${PAGARME_BASE_URL}/recipients/${tenant.pagarme_recipient_id}/balance`,
      {
        headers: {
          Authorization: basicAuth(PAGARME_API_KEY),
          'Content-Type': 'application/json',
        },
      }
    )

    if (!respostaPagarme.ok) {
      const detalhe = await respostaPagarme.text()
      return new Response(
        JSON.stringify({ error: 'Falha ao consultar saldo Pagar.me', detail: detalhe }),
        {
          status: 502,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        }
      )
    }

    const balance = await respostaPagarme.json() as {
      available_amount?: number
      waiting_funds_amount?: number
      transferred_amount?: number
    }

    return new Response(
      JSON.stringify({
        available: balance.available_amount ?? 0,
        waiting_funds: balance.waiting_funds_amount ?? 0,
        transferred: balance.transferred_amount ?? 0,
      }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro inesperado' }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  }
})
