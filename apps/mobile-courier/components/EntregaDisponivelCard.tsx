import { View, Text, TouchableOpacity } from 'react-native'
import { formatarReais } from '@mallora/lib'
import { CourierIcon } from '@/components/CourierIcon'
import { courierDesign } from '@/lib/courier-design'

interface Props {
  entrega: {
    id: string
    store_nome: string
    store_endereco: string
    consumer_endereco: string
    valor_entrega: number
  }
  onAceitar: () => void
  onRecusar: () => void
}

export function EntregaDisponivelCard({ entrega, onAceitar, onRecusar }: Props) {
  const { colors } = courierDesign

  return (
    <View
      className="rounded-[28px] p-4 mb-3"
      style={{ backgroundColor: colors.surface }}
    >
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-xs font-semibold uppercase mb-1" style={{ color: colors.inkSoft }}>
            Oferta de entrega
          </Text>
          <Text className="text-2xl font-bold" style={{ color: colors.ink }}>
            {formatarReais(entrega.valor_entrega)}
          </Text>
        </View>
        <View
          className="px-3 py-2 rounded-full flex-row items-center gap-2"
          style={{ backgroundColor: colors.accentSoft }}
        >
          <CourierIcon name="spark" size={14} color={colors.ink} />
          <Text className="text-xs font-semibold" style={{ color: colors.ink }}>
            Prioritaria
          </Text>
        </View>
      </View>

      <View
        className="rounded-[22px] p-4 mb-4"
        style={{ backgroundColor: colors.canvas }}
      >
        <View className="flex-row items-start gap-3">
          <View
            className="w-10 h-10 rounded-full items-center justify-center mt-0.5"
            style={{ backgroundColor: colors.surface }}
          >
            <CourierIcon name="store" size={18} color={colors.ink} />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-semibold uppercase" style={{ color: colors.inkSoft }}>
              Coletar em
            </Text>
            <Text className="text-sm font-semibold mt-1" style={{ color: colors.ink }}>
              {entrega.store_nome}
            </Text>
            <Text className="text-xs mt-1" style={{ color: colors.inkMuted }} numberOfLines={1}>
              {entrega.store_endereco}
            </Text>
          </View>
        </View>

        <View className="ml-5 my-3 w-px h-6" style={{ backgroundColor: colors.line }} />

        <View className="flex-row items-start gap-3">
          <View
            className="w-10 h-10 rounded-full items-center justify-center mt-0.5"
            style={{ backgroundColor: colors.surface }}
          >
            <CourierIcon name="pin" size={18} color={colors.ink} />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-semibold uppercase" style={{ color: colors.inkSoft }}>
              Entregar em
            </Text>
            <Text className="text-sm mt-1" style={{ color: colors.inkMuted }} numberOfLines={2}>
              {entrega.consumer_endereco}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row gap-3">
        <TouchableOpacity
          onPress={onRecusar}
          className="flex-1 py-3 rounded-full items-center"
          style={{ backgroundColor: colors.surfaceMuted }}
          activeOpacity={0.75}
        >
          <Text className="text-sm font-semibold" style={{ color: colors.inkMuted }}>
            Recusar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onAceitar}
          className="py-3 px-6 rounded-full items-center"
          style={{ backgroundColor: colors.ink, flex: 1.4 }}
          activeOpacity={0.85}
        >
          <Text className="text-sm font-bold" style={{ color: colors.accent }}>
            Aceitar entrega
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
