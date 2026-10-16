import { getCategorias } from '@/lib/actions/categorias'
import { ListaCategorias } from '@/components/dashboard/lista-categorias'
import { PageHeader } from '@/components/dashboard/page-header'

export default async function PaginaCategorias() {
  const { categorias, erro } = await getCategorias()

  return (
    <div className="p-6 sm:p-9">
      <PageHeader
        sobrelinha="Catálogo"
        titulo="Categorias"
        subtitulo="As seções que organizam seus produtos na vitrine, no app e no site."
      />

      {erro && (
        <p className="mb-6 rounded-[14px] px-4 py-3 text-[13.5px] font-semibold" style={{ background: 'var(--err-lt)', color: 'var(--err)' }}>
          {erro}
        </p>
      )}

      <ListaCategorias categorias={categorias} />
    </div>
  )
}
