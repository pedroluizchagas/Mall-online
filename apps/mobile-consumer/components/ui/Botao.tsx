import { TouchableOpacity, Text, ActivityIndicator } from 'react-native'
import { consumerDesign } from '@/lib/consumer-design'
import { ConsumerIcon, ConsumerIconName } from '@/components/ConsumerIcon'

/**
 * Botão padrão do mobile-consumer.
 *
 * Spec: docs/system-design/consumer/03-componentes-base.md §1
 */

const { colors, radius } = consumerDesign

export type BotaoVariante = 'primario' | 'secundario' | 'ghost' | 'dark' | 'danger'
export type BotaoTamanho = 'sm' | 'md' | 'lg'

interface BotaoProps {
  label: string
  onPress: () => void
  variante?: BotaoVariante
  tamanho?: BotaoTamanho
  carregando?: boolean
  desabilitado?: boolean
  iconeEsquerda?: ConsumerIconName
  iconeDireita?: ConsumerIconName
  /** 'completa' (default) ocupa toda a largura do pai; 'auto' encolhe ao conteúdo. */
  largura?: 'auto' | 'completa'
}

const VARIANTE_BG: Record<BotaoVariante, string> = {
  primario: colors.accent,
  secundario: colors.surface,
  ghost: 'transparent',
  dark: colors.ink,
  danger: colors.danger,
}

const VARIANTE_TEXTO: Record<BotaoVariante, string> = {
  primario: colors.ink,
  secundario: colors.ink,
  ghost: colors.inkMuted,
  dark: colors.accent,
  danger: colors.white,
}

const TAMANHO: Record<BotaoTamanho, { altura: number; padX: number; fonte: number; tamIcone: number }> = {
  sm: { altura: 40, padX: 16, fonte: 14, tamIcone: 16 },
  md: { altura: 48, padX: 20, fonte: 15, tamIcone: 18 },
  lg: { altura: 56, padX: 24, fonte: 16, tamIcone: 18 },
}

export function Botao({
  label,
  onPress,
  variante = 'primario',
  tamanho = 'lg',
  carregando = false,
  desabilitado = false,
  iconeEsquerda,
  iconeDireita,
  largura = 'completa',
}: BotaoProps) {
  const inativo = carregando || desabilitado
  const t = TAMANHO[tamanho]
  const cor = VARIANTE_TEXTO[variante]

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inativo}
      activeOpacity={consumerDesign.opacity.pressed}
      style={{
        height: t.altura,
        paddingHorizontal: t.padX,
        borderRadius: radius.pill,
        backgroundColor: VARIANTE_BG[variante],
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        opacity: inativo ? consumerDesign.opacity.disabled : 1,
        alignSelf: largura === 'auto' ? 'flex-start' : 'stretch',
        borderWidth: variante === 'secundario' ? 1 : 0,
        borderColor: variante === 'secundario' ? colors.line : 'transparent',
      }}
    >
      {carregando ? (
        <ActivityIndicator color={cor} />
      ) : (
        <>
          {iconeEsquerda && (
            <ConsumerIcon name={iconeEsquerda} size={t.tamIcone} color={cor} strokeWidth={2.1} />
          )}
          <Text style={{ fontSize: t.fonte, fontWeight: '800', color: cor, letterSpacing: 0.2 }}>
            {label}
          </Text>
          {iconeDireita && (
            <ConsumerIcon name={iconeDireita} size={t.tamIcone} color={cor} strokeWidth={2.1} />
          )}
        </>
      )}
    </TouchableOpacity>
  )
}
