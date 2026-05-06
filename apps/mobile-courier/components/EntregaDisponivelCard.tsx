import { View, Text, TouchableOpacity } from 'react-native'
import { formatarReais } from '@mallora/lib'
import { CourierIcon } from '@/components/CourierIcon'
import { courierDesign } from '@/lib/courier-design'
import { RotaIlustrada } from '@/components/RotaIlustrada'

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
      style={{
        backgroundColor: colors.surfaceDark,
        borderRadius: 28,
        padding: 16,
        marginBottom: 12,
      }}
    >
      {/* Header — preço + prioridade */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          paddingHorizontal: 4,
          paddingTop: 4,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 0.7,
              textTransform: 'uppercase',
              color: '#A4A7AD',
              marginBottom: 4,
            }}
          >
            Oferta de entrega
          </Text>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '800',
              color: '#FFFFFF',
              letterSpacing: -0.5,
            }}
          >
            {formatarReais(entrega.valor_entrega)}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: colors.accent,
          }}
        >
          <CourierIcon name="spark" size={13} color={colors.ink} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, letterSpacing: 0.2 }}>
            Prioritária
          </Text>
        </View>
      </View>

      {/* Painel do mapa + endereços */}
      <View
        style={{
          backgroundColor: colors.surfaceDarkSoft,
          borderRadius: 22,
          marginBottom: 14,
          overflow: 'hidden',
          position: 'relative',
          minHeight: 152,
        }}
      >
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '60%' }}
        >
          <RotaIlustrada />
        </View>

        <View style={{ padding: 16, paddingRight: 96 }}>
          {/* Coletar em */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.08)',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2,
              }}
            >
              <CourierIcon name="store" size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  color: '#7C7F86',
                }}
              >
                Coletar em
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#FFFFFF',
                  marginTop: 3,
                }}
                numberOfLines={1}
              >
                {entrega.store_nome}
              </Text>
              <Text
                style={{ fontSize: 11.5, color: '#A4A7AD', marginTop: 2 }}
                numberOfLines={1}
              >
                {entrega.store_endereco}
              </Text>
            </View>
          </View>

          {/* Conector vertical */}
          <View
            style={{
              marginLeft: 17,
              marginVertical: 8,
              width: 2,
              height: 18,
              borderRadius: 1,
              backgroundColor: 'rgba(255,255,255,0.10)',
            }}
          />

          {/* Entregar em */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2,
              }}
            >
              <CourierIcon name="pin" size={16} color={colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  color: '#7C7F86',
                }}
              >
                Entregar em
              </Text>
              <Text
                style={{ fontSize: 12.5, color: '#D5D7DB', marginTop: 3, lineHeight: 17 }}
                numberOfLines={2}
              >
                {entrega.consumer_endereco}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Ações */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          onPress={onRecusar}
          activeOpacity={0.75}
          style={{
            flex: 1,
            paddingVertical: 13,
            borderRadius: 999,
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#A4A7AD' }}>Recusar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onAceitar}
          activeOpacity={0.85}
          style={{
            flex: 1.4,
            paddingVertical: 13,
            paddingHorizontal: 20,
            borderRadius: 999,
            alignItems: 'center',
            backgroundColor: colors.accent,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.ink, letterSpacing: 0.2 }}>
            Aceitar entrega
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
