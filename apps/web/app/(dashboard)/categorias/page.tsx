import { getCategorias } from '@/lib/actions/categorias'
import { ListaCategorias } from '@/components/dashboard/lista-categorias'

export default async function PaginaCategorias() {
  const { categorias, erro } = await getCategorias()

  return (
    <div className="p-9 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[32px] leading-tight text-ink">Categorias</h1>
      </div>

      {erro && (
        <p className="text-red-500 text-sm">{erro}</p>
      )}

      <ListaCategorias categorias={categorias} />
    </div>
  )
}
