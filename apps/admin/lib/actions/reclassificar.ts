'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdminServer } from '@/lib/supabase/admin'

const schema = z.object({
  store_id: z.string().uuid(),
  categoria_nova_id: z.string().uuid(),
  motivo: z
    .string()
    .min(10, 'Motivo precisa de pelo menos 10 caracteres')
    .max(500, 'Motivo pode ter no máximo 500 caracteres'),
})

export async function reclassificarLoja(formData: FormData) {
  // 1. Verifica autenticação e role admin (via cliente com sessão do usuário)
  const userClient = createSupabaseServer()
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) return { erro: 'Não autenticado' }
  if (user.user_metadata?.role !== 'admin') return { erro: 'Acesso negado' }

  const dados = schema.safeParse({
    store_id: formData.get('store_id'),
    categoria_nova_id: formData.get('categoria_nova_id'),
    motivo: formData.get('motivo'),
  })
  if (!dados.success) return { erro: dados.error.errors[0].message }

  // 2. UPDATE em stores.categoria_id é bloqueado pela policy `stores_update_self`
  // mesmo para admin (categoria_id é imutável em auto-serviço). Usamos service_role
  // para fazer o bypass — operação registrada em store_categoria_changes.
  const adminClient = createSupabaseAdminServer()

  const { data: store } = await adminClient
    .from('stores')
    .select('id, categoria_id')
    .eq('id', dados.data.store_id)
    .single()
  if (!store) return { erro: 'Loja não encontrada' }

  const { error: errUpd } = await adminClient
    .from('stores')
    .update({ categoria_id: dados.data.categoria_nova_id })
    .eq('id', dados.data.store_id)
  if (errUpd) return { erro: errUpd.message }

  const { error: errAud } = await adminClient.from('store_categoria_changes').insert({
    store_id: dados.data.store_id,
    categoria_anterior: store.categoria_id,
    categoria_nova: dados.data.categoria_nova_id,
    motivo: dados.data.motivo,
    changed_by: user.id,
  })
  if (errAud) return { erro: errAud.message }

  revalidatePath('/admin/lojas-outros')
  revalidatePath('/admin/adocao-templates')
  return { sucesso: true }
}
