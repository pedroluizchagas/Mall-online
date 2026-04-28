import { getTenants } from '@/lib/actions/admin'
import { TabelaTenants } from '@/components/admin/tabela-tenants'
import { Store } from 'lucide-react'

const FILTROS = [
  { label: 'Todos', valor: '' },
  { label: 'Ativos', valor: 'ativa' },
  { label: 'Trial', valor: 'trial' },
  { label: 'Em atraso', valor: 'em_atraso' },
  { label: 'Cancelados', valor: 'cancelada' },
]

export default async function PaginaLojistas({
  searchParams,
}: {
  searchParams: { status?: string; busca?: string }
}) {
  const tenants = await getTenants({
    billing_status: searchParams.status,
    busca: searchParams.busca,
  })

  const statusAtual = searchParams.status ?? ''

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Store size={17} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Lojistas</h1>
            <p className="text-xs text-gray-400">{tenants.length} encontrado(s)</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {FILTROS.map((f) => (
          <a
            key={f.valor}
            href={`/admin/lojistas${f.valor ? `?status=${f.valor}` : ''}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              statusAtual === f.valor
                ? 'bg-[#1A4D3A] text-white border-[#1A4D3A] shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <TabelaTenants tenants={tenants} />
    </div>
  )
}
