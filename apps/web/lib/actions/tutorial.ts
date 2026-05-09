'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function marcarTutorialVisto() {
  const supabase = createSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado' }

  const { data: tenants } = (await supabase
    .from('tenants')
    .select('id')
    .limit(1)) as { data: { id: string }[] | null }

  const tenant = tenants?.[0]
  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { error } = await (supabase as any)
    .from('tenants')
    .update({ tutorial_template_visto: true })
    .eq('id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/', 'layout')
  return { sucesso: true }
}
