import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { formatarReais } from '@mallevo/lib'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign, softColor } from '@/lib/consumer-design'
import { metaDoStatus, ehAtivo } from '@/lib/status-pedido'

/**
 * Card de pedido na lista. Pedidos ativos viram <Card variante="escuro">,
 * finalizados/cancelados ficam em <Card claro>.
 *
 * Spec: docs/system-design/consumer/04-componentes-dominio.md §5
 */

const { colors } = consumerDesign

export interface PedidoCardModel {
  id: string
  status: string
  total: number
  criado_em: string
  stores: { nome: string } | null
  order_items: { nome: string; quantidade: number }[]
}

interface Props {
  pedido: PedidoCardModel
  aoTocar?: () => void
}

function formatarData(iso: string) {
  const d = new Date(iso)
  const hoje = new Date()
  const ontem = new Date()
  ontem.setDate(ontem.getDate() - 1)

  const hora = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (d.toDateString() === hoje.toDateString()) return `Hoje, ${hora}`
  if (d.toDateString() === ontem.toDateString()) return `Ontem, ${hora}`
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}, ${hora}`
}

export function PedidoCard({ pedido, aoTocar }: Props) {
  const meta = metaDoStatus(pedido.status)
  const ativo = ehAtivo(pedido.status)
  const variante = ativo ? 'escuro' : 'claro'

  const itensTexto = pedido.order_items
    ?.map((i) => `${i.quantidade}× ${i.nome}`)
    .join(', ') ?? ''

  const corTitulo = ativo ? colors.white : colors.ink
  const corSecundario = ativo ? colors.inkSoft : colors.inkMuted
  const corMeta = ativo ? colors.inkSoft : colors.inkSoft
  const corLinha = ativo ? colors.lineDark : colors.line

  return (
    <TouchableOpacity
      onPress={aoTocar ?? (() => router.push(`/pedido/${pedido.id}`))}
      activeOpacity={consumerDesign.opacity.pressed}
      style={{ marginBottom: 12 }}
    >
      <Card variante={variante} raio="lg" preenchimento="md">
        {/* Topo: ícone status + nome loja + chevron */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: softColor(meta.cor),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ConsumerIcon name={meta.icone} size={20} color={meta.cor} />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: corTitulo,
                letterSpacing: -0.2,
              }}
              numberOfLines={1}
            >
              {pedido.stores?.nome ?? 'Loja'}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: corSecundario,
                marginTop: 2,
                fontWeight: '500',
              }}
              numberOfLines={1}
            >
              {itensTexto}
            </Text>
          </View>

          <ConsumerIcon
            name="chevron-right"
            size={16}
            color={ativo ? colors.inkSoft : colors.inkSoft}
          />
        </View>

        {/* Barra de progresso (apenas em pedidos ativos não cancelados) */}
        {ativo && (
          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: ativo
                ? `rgba(255,255,255,0.12)`
                : colors.canvasAlt,
              overflow: 'hidden',
              marginTop: 12,
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${meta.progresso * 100}%`,
                backgroundColor: meta.cor,
                borderRadius: 2,
              }}
            />
          </View>
        )}

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: corLinha,
            marginVertical: 12,
          }}
        />

        {/* Rodapé: badge + total + data */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <Badge
            rotulo={meta.rotuloCurto}
            cor={meta.cor}
            icone={meta.icone}
            tamanho="sm"
          />

          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '800',
                color: corTitulo,
                letterSpacing: -0.2,
              }}
            >
              {formatarReais(pedido.total)}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: corMeta,
                marginTop: 2,
                fontWeight: '500',
              }}
            >
              {formatarData(pedido.criado_em)}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  )
}
