import { View, Text, Image, TouchableOpacity } from 'react-native'
import { formatarReais } from '@mallevo/lib'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { Badge } from '@/components/ui/Badge'
import { consumerDesign } from '@/lib/consumer-design'

const { colors, radius, shadow } = consumerDesign

interface Props {
  loja: {
    id: string
    nome: string
    logo_url: string | null
    taxa_entrega: number
    tempo_entrega: number | null
    categories?: { nome: string } | null
    badge?: string
  }
  onPress: () => void
}

export function LojaCard({ loja, onPress }: Props) {
  const inicial = loja.nome.charAt(0).toUpperCase()
  const freteGratis = loja.taxa_entrega === 0

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={consumerDesign.opacity.pressed}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          overflow: 'hidden',
        },
        shadow.soft,
      ]}
    >
      {/* Imagem de capa */}
      <View style={{ height: 176, backgroundColor: colors.surfaceDark, position: 'relative' }}>
        {loja.logo_url ? (
          <Image
            source={{ uri: loja.logo_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <View
              style={{
                position: 'absolute',
                right: -24,
                top: -24,
                width: 110,
                height: 110,
                borderRadius: 55,
                backgroundColor: colors.accentSoft,
              }}
            />
            <Text
              style={{
                color: colors.accent,
                fontSize: 80,
                fontWeight: '800',
                letterSpacing: -3,
                opacity: 0.85,
              }}
            >
              {inicial}
            </Text>
          </View>
        )}

        {/* Badge de categoria/loja */}
        {(loja.badge || loja.categories?.nome) && (
          <View style={{ position: 'absolute', top: 12, left: 12 }}>
            <Badge
              rotulo={loja.badge ?? loja.categories!.nome}
              cor={colors.ink}
              preenchido
              tamanho="sm"
            />
          </View>
        )}

        {/* Badge frete grátis */}
        {freteGratis && (
          <View style={{ position: 'absolute', top: 12, right: 12 }}>
            <Badge rotulo="Grátis" cor={colors.success} preenchido tamanho="sm" />
          </View>
        )}
      </View>

      {/* Informações */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
        <Text
          style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}
          numberOfLines={1}
        >
          {loja.nome}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          {loja.tempo_entrega !== null && (
            <>
              <ConsumerIcon name="clock" size={13} color={colors.inkSoft} />
              <Text style={{ fontSize: 13, color: colors.inkMuted, fontWeight: '500' }}>
                {loja.tempo_entrega} min
              </Text>
              <Text style={{ fontSize: 13, color: colors.inkSoft }}>·</Text>
            </>
          )}

          <ConsumerIcon
            name="truck"
            size={13}
            color={freteGratis ? colors.success : colors.inkSoft}
          />
          <Text
            style={{
              fontSize: 13,
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
