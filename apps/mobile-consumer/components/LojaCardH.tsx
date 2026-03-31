import { View, Text, Image, TouchableOpacity, Dimensions } from 'react-native'
import { Clock, Truck } from 'lucide-react-native'
import { formatarReais } from '@mallora/lib'

const { width } = Dimensions.get('window')
const CARD_WIDTH = Math.round(width * 0.62)

const CORES_PLACEHOLDER = ['#1A4D3A', '#2D6A4F', '#1E3A5F', '#4A1942', '#7C3D0F', '#C75B3A']

function corPorNome(nome: string) {
  const sum = nome.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return CORES_PLACEHOLDER[sum % CORES_PLACEHOLDER.length]
}

interface Props {
  loja: {
    id: string
    nome: string
    slug: string | null
    logo_url: string | null
    taxa_entrega: number
    tempo_entrega: number | null
    badge?: string
  }
  onPress: () => void
}

export function LojaCardH({ loja, onPress }: Props) {
  const cor = corPorNome(loja.nome)
  const inicial = loja.nome.charAt(0).toUpperCase()

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={{
        width: CARD_WIDTH,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        flexShrink: 0,
        shadowColor: '#1C1C19',
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
        borderWidth: 1,
        borderColor: 'rgba(26,26,23,0.06)',
      }}
    >
      {/* Imagem */}
      <View style={{ height: 140, position: 'relative', overflow: 'hidden' }}>
        {loja.logo_url ? (
          <Image
            source={{ uri: loja.logo_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              flex: 1,
              backgroundColor: cor,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {/* Círculo decorativo */}
            <View
              style={{
                position: 'absolute',
                right: -16,
                top: -16,
                width: 90,
                height: 90,
                borderRadius: 45,
                backgroundColor: 'rgba(255,255,255,0.07)',
              }}
            />
            <Text
              style={{
                color: 'rgba(255,255,255,0.16)',
                fontSize: 64,
                fontWeight: '800',
                letterSpacing: -2,
              }}
            >
              {inicial}
            </Text>
          </View>
        )}

        {/* Overlay gradiente */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            backgroundColor: 'transparent',
          }}
          pointerEvents="none"
        />

        {/* Badge */}
        {loja.badge && (
          <View
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 100,
              backgroundColor: 'rgba(0,0,0,0.38)',
            }}
          >
            <Text
              style={{
                color: '#FFF',
                fontSize: 10.5,
                fontWeight: '700',
                letterSpacing: 0.3,
              }}
            >
              {loja.badge}
            </Text>
          </View>
        )}

        {/* Frete grátis badge */}
        {loja.taxa_entrega === 0 && (
          <View
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 100,
              backgroundColor: '#4CAF82',
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 9.5, fontWeight: '700' }}>
              Grátis
            </Text>
          </View>
        )}
      </View>

      {/* Informações */}
      <View style={{ padding: 14, paddingTop: 12 }}>
        <Text
          style={{
            fontSize: 14.5,
            fontWeight: '700',
            color: '#1C1C19',
            marginBottom: 2,
          }}
          numberOfLines={1}
        >
          {loja.nome}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingTop: 8,
            marginTop: 6,
            borderTopWidth: 1,
            borderTopColor: 'rgba(26,26,23,0.07)',
          }}
        >
          {loja.tempo_entrega && (
            <>
              <Clock size={12} color="#8A8A7E" />
              <Text
                style={{ fontSize: 12, color: '#6B6B60', fontWeight: '500' }}
              >
                {loja.tempo_entrega} min
              </Text>
              <Text style={{ color: '#D0D0C5', fontSize: 12 }}>·</Text>
            </>
          )}

          <Truck
            size={12}
            color={loja.taxa_entrega === 0 ? '#287D5C' : '#8A8A7E'}
          />
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: loja.taxa_entrega === 0 ? '#287D5C' : '#6B6B60',
            }}
          >
            {loja.taxa_entrega === 0
              ? 'Frete grátis'
              : formatarReais(loja.taxa_entrega)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}
