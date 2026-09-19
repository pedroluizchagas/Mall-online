import { TouchableOpacity, Text } from 'react-native'
import { partnerDesign } from '@/lib/partner-design'
import { PartnerIcon, PartnerIconName } from '@/components/PartnerIcon'

/**
 * Pill clicável e toggleável (filtros, categorias).
 *
 * Spec: docs/system-design/consumer/03-componentes-base.md (port 1:1 — docs/system-design/partner/00-sistema.md §5) §5
 */

const { colors, radius } = partnerDesign

export type ChipTamanho = 'sm' | 'md'

interface ChipProps {
  rotulo: string
  ativo: boolean
  aoTocar: () => void
  icone?: PartnerIconName
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
      activeOpacity={partnerDesign.opacity.pressedSoft}
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
      {icone && <PartnerIcon name={icone} size={14} color={cor} strokeWidth={2.1} />}
      <Text style={{ fontSize: fonte, fontWeight: ativo ? '700' : '600', color: cor }}>
        {rotulo}
      </Text>
    </TouchableOpacity>
  )
}
