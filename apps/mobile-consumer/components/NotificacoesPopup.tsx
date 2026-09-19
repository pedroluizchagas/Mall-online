import { useState, useEffect, useMemo, useRef } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Easing,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ConsumerIcon, ConsumerIconName } from '@/components/ConsumerIcon'
import { GlowNeon, useFontesMarquee } from '@/components/home/Marquise'
import { consumerDesign, tempoRelativo } from '@/lib/consumer-design'
import {
  useNotificacoes,
  type Notificacao,
  type TipoNotificacao,
} from '@/store/useNotificacoes'

/**
 * Notificações — a folha que sobe do sino da marquise.
 *
 * Vem da fachada, então é feita do MESMO material dela: fundo `marquee`
 * com o glow neon, letreiro com sobrelinha, cartões de vidro fumê
 * (`marqueeGlass` + fio `marqueeLine`) como os cartazes "Ao vivo". Ícones
 * MONOCROMÁTICOS em moeda de vidro — nada de tijolo colorido por tipo (cara
 * de app genérico) nem de faísca (cara de IA): o tipo se diz por extenso
 * no rodapé. A não lida acende: fio `accentRing`, título em branco cheio,
 * ponto accent; a lida apaga para `marqueeInkSoft`. Agrupadas por Hoje /
 * Ontem / Antes, com o tempo relativo em micro caps.
 *
 * Toque marca como lida; "Marcar lidas" (pílula de vidro no letreiro) faz
 * tudo de uma vez. Fonte: `store/useNotificacoes.ts`.
 */

const { colors, radius, motion } = consumerDesign

const SCREEN_H = Dimensions.get('window').height

interface ConfigTipo {
  icone: ConsumerIconName
  rotulo: string
}

/** Ícones de linha, neutros — o tipo fala pelo rótulo, não pela cor. */
const CONFIG_TIPO: Record<TipoNotificacao, ConfigTipo> = {
  pedido: { icone: 'package', rotulo: 'Pedido' },
  promo: { icone: 'tag', rotulo: 'Promoção' },
  novidade: { icone: 'store', rotulo: 'Novidade' },
  sistema: { icone: 'info', rotulo: 'Mallevo' },
  comentario: { icone: 'comment', rotulo: 'Comentário' },
}

interface Props {
  visivel: boolean
  onFechar: () => void
}

export function NotificacoesPopup({ visivel, onFechar }: Props) {
  const insets = useSafeAreaInsets()
  const fontes = useFontesMarquee()
  const notificacoes = useNotificacoes((s) => s.lista)
  const marcarLida = useNotificacoes((s) => s.marcarLida)
  const marcarTodasLidas = useNotificacoes((s) => s.marcarTodasLidas)
  const [modalMontado, setModalMontado] = useState(false)

  const backdropOpacity = useRef(new Animated.Value(0)).current
  const sheetY = useRef(new Animated.Value(SCREEN_H)).current

  useEffect(() => {
    if (visivel) {
      setModalMontado(true)
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: motion.base + 40,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(sheetY, {
            toValue: 0,
            duration: motion.slow,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start()
      })
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: motion.base - 20,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sheetY, {
          toValue: SCREEN_H,
          duration: motion.base + 40,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => setModalMontado(false))
    }
  }, [visivel])

  const naoLidas = notificacoes.filter((n) => !n.lida).length

  // Hoje / Ontem / Antes — a lista já vem mais recente primeiro.
  const grupos = useMemo(() => {
    const hoje = new Date()
    const ontem = new Date()
    ontem.setDate(hoje.getDate() - 1)
    const chaveDe = (iso: string) => {
      const d = new Date(iso)
      if (d.toDateString() === hoje.toDateString()) return 'Hoje'
      if (d.toDateString() === ontem.toDateString()) return 'Ontem'
      return 'Antes'
    }
    const ordem = ['Hoje', 'Ontem', 'Antes']
    const mapa = new Map<string, Notificacao[]>()
    for (const n of notificacoes) {
      const chave = chaveDe(n.criado_em)
      if (!mapa.has(chave)) mapa.set(chave, [])
      mapa.get(chave)!.push(n)
    }
    return ordem
      .filter((k) => mapa.has(k))
      .map((k) => ({ rotulo: k, itens: mapa.get(k)! }))
  }, [notificacoes])

  return (
    <Modal
      visible={modalMontado}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onFechar}
    >
      {/* Véu com blur */}
      <Animated.View style={{ flex: 1, opacity: backdropOpacity }}>
        <TouchableWithoutFeedback onPress={onFechar}>
          <BlurView intensity={28} tint="dark" style={{ flex: 1 }} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Folha */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          transform: [{ translateY: sheetY }],
        }}
      >
        <TouchableWithoutFeedback>
          <View
            style={{
              backgroundColor: colors.marquee,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              maxHeight: SCREEN_H * 0.84,
              paddingBottom: insets.bottom + 16,
              overflow: 'hidden',
            }}
          >
            <GlowNeon />

            {/* Alça */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View
                style={{
                  width: 38,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.marqueeGlassStrong,
                }}
              />
            </View>

            {/* Letreiro */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                paddingHorizontal: 24,
                paddingTop: 14,
                paddingBottom: 18,
                gap: 12,
              }}
            >
              <View style={{ flexShrink: 1 }}>
                <Text style={estilos.microMudo}>
                  {naoLidas > 0
                    ? `${naoLidas} não lida${naoLidas !== 1 ? 's' : ''}`
                    : 'Tudo em dia'}
                </Text>
                <Text
                  style={[
                    fontes.letreiro,
                    { fontSize: 24, color: colors.white, letterSpacing: -0.5, marginTop: 4 },
                  ]}
                >
                  Notificações
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {naoLidas > 0 && (
                  <TouchableOpacity
                    onPress={marcarTodasLidas}
                    activeOpacity={consumerDesign.opacity.pressedSoft}
                    accessibilityRole="button"
                    accessibilityLabel="Marcar todas como lidas"
                    style={{
                      height: 36,
                      paddingHorizontal: 12,
                      borderRadius: radius.pill,
                      backgroundColor: colors.marqueeGlass,
                      borderWidth: 1,
                      borderColor: colors.marqueeLine,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <ConsumerIcon
                      name="check-double"
                      size={14}
                      color={colors.accent}
                      strokeWidth={2.2}
                    />
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.white }}>
                      Marcar lidas
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={onFechar}
                  activeOpacity={consumerDesign.opacity.pressedSoft}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.marqueeGlass,
                    borderWidth: 1,
                    borderColor: colors.marqueeLine,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ConsumerIcon name="close" size={15} color={colors.white} strokeWidth={2.2} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Lista agrupada */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, gap: 20 }}
            >
              {grupos.length === 0 ? (
                <Vazio />
              ) : (
                grupos.map((grupo) => (
                  <View key={grupo.rotulo} style={{ gap: 10 }}>
                    <Text style={[estilos.microMudo, { paddingHorizontal: 8 }]}>
                      {grupo.rotulo}
                    </Text>
                    {grupo.itens.map((item) => (
                      <CartaoNotificacao
                        key={item.id}
                        item={item}
                        aoTocar={() => marcarLida(item.id)}
                      />
                    ))}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// Peças
// ─────────────────────────────────────────────────────────

function CartaoNotificacao({
  item,
  aoTocar,
}: {
  item: Notificacao
  aoTocar: () => void
}) {
  const cfg = CONFIG_TIPO[item.tipo]
  const lida = item.lida

  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      accessibilityRole="button"
      accessibilityState={{ selected: !lida }}
      accessibilityLabel={`${lida ? '' : 'Não lida. '}${cfg.rotulo}: ${item.titulo}. ${item.corpo}`}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        padding: 14,
        borderRadius: radius.md,
        backgroundColor: lida ? colors.marqueeGlass : colors.marqueeGlassStrong,
        borderWidth: 1,
        borderColor: lida ? colors.marqueeLine : colors.accentRing,
      }}
    >
      {/* Moeda do tipo — vidro, ícone de linha monocromático */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.marqueeGlassStrong,
          borderWidth: 1,
          borderColor: colors.marqueeLine,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <ConsumerIcon
          name={cfg.icone}
          size={18}
          color={lida ? colors.marqueeInkSoft : colors.white}
          strokeWidth={1.8}
        />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text
            style={{
              flex: 1,
              fontSize: 14.5,
              fontWeight: lida ? '600' : '800',
              color: lida ? colors.marqueeInkSoft : colors.white,
              letterSpacing: -0.2,
            }}
            numberOfLines={1}
          >
            {item.titulo}
          </Text>
          {!lida && (
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: colors.accent,
                flexShrink: 0,
              }}
            />
          )}
        </View>

        <Text
          style={{
            fontSize: 13,
            lineHeight: 18,
            fontWeight: '500',
            color: lida ? colors.marqueeInkMuted : colors.marqueeInkSoft,
            marginTop: 3,
          }}
          numberOfLines={2}
        >
          {item.corpo}
        </Text>

        <Text
          style={[
            estilos.microMudo,
            { fontSize: 10.5, marginTop: 8, color: lida ? colors.marqueeInkMuted : colors.accent },
          ]}
        >
          {cfg.rotulo} · {tempoRelativo(item.criado_em)}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

/** Sem notificações — o sino apagado, em vidro. */
function Vazio() {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 44, gap: 12 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.marqueeGlass,
          borderWidth: 1,
          borderColor: colors.marqueeLine,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ConsumerIcon name="bell" size={26} color={colors.white} strokeWidth={1.6} />
      </View>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.white, letterSpacing: -0.2 }}>
        Tudo em dia
      </Text>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '500',
          color: colors.marqueeInkSoft,
          textAlign: 'center',
        }}
      >
        Quando o shopping tiver novidades para você, elas aparecem aqui.
      </Text>
    </View>
  )
}

const estilos = {
  microMudo: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.marqueeInkMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
}
