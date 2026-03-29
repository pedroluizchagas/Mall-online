import { getTenants } from '@/lib/actions/admin'
import { TabelaTenants } from '@/components/admin/tabela-tenants'

export default async function PaginaLojistas({
  searchParams,
}: {
  searchParams: { status?: string; busca?: string }
}) {
  const tenants = await getTenants({
    billing_status: searchParams.status,
    busca: searchParams.busca,
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1A4D3A]">Lojistas</h1>
        <span className="text-sm text-gray-400">{tenants.length} encontrado(s)</span>
      </div>

      <div className="flex gap-2">
        {[
          { label: 'Todos', valor: '' },
          { label: 'Ativos', valor: 'ativa' },
          { label: 'Trial', valor: 'trial' },
          { label: 'Em atraso', valor: 'em_atraso' },
          { label: 'Cancelados', valor: 'cancelada' },
        ].map((f) => (
          <a
            key={f.valor}
            href={`/admin/lojistas${f.valor ? `?status=${f.valor}` : ''}`}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              (searchParams.status ?? '') === f.valor
                ? 'bg-[#1A4D3A] text-white border-[#1A4D3A]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
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
