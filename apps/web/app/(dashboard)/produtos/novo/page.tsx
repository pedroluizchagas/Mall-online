import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { criarProduto } from '@/lib/actions/produtos'
import { getCategorias } from '@/lib/actions/categorias'
import { ProdutoForm } from '@/components/dashboard/produto-form'
import { Voltar } from '@/components/dashboard/voltar'

export default async function PaginaNovoProduto() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase.from('tenants').select('id').single()
  const { data: storeResult } = await supabase
    .from('stores')
    // carga_*: o form só exibe peso/volume por produto quando a loja está
    // em modo 'produto' (docs/31 §1.1)
    .select('id, carga_modo, carga_item_peso_g, carga_item_volume_ml')
    .eq('tenant_id', tenant?.id ?? '')
    .limit(1)
    .maybeSingle()

  const store = storeResult as any
  if (!store) redirect('/produtos')

  const { categorias } = await getCategorias()

  async function action(_estado: any, formData: FormData) {
    'use server'
    const resultado = await criarProduto(store!.id, formData)
    if (resultado.sucesso) redirect('/produtos')
    return resultado
  }

  return (
    <div className="p-9 max-w-2xl">
      <div className="mb-8">
        <Voltar href="/produtos">Catálogo</Voltar>
        <h1 className="text-[32px] font-semibold leading-[1.02] tracking-[-0.04em] text-ink sm:text-[38px]">Novo produto</h1>
      </div>

      <ProdutoForm action={action} categorias={categorias} loja={store} />
    </div>
  )
}
