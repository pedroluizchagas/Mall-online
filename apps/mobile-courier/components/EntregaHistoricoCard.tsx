import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { formatarReais } from '@mallora/lib'
import { CourierIcon } from '@/components/CourierIcon'
import { courierDesign, formatarMomentoCurto } from '@/lib/courier-design'

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
  const { colors } = courierDesign

  return (
    <TouchableOpacity
      onPress={() => router.push(`/entrega/${entrega.id}`)}
      activeOpacity={0.75}
      className="rounded-[24px] px-4 py-4 flex-row items-center justify-between"
      style={{ backgroundColor: colors.surface }}
    >
      <View className="flex-row items-center gap-3 flex-1 mr-3">
        <View
          className="w-11 h-11 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.canvas }}
        >
          <CourierIcon name="package" size={18} color={colors.ink} />
        </View>
        <View className="flex-1">
          <Text
            className="text-sm font-semibold"
            style={{ color: colors.ink }}
            numberOfLines={1}
          >
            {entrega.store_nome}
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: colors.inkSoft }}>
            {formatarMomentoCurto(data)}
          </Text>
        </View>
      </View>

      <View className="items-end gap-1">
        <Text className="text-sm font-bold" style={{ color: colors.ink }}>
          {formatarReais(entrega.valor_entrega)}
        </Text>
        <View
          className="px-2 py-1 rounded-full"
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
