import { createSupabaseServer } from '@/lib/supabase/server'
import { getHistoricoMovimentacoes } from '@/lib/actions/estoque'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Voltar } from '@/components/dashboard/voltar'

const LABELS_TIPO: Record<string, string> = {
  entrada: 'Entrada',
  saida_pedido: 'Saída por pedido',
  ajuste_positivo: 'Ajuste positivo',
  ajuste_negativo: 'Ajuste negativo',
}

const CORES_TIPO: Record<string, { bg: string; color: string }> = {
  entrada: { bg: 'var(--ok-lt)', color: 'var(--ok)' },
  saida_pedido: { bg: 'var(--sky-lt)', color: 'var(--sky)' },
  ajuste_positivo: { bg: 'var(--ok-lt)', color: 'var(--ok)' },
  ajuste_negativo: { bg: 'var(--err-lt)', color: 'var(--err)' },
}

export default async function PaginaHistoricoEstoque({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createSupabaseServer()

  const { data: produtoResult } = await supabase
    .from('products')
    .select('id, nome, stock_quantity, stock_minimo, track_stock')
    .eq('id', params.id)
    .single()

  const produto = produtoResult as any
  if (!produto) redirect('/produtos')

  const movimentacoes = await getHistoricoMovimentacoes(params.id)

  return (
    <div className="p-9 max-w-2xl slide-up">
      <Voltar href="/estoque">Estoque</Voltar>
      <h1 className="mb-8 text-[32px] font-semibold leading-[1.02] tracking-[-0.04em] text-ink sm:text-[38px]">
        {produto.nome}
      </h1>

      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">{produto.nome}</p>
            <p className="text-xs text-ink-3 mt-0.5">
              Estoque mínimo: {produto.stock_minimo ?? 0} unidades
            </p>
          </div>
          <div className="text-right">
            <p className="text-[34px] font-bold leading-none tracking-[-0.04em] text-ink tabular-nums">
              {produto.stock_quantity ?? 0}
            </p>
            <p className="text-xs text-ink-3">unidades</p>
          </div>
        </div>
      </Card>

      <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-3">
        Histórico de movimentações
      </h2>

      {movimentacoes.length === 0 ? (
        <p className="text-sm text-ink-3 text-center py-8">
          Nenhuma movimentação registrada ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {movimentacoes.map((mov: any) => {
            const corTipo = CORES_TIPO[mov.tipo]
            return (
              <div
                key={mov.id}
                className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={corTipo ?? { background: 'var(--bg-2)', color: 'var(--ink-3)' }}
                    >
                      {LABELS_TIPO[mov.tipo] ?? mov.tipo}
                    </span>
                  </div>
                  <p className="text-xs text-ink-2 mt-1">{mov.motivo ?? '—'}</p>
                  <p className="text-xs text-ink-3 mt-0.5">
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
                    className="text-base font-bold"
                    style={{ color: mov.quantidade > 0 ? 'var(--ok)' : 'var(--err)' }}
                  >
                    {mov.quantidade > 0 ? '+' : ''}
                    {mov.quantidade}
                  </p>
                  <p className="text-xs text-ink-3">
                    {mov.quantidade_anterior} → {mov.quantidade_posterior}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
