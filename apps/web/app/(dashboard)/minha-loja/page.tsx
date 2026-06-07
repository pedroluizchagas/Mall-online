import { getDadosLoja } from '@/lib/actions/lojas'
import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MinhaLojaEditor } from '@/components/dashboard/minha-loja-editor'
import type { ProdutoEditorInicial } from '@/components/dashboard/minha-loja-editor'

export default async function PaginaMinhaLoja() {
  const supabase = createSupabaseServer()
  const dados = await getDadosLoja()

  if (!dados?.loja) redirect('/onboarding')

  const { loja, tenant } = dados

  const { data: produtosRaw } = await supabase
    .from('products')
    .select('id, nome, foto_url, preco')
    .eq('tenant_id', tenant.id)
    .eq('disponivel', true)
    .order('criado_em', { ascending: false })
    .limit(4)

  const produtos = (produtosRaw ?? []) as ProdutoEditorInicial[]

  // Slug da categoria → sugere o arquétipo (pele) no editor.
  const { data: lojaCat } = await supabase
    .from('stores')
    .select('categoria:categories(slug)')
    .eq('id', loja.id)
    .single()
  const categoriaSlug =
    (lojaCat as { categoria?: { slug?: string | null } | null } | null)?.categoria
      ?.slug ?? null

  return (
    <MinhaLojaEditor
      loja={{
        nome: loja.nome,
        descricao: loja.descricao,
        logo_url: loja.logo_url,
        banner_url: loja.banner_url,
        theme: loja.theme ?? null,
        ativo: loja.ativo ?? true,
        slug: loja.slug ?? null,
        categoriaSlug,
      }}
      produtos={produtos}
    />
  )
}
