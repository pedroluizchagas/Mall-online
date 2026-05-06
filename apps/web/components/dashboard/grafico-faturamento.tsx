'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatarReais } from '@mallora/lib'

interface Props {
  dados: { data: string; bruto: number; liquido: number }[]
}

export function GraficoFaturamento({ dados }: Props) {
  if (dados.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-ink-3 text-sm">
        Nenhum dado disponível ainda.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis dataKey="data" tick={{ fontSize: 11, fill: 'var(--ink-3)' }} />
        <YAxis
          tickFormatter={(v) => `R$${(v / 100).toFixed(0)}`}
          tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
        />
        <Tooltip
          formatter={(value: number) => [formatarReais(value), '']}
          labelStyle={{ color: 'var(--ink)' }}
          contentStyle={{
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            borderRadius: 8,
          }}
        />
        <Line
          type="monotone"
          dataKey="bruto"
          name="Bruto"
          stroke="var(--ink-3)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="liquido"
          name="Líquido"
          stroke="var(--brick)"
          strokeWidth={2.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
