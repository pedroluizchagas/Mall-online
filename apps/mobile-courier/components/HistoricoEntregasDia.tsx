import { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { formatarReais } from '@mallevo/lib'
import { CourierIcon } from '@/components/CourierIcon'
import { courierDesign } from '@/lib/courier-design'

export function HistoricoEntregasDia() {
  const { courier } = useAuthStore()
  const [resumo, setResumo] = useState({
    total: 0,
    ganhos: 0,
    entregues: 0,
  })
  const { colors } = courierDesign

  useEffect(() => {
    if (!courier?.id) return

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    supabase
      .from('delivery_assignments')
      .select('valor_entrega, status')
      .eq('courier_id', courier.id)
      .gte('criado_em', hoje.toISOString())
      .then(({ data }) => {
        if (!data) return
        const entregues = data.filter((d) => d.status === 'entregue')
        setResumo({
          total: data.length,
          entregues: entregues.length,
          ganhos: entregues.reduce((acc, d) => acc + d.valor_entrega, 0),
        })
      })
  }, [courier?.id])

  if (resumo.total === 0) return null

  return (
    <View
      className="w-full rounded-[28px] p-4 mb-4"
      style={{ backgroundColor: colors.surface }}
    >
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-xs font-semibold uppercase" style={{ color: colors.inkSoft }}>
            Hoje
          </Text>
          <Text className="text-lg font-bold mt-1" style={{ color: colors.ink }}>
            Resumo do turno
          </Text>
        </View>
        <View
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.accentSoft }}
        >
          <CourierIcon name="trend" color={colors.ink} size={18} />
        </View>
      </View>

      <View className="flex-row justify-between">
        <Metric value={String(resumo.entregues)} label="Entregues" />
        <Metric value={String(resumo.total)} label="Total" />
        <View className="items-center flex-1">
          <Text className="text-xl font-bold" style={{ color: colors.ink }}>
            {formatarReais(resumo.ganhos)}
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: colors.inkSoft }}>
            Ganhos
          </Text>
        </View>
      </View>
    </View>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  const { colors } = courierDesign

  return (
    <View className="items-center flex-1">
      <Text className="text-xl font-bold" style={{ color: colors.ink }}>
        {value}
      </Text>
      <Text className="text-xs mt-0.5" style={{ color: colors.inkSoft }}>
        {label}
      </Text>
    </View>
  )
}
