'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServer } from '@/lib/supabase/server'

type ResultadoAcao = { sucesso: true } | { erro: string }
type ResultadoConvite = { sucesso: true; token: string; expiraEm: string } | { erro: string }

const convidarSchema = z.object({
  nome: z.string().trim().min(2, 'Nome muito curto').max(120, 'Nome muito longo'),
  telefone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(
      z
        .string()
        .min(10, 'Telefone deve ter ao menos 10 dígitos')
        .max(13, 'Telefone deve ter no máximo 13 dígitos'),
    ),
  email: z
    .string()
    .trim()
    .email('Email inválido')
    .max(200, 'Email muito longo')
    .optional()
    .or(z.literal('').transform(() => undefined)),
})

const alternarAtivoSchema = z.object({
  courierId: z.string().uuid(),
  ativo: z.boolean(),
})

async function getTenantId(supabase: ReturnType<typeof createSupabaseServer>) {
  const { data } = await supabase.from('tenants').select('id').single()
  return data?.id as string | undefined
}

export async function criarConvite(
  input: z.infer<typeof convidarSchema>,
): Promise<ResultadoConvite> {
  const parsed = convidarSchema.safeParse(input)
  if (!parsed.success) return { erro: parsed.error.errors[0].message }

  const supabase = createSupabaseServer()
  const tenantId = await getTenantId(supabase)
  if (!tenantId) return { erro: 'Tenant não encontrado' }

  const { data, error } = await supabase
    .from('courier_invites')
    .insert({
      tenant_id: tenantId,
      nome: parsed.data.nome,
      telefone: parsed.data.telefone,
      email: parsed.data.email ?? null,
    })
    .select('token, expira_em')
    .single()

  if (error || !data) return { erro: `Falha ao gerar convite: ${error?.message ?? 'erro desconhecido'}` }
  revalidatePath('/entregadores')
  return { sucesso: true, token: data.token as string, expiraEm: data.expira_em as string }
}

export async function revogarConvite(token: string): Promise<ResultadoAcao> {
  const parsed = z.string().uuid().safeParse(token)
  if (!parsed.success) return { erro: 'Token inválido' }

  const supabase = createSupabaseServer()
  const tenantId = await getTenantId(supabase)
  if (!tenantId) return { erro: 'Tenant não encontrado' }

  const { error } = await supabase
    .from('courier_invites')
    .delete()
    .eq('token', parsed.data)
    .eq('tenant_id', tenantId)
    .is('usado_em', null)

  if (error) return { erro: `Falha ao revogar convite: ${error.message}` }
  revalidatePath('/entregadores')
  return { sucesso: true }
}

export async function alternarAtivoEntregador(
  input: z.infer<typeof alternarAtivoSchema>,
): Promise<ResultadoAcao> {
  const parsed = alternarAtivoSchema.safeParse(input)
  if (!parsed.success) return { erro: parsed.error.errors[0].message }

  const supabase = createSupabaseServer()
  const tenantId = await getTenantId(supabase)
  if (!tenantId) return { erro: 'Tenant não encontrado' }

  const novoStatus = parsed.data.ativo ? 'aprovado' : 'suspenso'
  const { error } = await supabase
    .from('couriers')
    .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
    .eq('id', parsed.data.courierId)
    .eq('tenant_id', tenantId)

  if (error) return { erro: `Falha ao atualizar entregador: ${error.message}` }
  revalidatePath('/entregadores')
  return { sucesso: true }
}
