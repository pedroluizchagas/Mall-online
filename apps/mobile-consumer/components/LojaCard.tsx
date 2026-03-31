import { View, Text, Image, TouchableOpacity } from 'react-native'
import { Clock, Truck } from 'lucide-react-native'
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

const CORES_PLACEHOLDER = ['#1A4D3A', '#2D6A4F', '#1E3A5F', '#4A1942', '#7C3D0F']

function corPorNome(nome: string) {
  const sum = nome.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return CORES_PLACEHOLDER[sum % CORES_PLACEHOLDER.length]
}

export function LojaCard({ loja, onPress }: Props) {
  const cor = corPorNome(loja.nome)
  const inicial = loja.nome.charAt(0).toUpperCase()

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-2xl overflow-hidden"
      activeOpacity={0.88}
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.07,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }}
    >
      {/* Imagem de capa */}
      <View className="h-44 bg-gray-100">
        {loja.logo_url ? (
          <Image
            source={{ uri: loja.logo_url }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center" style={{ backgroundColor: cor }}>
            {/* Círculo decorativo de fundo */}
            <View
              style={{
                position: 'absolute',
                right: -20,
                top: -20,
                width: 110,
                height: 110,
                borderRadius: 55,
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: -10,
                bottom: -30,
                width: 90,
                height: 90,
                borderRadius: 45,
                backgroundColor: 'rgba(255,255,255,0.04)',
              }}
            />
            <Text
              style={{
                color: 'rgba(255,255,255,0.18)',
                fontSize: 80,
                fontWeight: '800',
                letterSpacing: -3,
              }}
            >
              {inicial}
            </Text>
          </View>
        )}

        {/* Badge de categoria */}
        {loja.categories?.nome && (
          <View
            className="absolute top-3 left-3 rounded-full px-3 py-1"
            style={{ backgroundColor: 'rgba(0,0,0,0.38)' }}
          >
            <Text className="text-white text-xs font-medium">
              {loja.categories.nome}
            </Text>
          </View>
        )}

        {/* Badge frete grátis */}
        {loja.taxa_entrega === 0 && (
          <View
            className="absolute top-3 right-3 rounded-full px-3 py-1"
            style={{ backgroundColor: '#4CAF82' }}
          >
            <Text className="text-white text-xs font-semibold">
              Frete grátis
            </Text>
          </View>
        )}
      </View>

      {/* Informações */}
      <View className="px-4 py-3.5">
        <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
          {loja.nome}
        </Text>

        <View className="flex-row items-center gap-3 mt-2.5">
          {loja.tempo_entrega && (
            <View className="flex-row items-center gap-1.5">
              <Clock size={13} color="#9CA3AF" />
              <Text className="text-xs text-gray-500 font-medium">
                {loja.tempo_entrega} min
              </Text>
            </View>
          )}

          {loja.tempo_entrega && (
            <View className="w-px h-3 bg-gray-200" />
          )}

          <View className="flex-row items-center gap-1.5">
            <Truck
              size={13}
              color={loja.taxa_entrega === 0 ? '#4CAF82' : '#9CA3AF'}
            />
            <Text
              className={`text-xs font-medium ${
                loja.taxa_entrega === 0 ? 'text-verde-medio' : 'text-gray-500'
              }`}
            >
              {loja.taxa_entrega === 0
                ? 'Frete grátis'
                : `Frete ${formatarReais(loja.taxa_entrega)}`}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}
