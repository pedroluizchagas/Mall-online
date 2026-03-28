import { getSupabaseAdmin } from '../helpers/auth.ts'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

interface PushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, string>
  sound?: 'default'
  badge?: number
}

Deno.serve(async (req) => {
  const webhookSecret = req.headers.get('x-webhook-secret')
  if (webhookSecret !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Não autorizado', { status: 401 })
  }

  const payload = await req.json()
  const { type, table, record, old_record } = payload

  const supabase = getSupabaseAdmin()
  const mensagens: PushMessage[] = []

  if (table === 'orders') {
    if (type === 'INSERT') {
      mensagens.push(...(await notificarLojistaNovoPedido(supabase, record)))
    }

    if (type === 'UPDATE' && old_record?.status !== record.status) {
      mensagens.push(...(await notificarConsumidorStatus(supabase, record)))
    }
  }

  if (table === 'delivery_assignments') {
    if (type === 'INSERT') {
      mensagens.push(...(await notificarEntregadorNovoPedido(supabase, record)))
    }

    if (type === 'UPDATE' && old_record?.status !== record.status) {
      if (record.status === 'entregue') {
        mensagens.push(...(await notificarLojistaPedidoEntregue(supabase, record)))
      }
    }
  }

  if (table === 'payouts' && type === 'UPDATE') {
    if (record.status === 'concluido' && old_record?.status !== 'concluido') {
      mensagens.push(...(await notificarRepasseProcessado(supabase, record)))
    }
  }

  if (mensagens.length > 0) {
    await enviarNotificacoes(supabase, mensagens)
  }

  return new Response(
    JSON.stringify({ enviadas: mensagens.length }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})

async function buscarTokensUsuario(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('ativo', true)

  return (data ?? []).map((t: { token: string }) => t.token)
}

async function buscarTokensCourier(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  courierId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('courier_id', courierId)
    .eq('ativo', true)

  return (data ?? []).map((t: { token: string }) => t.token)
}

async function notificarLojistaNovoPedido(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  pedido: Record<string, unknown>
): Promise<PushMessage[]> {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('user_id')
    .eq('id', pedido.tenant_id)
    .single()

  if (!tenant) return []

  const tokens = await buscarTokensUsuario(supabase, tenant.user_id)
  const total = ((pedido.total as number) / 100).toFixed(2).replace('.', ',')

  return tokens.map((token) => ({
    to: token,
    title: 'Novo pedido',
    body: `Você recebeu um novo pedido de R$${total}`,
    data: { tipo: 'novo_pedido', order_id: pedido.id as string },
    sound: 'default',
  }))
}

async function notificarConsumidorStatus(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  pedido: Record<string, unknown>
): Promise<PushMessage[]> {
  const { data: consumer } = await supabase
    .from('consumers')
    .select('user_id')
    .eq('id', pedido.consumer_id)
    .single()

  if (!consumer) return []

  const tokens = await buscarTokensUsuario(supabase, consumer.user_id)

  const MENSAGENS_STATUS: Record<string, { titulo: string; corpo: string }> = {
    confirmado: {
      titulo: 'Pedido confirmado',
      corpo: 'Seu pedido foi confirmado e está sendo preparado.',
    },
    em_preparo: {
      titulo: 'Em preparo',
      corpo: 'Seu pedido está sendo preparado agora.',
    },
    saiu_para_entrega: {
      titulo: 'Saiu para entrega',
      corpo: 'Seu pedido está a caminho! Acompanhe em tempo real.',
    },
    entregue: {
      titulo: 'Pedido entregue',
      corpo: 'Seu pedido foi entregue. Bom apetite!',
    },
    cancelado: {
      titulo: 'Pedido cancelado',
      corpo: (pedido.motivo_cancelamento as string) ?? 'Seu pedido foi cancelado.',
    },
  }

  const msg = MENSAGENS_STATUS[pedido.status as string]
  if (!msg) return []

  return tokens.map((token) => ({
    to: token,
    title: msg.titulo,
    body: msg.corpo,
    data: {
      tipo: 'status_pedido',
      order_id: pedido.id as string,
      status: pedido.status as string,
    },
    sound: 'default',
  }))
}

async function notificarEntregadorNovoPedido(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  assignment: Record<string, unknown>
): Promise<PushMessage[]> {
  const tokens = await buscarTokensCourier(supabase, assignment.courier_id as string)
  const valor = ((assignment.valor_entrega as number) / 100).toFixed(2).replace('.', ',')

  return tokens.map((token) => ({
    to: token,
    title: 'Nova entrega disponível',
    body: `Uma entrega de R$${valor} está aguardando você.`,
    data: { tipo: 'nova_entrega', assignment_id: assignment.id as string },
    sound: 'default',
  }))
}

async function notificarLojistaPedidoEntregue(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  assignment: Record<string, unknown>
): Promise<PushMessage[]> {
  const { data: pedido } = await supabase
    .from('orders')
    .select('tenant_id, id')
    .eq('id', assignment.order_id)
    .single()

  if (!pedido) return []

  const { data: tenant } = await supabase
    .from('tenants')
    .select('user_id')
    .eq('id', pedido.tenant_id)
    .single()

  if (!tenant) return []

  const tokens = await buscarTokensUsuario(supabase, tenant.user_id)

  return tokens.map((token) => ({
    to: token,
    title: 'Entrega confirmada',
    body: 'O entregador confirmou a entrega do pedido ao consumidor.',
    data: { tipo: 'entrega_confirmada', order_id: pedido.id as string },
    sound: 'default',
  }))
}

async function notificarRepasseProcessado(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  payout: Record<string, unknown>
): Promise<PushMessage[]> {
  if (!payout.courier_id) return []

  const tokens = await buscarTokensCourier(supabase, payout.courier_id as string)
  const valor = ((payout.valor_liquido as number) / 100).toFixed(2).replace('.', ',')

  return tokens.map((token) => ({
    to: token,
    title: 'Repasse processado',
    body: `R$${valor} foram transferidos para sua conta Stripe.`,
    data: { tipo: 'repasse_processado', payout_id: payout.id as string },
    sound: 'default',
  }))
}

async function enviarNotificacoes(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  mensagens: PushMessage[]
): Promise<void> {
  const lotes: PushMessage[][] = []
  for (let i = 0; i < mensagens.length; i += 100) {
    lotes.push(mensagens.slice(i, i + 100))
  }

  for (const lote of lotes) {
    try {
      const resposta = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(lote),
      })

      const resultado = await resposta.json()

      if (resultado.data) {
        const tokensInvalidos: string[] = []

        for (let i = 0; i < resultado.data.length; i++) {
          const ticket = resultado.data[i]
          if (
            ticket.status === 'error' &&
            ticket.details?.error === 'DeviceNotRegistered'
          ) {
            tokensInvalidos.push(lote[i].to)
          }
        }

        if (tokensInvalidos.length > 0) {
          await supabase
            .from('push_tokens')
            .update({ ativo: false })
            .in('token', tokensInvalidos)

          console.log(`${tokensInvalidos.length} token(s) inválido(s) desativados`)
        }
      }
    } catch (erro) {
      console.error('Erro ao enviar notificações:', erro)
    }
  }
}
