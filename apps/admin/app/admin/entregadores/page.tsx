import { getEntregadores } from '@/lib/actions/admin'
import { TabelaEntregadores } from '@/components/admin/tabela-entregadores'
import { Bike } from 'lucide-react'

const FILTROS = [
  { label: 'Pendentes', valor: 'pendente' },
  { label: 'Aprovados', valor: 'aprovado' },
  { label: 'Reprovados', valor: 'reprovado' },
  { label: 'Suspensos', valor: 'suspenso' },
]

const FILTROS_PAGARME = [
  { label: 'Todos', valor: '' },
  { label: 'Ativo', valor: 'active' },
  { label: 'Em análise', valor: 'affiliation' },
  { label: 'Cadastro', valor: 'registration' },
  { label: 'Pendente', valor: 'pending' },
  { label: 'Recusado', valor: 'refused' },
  { label: 'Bloqueado', valor: 'blocked' },
]

export default async function PaginaEntregadores({
  searchParams,
}: {
  searchParams: { status?: string; pagarme_status?: string }
}) {
  const status = searchParams.status ?? 'pendente'
  const pagarmeAtual = searchParams.pagarme_status ?? ''
  const entregadores = await getEntregadores({
    status,
    pagarme_status: searchParams.pagarme_status,
  })

  function buildHref(params: Record<string, string | undefined>) {
    const merged = {
      status: status || undefined,
      pagarme_status: pagarmeAtual || undefined,
      ...params,
    }
    const qs = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join('&')
    return `/admin/entregadores${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="p-9 space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sky/10 flex items-center justify-center">
            <Bike size={17} className="text-sky" />
          </div>
          <div>
            <h1 className="font-bold text-[17px] tracking-tight text-ink">Entregadores</h1>
            <p className="text-[13px] text-ink-3">{entregadores.length} encontrado(s)</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {FILTROS.map((f) => (
          <a
            key={f.valor}
            href={buildHref({ status: f.valor })}
            className={`px-4 py-2 rounded-full text-[13px] font-medium border transition-all ${
              status === f.valor
                ? 'border-transparent text-brick-ink'
                : 'bg-bg text-ink-2 border-line hover:border-line-2 hover:bg-bg-2'
            }`}
            style={status === f.valor ? { background: 'var(--brick)' } : {}}
          >
            {f.label}
          </a>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mr-1">
          Recebimentos
        </span>
        {FILTROS_PAGARME.map((f) => (
          <a
            key={f.valor || 'all'}
            href={buildHref({ pagarme_status: f.valor || undefined })}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
              pagarmeAtual === f.valor
                ? 'border-transparent text-brick-ink'
                : 'bg-bg text-ink-2 border-line hover:border-line-2 hover:bg-bg-2'
            }`}
            style={pagarmeAtual === f.valor ? { background: 'var(--brick)' } : {}}
          >
            {f.label}
          </a>
        ))}
      </div>

      <TabelaEntregadores entregadores={entregadores} />
    </div>
  )
}
