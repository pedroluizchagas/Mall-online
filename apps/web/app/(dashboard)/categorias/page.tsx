import { getCategorias } from '@/lib/actions/categorias'
import { ListaCategorias } from '@/components/dashboard/lista-categorias'

export default async function PaginaCategorias() {
  const { categorias, erro } = await getCategorias()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1A4D3A]">Categorias</h1>
      </div>

      {erro && (
        <p className="text-red-500 text-sm">{erro}</p>
      )}

      <ListaCategorias categorias={categorias} />
    </div>
  )
}
