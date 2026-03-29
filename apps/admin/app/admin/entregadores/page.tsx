import { getEntregadores } from '@/lib/actions/admin'
import { TabelaEntregadores } from '@/components/admin/tabela-entregadores'

export default async function PaginaEntregadores({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const status = searchParams.status ?? 'pendente'
  const entregadores = await getEntregadores({ status })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1A4D3A]">Entregadores</h1>
        <span className="text-sm text-gray-400">{entregadores.length} encontrado(s)</span>
      </div>

      <div className="flex gap-2">
        {[
          { label: 'Pendentes', valor: 'pendente' },
          { label: 'Aprovados', valor: 'aprovado' },
          { label: 'Reprovados', valor: 'reprovado' },
          { label: 'Suspensos', valor: 'suspenso' },
        ].map((f) => (
          <a
            key={f.valor}
            href={`/admin/entregadores?status=${f.valor}`}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              status === f.valor
                ? 'bg-[#1A4D3A] text-white border-[#1A4D3A]'
                : 'bg-white text-gray-600 border-gray-200'
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
