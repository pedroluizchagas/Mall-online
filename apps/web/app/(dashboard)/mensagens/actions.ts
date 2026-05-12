'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServer } from '@/lib/supabase/server'

type ResultadoAcao = { sucesso: true } | { erro: string }
type ResultadoBroadcast = { sucesso: true; enviadas: number; falhas: number } | { erro: string }

const threadIdSchema = z.string().uuid()
const corpoMensagemSchema = z.string().trim().min(1, 'Mensagem vazia').max(4000, 'Mensagem longa demais')
const corpoBroadcastSchema = z.string().trim().min(3, 'Mensagem muito curta').max(4000, 'Mensagem longa demais')

const LIMITE_BROADCAST = 200

async function getTenantId(supabase: ReturnType<typeof createSupabaseServer>) {
  const { data } = await supabase.from('tenants').select('id').single()
  return data?.id as string | undefined
}

export async function marcarThreadLida(threadId: string): Promise<ResultadoAcao> {
  const parsed = threadIdSchema.safeParse(threadId)
  if (!parsed.success) return { erro: 'ID inválido' }

  const supabase = createSupabaseServer()
  const tenantId = await getTenantId(supabase)
  if (!tenantId) return { erro: 'Tenant não encontrado' }

  const { error } = await supabase
    .from('message_threads')
    .update({ nao_lidas_lojista: 0 })
    .eq('id', parsed.data)
    .eq('tenant_id', tenantId)

  if (error) return { erro: `Falha ao marcar como lida: ${error.message}` }
  revalidatePath('/mensagens')
  return { sucesso: true }
}

export async function arquivarThread(threadId: string): Promise<ResultadoAcao> {
  const parsed = threadIdSchema.safeParse(threadId)
  if (!parsed.success) return { erro: 'ID inválido' }

  const supabase = createSupabaseServer()
  const tenantId = await getTenantId(supabase)
  if (!tenantId) return { erro: 'Tenant não encontrado' }

  const { error } = await supabase
    .from('message_threads')
    .update({ arquivada: true })
    .eq('id', parsed.data)
    .eq('tenant_id', tenantId)

  if (error) return { erro: `Falha ao arquivar: ${error.message}` }
  revalidatePath('/mensagens')
  revalidatePath(`/mensagens/${parsed.data}`)
  return { sucesso: true }
}

export async function desarquivarThread(threadId: string): Promise<ResultadoAcao> {
  const parsed = threadIdSchema.safeParse(threadId)
  if (!parsed.success) return { erro: 'ID inválido' }

  const supabase = createSupabaseServer()
  const tenantId = await getTenantId(supabase)
  if (!tenantId) return { erro: 'Tenant não encontrado' }

  const { error } = await supabase
    .from('message_threads')
    .update({ arquivada: false })
    .eq('id', parsed.data)
    .eq('tenant_id', tenantId)

  if (error) return { erro: `Falha ao desarquivar: ${error.message}` }
  revalidatePath('/mensagens')
  revalidatePath(`/mensagens/${parsed.data}`)
  return { sucesso: true }
}

const enviarMensagemSchema = z.object({
  threadId: z.string().uuid(),
  corpo: corpoMensagemSchema,
})

export async function enviarMensagem(
  input: z.infer<typeof enviarMensagemSchema>,
): Promise<ResultadoAcao> {
  const parsed = enviarMensagemSchema.safeParse(input)
  if (!parsed.success) return { erro: parsed.error.errors[0].message }

  const supabase = createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado' }

  const tenantId = await getTenantId(supabase)
  if (!tenantId) return { erro: 'Tenant não encontrado' }

  // Defesa em profundidade: confirma que a thread pertence ao tenant.
  const { data: thread, error: threadErr } = await supabase
    .from('message_threads')
    .select('id, tenant_id, arquivada')
    .eq('id', parsed.data.threadId)
    .maybeSingle()

  if (threadErr) return { erro: `Falha ao validar conversa: ${threadErr.message}` }
  if (!thread || (thread as { tenant_id: string }).tenant_id !== tenantId) {
    return { erro: 'Conversa não encontrada' }
  }
  if ((thread as { arquivada: boolean }).arquivada) {
    return { erro: 'Conversa arquivada' }
  }

  const { error } = await supabase.from('messages').insert({
    thread_id: parsed.data.threadId,
    autor_tipo: 'lojista',
    autor_id: user.id,
    corpo: parsed.data.corpo,
  })

  if (error) return { erro: `Falha ao enviar mensagem: ${error.message}` }

  revalidatePath('/mensagens')
  revalidatePath(`/mensagens/${parsed.data.threadId}`)
  return { sucesso: true }
}

const criarBroadcastSchema = z.object({ corpo: corpoBroadcastSchema })

export async function criarBroadcast(
  input: z.infer<typeof criarBroadcastSchema>,
): Promise<ResultadoBroadcast> {
  const parsed = criarBroadcastSchema.safeParse(input)
  if (!parsed.success) return { erro: parsed.error.errors[0].message }

  const supabase = createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado' }

  const tenantId = await getTenantId(supabase)
  if (!tenantId) return { erro: 'Tenant não encontrado' }

  const { data: pedidos, error: pedidosErr } = await supabase
    .from('orders')
    .select('consumer_id')
    .eq('tenant_id', tenantId)
    .not('consumer_id', 'is', null)

  if (pedidosErr) return { erro: `Falha ao listar destinatários: ${pedidosErr.message}` }

  const consumerIds = Array.from(
    new Set(
      ((pedidos ?? []) as Array<{ consumer_id: string | null }>)
        .map((p) => p.consumer_id)
        .filter((id): id is string => typeof id === 'string'),
    ),
  )

  if (consumerIds.length === 0) {
    return { erro: 'Nenhum cliente com pedido encontrado' }
  }
  if (consumerIds.length > LIMITE_BROADCAST) {
    return { erro: `Limite excedido: ${consumerIds.length} destinatários (máximo ${LIMITE_BROADCAST}).` }
  }

  const novasThreads = consumerIds.map((consumer_id) => ({
    tenant_id: tenantId,
    consumer_id,
    origem: 'broadcast' as const,
  }))

  const { data: threadsInseridas, error: threadsErr } = await supabase
    .from('message_threads')
    .insert(novasThreads)
    .select('id')

  if (threadsErr || !threadsInseridas) {
    return { erro: `Falha ao criar conversas: ${threadsErr?.message ?? 'erro desconhecido'}` }
  }

  const mensagens = (threadsInseridas as Array<{ id: string }>).map((t) => ({
    thread_id: t.id,
    autor_tipo: 'lojista' as const,
    autor_id: user.id,
    corpo: parsed.data.corpo,
  }))

  // Best-effort: insert em lote. Se falhar parcialmente, o Supabase JS
  // não rola transação client-side, então reportamos sucesso/falhas.
  const { error: mensagensErr, count } = await supabase
    .from('messages')
    .insert(mensagens, { count: 'exact' })

  if (mensagensErr) {
    return { erro: `Falha ao enviar mensagens: ${mensagensErr.message}` }
  }

  const enviadas = count ?? mensagens.length
  const falhas = mensagens.length - enviadas

  revalidatePath('/mensagens')
  return { sucesso: true, enviadas, falhas }
}
