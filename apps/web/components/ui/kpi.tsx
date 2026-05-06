import { LucideIcon, ArrowUp, ArrowDown } from 'lucide-react'
import { Card } from './card'
import { Sparkline } from './sparkline'

interface Props {
  label: string
  value: string
  prefix?: string
  suffix?: string
  delta?: number
  spark?: number[]
  icon?: LucideIcon
  color?: string
}

export function KPI({ label, value, prefix, suffix, delta, spark, icon: Icon, color = 'var(--brick)' }: Props) {
  return (
    <Card>
      <div className="flex items-start justify-between mb-2.5">
        <div className="text-[13px] text-ink-2 font-medium">{label}</div>
        {Icon && (
          <div className="w-7 h-7 rounded-full bg-bg-2 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-ink-2" strokeWidth={1.75} />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        {prefix && <span className="text-lg font-bold text-ink">{prefix}</span>}
        <span className="font-display text-[34px] leading-none text-ink">{value}</span>
        {suffix && <span className="text-[13px] text-ink-3">{suffix}</span>}
      </div>

      {delta !== undefined && (
        <div className="flex items-center gap-1.5 mt-2.5">
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold"
            style={{
              color: delta >= 0 ? '#2a6e1a' : '#a83820',
              background: delta >= 0 ? '#dff0cc' : '#fbd9cf',
            }}
          >
            {delta >= 0 ? (
              <ArrowUp className="w-2.5 h-2.5" strokeWidth={2.5} />
            ) : (
              <ArrowDown className="w-2.5 h-2.5" strokeWidth={2.5} />
            )}
            {Math.abs(delta)}%
          </span>
          <span className="text-[11px] text-ink-3">do mês passado</span>
        </div>
      )}

      {spark && (
        <div className="mt-3">
          <Sparkline data={spark} color={color} height={32} />
        </div>
      )}
    </Card>
  )
}
