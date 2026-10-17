import type { ReactNode } from 'react'
import { PartnerIcon } from '@/components/ui/partner-icon'

/**
 * Número da folha: micro em caixa alta, o valor grande em Jakarta com
 * algarismos tabulares e, se houver, a comparação real com o mesmo trecho do
 * mês anterior. `destaque` = o número que importa ganha a marquise (zinco,
 * neon e o valor aceso), como o líquido no Financeiro do painel web.
 */
export function KPI({
  rotulo,
  valor,
  sub,
  delta,
  destaque = false,
}: {
  rotulo: string
  valor: ReactNode
  sub?: ReactNode
  delta?: { pct: number; contexto: string } | null
  destaque?: boolean
}) {
  if (destaque) {
    return (
      <div className="sobre-escuro grao relative isolate flex flex-col overflow-hidden rounded-[20px] bg-marquee p-5 text-white">
        <div aria-hidden className="glow-marquise absolute inset-0 -z-10" />
        <p className="micro text-[color:var(--m-ink-3)]">{rotulo}</p>
        <p className="mt-3 truncate text-[28px] font-bold leading-none tracking-[-0.035em] text-[color:var(--brick)] tabular-nums">
          {valor}
        </p>
        {delta && <Delta {...delta} escuro />}
        {sub && <p className="mt-auto pt-3 text-[12.5px] text-[color:var(--m-ink-2)]">{sub}</p>}
      </div>
    )
  }
  return (
    <div className="cartao flex flex-col p-5">
      <p className="micro text-ink-3">{rotulo}</p>
      <p className="mt-3 truncate text-[28px] font-bold leading-none tracking-[-0.035em] text-ink tabular-nums">{valor}</p>
      {delta && <Delta {...delta} />}
      {sub && <p className="mt-auto pt-3 text-[12.5px] text-ink-3">{sub}</p>}
    </div>
  )
}

function Delta({ pct, contexto, escuro = false }: { pct: number; contexto: string; escuro?: boolean }) {
  const subiu = pct >= 0
  const cor = escuro ? (subiu ? 'var(--ok-vivo)' : 'var(--err-vivo)') : subiu ? 'var(--ok)' : 'var(--err)'
  const fundo = escuro ? 'var(--m-glass-2)' : subiu ? 'var(--ok-lt)' : 'var(--err-lt)'
  return (
    <p className="mt-3 flex flex-wrap items-center gap-1.5">
      <span
        className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11.5px] font-bold tabular-nums"
        style={{ color: cor, background: fundo }}
      >
        <PartnerIcon name={subiu ? 'chevron-up' : 'chevron-down'} size={12} strokeWidth={2.6} />
        <span className="sr-only">{subiu ? 'alta de' : 'queda de'} </span>
        {Math.abs(pct)}%
      </span>
      <span className={escuro ? 'text-[12px] text-[color:var(--m-ink-2)]' : 'text-[12px] text-ink-3'}>{contexto}</span>
    </p>
  )
}
