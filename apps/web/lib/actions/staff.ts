'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

const schemaStaff = z.object({
  nome: z.string().min(2, 'Nome obrigatório').max(80),
  foto_url: z.string().url().optional().nullable(),
  cor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor deve ser hex no formato #RRGGBB')
    .optional()
    .nullable(),
  ativo: z.boolean().default(true),
  ordem: z.number().int().min(0).default(0),
})

export interface StaffMembro {
  id: string
  nome: string
  foto_url: string | null
  cor: string | null
  ativo: boolean
  ordem: number
}

function parseStaffFormData(formData: FormData) {
  return schemaStaff.safeParse({
    nome: formData.get('nome'),
    foto_url: formData.get('foto_url') ? String(formData.get('foto_url')) : null,
    cor: formData.get('cor') ? String(formData.get('cor')) : null,
    ativo: formData.get('ativo') === 'true',
    ordem: formData.get('ordem') ? parseInt(String(formData.get('ordem')), 10) : 0,
  })
}

export async function listarStaff(store_id: string): Promise<{
  erro?: string
  staff: StaffMembro[]
}> {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) return { erro: 'Tenant não encontrado', staff: [] }

  const { data, error } = await (supabase as any)
    .from('service_staff')
    .select('id, nome, foto_url, cor, ativo, ordem')
    .eq('store_id', store_id)
    .eq('tenant_id', tenant.id)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })

  if (error) return { erro: error.message, staff: [] }

  return { staff: (data ?? []) as StaffMembro[] }
}

export async function criarStaff(store_id: string, formData: FormData) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', store_id)
    .eq('tenant_id', tenant.id)
    .single()
  if (!store) return { erro: 'Loja não encontrada' }

  const dados = parseStaffFormData(formData)
  if (!dados.success) return { erro: dados.error.errors[0].message }

  const { error } = await (supabase as any).from('service_staff').insert({
    ...dados.data,
    store_id,
    tenant_id: tenant.id,
  })

  if (error) return { erro: error.message }

  revalidatePath('/configuracoes/staff')
  revalidatePath('/agenda')
  return { sucesso: true }
}

export async function atualizarStaff(staff_id: string, formData: FormData) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) return { erro: 'Tenant não encontrado' }

  const dados = parseStaffFormData(formData)
  if (!dados.success) return { erro: dados.error.errors[0].message }

  const { error } = await (supabase as any)
    .from('service_staff')
    .update(dados.data)
    .eq('id', staff_id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/configuracoes/staff')
  revalidatePath('/agenda')
  return { sucesso: true }
}

export async function alternarAtivoStaff(staff_id: string, ativo: boolean) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { error } = await (supabase as any)
    .from('service_staff')
    .update({ ativo })
    .eq('id', staff_id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/configuracoes/staff')
  revalidatePath('/agenda')
  return { sucesso: true }
}

export async function excluirStaff(staff_id: string) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { error } = await (supabase as any)
    .from('service_staff')
    .delete()
    .eq('id', staff_id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/configuracoes/staff')
  revalidatePath('/agenda')
  return { sucesso: true }
}
