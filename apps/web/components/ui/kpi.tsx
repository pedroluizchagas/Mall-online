import { PartnerIcon, type PartnerIconName } from './partner-icon'
import { Sparkline } from './sparkline'

interface Props {
  label: string
  value: string
  prefix?: string
  suffix?: string
  delta?: number
  spark?: number[]
  /** Ícone da casa. */
  icon?: PartnerIconName
}

/**
 * Placa de número na folha: micro em caixa alta, a moeda monocromática do
 * ícone, o valor grande em Jakarta com algarismos tabulares. Sem tijolo
 * colorido por tipo — o rótulo diz o que é.
 */
export function KPI({ label, value, prefix, suffix, delta, spark, icon }: Props) {
  return (
    <div className="cartao flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="micro pt-1 text-ink-3">{label}</p>
        {icon && (
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-2 text-ink"
          >
            <PartnerIcon name={icon} size={16} strokeWidth={1.9} />
          </span>
        )}
      </div>

      <p className="mt-3 flex items-baseline gap-1.5">
        {prefix && <span className="text-[16px] font-semibold text-ink-3">{prefix}</span>}
        <span className="text-[32px] font-bold leading-none tracking-[-0.035em] text-ink tabular-nums">{value}</span>
        {suffix && <span className="text-[13px] font-semibold text-ink-3">{suffix}</span>}
      </p>

      {delta !== undefined && (
        <p className="mt-3 flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11.5px] font-bold"
            style={{
              color: delta >= 0 ? 'var(--ok)' : 'var(--err)',
              background: delta >= 0 ? 'var(--ok-lt)' : 'var(--err-lt)',
            }}
          >
            <PartnerIcon name={delta >= 0 ? 'chevron-up' : 'chevron-down'} size={12} strokeWidth={2.6} />
            {Math.abs(delta)}%
          </span>
          <span className="text-[12px] text-ink-3">do mês passado</span>
        </p>
      )}

      {spark && (
        <div className="mt-auto pt-4">
          <Sparkline data={spark} height={30} />
        </div>
      )}
    </div>
  )
}
