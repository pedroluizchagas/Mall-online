import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import {
  getPisosByCategoria,
  getTemplateByStore,
} from '@mallevo/lib'
import { TipoDeLojaCard } from '@/components/dashboard/tipo-de-loja-card'

type StoreComCategoria = {
  nome: string | null
  categoria: { id: string; slug: string | null; nome: string; icone: string | null } | null
}

export default async function PaginaTipoDeLoja() {
  const supabase = createSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id')
    .limit(1)

  const tenant = tenants?.[0]
  if (!tenant) redirect('/onboarding')

  const { data: loja } = (await supabase
    .from('stores')
    .select('nome, categoria:categories(id, slug, nome, icone)')
    .eq('tenant_id', tenant.id)
    .single()) as { data: StoreComCategoria | null }

  const template = getTemplateByStore(loja ?? {})
  const pisos = loja?.categoria?.slug
    ? getPisosByCategoria(loja.categoria.slug)
    : []

  return (
    <div className="p-9 max-w-2xl">
      <h1 className="font-display text-[32px] leading-tight text-ink mb-6">
        Tipo de loja
      </h1>

      <TipoDeLojaCard
        categoriaNome={loja?.categoria?.nome ?? null}
        categoriaIcone={loja?.categoria?.icone ?? null}
        template={template}
        pisos={pisos.map((p) => ({ slug: p.slug, nome: p.nome, icone: p.icone }))}
      />
    </div>
  )
}
