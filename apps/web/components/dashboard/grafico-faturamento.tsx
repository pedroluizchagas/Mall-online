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
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        Nenhum dado disponível ainda.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="data"
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
        />
        <YAxis
          tickFormatter={(v) => `R$${(v / 100).toFixed(0)}`}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
        />
        <Tooltip
          formatter={(value: number) => [formatarReais(value), '']}
          labelStyle={{ color: '#374151' }}
        />
        <Line
          type="monotone"
          dataKey="bruto"
          name="Bruto"
          stroke="#4CAF82"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="liquido"
          name="Líquido"
          stroke="#1A4D3A"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
