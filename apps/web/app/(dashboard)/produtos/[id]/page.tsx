import { redirect, notFound } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import {
  atualizarProduto,
  getModificadoresProduto,
  getVariantsProduto,
} from '@/lib/actions/produtos'
import { getCategorias } from '@/lib/actions/categorias'
import { ProdutoForm } from '@/components/dashboard/produto-form'

interface Props {
  params: { id: string }
}

export default async function PaginaEditarProduto({ params }: Props) {
  const supabase = createSupabaseServer()

  const { data: tenantResult } = await supabase
    .from('tenants')
    .select('id')
    .single()

  const tenant = tenantResult as any
  if (!tenant) redirect('/produtos')

  const { data: produtoResult } = await supabase
    .from('products')
    .select(`
      id, nome, descricao, preco, preco_promocional,
      foto_url, disponivel, track_stock, stock_quantity,
      stock_minimo, category_id, ordem, metadata,
      peso_g, volume_ml, refrigerado, fragil
    `)
    .eq('id', params.id)
    .eq('tenant_id', tenant.id)
    .single()

  const produto = produtoResult as any

  if (!produto) notFound()

  // Perfil de carga da loja: decide se o form mostra peso/volume por produto
  const { data: lojaResult } = await supabase
    .from('stores')
    .select('id, carga_modo, carga_item_peso_g, carga_item_volume_ml')
    .eq('tenant_id', tenant.id)
    .limit(1)
    .maybeSingle()

  const { categorias } = await getCategorias()
  const { grupos } = await getModificadoresProduto(params.id)
  const { optionGroups, variants } = await getVariantsProduto(params.id)

  async function action(_estado: any, formData: FormData) {
    'use server'
    const resultado = await atualizarProduto(params.id, formData)
    if (resultado.sucesso) redirect('/produtos')
    return resultado
  }

  return (
    <div className="p-9 max-w-2xl">
      <div className="mb-6">
        <a
          href="/produtos"
          className="text-sm font-medium hover:underline"
          style={{ color: 'var(--brick-dk)' }}
        >
          &larr; Voltar para produtos
        </a>
        <h1 className="font-display text-[28px] leading-tight text-ink mt-2">Editar produto</h1>
      </div>

      <ProdutoForm
        action={action}
        categorias={categorias}
        produto={produto}
        loja={lojaResult as any}
        grupos={grupos as any}
        optionGroups={optionGroups}
        variants={variants.map((v) => ({
          ...v,
          sku: v.sku ?? '',
          stock_minimo: v.stock_minimo ?? 0,
        }))}
      />
    </div>
  )
}
