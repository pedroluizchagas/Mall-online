import Link from 'next/link'
import { getTemplateByStore } from '@mallevo/lib'
import { PartnerIcon } from '@/components/ui/partner-icon'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getProdutos } from '@/lib/actions/produtos'
import { ListaProdutos } from '@/components/dashboard/lista-produtos'
import { UsoPlanoBarra } from '@/components/dashboard/uso-plano-barra'
import { PageHeader } from '@/components/dashboard/page-header'
import { ExportarProdutosButton } from '@/components/dashboard/exportar-produtos-button'
import { ImportarProdutosDialog } from '@/components/dashboard/importar-produtos-dialog'

export default async function PaginaProdutos() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase.from('tenants').select('id').single()
  const { data: store } = await supabase
    .from('stores')
    .select('id, nome, categoria:categories!stores_categoria_id_fkey(id, slug, nome, icone)')
    .eq('tenant_id', tenant?.id ?? '')
    .limit(1)
    .maybeSingle()

  if (!store) {
    return (
      <div className="p-9">
        <p className="text-ink-3">Nenhuma loja encontrada.</p>
      </div>
    )
  }

  const template = getTemplateByStore(store as Parameters<typeof getTemplateByStore>[0])
  const { produtos, uso } = await getProdutos(store.id)
  const baixoEstoque = (produtos as any[]).filter((p) => p.track_stock && (p.stock_quantity ?? 0) < 10).length

  const subtitulo =
    `${produtos.length} ${produtos.length === 1 ? 'produto' : 'produtos'} · ${baixoEstoque} com estoque baixo` +
    (uso ? ` · plano ${uso.atual}/${uso.maximo}` : '')

  return (
    <div className="space-y-5 p-6 sm:p-9">
      <PageHeader
        sobrelinha="Catálogo"
        titulo={template.produto.labels.produtoPlural}
        subtitulo={subtitulo}
        acoes={
          <>
            <ExportarProdutosButton storeId={store.id} />
            <ImportarProdutosDialog storeId={store.id} />
            <Link
              href="/produtos/novo"
              className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-bold transition-colors bg-brick text-brick-ink hover:bg-brick-dk"
            >
              <PartnerIcon name="plus" size={15} strokeWidth={2.4} />
              Novo {template.produto.labels.produtoSingular.toLowerCase()}
            </Link>
          </>
        }
      />

      {uso && <UsoPlanoBarra atual={uso.atual} maximo={uso.maximo} percentual={uso.percentual} />}

      <ListaProdutos produtos={produtos as any} storeId={store.id} />
    </div>
  )
}
