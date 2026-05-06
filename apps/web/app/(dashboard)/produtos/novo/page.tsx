import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { criarProduto } from '@/lib/actions/produtos'
import { getCategorias } from '@/lib/actions/categorias'
import { ProdutoForm } from '@/components/dashboard/produto-form'

export default async function PaginaNovoProduto() {
  const supabase = createSupabaseServer()

  const { data: storeResult } = await supabase
    .from('stores')
    .select('id')
    .single()

  const store = storeResult as any
  if (!store) redirect('/dashboard/produtos')

  const { categorias } = await getCategorias()

  async function action(_estado: any, formData: FormData) {
    'use server'
    const resultado = await criarProduto(store!.id, formData)
    if (resultado.sucesso) redirect('/dashboard/produtos')
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
        <h1 className="font-display text-[28px] leading-tight text-ink mt-2">Novo produto</h1>
      </div>

      <ProdutoForm action={action} categorias={categorias} />
    </div>
  )
}
