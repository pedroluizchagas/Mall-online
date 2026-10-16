import Link from 'next/link'
import { money } from '@/lib/format'
import { PartnerIcon } from '@/components/ui/partner-icon'

export interface ProdutoMaisVendido {
  nome: string
  /** Unidades vendidas no período (pedidos entregues). */
  quantidade: number
  /** Receita no período, em centavos. */
  receita: number
}

/**
 * Os mais vendidos de verdade (itens de pedidos entregues no período) — não
 * os produtos mais recentes com "0 vendas". Sem venda, diz isso.
 */
export function MaisVendidosCard({ produtos }: { produtos: ProdutoMaisVendido[] }) {
  if (produtos.length === 0) {
    return (
      <div className="cartao flex flex-1 flex-col items-start justify-center p-6">
        <span className="flex size-10 items-center justify-center rounded-full bg-bg-2 text-ink">
          <PartnerIcon name="trend" size={18} strokeWidth={1.9} />
        </span>
        <p className="mt-4 text-[15px] font-semibold text-ink">Ainda sem vendas entregues</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">
          Quando os pedidos forem entregues, os campeões da loja aparecem aqui.
        </p>
        <Link href="/conteudo/novo" className="sublinha mt-4 text-[13px] font-bold text-ink">
          Publicar um produto no Explorar
        </Link>
      </div>
    )
  }

  const maior = Math.max(...produtos.map((p) => p.quantidade), 1)

  return (
    <ol className="cartao flex flex-1 flex-col p-2">
      {produtos.map((p, i) => (
        <li key={p.nome} className="flex items-center gap-3.5 rounded-[14px] px-3 py-3">
          <span className="w-5 shrink-0 font-mono text-[12px] text-ink-3">{String(i + 1).padStart(2, '0')}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-[14px] font-semibold text-ink">{p.nome}</p>
              <p className="shrink-0 text-[13px] font-bold text-ink tabular-nums">{money(p.receita)}</p>
            </div>
            <div className="mt-2 flex items-center gap-2.5">
              <span className="block h-1 flex-1 overflow-hidden rounded-full bg-bg-2">
                <span
                  className="block h-full rounded-full bg-ink"
                  style={{ width: `${Math.max(6, (p.quantidade / maior) * 100)}%` }}
                />
              </span>
              <span className="shrink-0 text-[12px] font-medium text-ink-3 tabular-nums">
                {p.quantidade} {p.quantidade === 1 ? 'vendido' : 'vendidos'}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
