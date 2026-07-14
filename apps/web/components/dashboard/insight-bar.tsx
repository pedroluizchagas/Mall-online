import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import type { InsightBairro } from '@/lib/actions/home'

/**
 * Insight de bairro em alta — dados REAIS de getInsightBairro (últimos 7
 * dias vs 7 anteriores). Sem dados suficientes, a home simplesmente não
 * renderiza a barra (antes exibia "Niterói +18%" fixo no código, com um
 * botão "Aplicar" sem ação).
 */
export function InsightBar({ insight }: { insight: InsightBairro }) {
  return (
    <div
      className="mt-4 rounded-lg flex items-center gap-3.5 p-4"
      style={{ background: 'var(--brick-lt)', border: '1px solid var(--brick)' }}
    >
      <div
        className="w-11 h-11 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
      >
        <TrendingUp className="w-5 h-5" strokeWidth={2} />
      </div>
      <div className="flex-1">
        <div className="text-sm font-bold">
          Pedidos em alta no bairro{' '}
          <em
            className="not-italic px-1.5 rounded"
            style={{ background: 'var(--brick)' }}
          >
            {insight.bairro}
          </em>{' '}
          — <span className="text-ink">+{insight.delta}% esta semana</span> (
          {insight.pedidos} pedido{insight.pedidos === 1 ? '' : 's'}).
        </div>
        <div className="text-xs text-ink-2 mt-1">
          Sugestão: destaque seus produtos mais vendidos para essa região.
        </div>
      </div>
      <Link
        href="/relatorios"
        className="px-4 py-2 rounded-full font-semibold text-xs whitespace-nowrap"
        style={{ background: 'var(--ink)', color: 'var(--bg)' }}
      >
        Ver relatórios
      </Link>
    </div>
  )
}
