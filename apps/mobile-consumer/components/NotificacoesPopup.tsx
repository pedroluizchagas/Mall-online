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

const SCREEN_H = Dimensions.get('window').height
import {
  Bike,
  Tag,
  Sparkles,
  Info,
  CheckCheck,
  X,
} from 'lucide-react-native'

// ─── Tipos ────────────────────────────────────────────────────────────────

type TipoNotificacao = 'pedido' | 'promo' | 'novidade' | 'sistema'

interface Notificacao {
  id: string
  tipo: TipoNotificacao
  titulo: string
  corpo: string
  tempo: string
  lida: boolean
}

// ─── Mock de dados ────────────────────────────────────────────────────────

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
    corpo: 'Farmácia Aroeira chegou no Mallora! Confira já.',
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
    titulo: 'Bem-vindo ao Mallora',
    corpo: 'Seu cadastro foi concluído. Explore as melhores lojas!',
    tempo: '1 sem',
    lida: true,
  },
]

// ─── Config visual por tipo ────────────────────────────────────────────────

const CONFIG_TIPO: Record<
  TipoNotificacao,
  { cor: string; bg: string; Icone: React.ComponentType<{ size: number; color: string; strokeWidth: number }> }
> = {
  pedido:   { cor: '#287D5C', bg: 'rgba(40,125,92,0.1)',   Icone: Bike },
  promo:    { cor: '#D4A04A', bg: 'rgba(212,160,74,0.1)',   Icone: Tag },
  novidade: { cor: '#5B8DEF', bg: 'rgba(91,141,239,0.1)',  Icone: Sparkles },
  sistema:  { cor: '#8A8A7E', bg: 'rgba(138,138,126,0.1)', Icone: Info },
}

// ─── Componente ───────────────────────────────────────────────────────────

interface Props {
  visivel: boolean
  onFechar: () => void
}

export function NotificacoesPopup({ visivel, onFechar }: Props) {
  const insets = useSafeAreaInsets()
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>(NOTIFICACOES_MOCK)
  const [modalMontado, setModalMontado] = useState(false)

  const backdropOpacity = useRef(new Animated.Value(0)).current
  const sheetY = useRef(new Animated.Value(SCREEN_H)).current

  // Abre: monta o modal primeiro, depois anima
  useEffect(() => {
    if (visivel) {
      setModalMontado(true)
      // Pequeno delay para garantir que o Modal está montado antes de animar
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
      // Fecha: anima e depois desmonta
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
      {/* Backdrop com fade */}
      <Animated.View style={{ flex: 1, opacity: backdropOpacity }}>
        <TouchableWithoutFeedback onPress={onFechar}>
          <BlurView
            intensity={28}
            tint="dark"
            style={{ flex: 1 }}
          />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Sheet com slide */}
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
              backgroundColor: '#F4F0EB',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              maxHeight: SCREEN_H * 0.82,
              paddingBottom: insets.bottom + 16,
              overflow: 'hidden',
            }}
          >
              {/* Handle */}
              <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                <View
                  style={{
                    width: 38,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: 'rgba(26,26,23,0.15)',
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
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 22,
                      fontWeight: '800',
                      color: '#1A4D3A',
                      letterSpacing: -0.5,
                    }}
                  >
                    Notificações
                  </Text>
                  {naoLidas > 0 && (
                    <Text
                      style={{
                        fontSize: 12.5,
                        color: '#8A8A7E',
                        marginTop: 2,
                      }}
                    >
                      {naoLidas} não lida{naoLidas !== 1 ? 's' : ''}
                    </Text>
                  )}
                </View>

                {naoLidas > 0 && (
                  <TouchableOpacity
                    onPress={marcarTodasLidas}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 100,
                      backgroundColor: 'rgba(26,77,58,0.08)',
                      marginRight: 10,
                    }}
                  >
                    <CheckCheck size={13} color="#1A4D3A" strokeWidth={2.2} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: '#1A4D3A',
                      }}
                    >
                      Marcar lidas
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={onFechar}
                  activeOpacity={0.7}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 11,
                    backgroundColor: 'rgba(26,26,23,0.07)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={16} color="#3D3D36" strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View
                style={{
                  height: 1,
                  backgroundColor: 'rgba(26,26,23,0.07)',
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
                        width: 60,
                        height: 60,
                        borderRadius: 20,
                        backgroundColor: 'rgba(26,77,58,0.07)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 26 }}>🔔</Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 14.5,
                        fontWeight: '700',
                        color: '#1C1C19',
                      }}
                    >
                      Tudo em dia!
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: '#8A8A7E',
                        textAlign: 'center',
                      }}
                    >
                      Nenhuma notificação por enquanto.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const cfg = CONFIG_TIPO[item.tipo]
                  const { Icone } = cfg

                  return (
                    <TouchableOpacity
                      onPress={() => marcarLida(item.id)}
                      activeOpacity={0.82}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        backgroundColor: item.lida ? '#FFFFFF' : '#FFFFFF',
                        borderRadius: 18,
                        padding: 14,
                        gap: 14,
                        borderWidth: 1,
                        borderColor: item.lida
                          ? 'rgba(26,26,23,0.06)'
                          : `${cfg.cor}30`,
                        shadowColor: '#1C1C19',
                        shadowOpacity: item.lida ? 0.03 : 0.06,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: item.lida ? 1 : 3,
                      }}
                    >
                      {/* Ícone */}
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          backgroundColor: cfg.bg,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icone size={20} color={cfg.cor} strokeWidth={1.8} />
                      </View>

                      {/* Conteúdo */}
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 3,
                          }}
                        >
                          <Text
                            style={{
                              flex: 1,
                              fontSize: 14,
                              fontWeight: item.lida ? '600' : '700',
                              color: '#1C1C19',
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
                            fontSize: 12.5,
                            color: '#6B6B60',
                            lineHeight: 18,
                          }}
                          numberOfLines={2}
                        >
                          {item.corpo}
                        </Text>

                        <Text
                          style={{
                            fontSize: 11,
                            color: '#A8A89E',
                            marginTop: 6,
                            fontWeight: '500',
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

// ─── Utilitário: conta não lidas (para o badge externo) ───────────────────

export const NOTIFICACOES_NAO_LIDAS = NOTIFICACOES_MOCK.filter((n) => !n.lida).length
