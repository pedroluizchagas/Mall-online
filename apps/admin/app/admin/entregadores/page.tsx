import { getEntregadores } from '@/lib/actions/admin'
import { TabelaEntregadores } from '@/components/admin/tabela-entregadores'
import { Bike } from 'lucide-react'

const FILTROS = [
  { label: 'Pendentes', valor: 'pendente' },
  { label: 'Aprovados', valor: 'aprovado' },
  { label: 'Reprovados', valor: 'reprovado' },
  { label: 'Suspensos', valor: 'suspenso' },
]

export default async function PaginaEntregadores({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const status = searchParams.status ?? 'pendente'
  const entregadores = await getEntregadores({ status })

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
            <Bike size={17} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Entregadores</h1>
            <p className="text-xs text-gray-400">{entregadores.length} encontrado(s)</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {FILTROS.map((f) => (
          <a
            key={f.valor}
            href={`/admin/entregadores?status=${f.valor}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              status === f.valor
                ? 'bg-[#1A4D3A] text-white border-[#1A4D3A] shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <TabelaEntregadores entregadores={entregadores} />
    </div>
  )
}
