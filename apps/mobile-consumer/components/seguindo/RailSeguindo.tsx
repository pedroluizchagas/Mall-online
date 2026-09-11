import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'

/**
 * Trilho horizontal com as lojas seguidas — no topo da GALERIA do Seguindo
 * (pinch ou lupa sobre o feed de reels).
 *
 * É a lista completa de quem se segue E o atalho de navegação: em vez de
 * rolar até achar um reel da loja, o usuário pula direto para a vitrine
 * dela. Toque longo deixa de seguir — a única saída para uma loja que ainda
 * não publicou nada. O último item é sempre "Descobrir", a saída para o
 * Explorar quando o feed já foi lido.
 *
 * Vive sobre `ink` (a galeria é escura): rótulos em branco fumê, moedas em
 * vidro — a mesma linguagem das vitrines da marquise.
 *
 * Spec: docs/system-design/consumer/07-telas.md §Seguindo
 */

const { colors } = consumerDesign

const AVATAR = 58
const COLUNA = 74

export interface ItemRail {
  slug: string
  nome: string
  logo_url?: string | null
}

interface Props {
  lojas: ItemRail[]
  onAbrirLoja: (slug: string) => void
  onDescobrir: () => void
  /** Toque longo no avatar — única saída para deixar de seguir uma loja
   *  que ainda não publicou (sem reel no feed para o botão Seguindo). */
  onRemover?: (loja: ItemRail) => void
}

export function RailSeguindo({
  lojas,
  onAbrirLoja,
  onDescobrir,
  onRemover,
}: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingVertical: 4 }}
    >
      {lojas.map((loja) => (
        <TouchableOpacity
          key={loja.slug}
          onPress={() => onAbrirLoja(loja.slug)}
          onLongPress={onRemover ? () => onRemover(loja) : undefined}
          activeOpacity={consumerDesign.opacity.pressedSoft}
          accessibilityRole="button"
          accessibilityLabel={loja.nome}
          accessibilityHint={
            onRemover ? 'Toque longo para deixar de seguir' : undefined
          }
          style={{ width: COLUNA, alignItems: 'center', gap: 6 }}
        >
          {/* Anel accent: marca "loja sua", não "história não vista". */}
          <View
            style={{
              width: AVATAR + 6,
              height: AVATAR + 6,
              borderRadius: (AVATAR + 6) / 2,
              borderWidth: 2,
              borderColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Avatar nome={loja.nome} logoUrl={loja.logo_url} tamanho={AVATAR} />
          </View>
          <Text style={estiloRotulo} numberOfLines={1}>
            {loja.nome}
          </Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        onPress={onDescobrir}
        activeOpacity={consumerDesign.opacity.pressedSoft}
        accessibilityRole="button"
        accessibilityLabel="Descobrir lojas no Explorar"
        style={{ width: COLUNA, alignItems: 'center', gap: 6 }}
      >
        <View
          style={{
            width: AVATAR + 6,
            height: AVATAR + 6,
            borderRadius: (AVATAR + 6) / 2,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: colors.marqueeInkMuted,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.marqueeGlass,
          }}
        >
          <ConsumerIcon name="plus" size={22} color={colors.accent} strokeWidth={2.1} />
        </View>
        <Text style={estiloRotulo} numberOfLines={1}>
          Descobrir
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const estiloRotulo = {
  fontSize: 11,
  fontWeight: '600' as const,
  color: colors.marqueeInkSoft,
  textAlign: 'center' as const,
}

/** Logo da loja em moeda; sem logo, a inicial em accent sobre vidro. */
function Avatar({
  nome,
  logoUrl,
  tamanho,
}: {
  nome: string
  logoUrl?: string | null
  tamanho: number
}) {
  if (logoUrl) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={{
          width: tamanho,
          height: tamanho,
          borderRadius: tamanho / 2,
          backgroundColor: colors.marqueeGlassStrong,
        }}
        resizeMode="cover"
      />
    )
  }
  return (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho / 2,
        backgroundColor: colors.marqueeGlassStrong,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: colors.accent,
          fontSize: Math.round(tamanho * 0.38),
          fontWeight: '800',
          letterSpacing: -0.5,
        }}
      >
        {nome.charAt(0).toUpperCase()}
      </Text>
    </View>
  )
}
