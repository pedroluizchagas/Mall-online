import { useEffect, useRef } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { formatarReais } from '@mallevo/lib'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { useFontesMarquee } from '@/components/home/Marquise'
import type { PedidoCardModel } from '@/components/PedidoCard'
import { consumerDesign } from '@/lib/consumer-design'
import { metaDoStatus } from '@/lib/status-pedido'

/**
 * Cartão de pedido AO VIVO — um pedido em andamento, na marquise da tela
 * de pedidos. Mesmo material do cartão de pedido ativo do Início (vidro
 * fumê sobre `marquee`, ponto pulsando, barra de progresso accent), com o
 * que a tela de pedidos precisa a mais: a loja, os itens e o total.
 *
 * Anatomia: sobrelinha "AO VIVO · LOJA" + percentual; o status por
 * extenso na fonte-statement da casa; a descrição do passo; a barra; e o
 * rodapé com itens, total e o convite "Acompanhar".
 *
 * Spec: docs/system-design/consumer/07-telas.md §6
 */

const { colors, radius, motion } = consumerDesign

interface Props {
  pedido: PedidoCardModel
  aoTocar: () => void
}

export function CartaoPedidoVivo({ pedido, aoTocar }: Props) {
  const fontes = useFontesMarquee()
  const meta = metaDoStatus(pedido.status)

  // Barra anima até o progresso do status — e re-anima quando muda.
  const progresso = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(progresso, {
      toValue: meta.progresso,
      duration: motion.slow * 2,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // anima width (layout)
    }).start()
  }, [meta.progresso])

  // Respiração do ponto "ao vivo" — loop infinito, então respeita o
  // reduce motion do aparelho (fica aceso fixo, sem pulsar).
  const pulso = useRef(new Animated.Value(1)).current
  useEffect(() => {
    let ciclo: Animated.CompositeAnimation | undefined
    let vivo = true
    AccessibilityInfo.isReduceMotionEnabled().then((reduzido) => {
      if (!vivo || reduzido) return
      ciclo = Animated.loop(
        Animated.sequence([
          Animated.timing(pulso, {
            toValue: 0.3,
            duration: motion.pulse / 2,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulso, {
            toValue: 1,
            duration: motion.pulse / 2,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      )
      ciclo.start()
    })
    return () => {
      vivo = false
      ciclo?.stop()
    }
  }, [])

  const itens =
    pedido.order_items?.map((i) => `${i.quantidade}× ${i.nome}`).join(', ') ?? ''

  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressed}
      accessibilityRole="button"
      accessibilityLabel={`${meta.rotuloLongo}, ${pedido.stores?.nome ?? 'loja'}. Acompanhar pedido`}
      style={{
        backgroundColor: colors.marqueeGlass,
        borderWidth: 1,
        borderColor: colors.marqueeLine,
        borderRadius: radius.lg,
        padding: 18,
        gap: 12,
      }}
    >
      {/* Sobrelinha: ao vivo · loja · % */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Animated.View
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: colors.accent,
            opacity: pulso,
          }}
        />
        <Text
          style={{
            flex: 1,
            fontSize: 11,
            fontWeight: '700',
            color: colors.marqueeInkMuted,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
          numberOfLines={1}
        >
          Ao vivo · {pedido.stores?.nome ?? 'Loja'}
        </Text>
        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.accent }}>
          {Math.round(meta.progresso * 100)}%
        </Text>
      </View>

      {/* Status por extenso + descrição */}
      <View style={{ gap: 3 }}>
        <Text
          style={[
            fontes.statement,
            { fontSize: 20, lineHeight: 24, letterSpacing: -0.4, color: colors.white },
          ]}
          numberOfLines={1}
        >
          {meta.rotuloLongo}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.marqueeInkSoft }}>
          {meta.descricao}
        </Text>
      </View>

      {/* Barra de progresso */}
      <View
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.marqueeGlassStrong,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            height: '100%',
            borderRadius: 2,
            backgroundColor: colors.accent,
            width: progresso.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          }}
        />
      </View>

      {/* Rodapé: itens · total · acompanhar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text
          style={{ flex: 1, fontSize: 12.5, fontWeight: '500', color: colors.marqueeInkSoft }}
          numberOfLines={1}
        >
          {itens}
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.white, letterSpacing: -0.2 }}>
          {formatarReais(pedido.total)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.accent }}>
            Acompanhar
          </Text>
          <ConsumerIcon name="chevron-right" size={13} color={colors.accent} strokeWidth={2.4} />
        </View>
      </View>
    </TouchableOpacity>
  )
}
