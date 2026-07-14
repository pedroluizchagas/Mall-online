import { TouchableOpacity, Text, ActivityIndicator } from 'react-native'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'
import { ConsumerIcon, ConsumerIconName } from '@/components/ConsumerIcon'

/**
 * Botão padrão do mobile-consumer. Dentro de uma loja com StoreTheme, veste
 * a pele dela (accent/raio/fonte via useStoreDesign); fora, design Mallevo.
 *
 * Spec: docs/system-design/consumer/03-componentes-base.md §1
 */

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
  const design = useStoreDesign()
  const { colors } = design
  const inativo = carregando || desabilitado
  const t = TAMANHO[tamanho]

  const VARIANTE_BG: Record<BotaoVariante, string> = {
    primario: colors.accent,
    secundario: colors.surface,
    ghost: 'transparent',
    dark: colors.ink,
    danger: colors.danger,
  }
  const VARIANTE_TEXTO: Record<BotaoVariante, string> = {
    primario: colors.accentInk,
    secundario: colors.ink,
    ghost: colors.inkMuted,
    dark: colors.accent,
    danger: colors.white,
  }
  const cor = VARIANTE_TEXTO[variante]

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inativo}
      activeOpacity={consumerDesign.opacity.pressed}
      style={{
        height: t.altura,
        paddingHorizontal: t.padX,
        borderRadius: design.radius.pill,
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
          <Text
            style={{
              fontSize: t.fonte,
              color: cor,
              letterSpacing: 0.2,
              ...fontStyle(design.body, 800),
            }}
          >
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
