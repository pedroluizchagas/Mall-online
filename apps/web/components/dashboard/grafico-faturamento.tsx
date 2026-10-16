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
import { formatarReais } from '@mallevo/lib'

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
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis
          dataKey="data"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
          dy={6}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(v) => `R$ ${(v / 100).toFixed(0)}`}
          tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
        />
        {/* Tooltip na cápsula escura da casa; líquido em tinta, bruto em grafite tracejado. */}
        <Tooltip
          formatter={(value: number, nome: string) => [formatarReais(value), nome]}
          cursor={{ stroke: 'var(--line-2)' }}
          labelStyle={{ color: 'rgba(255,255,255,0.66)', fontSize: 11, fontWeight: 700, marginBottom: 4 }}
          itemStyle={{ color: '#fff', fontSize: 12.5, fontWeight: 600, padding: 0 }}
          contentStyle={{
            background: 'rgba(17, 18, 22, 0.94)',
            border: 'none',
            borderRadius: 14,
            padding: '10px 12px',
            boxShadow: 'var(--shadow-lg)',
          }}
        />
        <Line
          type="monotone"
          dataKey="bruto"
          name="Bruto"
          stroke="var(--ink-4)"
          strokeWidth={1.75}
          strokeDasharray="4 4"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="liquido"
          name="Líquido"
          stroke="var(--ink)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: 'var(--brick)', stroke: 'var(--ink)', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
