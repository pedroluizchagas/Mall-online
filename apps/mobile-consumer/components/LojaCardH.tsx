import { View, Text, Image, TouchableOpacity, Dimensions } from 'react-native'
import { formatarReais } from '@mallevo/lib'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { Badge } from '@/components/ui/Badge'
import { consumerDesign } from '@/lib/consumer-design'

const { colors, radius, shadow } = consumerDesign

const { width } = Dimensions.get('window')
const CARD_WIDTH = Math.round(width * 0.62)

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
  const inicial = loja.nome.charAt(0).toUpperCase()
  const freteGratis = loja.taxa_entrega === 0

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={consumerDesign.opacity.pressed}
      style={[
        {
          width: CARD_WIDTH,
          borderRadius: radius.lg,
          overflow: 'hidden',
          backgroundColor: colors.surface,
          flexShrink: 0,
        },
        shadow.soft,
      ]}
    >
      {/* Imagem */}
      <View style={{ height: 132, position: 'relative', overflow: 'hidden' }}>
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
              backgroundColor: colors.surfaceDark,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                position: 'absolute',
                right: -16,
                top: -16,
                width: 90,
                height: 90,
                borderRadius: 45,
                backgroundColor: colors.accentSoft,
              }}
            />
            <Text
              style={{
                color: colors.accent,
                fontSize: 64,
                fontWeight: '800',
                letterSpacing: -2,
                opacity: 0.85,
              }}
            >
              {inicial}
            </Text>
          </View>
        )}

        {/* Badge de loja */}
        {loja.badge && (
          <View style={{ position: 'absolute', top: 10, left: 10 }}>
            <Badge rotulo={loja.badge} cor={colors.ink} preenchido tamanho="sm" />
          </View>
        )}

        {/* Badge frete grátis */}
        {freteGratis && (
          <View style={{ position: 'absolute', top: 10, right: 10 }}>
            <Badge rotulo="Grátis" cor={colors.success} preenchido tamanho="sm" />
          </View>
        )}
      </View>

      {/* Informações */}
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Text
          style={{
            fontSize: 14.5,
            fontWeight: '700',
            color: colors.ink,
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
            borderTopColor: colors.line,
          }}
        >
          {loja.tempo_entrega !== null && (
            <>
              <ConsumerIcon name="clock" size={12} color={colors.inkSoft} />
              <Text style={{ fontSize: 12, color: colors.inkMuted, fontWeight: '500' }}>
                {loja.tempo_entrega} min
              </Text>
              <Text style={{ color: colors.inkSoft, fontSize: 12 }}>·</Text>
            </>
          )}

          <ConsumerIcon
            name="truck"
            size={12}
            color={freteGratis ? colors.success : colors.inkSoft}
          />
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: freteGratis ? colors.success : colors.inkMuted,
            }}
          >
            {freteGratis ? 'Frete grátis' : formatarReais(loja.taxa_entrega)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}
