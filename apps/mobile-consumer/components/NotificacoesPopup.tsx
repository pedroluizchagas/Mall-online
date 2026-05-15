import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Easing,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Botao } from '@/components/ui/Botao'
import { ConsumerIcon, ConsumerIconName } from '@/components/ConsumerIcon'
import { consumerDesign, softColor } from '@/lib/consumer-design'

const { colors, radius } = consumerDesign

const SCREEN_H = Dimensions.get('window').height

type TipoNotificacao = 'pedido' | 'promo' | 'novidade' | 'sistema'

interface Notificacao {
  id: string
  tipo: TipoNotificacao
  titulo: string
  corpo: string
  tempo: string
  lida: boolean
}

const NOTIFICACOES_MOCK: Notificacao[] = [
  {
    id: '1',
    tipo: 'pedido',
    titulo: 'Pedido a caminho!',
    corpo: 'Seu pedido saiu para entrega. Fique de olho!',
    tempo: '5 min',
    lida: false,
  },
  {
    id: '2',
    tipo: 'promo',
    titulo: 'Frete grátis hoje',
    corpo: 'Peça qualquer coisa até meia-noite e ganhe frete grátis.',
    tempo: '1 h',
    lida: false,
  },
  {
    id: '3',
    tipo: 'novidade',
    titulo: 'Nova loja disponível',
    corpo: 'Farmácia Aroeira chegou no Mallevo! Confira já.',
    tempo: '3 h',
    lida: true,
  },
  {
    id: '4',
    tipo: 'pedido',
    titulo: 'Pedido entregue',
    corpo: 'Seu pedido foi entregue com sucesso. Bom apetite!',
    tempo: 'Ontem',
    lida: true,
  },
  {
    id: '5',
    tipo: 'promo',
    titulo: '10% off no próximo pedido',
    corpo: 'Use o cupom VOLTA10 e economize na próxima compra.',
    tempo: '2 dias',
    lida: true,
  },
  {
    id: '6',
    tipo: 'sistema',
    titulo: 'Bem-vindo ao Mallevo',
    corpo: 'Seu cadastro foi concluído. Explore as melhores lojas!',
    tempo: '1 sem',
    lida: true,
  },
]

interface ConfigTipo {
  cor: string
  icone: ConsumerIconName
}

const CONFIG_TIPO: Record<TipoNotificacao, ConfigTipo> = {
  pedido: { cor: colors.info, icone: 'bike' },
  promo: { cor: colors.warning, icone: 'tag' },
  novidade: { cor: colors.accent, icone: 'spark' },
  sistema: { cor: colors.inkSoft, icone: 'info' },
}

interface Props {
  visivel: boolean
  onFechar: () => void
}

export function NotificacoesPopup({ visivel, onFechar }: Props) {
  const insets = useSafeAreaInsets()
  const [notificacoes, setNotificacoes] =
    useState<Notificacao[]>(NOTIFICACOES_MOCK)
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
            duration: 260,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(sheetY, {
            toValue: 0,
            duration: 340,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start()
      })
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sheetY, {
          toValue: SCREEN_H,
          duration: 260,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => setModalMontado(false))
    }
  }, [visivel])

  const naoLidas = notificacoes.filter((n) => !n.lida).length

  function marcarTodasLidas() {
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
  }

  function marcarLida(id: string) {
    setNotificacoes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
    )
  }

  return (
    <Modal
      visible={modalMontado}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onFechar}
    >
      {/* Backdrop com blur */}
      <Animated.View style={{ flex: 1, opacity: backdropOpacity }}>
        <TouchableWithoutFeedback onPress={onFechar}>
          <BlurView intensity={28} tint="dark" style={{ flex: 1 }} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Sheet */}
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
              backgroundColor: colors.surfaceDark,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              maxHeight: SCREEN_H * 0.82,
              paddingBottom: insets.bottom + 16,
              overflow: 'hidden',
            }}
          >
            {/* Drag handle */}
            <View
              style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}
            >
              <View
                style={{
                  width: 38,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.lineDark,
                }}
              />
            </View>

            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 22,
                paddingVertical: 14,
                gap: 8,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '800',
                    color: colors.white,
                    letterSpacing: -0.5,
                  }}
                >
                  Notificações
                </Text>
                {naoLidas > 0 && (
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.inkSoft,
                      marginTop: 2,
                      fontWeight: '500',
                    }}
                  >
                    {naoLidas} não lida{naoLidas !== 1 ? 's' : ''}
                  </Text>
                )}
              </View>

              {naoLidas > 0 && (
                <Botao
                  label="Marcar lidas"
                  variante="ghost"
                  tamanho="sm"
                  iconeEsquerda="check-double"
                  largura="auto"
                  onPress={marcarTodasLidas}
                />
              )}

              <TouchableOpacity
                onPress={onFechar}
                activeOpacity={0.7}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.sm,
                  backgroundColor: colors.surfaceDarkSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ConsumerIcon
                  name="close"
                  size={16}
                  color={colors.inkSoft}
                  strokeWidth={2.2}
                />
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: colors.lineDark,
                marginHorizontal: 22,
                marginBottom: 8,
              }}
            />

            {/* Lista */}
            <FlatList
              data={notificacoes}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 4,
                paddingBottom: 8,
                gap: 8,
              }}
              ListEmptyComponent={
                <View
                  style={{
                    alignItems: 'center',
                    paddingVertical: 48,
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: colors.accentSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ConsumerIcon
                      name="bell"
                      size={28}
                      color={colors.accent}
                      strokeWidth={1.8}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '800',
                      color: colors.white,
                    }}
                  >
                    Tudo em dia
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.inkSoft,
                      textAlign: 'center',
                      fontWeight: '500',
                    }}
                  >
                    Nenhuma notificação por enquanto.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const cfg = CONFIG_TIPO[item.tipo]

                return (
                  <TouchableOpacity
                    onPress={() => marcarLida(item.id)}
                    activeOpacity={consumerDesign.opacity.pressed}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      backgroundColor: colors.surfaceDarkSoft,
                      borderRadius: radius.md,
                      padding: 14,
                      gap: 12,
                      borderWidth: 1,
                      borderColor: item.lida
                        ? 'transparent'
                        : `${cfg.cor}40`,
                    }}
                  >
                    {/* Ícone */}
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: radius.sm,
                        backgroundColor: softColor(cfg.cor),
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <ConsumerIcon
                        name={cfg.icone}
                        size={20}
                        color={cfg.cor}
                        strokeWidth={1.9}
                      />
                    </View>

                    {/* Conteúdo */}
                    <View style={{ flex: 1, gap: 3 }}>
                      <View
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                      >
                        <Text
                          style={{
                            flex: 1,
                            fontSize: 14,
                            fontWeight: item.lida ? '600' : '800',
                            color: colors.white,
                            letterSpacing: -0.1,
                          }}
                          numberOfLines={1}
                        >
                          {item.titulo}
                        </Text>
                        {!item.lida && (
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: cfg.cor,
                              marginLeft: 8,
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </View>

                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.inkSoft,
                          lineHeight: 18,
                          fontWeight: '500',
                        }}
                        numberOfLines={2}
                      >
                        {item.corpo}
                      </Text>

                      <Text
                        style={{
                          fontSize: 11,
                          color: colors.inkSoft,
                          marginTop: 4,
                          fontWeight: '600',
                          letterSpacing: 0.5,
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.tempo}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              }}
            />
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </Modal>
  )
}

export const NOTIFICACOES_NAO_LIDAS = NOTIFICACOES_MOCK.filter(
  (n) => !n.lida
).length
