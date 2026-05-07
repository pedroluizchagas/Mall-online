import { View, Text, TouchableOpacity } from 'react-native'
import { useCartStore } from '@/store/useCartStore'
import { formatarReais } from '@mallora/lib'
import type { ItemCarrinho } from '@mallora/types'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign, softColor } from '@/lib/consumer-design'

const { colors } = consumerDesign

interface Props {
  item: ItemCarrinho
  /** Esconde os controles +/-/remover (usado em pedido/[id].tsx). */
  readonly?: boolean
}

export function ItemCarrinhoCard({ item, readonly = false }: Props) {
  const { aumentarQuantidade, diminuirQuantidade, removerItem } = useCartStore()
  const totalLinha = item.preco * item.quantidade
  const eUltimo = item.quantidade === 1

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text
          style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}
          numberOfLines={1}
        >
          {item.nome}
        </Text>
        {item.observacoes && (
          <Text
            style={{ fontSize: 12, color: colors.inkMuted, fontWeight: '500' }}
            numberOfLines={1}
          >
            {item.observacoes}
          </Text>
        )}
        <Text
          style={{
            fontSize: 14,
            fontWeight: '800',
            color: colors.ink,
            marginTop: 2,
          }}
        >
          {formatarReais(totalLinha)}
        </Text>
      </View>

      {readonly ? (
        <Text
          style={{
            fontSize: 14,
            fontWeight: '800',
            color: colors.inkMuted,
            paddingHorizontal: 8,
          }}
        >
          ×{item.quantidade}
        </Text>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <BotaoQty
            icone={eUltimo ? 'close' : 'minus'}
            cor={eUltimo ? colors.danger : colors.ink}
            fundo={
              eUltimo ? softColor(colors.danger) : colors.surfaceMuted
            }
            aoTocar={() =>
              eUltimo
                ? removerItem(item.product_id)
                : diminuirQuantidade(item.product_id)
            }
          />
          <Text
            style={{
              fontSize: 14,
              fontWeight: '800',
              color: colors.ink,
              width: 22,
              textAlign: 'center',
            }}
          >
            {item.quantidade}
          </Text>
          <BotaoQty
            icone="plus"
            cor={colors.accent}
            fundo={colors.ink}
            aoTocar={() => aumentarQuantidade(item.product_id)}
          />
        </View>
      )}
    </View>
  )
}

function BotaoQty({
  icone,
  cor,
  fundo,
  aoTocar,
}: {
  icone: 'minus' | 'plus' | 'close'
  cor: string
  fundo: string
  aoTocar: () => void
}) {
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: fundo,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ConsumerIcon name={icone} size={14} color={cor} strokeWidth={2.2} />
    </TouchableOpacity>
  )
}
