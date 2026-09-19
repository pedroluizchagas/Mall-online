import { Image, Text, View } from 'react-native'
import { partnerDesign } from '@/lib/partner-design'

const { colors, radius } = partnerDesign

/**
 * O tijolo do logo da loja (port do consumer): `logoUrl` sobre `surface`
 * com fio `line`, ou duas iniciais em `ink` sobre o `accent` da casa —
 * no app do lojista a loja É a casa, então o fallback veste a marca
 * Mallevo, não um tema de arquétipo.
 *
 * `tamanho` default 46, `radius.sm`. Usado na marquise (Início, Menu),
 * no seletor de loja e nos recibos.
 */
export function TijoloLoja({
  nome,
  logoUrl,
  tamanho = 46,
  raio = radius.sm,
}: {
  nome: string
  logoUrl?: string | null
  tamanho?: number
  raio?: number
}) {
  if (logoUrl) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={{
          width: tamanho,
          height: tamanho,
          borderRadius: raio,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.line,
        }}
        accessibilityIgnoresInvertColors
      />
    )
  }

  return (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: raio,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityLabel={nome}
    >
      <Text
        style={{
          color: colors.ink,
          fontSize: Math.round(tamanho * 0.36),
          fontWeight: '800',
          letterSpacing: -0.5,
        }}
      >
        {iniciais(nome)}
      </Text>
    </View>
  )
}

/** "Café Aroma" → "CA"; "Padaria" → "PA". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[1][0]).toUpperCase()
}
