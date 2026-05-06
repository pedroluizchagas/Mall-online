import { Card } from '@/components/ui/card'
import { ProductThumb } from '@/components/ui/product-thumb'
import { money } from '@/lib/format'

export interface ProdutoMaisVendido {
  id: string
  nome: string
  preco: number
  vendas_semana: number
}

export function MaisVendidosCard({ produtos }: { produtos: ProdutoMaisVendido[] }) {
  return (
    <Card className="!p-[22px]">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="m-0 text-base font-bold tracking-tight">Mais vendidos</h3>
        <span className="font-mono text-[10px] text-ink-3">esta semana</span>
      </div>

      {produtos.length === 0 && (
        <div className="text-center text-ink-3 text-sm py-6">
          Sem dados de vendas ainda.
        </div>
      )}

      {produtos.map((p, i) => (
        <div
          key={p.id}
          className={`flex items-center gap-3 py-2 ${i < produtos.length - 1 ? 'border-b border-line' : ''}`}
        >
          <span className="font-mono text-[11px] text-ink-3 w-4">
            {String(i + 1).padStart(2, '0')}
          </span>
          <ProductThumb name={p.nome} size={36} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[13px] truncate">{p.nome}</div>
            <div className="text-[11px] text-ink-3">
              {p.vendas_semana} vendas · {money(p.preco)}
            </div>
          </div>
        </div>
      ))}
    </Card>
  )
}
