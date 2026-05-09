import { getDadosLoja } from '@/lib/actions/lojas'
import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MinhaLojaEditor } from '@/components/dashboard/minha-loja-editor'
import type { ProdutoEditorInicial } from '@/components/dashboard/minha-loja-editor'
import type { StoreTheme } from '@mallora/types'

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

  return (
    <MinhaLojaEditor
      loja={{
        nome: loja.nome,
        descricao: loja.descricao,
        logo_url: loja.logo_url,
        banner_url: loja.banner_url,
        theme: (loja.theme as StoreTheme | null) ?? null,
        ativo: loja.ativo ?? true,
        slug: loja.slug ?? null,
      }}
      produtos={produtos}
    />
  )
}
