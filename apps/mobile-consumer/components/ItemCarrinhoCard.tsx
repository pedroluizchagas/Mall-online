import { View, Text, TouchableOpacity } from 'react-native'
import { useCartStore } from '@/store/useCartStore'
import { formatarReais } from '@mallevo/lib'
import type { ItemCarrinho, ItemCarrinhoAgendamento } from '@mallevo/types'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign, softColor } from '@/lib/consumer-design'

const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export function formatarAgendamento(a: ItemCarrinhoAgendamento): string {
  const d = new Date(a.inicio_at)
  const diaSemana = DIAS_CURTOS[d.getDay()]
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const hora = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const staff = a.staff_nome ?? 'Qualquer'
  return `${diaSemana} ${dia}/${mes} às ${hora}:${min} com ${staff}`
}

const { colors } = consumerDesign

interface Props {
  item: ItemCarrinho
  /** Esconde os controles +/-/remover (usado em pedido/[id].tsx). */
  readonly?: boolean
}

export function ItemCarrinhoCard({ item, readonly = false }: Props) {
  const { aumentarQuantidade, diminuirQuantidade, removerItem } = useCartStore()
  const precoExtra =
    item.modifiers?.reduce((acc, m) => acc + m.preco_extra, 0) ?? 0
  const totalLinha = (item.preco + precoExtra) * item.quantidade
  const eUltimo = item.quantidade === 1
  const rotuloVariant = item.variant?.rotulo ?? null
  const resumoModifiers =
    item.modifiers && item.modifiers.length > 0
      ? item.modifiers.map((m) => m.nome).join(', ')
      : null
  const resumoAgendamento = item.agendamento
    ? formatarAgendamento(item.agendamento)
    : null

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
        {resumoAgendamento && (
          <Text
            style={{ fontSize: 12, color: colors.inkMuted, fontWeight: '600' }}
            numberOfLines={2}
          >
            📅 {resumoAgendamento}
          </Text>
        )}
        {rotuloVariant && (
          <Text
            style={{ fontSize: 12, color: colors.inkMuted, fontWeight: '600' }}
            numberOfLines={1}
          >
            {rotuloVariant}
          </Text>
        )}
        {resumoModifiers && (
          <Text
            style={{ fontSize: 12, color: colors.inkMuted, fontWeight: '500' }}
            numberOfLines={2}
          >
            {resumoModifiers}
          </Text>
        )}
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
        item.agendamento ? null : (
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
        )
      ) : item.agendamento ? (
        <BotaoQty
          icone="close"
          cor={colors.danger}
          fundo={softColor(colors.danger)}
          aoTocar={() => removerItem(item.linha_id)}
        />
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
                ? removerItem(item.linha_id)
                : diminuirQuantidade(item.linha_id)
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
            aoTocar={() => aumentarQuantidade(item.linha_id)}
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
