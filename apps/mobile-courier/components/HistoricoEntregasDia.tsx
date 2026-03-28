import { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { formatarReais } from '@mallora/lib'

export function HistoricoEntregasDia() {
  const { courier } = useAuthStore()
  const [resumo, setResumo] = useState({
    total: 0,
    ganhos: 0,
    entregues: 0,
  })

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
    <View className="w-full bg-white rounded-2xl p-4 mb-2">
      <Text className="text-xs font-semibold text-gray-500 uppercase mb-3">Hoje</Text>
      <View className="flex-row justify-between">
        <View className="items-center">
          <Text className="text-xl font-bold text-[#1A4D3A]">{resumo.entregues}</Text>
          <Text className="text-xs text-gray-400 mt-0.5">Entregues</Text>
        </View>
        <View className="items-center">
          <Text className="text-xl font-bold text-[#1A4D3A]">{resumo.total}</Text>
          <Text className="text-xs text-gray-400 mt-0.5">Total</Text>
        </View>
        <View className="items-center">
          <Text className="text-xl font-bold text-[#4CAF82]">
            {formatarReais(resumo.ganhos)}
          </Text>
          <Text className="text-xs text-gray-400 mt-0.5">Ganhos</Text>
        </View>
      </View>
    </View>
  )
}
