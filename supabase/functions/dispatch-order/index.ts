// supabase/functions/dispatch-order/index.ts
//
// Motor de despacho automático (docs/31-logistica-de-entrega.md §3).
// Substitui a escolha manual de entregador pelo lojista: monta a rota
// (agrupando pedidos próximos da mesma loja, §4), ranqueia os entregadores
// elegíveis e emite a oferta ao melhor candidato.
//
// A DECISÃO mora no banco (migration 20260807120002): montar_rota,
// ranquear_couriers e ofertar_rota. Esta function ORQUESTRA — valida a
// pré-condição, dispara o push e devolve o estado ao chamador. Manter a
// decisão em SQL evita round-trips no ranqueamento e deixa o pg_cron
// reofertando mesmo se o Edge estiver fora do ar.
//
// Chamada por:
//   - Dashboard/Partner App ao mover o pedido para "em_preparo"
//   - Database Webhook em orders (UPDATE de status)
//   - Retentativa manual pelo admin
//
// Body: { order_id, agrupar? }
//   agrupar=false força entrega individual (override do lojista)
import {
  getSupabaseAdmin,
  getAuthenticatedUser,
  corsHeaders,
} from '../helpers/auth.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    await getAuthenticatedUser(req)

    const { order_id, agrupar = true } = (await req.json()) ?? {}
    if (!order_id) throw new Error('order_id é obrigatório')

    const supabase = getSupabaseAdmin()

    // ---- Pré-condições -------------------------------------------------
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, status, store_id, tenant_id, carga_porte, entrega_lat, forma_pagamento, payment_status')
      .eq('id', order_id)
      .single()

    if (orderErr || !order) throw new Error('Pedido não encontrado')

    // Só despacha pedido já confirmado pelo lojista. Antes disso a loja
    // ainda pode cancelar, e a rota teria que ser desmontada.
    if (!['em_preparo', 'aguardando_entregador'].includes(order.status)) {
      return json(
        { despachado: false, motivo: `status_invalido:${order.status}` },
        409,
      )
    }

    // Pagamento na entrega não passa pelo gateway (docs/01), então não há
    // payment_status a exigir. Para pagamento online, exigir confirmação
    // antes de mobilizar entregador.
    // Valores conforme docs/17 (FormaPagamento): online_cartao | online_pix |
    // dinheiro | cartao_maquininha
    const pagamentoOnline = ['online_cartao', 'online_pix'].includes(order.forma_pagamento)
    if (pagamentoOnline && order.payment_status !== 'pago') {
      return json(
        { despachado: false, motivo: 'pagamento_nao_confirmado' },
        409,
      )
    }

    // ---- 1. Montar (ou recuperar) a rota -------------------------------
    // montar_rota é idempotente: se o pedido já está numa rota viva,
    // devolve o route_id existente em vez de duplicar.
    const { data: routeId, error: rotaErr } = await supabase
      .rpc('montar_rota', { p_order_id: order_id, p_agrupar: agrupar })

    if (rotaErr) throw new Error(`montar_rota: ${rotaErr.message}`)
    if (!routeId) throw new Error('Não foi possível montar a rota')

    // ---- 2. Emitir a oferta ao melhor candidato ------------------------
    const { data: courierId, error: ofertaErr } = await supabase
      .rpc('ofertar_rota', { p_route_id: routeId })

    if (ofertaErr) throw new Error(`ofertar_rota: ${ofertaErr.message}`)

    const { data: rota } = await supabase
      .from('delivery_routes')
      .select('id, status, drops, carga_porte, distancia_total_m, duracao_estimada_s, ciclos_oferta')
      .eq('id', routeId)
      .single()

    // Sem candidato: a rota fica na fila e o pg_cron reoferece a cada 30s
    // (docs/31 §3.2). Não é erro — é frota indisponível no instante.
    if (!courierId) {
      const semCandidato = (rota?.ciclos_oferta ?? 0) >= 3
      return json({
        despachado: false,
        route_id: routeId,
        motivo: semCandidato ? 'broadcast_emitido' : 'sem_entregador_elegivel',
        rota,
      })
    }

    // ---- 3. Push ao entregador ofertado --------------------------------
    // Falha de push não invalida a oferta: ela vive no banco com expiração
    // e o app também escuta dispatch_offers via Realtime.
    await notificarEntregador(supabase, courierId, rota)

    return json({ despachado: true, route_id: routeId, courier_id: courierId, rota })
  } catch (error) {
    return json({ error: (error as Error).message }, 500)
  }
})

async function notificarEntregador(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  courierId: string,
  rota: { drops?: number; distancia_total_m?: number | null } | null,
) {
  try {
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('courier_id', courierId)
      .eq('ativo', true)

    if (!tokens?.length) return

    const drops = rota?.drops ?? 1
    const km = rota?.distancia_total_m
      ? (rota.distancia_total_m / 1000).toFixed(1)
      : null

    const corpo = [
      drops > 1 ? `${drops} entregas na mesma rota` : 'Nova entrega disponível',
      km ? `${km} km` : null,
    ]
      .filter(Boolean)
      .join(' · ')

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        tokens.map((t: { token: string }) => ({
          to: t.token,
          title: 'Oferta de entrega',
          body: corpo,
          sound: 'default',
          priority: 'high',
          data: { tipo: 'dispatch_offer' },
        })),
      ),
    })
  } catch {
    // Push é best-effort — a oferta já está persistida com TTL.
  }
}
