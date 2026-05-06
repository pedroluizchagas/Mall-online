// supabase/functions/request-advance/index.ts
import {
  getSupabaseAdmin,
  getAuthenticatedUser,
  corsHeaders,
  pagarmeHeaders,
  PAGARME_BASE_URL,
} from '../helpers/auth.ts'

const TAXA_ANTECIPACAO_CENTAVOS = 75 // R$0,75 por pedido

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const user = await getAuthenticatedUser(req)
    const supabase = getSupabaseAdmin()

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, pagarme_recipient_id, pagarme_onboarding_status')
      .eq('user_id', user.id)
      .single()

    if (!tenant) throw new Error('Lojista não encontrado')
    if (!tenant.pagarme_recipient_id || tenant.pagarme_onboarding_status !== 'active') {
      throw new Error('Configure sua conta de recebimentos antes de solicitar antecipação')
    }

    const { data: sub } = await supabase
      .from('tenant_subscriptions')
      .select('billing_status, plans!inner(tem_antecipacao)')
      .eq('tenant_id', tenant.id)
      .single()

    if (!sub || !['trial', 'ativa'].includes(sub.billing_status)) {
      throw new Error('Assinatura inativa')
    }

    if (!sub.plans.tem_antecipacao) {
      throw new Error('Seu plano não inclui antecipação de repasses')
    }

    const { data: antecipacaoExistente } = await supabase
      .from('payout_advance_requests')
      .select('id, status')
      .eq('tenant_id', tenant.id)
      .in('status', ['pendente', 'aprovada'])
      .single()

    if (antecipacaoExistente) {
      throw new Error('Já existe uma solicitação de antecipação em andamento')
    }

    const seteDiasAtras = new Date()
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)

    const { data: pedidosElegiveis } = await supabase
      .from('orders')
      .select('id, total, taxa_entrega, platform_fee_amount')
      .eq('tenant_id', tenant.id)
      .eq('status', 'entregue')
      .eq('payment_status', 'pago')
      .gte('atualizado_em', seteDiasAtras.toISOString())

    if (!pedidosElegiveis || pedidosElegiveis.length === 0) {
      throw new Error('Nenhum pedido elegível para antecipação no momento')
    }

    const totalPedidos = pedidosElegiveis.length
    const valorEstimado = pedidosElegiveis.reduce((acc, p) => {
      return acc + p.total - p.taxa_entrega - p.platform_fee_amount
    }, 0)

    const taxaTotal = totalPedidos * TAXA_ANTECIPACAO_CENTAVOS
    const valorLiquido = valorEstimado - taxaTotal

    // Ativa a antecipação automática no recipient Pagar.me. A liquidação
    // antecipada passa a valer para todas as charges futuras do recebedor.
    const pagarmeRes = await fetch(
      `${PAGARME_BASE_URL}/recipients/${tenant.pagarme_recipient_id}`,
      {
        method: 'PUT',
        headers: pagarmeHeaders(),
        body: JSON.stringify({
          automatic_anticipation_enabled: true,
          automatic_anticipation_type: 'full',
          automatic_anticipation_days: 1,
          automatic_anticipation_1025_delay: 15,
        }),
      }
    )

    if (!pagarmeRes.ok) {
      const erro = await pagarmeRes.json().catch(() => ({}))
      throw new Error(`Falha ao ativar antecipação no Pagar.me: ${JSON.stringify(erro)}`)
    }

    const { data: solicitacao } = await supabase
      .from('payout_advance_requests')
      .insert({
        tenant_id: tenant.id,
        total_pedidos: totalPedidos,
        taxa_total: taxaTotal,
        valor_estimado: valorEstimado,
        status: 'aprovada',
      })
      .select('id')
      .single()

    return new Response(
      JSON.stringify({
        solicitacao_id: solicitacao?.id,
        total_pedidos: totalPedidos,
        valor_bruto: valorEstimado,
        taxa_antecipacao: taxaTotal,
        valor_liquido: valorLiquido,
        previsao_liquidacao: 'Conforme calendário Pagar.me — D+15 a partir da ativação',
        mensagem: 'Antecipação automática ativada no Pagar.me.',
      }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  }
})
