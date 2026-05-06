// supabase/functions/pagarme-anticipations/index.ts
// Lista as antecipações (anticipations) do recipient Pagar.me do tenant autenticado.
// Resposta: { anticipations: Array<{ id, amount, status, created_at, payment_date }> }
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
        JSON.stringify({ anticipations: [] }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      )
    }

    const respostaPagarme = await fetch(
      `${PAGARME_BASE_URL}/recipients/${tenant.pagarme_recipient_id}/anticipations`,
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
        JSON.stringify({ error: 'Falha ao consultar antecipações Pagar.me', detail: detalhe }),
        {
          status: 502,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        }
      )
    }

    const corpo = await respostaPagarme.json() as {
      data?: Array<{
        id: string
        amount: number
        status: string
        created_at: string
        payment_date: string | null
      }>
    }

    const anticipations = (corpo.data ?? []).map((a) => ({
      id: a.id,
      amount: a.amount,
      status: a.status,
      created_at: a.created_at,
      payment_date: a.payment_date,
    }))

    return new Response(
      JSON.stringify({ anticipations }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro inesperado' }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  }
})
