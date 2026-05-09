'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServer } from '@/lib/supabase/server'

type ResultadoAcao = { sucesso: true } | { erro: string }

const responderSchema = z.object({
  reviewId: z.string().uuid(),
  resposta: z.string().trim().min(3, 'Resposta muito curta').max(2000, 'Resposta muito longa'),
})

const sinalizarSchema = z.object({
  reviewId: z.string().uuid(),
  motivo: z.string().trim().min(3, 'Motivo muito curto').max(500, 'Motivo muito longo'),
})

async function getTenantId(supabase: ReturnType<typeof createSupabaseServer>) {
  const { data } = await supabase.from('tenants').select('id').single()
  return data?.id as string | undefined
}

export async function responderAvaliacao(
  input: z.infer<typeof responderSchema>,
): Promise<ResultadoAcao> {
  const parsed = responderSchema.safeParse(input)
  if (!parsed.success) return { erro: parsed.error.errors[0].message }

  const supabase = createSupabaseServer()
  const tenantId = await getTenantId(supabase)
  if (!tenantId) return { erro: 'Tenant não encontrado' }

  const { error } = await supabase
    .from('store_reviews')
    .update({
      resposta_lojista: parsed.data.resposta,
      respondida_em: new Date().toISOString(),
    })
    .eq('id', parsed.data.reviewId)
    .eq('tenant_id', tenantId)
    .is('respondida_em', null)

  if (error) return { erro: `Falha ao responder: ${error.message}` }
  revalidatePath('/avaliacoes')
  return { sucesso: true }
}

export async function sinalizarAvaliacao(
  input: z.infer<typeof sinalizarSchema>,
): Promise<ResultadoAcao> {
  const parsed = sinalizarSchema.safeParse(input)
  if (!parsed.success) return { erro: parsed.error.errors[0].message }

  const supabase = createSupabaseServer()
  const tenantId = await getTenantId(supabase)
  if (!tenantId) return { erro: 'Tenant não encontrado' }

  const { error } = await supabase
    .from('store_reviews')
    .update({ sinalizada: true, motivo_sinalizacao: parsed.data.motivo })
    .eq('id', parsed.data.reviewId)
    .eq('tenant_id', tenantId)

  if (error) return { erro: `Falha ao sinalizar: ${error.message}` }
  revalidatePath('/avaliacoes')
  return { sucesso: true }
}

export async function removerSinalizacao(reviewId: string): Promise<ResultadoAcao> {
  const parsed = z.string().uuid().safeParse(reviewId)
  if (!parsed.success) return { erro: 'ID inválido' }

  const supabase = createSupabaseServer()
  const tenantId = await getTenantId(supabase)
  if (!tenantId) return { erro: 'Tenant não encontrado' }

  const { error } = await supabase
    .from('store_reviews')
    .update({ sinalizada: false, motivo_sinalizacao: null })
    .eq('id', parsed.data)
    .eq('tenant_id', tenantId)

  if (error) return { erro: `Falha ao remover sinalização: ${error.message}` }
  revalidatePath('/avaliacoes')
  return { sucesso: true }
}
