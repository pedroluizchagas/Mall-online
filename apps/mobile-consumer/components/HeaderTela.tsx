import { ReactNode } from 'react'
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'

/**
 * Header reutilizável com 3 variantes:
 * - 'principal': pin/avatar + saudação + ação à direita (home, perfil)
 * - 'voltar': botão back + título centralizado (loja, checkout, pedido detail)
 * - 'simples': título grande, sem voltar (pedidos, buscar)
 *
 * Spec: docs/system-design/consumer/05-shell-app.md §2
 */

const { colors, radius } = consumerDesign

type HeaderFundo = 'canvas' | 'surface' | 'transparente'

type HeaderTelaProps =
  | {
      variante: 'principal'
      rotuloLocalizacao?: string
      textoLocalizacao?: string
      aoTocarLocalizacao?: () => void
      acaoDireita?: ReactNode
      fundo?: HeaderFundo
    }
  | {
      variante: 'voltar'
      titulo: string
      aoVoltar?: () => void
      acaoDireita?: ReactNode
      fundo?: HeaderFundo
    }
  | {
      variante: 'simples'
      titulo: string
      acaoDireita?: ReactNode
      fundo?: HeaderFundo
    }

export function HeaderTela(props: HeaderTelaProps) {
  const insets = useSafeAreaInsets()
  const fundo = props.fundo ?? 'canvas'
  const corFundo: ViewStyle['backgroundColor'] =
    fundo === 'transparente'
      ? 'transparent'
      : fundo === 'surface'
      ? colors.surface
      : colors.canvas

  return (
    <View
      style={{
        paddingTop: insets.top + 6,
        paddingHorizontal: 24,
        paddingBottom: 12,
        backgroundColor: corFundo,
      }}
    >
      {props.variante === 'principal' && <HeaderPrincipal {...props} />}
      {props.variante === 'voltar' && <HeaderVoltar {...props} />}
      {props.variante === 'simples' && <HeaderSimples {...props} />}
    </View>
  )
}

function HeaderPrincipal({
  rotuloLocalizacao = 'Entregar em',
  textoLocalizacao = '—',
  aoTocarLocalizacao,
  acaoDireita,
}: Extract<HeaderTelaProps, { variante: 'principal' }>) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <TouchableOpacity
        onPress={aoTocarLocalizacao}
        disabled={!aoTocarLocalizacao}
        activeOpacity={consumerDesign.opacity.pressedSoft}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.sm,
            backgroundColor: colors.ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ConsumerIcon name="pin" size={18} color={colors.accent} />
        </View>
        <View>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: colors.inkSoft,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 2,
            }}
          >
            {rotuloLocalizacao}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '800',
                color: colors.ink,
                letterSpacing: -0.3,
              }}
            >
              {textoLocalizacao}
            </Text>
            {aoTocarLocalizacao && (
              <ConsumerIcon
                name="chevron-down"
                size={14}
                color={colors.inkMuted}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {acaoDireita}
    </View>
  )
}

function HeaderVoltar({
  titulo,
  aoVoltar,
  acaoDireita,
}: Extract<HeaderTelaProps, { variante: 'voltar' }>) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <TouchableOpacity
        onPress={aoVoltar ?? (() => router.back())}
        activeOpacity={0.7}
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.sm,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ConsumerIcon name="back" size={18} color={colors.ink} strokeWidth={2.1} />
      </TouchableOpacity>
      <Text
        style={{
          fontSize: 17,
          fontWeight: '800',
          color: colors.ink,
          flex: 1,
          textAlign: 'center',
          // Compensa a largura do botão de voltar (40) para o título ficar
          // visualmente centralizado quando não há ação à direita.
          marginRight: acaoDireita ? 0 : 40,
        }}
        numberOfLines={1}
      >
        {titulo}
      </Text>
      {acaoDireita}
    </View>
  )
}

function HeaderSimples({
  titulo,
  acaoDireita,
}: Extract<HeaderTelaProps, { variante: 'simples' }>) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: '800',
          color: colors.ink,
          letterSpacing: -0.5,
        }}
      >
        {titulo}
      </Text>
      {acaoDireita}
    </View>
  )
}
