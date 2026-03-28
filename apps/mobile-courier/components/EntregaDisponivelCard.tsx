import { View, Text, TouchableOpacity } from 'react-native'
import { formatarReais } from '@mallora/lib'

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
  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
      {/* Valor de destaque */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-2xl font-bold text-[#1A4D3A]">
          {formatarReais(entrega.valor_entrega)}
        </Text>
        <View className="bg-[#4CAF82]/10 px-3 py-1 rounded-full">
          <Text className="text-xs font-semibold text-[#4CAF82]">Nova entrega</Text>
        </View>
      </View>

      {/* Rota visual */}
      <View className="gap-2 mb-4">
        {/* Origem */}
        <View className="flex-row items-start gap-3">
          <View className="w-3 h-3 rounded-full bg-[#1A4D3A] mt-1 flex-shrink-0" />
          <View className="flex-1">
            <Text className="text-xs font-semibold text-gray-500 uppercase">Coletar em</Text>
            <Text className="text-sm font-semibold text-gray-800 mt-0.5">
              {entrega.store_nome}
            </Text>
            <Text className="text-xs text-gray-400" numberOfLines={1}>
              {entrega.store_endereco}
            </Text>
          </View>
        </View>

        {/* Linha conectora */}
        <View className="ml-1.5 w-px h-4 bg-gray-200" />

        {/* Destino */}
        <View className="flex-row items-start gap-3">
          <View className="w-3 h-3 rounded-full bg-[#F5A623] mt-1 flex-shrink-0" />
          <View className="flex-1">
            <Text className="text-xs font-semibold text-gray-500 uppercase">Entregar em</Text>
            <Text className="text-sm text-gray-700 mt-0.5" numberOfLines={2}>
              {entrega.consumer_endereco}
            </Text>
          </View>
        </View>
      </View>

      {/* Ações */}
      <View className="flex-row gap-3">
        <TouchableOpacity
          onPress={onRecusar}
          className="flex-1 border border-gray-200 py-3 rounded-xl items-center"
          activeOpacity={0.7}
        >
          <Text className="text-gray-500 text-sm font-medium">Recusar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onAceitar}
          className="flex-2 bg-[#1A4D3A] py-3 px-6 rounded-xl items-center"
          style={{ flex: 2 }}
          activeOpacity={0.85}
        >
          <Text className="text-white text-sm font-bold">Aceitar entrega</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
