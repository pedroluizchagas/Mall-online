'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

const schemaCategoria = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  descricao: z.string().optional(),
  icone: z.string().optional(),
  ordem: z.number().int().default(0),
})

export async function getCategorias() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  const { data, error } = await supabase
    .from('categories')
    .select('id, nome, descricao, icone, ordem, ativa, tenant_id')
    .or(`tenant_id.is.null,tenant_id.eq.${tenant?.id}`)
    .eq('ativa', true)
    .order('ordem', { ascending: true })

  if (error) return { erro: error.message, categorias: [] }
  return { categorias: data ?? [] }
}

export async function criarCategoria(formData: FormData) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const dados = schemaCategoria.safeParse({
    nome: formData.get('nome'),
    descricao: formData.get('descricao') || undefined,
    icone: formData.get('icone') || undefined,
    ordem: parseInt(String(formData.get('ordem') ?? '0')),
  })

  if (!dados.success) return { erro: dados.error.errors[0].message }

  const { error } = await supabase.from('categories').insert({
    ...dados.data,
    tenant_id: tenant.id,
  })

  if (error) return { erro: error.message }

  revalidatePath('/dashboard/categorias')
  revalidatePath('/dashboard/produtos')
  return { sucesso: true }
}

export async function atualizarCategoria(
  categoria_id: string,
  formData: FormData
) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const dados = schemaCategoria.safeParse({
    nome: formData.get('nome'),
    descricao: formData.get('descricao') || undefined,
    icone: formData.get('icone') || undefined,
    ordem: parseInt(String(formData.get('ordem') ?? '0')),
  })

  if (!dados.success) return { erro: dados.error.errors[0].message }

  const { error } = await supabase
    .from('categories')
    .update(dados.data)
    .eq('id', categoria_id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/dashboard/categorias')
  return { sucesso: true }
}

export async function excluirCategoria(categoria_id: string) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  await supabase
    .from('products')
    .update({ category_id: null })
    .eq('category_id', categoria_id)
    .eq('tenant_id', tenant.id)

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoria_id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/dashboard/categorias')
  return { sucesso: true }
}
