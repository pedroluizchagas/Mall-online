'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServer } from '@/lib/supabase/server'

type ResultadoAcao = { sucesso: true } | { erro: string }

const criarTicketSchema = z.object({
  assunto: z.string().trim().min(3, 'Assunto muito curto').max(200, 'Assunto muito longo'),
  mensagem: z.string().trim().min(10, 'Mensagem muito curta').max(4000, 'Mensagem muito longa'),
  prioridade: z.enum(['baixa', 'normal', 'alta', 'critica']),
})

async function getTenantId(supabase: ReturnType<typeof createSupabaseServer>) {
  const { data } = await supabase.from('tenants').select('id').single()
  return data?.id as string | undefined
}

export async function criarTicket(
  input: z.infer<typeof criarTicketSchema>,
): Promise<ResultadoAcao> {
  const parsed = criarTicketSchema.safeParse(input)
  if (!parsed.success) return { erro: parsed.error.errors[0].message }

  const supabase = createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado' }

  const tenantId = await getTenantId(supabase)
  if (!tenantId) return { erro: 'Tenant não encontrado' }

  const { error } = await supabase.from('support_tickets').insert({
    tenant_id: tenantId,
    autor_id: user.id,
    assunto: parsed.data.assunto,
    mensagem: parsed.data.mensagem,
    prioridade: parsed.data.prioridade,
  })

  if (error) return { erro: `Falha ao abrir ticket: ${error.message}` }
  revalidatePath('/ajuda')
  return { sucesso: true }
}

export async function marcarResolvido(ticketId: string): Promise<ResultadoAcao> {
  const parsed = z.string().uuid().safeParse(ticketId)
  if (!parsed.success) return { erro: 'ID inválido' }

  const supabase = createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado' }

  const { error } = await supabase
    .from('support_tickets')
    .update({ status: 'resolvido', atualizada_em: new Date().toISOString() })
    .eq('id', parsed.data)
    .eq('autor_id', user.id)

  if (error) return { erro: `Falha ao marcar como resolvido: ${error.message}` }
  revalidatePath('/ajuda')
  return { sucesso: true }
}

export async function reabrirTicket(ticketId: string): Promise<ResultadoAcao> {
  const parsed = z.string().uuid().safeParse(ticketId)
  if (!parsed.success) return { erro: 'ID inválido' }

  const supabase = createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado' }

  const { error } = await supabase
    .from('support_tickets')
    .update({ status: 'aberto', atualizada_em: new Date().toISOString() })
    .eq('id', parsed.data)
    .eq('autor_id', user.id)

  if (error) return { erro: `Falha ao reabrir ticket: ${error.message}` }
  revalidatePath('/ajuda')
  return { sucesso: true }
}
