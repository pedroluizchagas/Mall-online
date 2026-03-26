// supabase/functions/daily-payouts/index.ts
import Stripe from 'https://esm.sh/stripe@14'
import { getSupabaseAdmin } from '../helpers/auth.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
})

Deno.serve(async (_req) => {
  const supabase = getSupabaseAdmin()
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const ontem = new Date(hoje)
  ontem.setDate(ontem.getDate() - 1)

  const seteDiasAtras = new Date(hoje)
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)

  const erros: string[] = []

  // PASSO 1 — Repasse D+1 para entregadores autônomos
  try {
    const { data: entregas } = await supabase
      .from('delivery_assignments')
      .select(`
        id,
        courier_id,
        valor_entrega,
        order_id,
        couriers!inner (
          id,
          tipo,
          status,
          stripe_account_id,
          stripe_onboarding_ok
        )
      `)
      .eq('status', 'entregue')
      .gte('entregue_em', ontem.toISOString())
      .lt('entregue_em', hoje.toISOString())
      .eq('couriers.tipo', 'autonomo')
      .eq('couriers.status', 'aprovado')
      .eq('couriers.stripe_onboarding_ok', true)
      .is('payout_id', null)

    if (entregas && entregas.length > 0) {
      // Agrupar por entregador
      const porEntregador = entregas.reduce((acc: any, e: any) => {
        const cid = e.courier_id
        if (!acc[cid]) {
          acc[cid] = {
            courier: e.couriers,
            entregas: [],
            total: 0,
          }
        }
        acc[cid].entregas.push(e.id)
        acc[cid].total += e.valor_entrega
        return acc
      }, {})

      for (const [courierId, dados] of Object.entries(porEntregador) as any) {
        try {
          const transfer = await stripe.transfers.create({
            amount: dados.total,
            currency: 'brl',
            destination: dados.courier.stripe_account_id,
            description: `Repasse D+1 — ${ontem.toLocaleDateString('pt-BR')}`,
            metadata: {
              courier_id: courierId,
              data_referencia: ontem.toISOString().split('T')[0],
              tipo: 'entregador',
            },
          })

          const { data: payout } = await supabase
            .from('payouts')
            .insert({
              tipo: 'entregador',
              courier_id: courierId,
              valor_bruto: dados.total,
              taxa_antecipacao: 0,
              valor_liquido: dados.total,
              total_pedidos: dados.entregas.length,
              status: 'concluido',
              antecipado: false,
              data_referencia: ontem.toISOString().split('T')[0],
              data_prevista: hoje.toISOString().split('T')[0],
              stripe_transfer_id: transfer.id,
              processado_em: new Date().toISOString(),
            })
            .select('id')
            .single()

          console.log(`Repasse entregador ${courierId}: R$${dados.total / 100} — ${transfer.id}`)
        } catch (e: any) {
          erros.push(`Entregador ${courierId}: ${e.message}`)
          console.error(`Erro repasse entregador ${courierId}:`, e)
        }
      }
    }
  } catch (e: any) {
    erros.push(`Erro geral D+1: ${e.message}`)
  }

  // PASSO 2 — Repasse D+7 para lojistas
  try {
    const { data: pedidos } = await supabase
      .from('orders')
      .select(`
        id,
        tenant_id,
        total,
        taxa_entrega,
        platform_fee_amount,
        tenants!inner (
          id,
          stripe_account_id,
          stripe_onboarding_ok
        )
      `)
      .eq('status', 'entregue')
      .eq('payment_status', 'pago')
      .gte('atualizado_em', seteDiasAtras.toISOString())
      .lt('atualizado_em', new Date(seteDiasAtras.getTime() + 86400000).toISOString())
      .eq('tenants.stripe_onboarding_ok', true)

    if (pedidos && pedidos.length > 0) {
      // Agrupar por tenant
      const porTenant = pedidos.reduce((acc: any, p: any) => {
        const tid = p.tenant_id
        if (!acc[tid]) {
          acc[tid] = {
            tenant: p.tenants,
            pedidos: [],
            total: 0,
          }
        }
        // Valor do lojista = total - taxa_entrega - platform_fee
        const valorLojista = p.total - p.taxa_entrega - p.platform_fee_amount
        acc[tid].pedidos.push(p.id)
        acc[tid].total += valorLojista
        return acc
      }, {})

      for (const [tenantId, dados] of Object.entries(porTenant) as any) {
        // Verificar se há antecipação ativa para este tenant
        const { data: advance } = await supabase
          .from('payout_advance_requests')
          .select('id, total_pedidos, taxa_total')
          .eq('tenant_id', tenantId)
          .eq('status', 'aprovada')
          .lte('solicitado_em', hoje.toISOString())
          .single()

        // Se há antecipação aprovada, pular (será processado no passo 3)
        if (advance) continue

        try {
          const transfer = await stripe.transfers.create({
            amount: dados.total,
            currency: 'brl',
            destination: dados.tenant.stripe_account_id,
            description: `Repasse D+7 — ${seteDiasAtras.toLocaleDateString('pt-BR')}`,
            metadata: {
              tenant_id: tenantId,
              data_referencia: seteDiasAtras.toISOString().split('T')[0],
              tipo: 'lojista',
            },
          })

          await supabase.from('payouts').insert({
            tipo: 'lojista',
            tenant_id: tenantId,
            valor_bruto: dados.total,
            taxa_antecipacao: 0,
            valor_liquido: dados.total,
            total_pedidos: dados.pedidos.length,
            status: 'concluido',
            antecipado: false,
            data_referencia: seteDiasAtras.toISOString().split('T')[0],
            data_prevista: hoje.toISOString().split('T')[0],
            stripe_transfer_id: transfer.id,
            processado_em: new Date().toISOString(),
          })

          console.log(`Repasse lojista ${tenantId}: R$${dados.total / 100} — ${transfer.id}`)
        } catch (e: any) {
          erros.push(`Lojista ${tenantId}: ${e.message}`)
        }
      }
    }
  } catch (e: any) {
    erros.push(`Erro geral D+7: ${e.message}`)
  }

  // PASSO 3 — Antecipações D+2 com vencimento hoje
  try {
    const { data: antecipacoes } = await supabase
      .from('payout_advance_requests')
      .select(`
        id,
        tenant_id,
        total_pedidos,
        taxa_total,
        valor_estimado,
        tenants!inner (
          stripe_account_id,
          stripe_onboarding_ok
        )
      `)
      .eq('status', 'aprovada')
      .eq('tenants.stripe_onboarding_ok', true)

    for (const antecipacao of (antecipacoes ?? [])) {
      try {
        const valorLiquido = antecipacao.valor_estimado - antecipacao.taxa_total

        const transfer = await stripe.transfers.create({
          amount: valorLiquido,
          currency: 'brl',
          destination: antecipacao.tenants.stripe_account_id,
          description: `Repasse antecipado D+2 — taxa R$${antecipacao.taxa_total / 100}`,
          metadata: {
            tenant_id: antecipacao.tenant_id,
            antecipado: 'true',
            taxa_antecipacao: String(antecipacao.taxa_total),
          },
        })

        const { data: payout } = await supabase
          .from('payouts')
          .insert({
            tipo: 'lojista',
            tenant_id: antecipacao.tenant_id,
            valor_bruto: antecipacao.valor_estimado,
            taxa_antecipacao: antecipacao.taxa_total,
            valor_liquido: valorLiquido,
            total_pedidos: antecipacao.total_pedidos,
            status: 'concluido',
            antecipado: true,
            data_referencia: ontem.toISOString().split('T')[0],
            data_prevista: hoje.toISOString().split('T')[0],
            stripe_transfer_id: transfer.id,
            processado_em: new Date().toISOString(),
          })
          .select('id')
          .single()

        await supabase
          .from('payout_advance_requests')
          .update({
            status: 'executada',
            payout_id: payout?.id,
            processado_em: new Date().toISOString(),
          })
          .eq('id', antecipacao.id)

        console.log(`Antecipação tenant ${antecipacao.tenant_id}: R$${valorLiquido / 100}`)
      } catch (e: any) {
        erros.push(`Antecipação ${antecipacao.id}: ${e.message}`)
      }
    }
  } catch (e: any) {
    erros.push(`Erro geral antecipações: ${e.message}`)
  }

  return new Response(
    JSON.stringify({
      sucesso: erros.length === 0,
      erros,
      executado_em: new Date().toISOString(),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
