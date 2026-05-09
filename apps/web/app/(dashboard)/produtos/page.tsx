import Link from 'next/link'
import { Plus, Download } from 'lucide-react'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getProdutos } from '@/lib/actions/produtos'
import { ListaProdutos } from '@/components/dashboard/lista-produtos'
import { UsoPlanoBarra } from '@/components/dashboard/uso-plano-barra'
import { PageHeader } from '@/components/dashboard/page-header'

export default async function PaginaProdutos() {
  const supabase = createSupabaseServer()

  const { data: store } = await supabase.from('stores').select('id, nome').single()

  if (!store) {
    return (
      <div className="p-9">
        <p className="text-ink-3">Nenhuma loja encontrada.</p>
      </div>
    )
  }

  const { produtos, uso } = await getProdutos(store.id)
  const baixoEstoque = (produtos as any[]).filter((p) => p.track_stock && (p.stock_quantity ?? 0) < 10).length

  const subtitulo =
    `${produtos.length} produtos · ${baixoEstoque} com estoque baixo` +
    (uso ? ` · plano ${uso.atual}/${uso.maximo}` : '')

  return (
    <div className="p-9 space-y-5 slide-up">
      <PageHeader
        titulo="Catálogo"
        subtitulo={subtitulo}
        acoes={
          <>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-line bg-bg text-xs font-semibold hover:bg-bg-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Importar CSV
            </button>
            <Link
              href="/produtos/novo"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-colors"
              style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
            >
              <Plus className="w-3.5 h-3.5" /> Novo produto
            </Link>
          </>
        }
      />

      {uso && <UsoPlanoBarra atual={uso.atual} maximo={uso.maximo} percentual={uso.percentual} />}

      <ListaProdutos produtos={produtos as any} storeId={store.id} />
    </div>
  )
}
