import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useFontesMarquee } from '@/components/marquise/Marquise'
import { partnerDesign } from '@/lib/partner-design'

/**
 * Seção da FOLHA clara — o letreiro de corredor da home aplicado a qualquer
 * tela: sobrelinha em micro caps `inkSoft` + título na fonte-assinatura
 * (`useFontesMarquee().letreiro`, 21), conteúdo no gutter de 16.
 *
 * Usada por Início, Pedidos, Menu, Conteúdo e o detalhe do pedido (e, via Basicos, pelos módulos de gestão). Se uma tela
 * precisa de um letreiro, é este — não redesenhar o rótulo em cada tela.
 */

const { colors, radius, shadow } = partnerDesign

export function SecaoFolha({
  sobrelinha,
  titulo,
  direita,
  children,
}: {
  sobrelinha: string
  titulo: string
  /** Nó à direita do letreiro (contagem, link) — alinhado à base do título. */
  direita?: ReactNode
  children: ReactNode
}) {
  const fontes = useFontesMarquee()
  return (
    <View style={{ gap: 14 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          paddingHorizontal: 24,
          gap: 12,
        }}
      >
        <View style={{ flexShrink: 1 }}>
          <Text
            style={{
              fontSize: 10.5,
              fontWeight: '700',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: colors.inkSoft,
              marginBottom: 3,
            }}
            numberOfLines={1}
          >
            {sobrelinha}
          </Text>
          <Text
            style={[fontes.letreiro, { fontSize: 21, color: colors.ink, letterSpacing: -0.4 }]}
            numberOfLines={1}
          >
            {titulo}
          </Text>
        </View>
        {direita ? <View style={{ paddingBottom: 4 }}>{direita}</View> : null}
      </View>
      <View style={{ paddingHorizontal: 16 }}>{children}</View>
    </View>
  )
}

/**
 * Cartão claro da folha — `surface` SEM borda (elevação por luminosidade),
 * `radius.md`, `shadow.soft`. `padding` 0 para listas de linhas com
 * divisores próprios (o `overflow: hidden` recorta as linhas no raio).
 */
export function CartaoFolha({
  children,
  padding = 16,
}: {
  children: ReactNode
  padding?: number
}) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding,
          overflow: 'hidden',
        },
        shadow.soft,
      ]}
    >
      {children}
    </View>
  )
}
