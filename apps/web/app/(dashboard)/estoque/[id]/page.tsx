import { createSupabaseServer } from '@/lib/supabase/server'
import { getHistoricoMovimentacoes } from '@/lib/actions/estoque'
import { redirect } from 'next/navigation'

const LABELS_TIPO: Record<string, string> = {
  entrada: 'Entrada',
  saida_pedido: 'Saída por pedido',
  ajuste_positivo: 'Ajuste positivo',
  ajuste_negativo: 'Ajuste negativo',
}

const CORES_TIPO: Record<string, string> = {
  entrada: 'text-green-600 bg-green-50',
  saida_pedido: 'text-blue-600 bg-blue-50',
  ajuste_positivo: 'text-green-600 bg-green-50',
  ajuste_negativo: 'text-red-600 bg-red-50',
}

export default async function PaginaHistoricoEstoque({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createSupabaseServer()

  const { data: produto } = await supabase
    .from('products')
    .select('id, nome, stock_quantity, stock_minimo, track_stock')
    .eq('id', params.id)
    .single()

  if (!produto) redirect('/dashboard/produtos')

  const movimentacoes = await getHistoricoMovimentacoes(params.id)

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <a href="/dashboard/produtos" className="text-[#4CAF82] text-sm">
          Produtos
        </a>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 text-sm">Estoque — {produto.nome}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700">{produto.nome}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Estoque mínimo: {produto.stock_minimo ?? 0} unidades
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-[#1A4D3A]">
              {produto.stock_quantity ?? 0}
            </p>
            <p className="text-xs text-gray-400">unidades</p>
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
        Histórico de movimentações
      </h2>

      {movimentacoes.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          Nenhuma movimentação registrada ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {movimentacoes.map((mov: any) => (
            <div
              key={mov.id}
              className="bg-white rounded-xl border border-gray-100 px-4 py-3
                flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${CORES_TIPO[mov.tipo] ?? 'text-gray-600 bg-gray-50'}`}
                  >
                    {LABELS_TIPO[mov.tipo] ?? mov.tipo}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {mov.motivo ?? '—'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(mov.criado_em).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="text-right">
                <p
                  className={`text-base font-bold ${
                    mov.quantidade > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {mov.quantidade > 0 ? '+' : ''}
                  {mov.quantidade}
                </p>
                <p className="text-xs text-gray-400">
                  {mov.quantidade_anterior} → {mov.quantidade_posterior}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
