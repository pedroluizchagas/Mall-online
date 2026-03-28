import { View, Text, Image, TouchableOpacity } from 'react-native'
import { formatarReais } from '@mallora/lib'

interface Props {
  loja: {
    id: string
    nome: string
    logo_url: string | null
    taxa_entrega: number
    tempo_entrega: number | null
    categories?: { nome: string } | null
  }
  onPress: () => void
}

export function LojaCard({ loja, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-2xl overflow-hidden"
      activeOpacity={0.85}
    >
      {/* Imagem de capa */}
      <View className="h-36 bg-gray-100">
        {loja.logo_url ? (
          <Image
            source={{ uri: loja.logo_url }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-4xl text-gray-200">?</Text>
          </View>
        )}
      </View>

      {/* Informações */}
      <View className="p-4">
        <Text className="text-base font-bold text-gray-800" numberOfLines={1}>
          {loja.nome}
        </Text>

        {loja.categories?.nome && (
          <Text className="text-sm text-gray-400 mt-0.5">
            {loja.categories.nome}
          </Text>
        )}

        <View className="flex-row items-center gap-3 mt-2">
          {loja.tempo_entrega && (
            <Text className="text-xs text-gray-500">
              {loja.tempo_entrega} min
            </Text>
          )}
          <Text className="text-xs text-gray-300">·</Text>
          <Text className="text-xs text-gray-500">
            {loja.taxa_entrega === 0
              ? 'Frete grátis'
              : `Frete ${formatarReais(loja.taxa_entrega)}`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}
