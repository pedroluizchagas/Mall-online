import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { formatarReais } from '@mallevo/lib'
import { Badge } from '@/components/ui/Badge'
import { PartnerIcon } from '@/components/PartnerIcon'
import { partnerDesign, tempoRelativo } from '@/lib/partner-design'
import { metaDoStatus, rotuloFormaPagamento } from '@/lib/status-pedido'
import type { Pedido } from '@/store/usePedidosStore'

/**
 * Recibo de pedido — o cartão da FOLHA clara (histórico e em andamento).
 * Pedidos que pedem ação do lojista não usam este card: viram
 * `CartaoPedidoVivo` na marquise.
 *
 * Port do recibo do consumer (04-componentes-dominio.md §5): `surface`
 * sem borda (elevação por luminosidade), `radius.md`, `shadow.soft`. Onde
 * o consumer põe o tijolo da loja, o lojista vê o cliente — moeda
 * monocromática `canvasAlt` com ícone de linha (regra da casa: sem tijolo
 * colorido por tipo).
 */

const { colors, radius, shadow } = partnerDesign

interface Props {
  pedido: Pedido
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
  const itens = pedido.order_items ?? []
  const resumo = itens.map((i) => `${i.quantidade}× ${i.nome}`).join(', ')
  const cliente = pedido.consumers?.nome ?? 'Cliente'
  const emCurso = meta.ordem >= 0 && meta.ordem < 5

  return (
    <Pressable
      onPress={aoTocar ?? (() => router.push(`/pedido/${pedido.id}`))}
      accessibilityRole="button"
      accessibilityLabel={`${cliente}, ${meta.rotulo}, ${formatarReais(pedido.total)}. Ver detalhes`}
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
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: radius.sm,
            backgroundColor: colors.canvasAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PartnerIcon name="user" size={20} color={colors.ink} strokeWidth={1.8} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{ fontSize: 15, fontWeight: '700', color: colors.ink, letterSpacing: -0.2 }}
            numberOfLines={1}
          >
            {cliente}
          </Text>
          <Text
            style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkMuted, marginTop: 2 }}
            numberOfLines={1}
          >
            {resumo || 'Sem itens'}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink, letterSpacing: -0.2 }}>
            {formatarReais(pedido.total)}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.inkSoft, marginTop: 2 }}>
            {emCurso ? `há ${tempoRelativo(pedido.criado_em)}` : formatarData(pedido.criado_em)}
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
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
          <Badge rotulo={meta.rotulo} cor={meta.cor} icone={meta.icone} tamanho="sm" />
          <Text
            style={{ fontSize: 12, fontWeight: '500', color: colors.inkSoft, flexShrink: 1 }}
            numberOfLines={1}
          >
            {rotuloFormaPagamento(pedido.forma_pagamento)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.inkMuted }}>
            Ver detalhes
          </Text>
          <PartnerIcon name="chevron-right" size={13} color={colors.inkMuted} strokeWidth={2.2} />
        </View>
      </View>
    </Pressable>
  )
}
