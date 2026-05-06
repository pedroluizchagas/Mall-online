// supabase/functions/transfer-to-courier/index.ts
//
// Estágio 2 do split de pagamentos: após o lojista aceitar o pedido e alocar
// um entregador autônomo, esta function executa um Transfer Pagar.me da
// conta da Mallora para o recipient do entregador, no valor da taxa de
// entrega (em custódia desde o checkout).
//
// Pré-condições rígidas (vide docs/06 e docs/30):
//   - courier.tipo === 'autonomo'
//   - courier.pagarme_onboarding_status === 'active'
//   - order.payment_status === 'pago'
//
// Body: { assignment_id }
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
    await getAuthenticatedUser(req)
    const body = await req.json()
    const { assignment_id } = body ?? {}
    if (!assignment_id) throw new Error('assignment_id é obrigatório')

    const supabase = getSupabaseAdmin()

    const { data: assignment } = await supabase
      .from('delivery_assignments')
      .select(`
        id, order_id, courier_id, valor_entrega, pagarme_transfer_id,
        couriers!inner (
          pagarme_recipient_id, pagarme_onboarding_status, tipo, status
        ),
        orders!inner ( tenant_id, payment_status )
      `)
      .eq('id', assignment_id)
      .single()

    if (!assignment) throw new Error('Atribuição não encontrada')
    if (assignment.pagarme_transfer_id) {
      throw new Error('Transfer já executado para esta atribuição')
    }

    const courier = assignment.couriers as {
      pagarme_recipient_id: string | null
      pagarme_onboarding_status: string | null
      tipo: string
      status: string
    }
    const order = assignment.orders as {
      tenant_id: string
      payment_status: string
    }

    // Entregador próprio (CLT do lojista) não recebe via Pagar.me — sai
    // diretamente da folha do lojista. Sem transfer.
    if (courier.tipo !== 'autonomo') {
      return new Response(
        JSON.stringify({
          message: 'Entregador próprio — sem transfer Pagar.me',
        }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } },
      )
    }

    if (courier.pagarme_onboarding_status !== 'active') {
      throw new Error('Entregador sem KYC concluído no Pagar.me')
    }

    if (!courier.pagarme_recipient_id) {
      throw new Error('Entregador sem recipient Pagar.me cadastrado')
    }

    if (order.payment_status !== 'pago') {
      throw new Error('Pedido ainda não pago — aguardar confirmação')
    }

    const transferRes = await pagarmeRequest<{ id: string }>(
      '/transfers',
      {
        method: 'POST',
        body: {
          amount: assignment.valor_entrega,
          recipient_id: courier.pagarme_recipient_id,
          metadata: {
            assignment_id: assignment.id,
            order_id: assignment.order_id,
            courier_id: assignment.courier_id,
            tipo: 'taxa_entrega_estagio2',
          },
        },
      },
    )

    if (!transferRes.ok) {
      throw new Error(`Pagar.me transfer: ${JSON.stringify(transferRes.data)}`)
    }

    const transferId = transferRes.data.id

    await supabase
      .from('delivery_assignments')
      .update({ pagarme_transfer_id: transferId })
      .eq('id', assignment.id)

    await supabase.from('payouts').insert({
      tipo: 'entregador',
      courier_id: assignment.courier_id,
      valor_bruto: assignment.valor_entrega,
      taxa_antecipacao: 0,
      valor_liquido: assignment.valor_entrega,
      total_pedidos: 1,
      status: 'concluido',
      antecipado: false,
      data_referencia: new Date().toISOString().split('T')[0],
      data_prevista: new Date().toISOString().split('T')[0],
      pagarme_transfer_id: transferId,
      processado_em: new Date().toISOString(),
    })

    return new Response(
      JSON.stringify({ pagarme_transfer_id: transferId }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } },
    )
  }
})
