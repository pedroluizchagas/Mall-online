import Link from 'next/link'
import type { InsightBairro } from '@/lib/actions/home'
import { PartnerIcon } from '@/components/ui/partner-icon'

/**
 * Insight de bairro em alta — dados REAIS de getInsightBairro (últimos 7
 * dias vs 7 anteriores). Sem dados suficientes, o Início não renderiza.
 * O bairro é a linha acesa: marca-texto, porque lima não é tinta no claro.
 */
export function InsightBar({ insight }: { insight: InsightBairro }) {
  return (
    <div className="cartao flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-marquee text-[color:var(--brick)]">
        <PartnerIcon name="trend" size={20} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-snug text-ink">
          Pedidos em alta no <span className="marca-texto">{insight.bairro}</span>: +{insight.delta}% esta semana (
          {insight.pedidos} pedido{insight.pedidos === 1 ? '' : 's'}).
        </p>
        <p className="mt-1 text-[13px] text-ink-3">
          Sugestão: destaque seus produtos mais vendidos para essa região.
        </p>
      </div>
      <Link
        href="/relatorios"
        className="inline-flex h-10 shrink-0 items-center gap-1.5 self-start rounded-full bg-ink px-4 text-[13px] font-bold text-bg transition-opacity hover:opacity-90 sm:self-auto"
      >
        Ver relatórios
        <PartnerIcon name="chevron-right" size={14} strokeWidth={2.4} />
      </Link>
    </div>
  )
}
