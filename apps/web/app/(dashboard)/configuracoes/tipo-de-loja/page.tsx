import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import {
  getPisosByCategoria,
  getTemplateByStore,
} from '@mallevo/lib'
import { TipoDeLojaCard } from '@/components/dashboard/tipo-de-loja-card'
import { PageHeader } from '@/components/dashboard/page-header'

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
    .select('nome, categoria:categories!stores_categoria_id_fkey(id, slug, nome, icone)')
    .eq('tenant_id', tenant.id)
    .limit(1)
    .maybeSingle()) as { data: StoreComCategoria | null }

  const template = getTemplateByStore(loja ?? {})
  const pisos = loja?.categoria?.slug
    ? getPisosByCategoria(loja.categoria.slug)
    : []

  return (
    <div className="max-w-3xl p-6 sm:p-9">
      <PageHeader
        sobrelinha="Minha loja"
        titulo="Tipo de loja"
        subtitulo="O que o seu ramo liga no painel e onde a loja aparece no shopping."
      />

      <TipoDeLojaCard
        categoriaNome={loja?.categoria?.nome ?? null}
        categoriaSlug={loja?.categoria?.slug ?? null}
        template={template}
        pisos={pisos.map((p) => ({ slug: p.slug, nome: p.nome }))}
      />
    </div>
  )
}
