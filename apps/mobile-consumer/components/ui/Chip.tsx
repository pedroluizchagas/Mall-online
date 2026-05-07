import { TouchableOpacity, Text } from 'react-native'
import { consumerDesign } from '@/lib/consumer-design'
import { ConsumerIcon, ConsumerIconName } from '@/components/ConsumerIcon'

/**
 * Pill clicável e toggleável (filtros, categorias).
 *
 * Spec: docs/system-design/consumer/03-componentes-base.md §5
 */

const { colors, radius } = consumerDesign

export type ChipTamanho = 'sm' | 'md'

interface ChipProps {
  rotulo: string
  ativo: boolean
  aoTocar: () => void
  icone?: ConsumerIconName
  /** Suporte a emoji para chips de categoria do home/buscar. */
  emoji?: string
  tamanho?: ChipTamanho
}

export function Chip({
  rotulo,
  ativo,
  aoTocar,
  icone,
  emoji,
  tamanho = 'md',
}: ChipProps) {
  const altura = tamanho === 'sm' ? 32 : 40
  const padX = tamanho === 'sm' ? 12 : 16
  const fonte = tamanho === 'sm' ? 13 : 14
  const cor = ativo ? colors.accent : colors.inkMuted

  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      style={{
        height: altura,
        paddingHorizontal: padX,
        borderRadius: radius.pill,
        backgroundColor: ativo ? colors.ink : colors.surfaceMuted,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {emoji && <Text style={{ fontSize: fonte }}>{emoji}</Text>}
      {icone && <ConsumerIcon name={icone} size={14} color={cor} strokeWidth={2.1} />}
      <Text style={{ fontSize: fonte, fontWeight: ativo ? '700' : '600', color: cor }}>
        {rotulo}
      </Text>
    </TouchableOpacity>
  )
}
