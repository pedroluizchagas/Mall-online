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
    <div className="p-9 space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brick/10 flex items-center justify-center">
            <Store size={17} className="text-brick-dk" />
          </div>
          <div>
            <h1 className="font-bold text-[17px] tracking-tight text-ink">Lojistas</h1>
            <p className="text-[13px] text-ink-3">{tenants.length} encontrado(s)</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {FILTROS.map((f) => (
          <a
            key={f.valor}
            href={`/admin/lojistas${f.valor ? `?status=${f.valor}` : ''}`}
            className={`px-4 py-2 rounded-full text-[13px] font-medium border transition-all ${
              statusAtual === f.valor
                ? 'border-transparent text-brick-ink'
                : 'bg-bg text-ink-2 border-line hover:border-line-2 hover:bg-bg-2'
            }`}
            style={statusAtual === f.valor ? { background: 'var(--brick)' } : {}}
          >
            {f.label}
          </a>
        ))}
      </div>

      <TabelaTenants tenants={tenants} />
    </div>
  )
}
