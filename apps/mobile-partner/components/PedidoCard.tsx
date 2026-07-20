import { Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { formatarReais } from '@mallevo/lib'
import { META_STATUS_LOJISTA, rotuloFormaPagamento } from '@/lib/status-pedido'
import { partnerDesign, softColor } from '@/lib/partner-design'
import type { Pedido } from '@/store/usePedidosStore'

// Card compacto da lista de pedidos (aba Pedidos e fila da aba Início).

function tempoDesde(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  return `há ${h}h${min % 60 ? ` ${min % 60}min` : ''}`
}

export function PedidoCard({ pedido }: { pedido: Pedido }) {
  const { colors, radius, spacing, typography } = partnerDesign
  const meta = META_STATUS_LOJISTA[pedido.status]
  const itens = pedido.order_items ?? []
  const resumo = itens
    .map((i) => `${i.quantidade}× ${i.nome}`)
    .slice(0, 2)
    .join(' · ')
  const mais = itens.length > 2 ? ` +${itens.length - 2}` : ''

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push(`/pedido/${pedido.id}`)}
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.lg,
        marginBottom: spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <View
          style={{
            backgroundColor: softColor(meta.cor),
            borderRadius: radius.pill,
            paddingVertical: 3,
            paddingHorizontal: 10,
          }}
        >
          <Text style={{ color: colors.ink, fontSize: typography.micro.size, fontWeight: '800' }}>
            {meta.rotulo}
          </Text>
        </View>
        <Text style={{ flex: 1, textAlign: 'right', color: colors.inkSoft, fontSize: typography.bodySm.size }}>
          {tempoDesde(pedido.criado_em)}
        </Text>
      </View>

      <Text
        numberOfLines={1}
        style={{ color: colors.ink, fontSize: typography.bodyLg.size, fontWeight: '700', marginBottom: 2 }}
      >
        {pedido.consumers?.nome ?? 'Cliente'}
      </Text>
      <Text numberOfLines={1} style={{ color: colors.inkMuted, fontSize: typography.bodySm.size, marginBottom: 8 }}>
        {resumo}{mais}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ flex: 1, color: colors.inkMuted, fontSize: typography.bodySm.size }}>
          {rotuloFormaPagamento(pedido.forma_pagamento)}
        </Text>
        <Text style={{ color: colors.ink, fontSize: typography.bodyLg.size, fontWeight: '800' }}>
          {formatarReais(pedido.total)}
        </Text>
      </View>
    </TouchableOpacity>
  )
}
