import { View, Text } from 'react-native'
import { consumerDesign, softColor } from '@/lib/consumer-design'
import { ConsumerIcon, ConsumerIconName } from '@/components/ConsumerIcon'

/**
 * Pill colorido para status, categorias e flags.
 *
 * Spec: docs/system-design/consumer/03-componentes-base.md §4
 */

const { colors, radius } = consumerDesign

export type BadgeTamanho = 'sm' | 'md'

interface BadgeProps {
  rotulo: string
  /** Cor sólida em hex (ex.: vinda dos tokens de status). */
  cor: string
  icone?: ConsumerIconName
  tamanho?: BadgeTamanho
  /** Se true, fundo sólido na cor; senão, soft (alpha 18%). */
  preenchido?: boolean
}

export function Badge({
  rotulo,
  cor,
  icone,
  tamanho = 'sm',
  preenchido = false,
}: BadgeProps) {
  const fonte = tamanho === 'sm' ? 11 : 12
  const tracking = tamanho === 'sm' ? 1.2 : 0.5
  const altura = tamanho === 'sm' ? 22 : 28
  const padX = tamanho === 'sm' ? 8 : 12
  const tamIcone = tamanho === 'sm' ? 12 : 14
  const corTexto = preenchido ? colors.white : cor

  return (
    <View
      style={{
        height: altura,
        paddingHorizontal: padX,
        borderRadius: radius.pill,
        backgroundColor: preenchido ? cor : softColor(cor),
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
      }}
    >
      {icone && (
        <ConsumerIcon name={icone} size={tamIcone} color={corTexto} strokeWidth={2.2} />
      )}
      <Text
        style={{
          fontSize: fonte,
          fontWeight: '700',
          color: corTexto,
          letterSpacing: tracking,
          textTransform: 'uppercase',
        }}
      >
        {rotulo}
      </Text>
    </View>
  )
}
