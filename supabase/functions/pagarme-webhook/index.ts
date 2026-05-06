// supabase/functions/pagarme-webhook/index.ts
//
// Processa eventos do Pagar.me (pagamentos, recipients, transfers).
//
// Fluxo obrigatório:
//   1. Ler o raw body ANTES de qualquer parse — necessário para HMAC.
//   2. Verificar HMAC-SHA256 com PAGARME_WEBHOOK_SECRET (timing-safe).
//      Falha => 401.
//   3. Inserir event.id em webhook_events_log com ON CONFLICT DO NOTHING.
//      Se já existia (idempotência), retornar 200 sem reprocessar.
//   4. Tratar o evento (order/charge/recipient/transfer).
//
// Eventos suportados:
//   order.paid, order.payment_failed,
//   charge.paid, charge.payment_failed, charge.refunded,
//   charge.chargeback.created,
//   recipient.status.changed,
//   transfer.created, transfer.failed, transfer.paid
import { getSupabaseAdmin } from '../helpers/auth.ts'
import { verifyHmac } from '../helpers/pagarme.ts'

function mapPaymentMethod(method: string | undefined): string {
  const map: Record<string, string> = {
    pix: 'online_pix',
    credit_card: 'online_cartao',
    debit_card: 'online_cartao',
    boleto: 'online_boleto',
  }
  return map[method ?? ''] ?? 'online_cartao'
}

Deno.serve(async (req) => {
  // 1. Raw body antes de qualquer parse — usado tanto na validação HMAC
  // quanto no JSON.parse posterior.
  const rawBody = await req.text()

  // 2. Verificação HMAC. PAGARME_WEBHOOK_SECRET é obrigatório.
  const secret = Deno.env.get('PAGARME_WEBHOOK_SECRET')
  if (!secret) {
    return new Response('PAGARME_WEBHOOK_SECRET não configurado', { status: 500 })
  }
  const signature = req.headers.get('x-hub-signature')
  const valid = await verifyHmac(secret, rawBody, signature)
  if (!valid) {
    return new Response('Assinatura inválida', { status: 401 })
  }

  let event: {
    id?: string
    type?: string
    data?: Record<string, unknown>
  }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return new Response('JSON inválido', { status: 400 })
  }

  if (!event.id || !event.type) {
    return new Response('Evento sem id/type', { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // 3. Idempotência via webhook_events_log. ON CONFLICT (id) DO NOTHING — em
  // supabase-js, isso é `upsert` com ignoreDuplicates=true. Quando o id já
  // existe, `data` volta vazio; tratamos como duplicata e retornamos 200 sem
  // reprocessar (garantia de idempotência exigida pelos critérios de aceite).
  const { data: inserted, error: insertError } = await supabase
    .from('webhook_events_log')
    .upsert(
      {
        id: event.id,
        provider: 'pagarme',
        event_type: event.type,
        payload: event,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    .select('id')

  if (insertError) {
    console.error('Erro inserindo webhook_events_log:', insertError)
    return new Response(
      JSON.stringify({ error: insertError.message }),
      { status: 500 },
    )
  }

  if (!inserted || inserted.length === 0) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 4. Despacho do evento.
  try {
    const data = (event.data ?? {}) as Record<string, unknown>

    switch (event.type) {
      case 'order.paid':
      case 'charge.paid': {
        const metadata = (data.metadata ?? {}) as Record<string, unknown>
        const orderId = (metadata.order_id as string | undefined) ??
          (data.code as string | undefined)
        if (!orderId) break

        await supabase
          .from('orders')
          .update({
            payment_status: 'pago',
            pagarme_order_id: (data.order_id as string | undefined) ??
              (data.id as string | undefined),
            pagarme_charge_id: data.id as string | undefined,
            forma_pagamento: mapPaymentMethod(data.payment_method as string),
          })
          .eq('id', orderId)
        break
      }

      case 'order.payment_failed':
      case 'charge.payment_failed': {
        const metadata = (data.metadata ?? {}) as Record<string, unknown>
        const orderId = (metadata.order_id as string | undefined) ??
          (data.code as string | undefined)
        if (!orderId) break

        await supabase
          .from('orders')
          .update({
            status: 'cancelado',
            payment_status: 'pendente',
            motivo_cancelamento: 'Falha no pagamento',
            cancelado_em: new Date().toISOString(),
          })
          .eq('id', orderId)
        break
      }

      case 'charge.refunded': {
        const metadata = (data.metadata ?? {}) as Record<string, unknown>
        const orderId = metadata.order_id as string | undefined
        if (!orderId) break

        const refunded = Number(data.refunded_amount ?? 0)
        const amount = Number(data.amount ?? 0)
        const isPartial = refunded > 0 && refunded < amount

        await supabase
          .from('orders')
          .update({
            payment_status: isPartial ? 'estornado_parcial' : 'estornado',
          })
          .eq('id', orderId)
        break
      }

      case 'charge.chargeback.created': {
        const metadata = (data.metadata ?? {}) as Record<string, unknown>
        const orderId = metadata.order_id as string | undefined
        if (!orderId) break

        await supabase
          .from('orders')
          .update({ payment_status: 'em_disputa' })
          .eq('id', orderId)
        break
      }

      case 'recipient.status.changed': {
        const recipientId = data.id as string | undefined
        const newStatus = data.status as string | undefined
        if (!recipientId || !newStatus) break

        const { data: tenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('pagarme_recipient_id', recipientId)
          .maybeSingle()

        if (tenant) {
          await supabase
            .from('tenants')
            .update({ pagarme_onboarding_status: newStatus })
            .eq('id', tenant.id)

          if (newStatus === 'active') {
            // Dispara create-subscription via fetch interna autenticada com
            // service_role (sem JWT de usuário).
            await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/create-subscription`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({ tenant_id: tenant.id }),
              },
            )
          }
        }

        const { data: courier } = await supabase
          .from('couriers')
          .select('id')
          .eq('pagarme_recipient_id', recipientId)
          .maybeSingle()

        if (courier) {
          await supabase
            .from('couriers')
            .update({ pagarme_onboarding_status: newStatus })
            .eq('id', courier.id)
        }
        break
      }

      case 'transfer.created': {
        // Auditoria — registro do transfer já existe em payouts (criado pela
        // edge function transfer-to-courier). Apenas log.
        console.log('transfer.created', data.id)
        break
      }

      case 'transfer.paid': {
        const transferId = data.id as string | undefined
        if (!transferId) break
        await supabase
          .from('payouts')
          .update({
            status: 'concluido',
            processado_em: new Date().toISOString(),
          })
          .eq('pagarme_transfer_id', transferId)
        break
      }

      case 'transfer.failed': {
        const transferId = data.id as string | undefined
        if (!transferId) break
        await supabase
          .from('payouts')
          .update({
            status: 'falhou',
            erro_mensagem: `Transfer ${transferId} falhou`,
          })
          .eq('pagarme_transfer_id', transferId)
        break
      }

      default:
        // Eventos não mapeados ficam apenas no webhook_events_log para
        // auditoria.
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro ao processar webhook Pagar.me:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500 },
    )
  }
})
