import { createSupabaseServer } from '@/lib/supabase/server'
import { getProdutos } from '@/lib/actions/produtos'
import { ListaProdutos } from '@/components/dashboard/lista-produtos'
import { UsoPlanoBarra } from '@/components/dashboard/uso-plano-barra'

export default async function PaginaProdutos() {
  const supabase = createSupabaseServer()

  const { data: store } = await supabase
    .from('stores')
    .select('id, nome')
    .single()

  if (!store) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Nenhuma loja encontrada.</p>
      </div>
    )
  }

  const { produtos, uso } = await getProdutos(store.id)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A4D3A]">Produtos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{store.nome}</p>
        </div>
        <a
          href="/dashboard/produtos/novo"
          className="bg-[#1A4D3A] text-white px-4 py-2 rounded-lg text-sm font-medium
            hover:bg-[#163d2e] transition-colors"
        >
          Novo produto
        </a>
      </div>

      {uso && (
        <UsoPlanoBarra
          atual={uso.atual}
          maximo={uso.maximo}
          percentual={uso.percentual}
        />
      )}

      <ListaProdutos produtos={produtos} storeId={store.id} />
    </div>
  )
}
