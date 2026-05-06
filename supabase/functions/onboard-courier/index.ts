// supabase/functions/onboard-courier/index.ts
//
// Cria o recipient Pagar.me do entregador autônomo (PF) e solicita o link
// de KYC (Prova de Vida) que o entregador deve completar no app.
//
// Body:
// {
//   dados_bancarios: {
//     tipo: 'pix' | 'conta_bancaria',
//     // pix:
//     chave_pix?, tipo_chave?,
//     // conta_bancaria:
//     banco?, agencia?, conta?, digito?, tipo_conta?
//   }
// }
import {
  getSupabaseAdmin,
  getAuthenticatedUser,
  corsHeaders,
} from '../helpers/auth.ts'
import { pagarmeRequest } from '../helpers/pagarme.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const user = await getAuthenticatedUser(req)
    const supabase = getSupabaseAdmin()

    const { data: courier, error: courierError } = await supabase
      .from('couriers')
      .select('id, nome, cpf, email, status, pagarme_recipient_id')
      .eq('user_id', user.id)
      .single()

    if (courierError || !courier) throw new Error('Entregador não encontrado')
    if (courier.status !== 'aprovado') {
      throw new Error('Entregador ainda não aprovado pelo admin')
    }

    const body = await req.json()
    const { dados_bancarios } = body ?? {}
    if (!dados_bancarios?.tipo) {
      throw new Error('dados_bancarios.tipo é obrigatório (pix|conta_bancaria)')
    }

    let recipientId = courier.pagarme_recipient_id

    if (!recipientId) {
      const recipientPayload = dados_bancarios.tipo === 'pix'
        ? {
          name: courier.nome,
          email: courier.email ?? user.email,
          document: courier.cpf,
          type: 'individual',
          payment_mode: 'pix',
          pix_key: dados_bancarios.chave_pix,
          pix_key_type: dados_bancarios.tipo_chave,
        }
        : {
          name: courier.nome,
          email: courier.email ?? user.email,
          document: courier.cpf,
          type: 'individual',
          default_bank_account: {
            holder_name: courier.nome,
            holder_document: courier.cpf,
            bank: dados_bancarios.banco,
            branch_number: dados_bancarios.agencia,
            account_number: dados_bancarios.conta,
            account_check_digit: dados_bancarios.digito,
            type: dados_bancarios.tipo_conta,
          },
        }

      const recipientRes = await pagarmeRequest<{
        id: string
        status: string
      }>('/recipients', { method: 'POST', body: recipientPayload })

      if (!recipientRes.ok) {
        throw new Error(
          `Pagar.me recipient: ${JSON.stringify(recipientRes.data)}`,
        )
      }

      recipientId = recipientRes.data.id

      await supabase
        .from('couriers')
        .update({
          pagarme_recipient_id: recipientId,
          pagarme_onboarding_status: recipientRes.data.status,
        })
        .eq('id', courier.id)
    }

    // Solicitar KYC link (Prova de Vida) — exigido pelo Pagar.me para PF
    // antes de liberar recebimentos.
    const kycRes = await pagarmeRequest<{ url?: string }>(
      `/recipients/${recipientId}/kyc_link`,
      { method: 'POST' },
    )

    return new Response(
      JSON.stringify({
        pagarme_recipient_id: recipientId,
        kyc_link: kycRes.ok ? (kycRes.data.url ?? null) : null,
      }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } },
    )
  }
})
