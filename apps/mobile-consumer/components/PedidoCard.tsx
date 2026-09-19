import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import { formatarReais } from '@mallevo/lib'
import { Badge } from '@/components/ui/Badge'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { TijoloLoja } from '@/components/TijoloLoja'
import { consumerDesign } from '@/lib/consumer-design'
import { metaDoStatus } from '@/lib/status-pedido'

/**
 * Card de pedido do HISTÓRICO — o recibo, na folha clara da tela de
 * pedidos. Pedidos em andamento não usam este card: viram
 * `CartaoPedidoVivo` na marquise.
 *
 * Mesma linguagem das fachadas do Início: superfície branca sem borda
 * (elevação por luminosidade), raio 20, e a loja presente pela própria
 * pele — o tijolo do logo (imagem, ou as iniciais em `accentInk` sobre o
 * `accent` do tema da loja, na fonte de display dela). O resto é a voz da
 * casa: nome, itens, total, data e o selo do desfecho.
 *
 * Spec: docs/system-design/consumer/04-componentes-dominio.md §5
 */

const { colors, radius, shadow } = consumerDesign

export interface LojaDoPedido {
  id?: string
  nome: string
  slug?: string | null
  logo_url?: string | null
  /** `stores.theme` cru — o tijolo veste a pele da loja. */
  theme?: unknown
}

export interface PedidoCardModel {
  id: string
  status: string
  total: number
  criado_em: string
  stores: LojaDoPedido | null
  order_items: { nome: string; quantidade: number }[]
}

interface Props {
  pedido: PedidoCardModel
  aoTocar?: () => void
}

/** "Hoje, 19:42" · "Ontem, 12:10" · "03 set, 20:15". */
export function formatarData(iso: string) {
  const d = new Date(iso)
  const hoje = new Date()
  const ontem = new Date()
  ontem.setDate(ontem.getDate() - 1)

  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === hoje.toDateString()) return `Hoje, ${hora}`
  if (d.toDateString() === ontem.toDateString()) return `Ontem, ${hora}`
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}, ${hora}`
}

export function PedidoCard({ pedido, aoTocar }: Props) {
  const meta = metaDoStatus(pedido.status)
  const itens =
    pedido.order_items?.map((i) => `${i.quantidade}× ${i.nome}`).join(', ') ?? ''

  return (
    <Pressable
      onPress={aoTocar ?? (() => router.push(`/pedido/${pedido.id}`))}
      accessibilityRole="button"
      accessibilityLabel={`${pedido.stores?.nome ?? 'Loja'}, ${meta.rotuloCurto}, ${formatarReais(pedido.total)}. Ver detalhes`}
      style={({ pressed }) => [
        {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: 14,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        shadow.soft,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TijoloLoja
          nome={pedido.stores?.nome ?? 'Loja'}
          logoUrl={pedido.stores?.logo_url}
          theme={pedido.stores?.theme}
        />

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{ fontSize: 15, fontWeight: '700', color: colors.ink, letterSpacing: -0.2 }}
            numberOfLines={1}
          >
            {pedido.stores?.nome ?? 'Loja'}
          </Text>
          <Text
            style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkMuted, marginTop: 2 }}
            numberOfLines={1}
          >
            {itens}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink, letterSpacing: -0.2 }}>
            {formatarReais(pedido.total)}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.inkSoft, marginTop: 2 }}>
            {formatarData(pedido.criado_em)}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: colors.line,
        }}
      >
        <Badge rotulo={meta.rotuloCurto} cor={meta.cor} icone={meta.icone} tamanho="sm" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.inkMuted }}>
            Ver detalhes
          </Text>
          <ConsumerIcon name="chevron-right" size={13} color={colors.inkMuted} strokeWidth={2.2} />
        </View>
      </View>
    </Pressable>
  )
}
