'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServer } from '@/lib/supabase/server'

type ResultadoAcao = { sucesso: true } | { erro: string }

const threadIdSchema = z.string().uuid()

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
