import { Image, Text, View } from 'react-native'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesignFromTheme } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * Tijolo do logo de uma loja, com a pele dela — o mesmo das fachadas do
 * Início: logo sobre `surface` da loja com fio `line`, ou as duas iniciais
 * em `accentInk` sobre o `accent` do tema, na fonte de display do
 * arquétipo. Loja sem tema cai no Mallevo.
 *
 * Usado no recibo (Pedidos, Acompanhamento) e no checkout.
 */

const { colors, radius } = consumerDesign

export function TijoloLoja({
  nome,
  logoUrl,
  theme,
  tamanho = 46,
}: {
  nome: string
  logoUrl?: string | null
  /** `stores.theme` cru. */
  theme?: unknown
  tamanho?: number
}) {
  const design = useStoreDesignFromTheme(theme ?? null)
  const cores = design.colors
  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')

  return (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: radius.sm,
        overflow: 'hidden',
        backgroundColor: logoUrl ? cores.surface : cores.accent,
        borderWidth: logoUrl ? 1 : 0,
        borderColor: colors.line,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {logoUrl ? (
        <Image
          source={{ uri: logoUrl }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : (
        <Text
          style={[
            fontStyle(design.display, 700),
            { fontSize: Math.round(tamanho * 0.35), letterSpacing: -0.4, color: cores.accentInk },
          ]}
        >
          {iniciais}
        </Text>
      )}
    </View>
  )
}
