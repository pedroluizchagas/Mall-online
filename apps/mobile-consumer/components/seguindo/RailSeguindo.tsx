import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { Avatar } from '@/components/seguindo/CardPost'
import { consumerDesign } from '@/lib/consumer-design'

/**
 * Trilho horizontal com as lojas seguidas, no topo do feed Seguindo.
 *
 * É a lista completa de quem se segue E o atalho de navegação: em vez de
 * rolar até achar um post da loja, o usuário pula direto para a vitrine
 * dela. O último item é sempre "Descobrir" — a saída para o Explorar
 * quando o feed já foi lido.
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
   *  que ainda não publicou (sem card no feed para o botão Seguindo). */
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
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: colors.inkMuted,
              textAlign: 'center',
            }}
            numberOfLines={1}
          >
            {loja.nome}
          </Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        onPress={onDescobrir}
        activeOpacity={consumerDesign.opacity.pressedSoft}
        style={{ width: COLUNA, alignItems: 'center', gap: 6 }}
      >
        <View
          style={{
            width: AVATAR + 6,
            height: AVATAR + 6,
            borderRadius: (AVATAR + 6) / 2,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: colors.inkSoft,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface,
          }}
        >
          <ConsumerIcon name="plus" size={22} color={colors.inkMuted} strokeWidth={2.1} />
        </View>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '600',
            color: colors.inkMuted,
            textAlign: 'center',
          }}
          numberOfLines={1}
        >
          Descobrir
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}
