// supabase/functions/get-pagarme-kyc-link/index.ts
// Gera (ou recupera) o link de KYC hospedado pelo Pagar.me para o tenant autenticado.
// Resposta: { kyc_link }
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
      .select('id, pagarme_recipient_id, pagarme_kyc_link, pagarme_onboarding_status')
      .eq('user_id', user.id)
      .single()

    if (!tenant?.pagarme_recipient_id) {
      return new Response(
        JSON.stringify({ error: 'Recipient Pagar.me ainda não foi criado para este tenant' }),
        { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      )
    }

    if (tenant.pagarme_onboarding_status === 'active') {
      return new Response(
        JSON.stringify({ error: 'Onboarding já concluído', kyc_link: null }),
        { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      )
    }

    if (tenant.pagarme_kyc_link) {
      return new Response(
        JSON.stringify({ kyc_link: tenant.pagarme_kyc_link }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      )
    }

    const respostaPagarme = await fetch(
      `${PAGARME_BASE_URL}/recipients/${tenant.pagarme_recipient_id}/kyc_link`,
      {
        method: 'POST',
        headers: {
          Authorization: basicAuth(PAGARME_API_KEY),
          'Content-Type': 'application/json',
        },
      }
    )

    if (!respostaPagarme.ok) {
      const detalhe = await respostaPagarme.text()
      return new Response(
        JSON.stringify({ error: 'Falha ao gerar link de KYC Pagar.me', detail: detalhe }),
        {
          status: 502,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        }
      )
    }

    const corpo = await respostaPagarme.json() as { url?: string; base64_qrcode?: string }
    const kycLink = corpo.url

    if (!kycLink) {
      return new Response(
        JSON.stringify({ error: 'Pagar.me não retornou URL de KYC' }),
        { status: 502, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      )
    }

    await supabase
      .from('tenants')
      .update({ pagarme_kyc_link: kycLink })
      .eq('id', tenant.id)

    return new Response(
      JSON.stringify({ kyc_link: kycLink }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro inesperado' }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  }
})
