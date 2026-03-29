import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { formatarReais } from '@mallora/lib'

const LABELS_STATUS: Record<string, string> = {
  pendente: 'Pendente',
  aceita: 'Aceita',
  coletada: 'Coletada',
  entregue: 'Entregue',
  cancelada: 'Cancelada',
}

const CORES_STATUS: Record<string, { bg: string; text: string }> = {
  entregue: { bg: '#DCFCE7', text: '#15803D' },
  cancelada: { bg: '#FEE2E2', text: '#DC2626' },
  aceita: { bg: '#DBEAFE', text: '#1D4ED8' },
  coletada: { bg: '#EDE9FE', text: '#7C3AED' },
  pendente: { bg: '#F3F4F6', text: '#6B7280' },
}

interface Entrega {
  id: string
  store_nome: string
  valor_entrega: number
  status: string
  entregue_em: string | null
  criado_em: string
}

export function EntregaHistoricoCard({ entrega }: { entrega: Entrega }) {
  const cor = CORES_STATUS[entrega.status] ?? CORES_STATUS.pendente
  const data = entrega.entregue_em ?? entrega.criado_em

  return (
    <TouchableOpacity
      onPress={() => router.push(`/entrega/${entrega.id}`)}
      activeOpacity={0.75}
      className="bg-white rounded-2xl px-4 py-3 flex-row items-center justify-between border border-gray-50"
    >
      <View className="flex-1 mr-3">
        <Text
          className="text-sm font-semibold text-gray-800"
          numberOfLines={1}
        >
          {entrega.store_nome}
        </Text>
        <Text className="text-xs text-gray-400 mt-0.5">
          {new Date(data).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      <View className="items-end gap-1">
        <Text className="text-sm font-bold text-[#1A4D3A]">
          {formatarReais(entrega.valor_entrega)}
        </Text>
        <View
          className="px-2 py-0.5 rounded-full"
          style={{ backgroundColor: cor.bg }}
        >
          <Text
            className="text-xs font-semibold"
            style={{ color: cor.text }}
          >
            {LABELS_STATUS[entrega.status]}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}
