import { ReactNode } from 'react'
import { View, ViewStyle } from 'react-native'
import { consumerDesign } from '@/lib/consumer-design'

/**
 * Container retangular com radius e shadow padronizados.
 *
 * Spec: docs/system-design/consumer/03-componentes-base.md §3
 */

const { colors, radius, shadow } = consumerDesign

export type CardVariante = 'claro' | 'escuro'
export type CardRaio = 'md' | 'lg' | 'xl'
export type CardPreenchimento = 'sm' | 'md' | 'lg'
export type CardSombra = 'none' | 'soft' | 'medium' | 'floating'

interface CardProps {
  variante?: CardVariante
  raio?: CardRaio
  preenchimento?: CardPreenchimento
  /** Default: 'soft' no claro, 'none' no escuro. */
  sombra?: CardSombra
  /** Se true, não desenha borda no card claro. */
  semBorda?: boolean
  estilo?: ViewStyle
  children: ReactNode
}

const PADDING: Record<CardPreenchimento, number> = { sm: 12, md: 16, lg: 20 }
const RADIUS: Record<CardRaio, number> = { md: radius.md, lg: radius.lg, xl: radius.xl }

export function Card({
  variante = 'claro',
  raio = 'lg',
  preenchimento = 'md',
  sombra,
  semBorda = false,
  estilo,
  children,
}: CardProps) {
  const sombraResolvida: CardSombra = sombra ?? (variante === 'claro' ? 'soft' : 'none')

  return (
    <View
      style={[
        {
          backgroundColor: variante === 'claro' ? colors.surface : colors.surfaceDark,
          borderRadius: RADIUS[raio],
          padding: PADDING[preenchimento],
          borderWidth: variante === 'claro' && !semBorda ? 1 : 0,
          borderColor: colors.line,
        },
        shadow[sombraResolvida],
        estilo,
      ]}
    >
      {children}
    </View>
  )
}
