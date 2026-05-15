import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getTemplateByStore } from '@mallevo/lib'
import { listarStaff } from '@/lib/actions/staff'
import { StaffLista } from '@/components/dashboard/staff-lista'

type StoreComCategoria = {
  id: string
  nome: string | null
  categoria: { id: string; slug: string | null; nome: string; icone: string | null } | null
}

export default async function PaginaStaff() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) redirect('/onboarding')

  const { data: store } = (await supabase
    .from('stores')
    .select('id, nome, categoria:categories(id, slug, nome, icone)')
    .eq('tenant_id', tenant.id)
    .single()) as { data: StoreComCategoria | null }

  if (!store) {
    return (
      <div className="p-9">
        <p className="text-ink-3">Nenhuma loja encontrada.</p>
      </div>
    )
  }

  const template = getTemplateByStore(store)

  if (!template.modulos.agenda) {
    return (
      <div className="p-9 space-y-3">
        <h1 className="font-display text-[32px] m-0 leading-tight">Profissionais</h1>
        <div
          className="rounded-xl p-4 text-sm"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
        >
          Sua loja não usa agenda de profissionais. Esta seção fica disponível para lojas do tipo
          Serviços.
        </div>
      </div>
    )
  }

  const { staff, erro } = await listarStaff(store.id)

  return (
    <div className="p-9 space-y-5 slide-up">
      <div>
        <h1 className="font-display text-[32px] m-0 leading-tight">Profissionais</h1>
        <p className="text-ink-3 text-[13px] mt-0.5">
          Cadastre quem atende na sua loja. As cores aparecem no calendário da agenda.
        </p>
      </div>

      {erro && (
        <div
          className="px-4 py-3 rounded-xl text-sm"
          style={{ background: '#fde8e4', color: 'var(--err)' }}
        >
          {erro}
        </div>
      )}

      <StaffLista storeId={store.id} staff={staff} />
    </div>
  )
}
