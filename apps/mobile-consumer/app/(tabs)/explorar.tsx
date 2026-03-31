import { useState, useRef, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ViewToken,
  Platform,
  Animated,
  Easing,
  StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  PinchGestureHandler,
  GestureHandlerRootView,
  State,
} from 'react-native-gesture-handler'
import { useVideoPlayer, VideoView } from 'expo-video'
import {
  Heart,
  MessageCircle,
  Send,
  ShoppingBag,
  Volume2,
  VolumeX,
  Search,
  Play,
} from 'lucide-react-native'
import { router } from 'expo-router'

const { width: W, height: H } = Dimensions.get('window')

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
interface Reel {
  id: string
  loja_slug: string
  loja_nome: string
  loja_cor: string
  loja_inicial: string
  video_url: string
  descricao: string
  tags: string[]
  curtidas: number
  comentarios: number
  produto?: { nome: string; preco: number }
}

// ─────────────────────────────────────────────────────────
// Mock data — substituir por query Supabase em `store_reels`
// ─────────────────────────────────────────────────────────
const REELS: Reel[] = [
  {
    id: '1',
    loja_slug: 'sabor-mineiro',
    loja_nome: 'Sabor Mineiro',
    loja_cor: '#C75B3A',
    loja_inicial: 'S',
    video_url:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    descricao:
      'Feijão tropeiro fresquinho saindo do fogão! 🫘🔥 Comida mineira de verdade, do jeito que você ama.',
    tags: ['#comidamineira', '#feijão', '#divinópolis'],
    curtidas: 234,
    comentarios: 18,
    produto: { nome: 'Feijão Tropeiro Completo', preco: 28.9 },
  },
  {
    id: '2',
    loja_slug: 'burger-house',
    loja_nome: 'Burger House DV',
    loja_cor: '#1A4D3A',
    loja_inicial: 'B',
    video_url:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    descricao:
      'Nosso smash burger artesanal acabou de sair da chapa 🍔✨ Pediu? Chegou em 30 min.',
    tags: ['#burger', '#artesanal', '#smash'],
    curtidas: 891,
    comentarios: 67,
    produto: { nome: 'Smash Burger Clássico', preco: 34.9 },
  },
  {
    id: '3',
    loja_slug: 'mercado-central',
    loja_nome: 'Mercado Central DV',
    loja_cor: '#287D5C',
    loja_inicial: 'M',
    video_url:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    descricao:
      'Frutas e verduras fresquinhas chegando hoje! 🥦🍅 Qualidade que você vê e sente na hora.',
    tags: ['#mercado', '#hortifruti', '#fresco'],
    curtidas: 156,
    comentarios: 9,
  },
  {
    id: '4',
    loja_slug: 'vitrine-fashion',
    loja_nome: 'Vitrine Fashion',
    loja_cor: '#D45B9E',
    loja_inicial: 'V',
    video_url:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    descricao:
      'Nova coleção chegando! 👗✨ Tendências que combinam com você. Retirada disponível no shopping.',
    tags: ['#moda', '#fashion', '#tendência'],
    curtidas: 423,
    comentarios: 31,
    produto: { nome: 'Vestido Floral Premium', preco: 189.9 },
  },
  {
    id: '5',
    loja_slug: 'adega-premium',
    loja_nome: 'Adega Premium',
    loja_cor: '#6C5CE7',
    loja_inicial: 'A',
    video_url:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    descricao:
      'Vinhos selecionados para qualquer momento 🍷🌿 Entregamos em até 35 minutos.',
    tags: ['#vinho', '#adega', '#bebidas'],
    curtidas: 312,
    comentarios: 22,
    produto: { nome: 'Vinho Tinto Seleção', preco: 89.9 },
  },
]

// ─────────────────────────────────────────────────────────
// Overlay gradient (simulado sem expo-linear-gradient)
// ─────────────────────────────────────────────────────────
function GradienteOverlay() {
  return (
    <View
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: H * 0.72 }}
      pointerEvents="none"
    >
      {[0, 0.04, 0.1, 0.18, 0.28, 0.42, 0.58, 0.74].map((opacidade, i, arr) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: `rgba(0,0,0,${opacidade})`,
            // Borda superior levemente mais escura para suavizar
            borderTopWidth: i > 0 ? 0 : 0,
          }}
        />
      ))}
    </View>
  )
}

// ─────────────────────────────────────────────────────────
// Item de reel
// ─────────────────────────────────────────────────────────
function ReelItem({
  reel,
  isActive,
  mutado,
  onToggleMute,
  tabBarHeight,
  overlayVisivel,
  onToggleOverlay,
}: {
  reel: Reel
  isActive: boolean
  mutado: boolean
  onToggleMute: () => void
  tabBarHeight: number
  overlayVisivel: boolean
  onToggleOverlay: () => void
}) {
  const [curtido, setCurtido] = useState(false)
  const [curtidas, setCurtidas] = useState(reel.curtidas)

  // ── Valores animados (RN Animated — compatível com Expo Go) ──
  const overlayOpacity = useRef(new Animated.Value(1)).current
  const contentY       = useRef(new Animated.Value(32)).current
  const contentOpacity = useRef(new Animated.Value(0)).current
  const actionsX       = useRef(new Animated.Value(40)).current
  const actionsOpacity = useRef(new Animated.Value(0)).current
  const heartScale     = useRef(new Animated.Value(1)).current
  const muteScale      = useRef(new Animated.Value(1)).current

  const player = useVideoPlayer(reel.video_url, (p) => {
    p.loop = true
    p.muted = mutado
  })

  // Reprodução e animação de entrada ao virar ativo
  useEffect(() => {
    if (isActive) {
      player.play()
      contentY.setValue(32)
      contentOpacity.setValue(0)
      actionsX.setValue(40)
      actionsOpacity.setValue(0)

      Animated.parallel([
        Animated.sequence([
          Animated.delay(80),
          Animated.parallel([
            Animated.spring(contentY, { toValue: 0, damping: 18, stiffness: 120, useNativeDriver: true }),
            Animated.timing(contentOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(180),
          Animated.parallel([
            Animated.spring(actionsX, { toValue: 0, damping: 18, stiffness: 120, useNativeDriver: true }),
            Animated.timing(actionsOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
          ]),
        ]),
      ]).start()
    } else {
      player.pause()
      player.currentTime = 0
    }
  }, [isActive])

  useEffect(() => {
    player.muted = mutado
  }, [mutado])

  // Fade do overlay no toggle de visibilidade
  useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: overlayVisivel ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start()
  }, [overlayVisivel])

  function toggleCurtida() {
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.45, damping: 6,  stiffness: 200, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1,    damping: 10, stiffness: 180, useNativeDriver: true }),
    ]).start()
    setCurtido((prev) => {
      setCurtidas((c) => c + (prev ? -1 : 1))
      return !prev
    })
  }

  function handleToggleMute() {
    Animated.sequence([
      Animated.spring(muteScale, { toValue: 0.75, damping: 8,  stiffness: 220, useNativeDriver: true }),
      Animated.spring(muteScale, { toValue: 1,    damping: 10, stiffness: 200, useNativeDriver: true }),
    ]).start()
    onToggleMute()
  }

  function formatarNumero(n: number) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
  }

  return (
    <View style={{ width: W, height: H, backgroundColor: '#080806' }}>
      {/* Vídeo — toque alterna visibilidade do overlay */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={onToggleOverlay}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <VideoView
          player={player}
          style={{ width: W, height: H }}
          contentFit="cover"
          nativeControls={false}
        />
      </TouchableOpacity>

      {/* Gradiente inferior — sempre visível para legibilidade */}
      <GradienteOverlay />

      {/* Overlay animado — fade in/out no toggle */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: tabBarHeight + 12,
          left: 0,
          right: 0,
          flexDirection: 'row',
          alignItems: 'flex-end',
          paddingHorizontal: 16,
          gap: 14,
          opacity: overlayOpacity,
        }}
        pointerEvents={overlayVisivel ? 'box-none' : 'none'}
      >
        {/* Esquerda: loja + descrição + produto — slide-up na entrada */}
        <Animated.View
          style={{
            flex: 1,
            gap: 10,
            opacity: contentOpacity,
            transform: [{ translateY: contentY }],
          }}
        >
          {/* Avatar + nome + seguir */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: reel.loja_cor,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.85)',
              }}
            >
              <Text
                style={{
                  color: '#FFF',
                  fontWeight: '800',
                  fontSize: 16,
                  lineHeight: 20,
                }}
              >
                {reel.loja_inicial}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push(`/loja/${reel.loja_slug}`)}
              activeOpacity={0.75}
            >
              <Text
                style={{
                  color: '#FFF',
                  fontWeight: '700',
                  fontSize: 13.5,
                  textShadowColor: 'rgba(0,0,0,0.4)',
                  textShadowRadius: 4,
                  textShadowOffset: { width: 0, height: 1 },
                }}
              >
                {reel.loja_nome}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 100,
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.7)',
              }}
            >
              <Text
                style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}
              >
                Seguir
              </Text>
            </TouchableOpacity>
          </View>

          {/* Descrição */}
          <Text
            style={{
              color: 'rgba(255,255,255,0.92)',
              fontSize: 13,
              lineHeight: 18.5,
              fontWeight: '400',
              textShadowColor: 'rgba(0,0,0,0.5)',
              textShadowRadius: 6,
              textShadowOffset: { width: 0, height: 1 },
            }}
            numberOfLines={3}
          >
            {reel.descricao}
          </Text>

          {/* Tags */}
          <Text
            style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: 12,
              fontWeight: '600',
            }}
          >
            {reel.tags.join('  ')}
          </Text>

          {/* Produto destacado */}
          {reel.produto && (
            <TouchableOpacity
              onPress={() => router.push(`/loja/${reel.loja_slug}`)}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                alignSelf: 'flex-start',
                backgroundColor: 'rgba(20,20,16,0.55)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.18)',
                borderRadius: 100,
                paddingHorizontal: 14,
                paddingVertical: 9,
              }}
            >
              <ShoppingBag size={13} color="#D4A04A" />
              <Text
                style={{
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: 12,
                  fontWeight: '600',
                  maxWidth: 130,
                }}
                numberOfLines={1}
              >
                {reel.produto.nome}
              </Text>
              <View
                style={{
                  width: 1,
                  height: 12,
                  backgroundColor: 'rgba(255,255,255,0.22)',
                }}
              />
              <Text
                style={{ color: '#D4A04A', fontSize: 12.5, fontWeight: '700' }}
              >
                R$ {reel.produto.preco.toFixed(2).replace('.', ',')}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Direita: botões de ação — slide-in na entrada */}
        <Animated.View
          style={{
            alignItems: 'center',
            gap: 22,
            paddingBottom: 4,
            opacity: actionsOpacity,
            transform: [{ translateX: actionsX }],
          }}
        >
          {/* Som / Mudo — bounce no toggle */}
          <TouchableOpacity
            onPress={handleToggleMute}
            activeOpacity={0.75}
            style={{ alignItems: 'center', gap: 5 }}
          >
            <Animated.View style={{ transform: [{ scale: muteScale }] }}>
              {mutado ? (
                <VolumeX size={28} color="#FFF" />
              ) : (
                <Volume2 size={28} color="#FFF" />
              )}
            </Animated.View>
          </TouchableOpacity>

          {/* Curtir — bounce no coração */}
          <TouchableOpacity
            onPress={toggleCurtida}
            activeOpacity={0.75}
            style={{ alignItems: 'center', gap: 5 }}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Heart
                size={28}
                color={curtido ? '#C75B3A' : '#FFF'}
                fill={curtido ? '#C75B3A' : 'none'}
              />
            </Animated.View>
            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>
              {formatarNumero(curtidas)}
            </Text>
          </TouchableOpacity>

          {/* Comentar */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={{ alignItems: 'center', gap: 5 }}
          >
            <MessageCircle size={28} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>
              {formatarNumero(reel.comentarios)}
            </Text>
          </TouchableOpacity>

          {/* Compartilhar */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={{ alignItems: 'center', gap: 5 }}
          >
            <Send size={28} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>
              Enviar
            </Text>
          </TouchableOpacity>

          {/* Ir para loja */}
          <TouchableOpacity
            onPress={() => router.push(`/loja/${reel.loja_slug}`)}
            activeOpacity={0.85}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: '#D4A04A',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#D4A04A',
              shadowOpacity: 0.5,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 3 },
              elevation: 6,
            }}
          >
            <ShoppingBag size={20} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────
// Galeria (visão reduzida — pinch out)
// ─────────────────────────────────────────────────────────
const CELL_W = (W - 3) / 3   // 3 colunas com gap de 1.5px entre cada
const CELL_H = CELL_W * 1.72 // proporção 9:16 comprimida

function GaleriaGrid({
  ativo,
  onSelect,
  insets,
  visivel,
}: {
  ativo: number
  onSelect: (i: number) => void
  insets: { top: number; bottom: number }
  visivel: boolean
}) {
  const [busca, setBusca] = useState('')
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    if (visivel) {
      const t = setTimeout(() => inputRef.current?.focus(), 180)
      return () => clearTimeout(t)
    } else {
      inputRef.current?.blur()
      setBusca('')
    }
  }, [visivel])

  const reelsFiltrados = busca.trim()
    ? REELS.filter((r) => {
        const termo = busca.toLowerCase()
        return (
          r.loja_nome.toLowerCase().includes(termo) ||
          r.tags.some((t) => t.toLowerCase().includes(termo)) ||
          r.descricao.toLowerCase().includes(termo)
        )
      })
    : REELS

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: (insets.bottom || 16) + 60 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Barra de busca */}
      <View
        style={{
          paddingTop: insets.top + 14,
          paddingHorizontal: 16,
          paddingBottom: 14,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 100,
            paddingHorizontal: 16,
            paddingVertical: 11,
            borderWidth: 1,
            borderColor: busca ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)',
          }}
        >
          <Search size={15} color="rgba(255,255,255,0.45)" />
          <TextInput
            ref={inputRef}
            value={busca}
            onChangeText={setBusca}
            placeholder="Pesquisar"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={{
              flex: 1,
              fontSize: 14,
              color: '#FFF',
              fontWeight: '500',
              padding: 0,
            }}
            returnKeyType="search"
            autoCorrect={false}
          />
          {busca.length > 0 && (
            <TouchableOpacity onPress={() => setBusca('')} activeOpacity={0.7}>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 18, lineHeight: 20 }}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Grade de células */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1.5 }}>
        {reelsFiltrados.length === 0 ? (
          <View style={{ width: W, paddingVertical: 48, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
              Nenhum vídeo encontrado
            </Text>
          </View>
        ) : reelsFiltrados.map((reel) => {
          const originalIndex = REELS.indexOf(reel)
          const isAtivo = originalIndex === ativo
          return (
            <TouchableOpacity
              key={reel.id}
              onPress={() => onSelect(originalIndex)}
              activeOpacity={0.88}
              style={{
                width: CELL_W,
                height: CELL_H,
                backgroundColor: reel.loja_cor,
                overflow: 'hidden',
                borderWidth: isAtivo ? 2.5 : 0,
                borderColor: '#D4A04A',
              }}
            >
              {/* Letra de fundo (decorativa) */}
              <Text
                style={{
                  position: 'absolute',
                  bottom: -8,
                  right: -4,
                  fontSize: 80,
                  fontWeight: '900',
                  color: 'rgba(0,0,0,0.18)',
                  lineHeight: 88,
                }}
              >
                {reel.loja_inicial}
              </Text>

              {/* Ícone de play centralizado */}
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: 'rgba(0,0,0,0.35)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Play size={16} color="#FFF" fill="#FFF" />
                </View>
              </View>

              {/* Info da loja */}
              <View
                style={{
                  padding: 8,
                  backgroundColor: 'rgba(0,0,0,0.38)',
                }}
              >
                <Text
                  style={{
                    color: '#FFF',
                    fontSize: 10.5,
                    fontWeight: '700',
                    letterSpacing: 0.1,
                  }}
                  numberOfLines={1}
                >
                  {reel.loja_nome}
                </Text>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 9.5,
                    marginTop: 1,
                  }}
                  numberOfLines={1}
                >
                  {reel.tags[0]}
                </Text>
              </View>

              {/* Indicador "em reprodução" */}
              {isAtivo && (
                <View
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    borderRadius: 4,
                    backgroundColor: '#D4A04A',
                  }}
                >
                  <Text
                    style={{
                      color: '#1C1C19',
                      fontSize: 8,
                      fontWeight: '800',
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    Atual
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </ScrollView>
  )
}

// ─────────────────────────────────────────────────────────
// Tela principal
// ─────────────────────────────────────────────────────────
export default function TelaExplorar() {
  const [ativo, setAtivo] = useState(0)
  const [mutado, setMutado] = useState(false)
  const [modoGaleria, setModoGaleria] = useState(false)
  const [overlayVisivel, setOverlayVisivel] = useState(true)
  const insets = useSafeAreaInsets()
  const flatListRef = useRef<FlatList>(null)

  const tabBarHeight = (insets.bottom || 16) + 52

  // Anima o header junto com o overlay
  const headerOpacity = useRef(new Animated.Value(1)).current
  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: overlayVisivel ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start()
  }, [overlayVisivel])

  // ── Animação feed ↔ galeria ───────────────────────────────
  const galeriaAnim = useRef(new Animated.Value(0)).current

  const feedOpacity = galeriaAnim.interpolate({
    inputRange: [0, 1], outputRange: [1, 0],
  })
  const feedScale = galeriaAnim.interpolate({
    inputRange: [0, 1], outputRange: [1, 0.88],
  })
  const galeriaOpacity = galeriaAnim.interpolate({
    inputRange: [0, 0.35, 1], outputRange: [0, 0, 1],
  })
  const galeriaSlide = galeriaAnim.interpolate({
    inputRange: [0, 1], outputRange: [H * 0.06, 0],
  })

  function entrarGaleria() {
    setModoGaleria(true)
    Animated.timing(galeriaAnim, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }

  function selecionarReel(index: number) {
    Animated.timing(galeriaAnim, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setModoGaleria(false)
      setAtivo(index)
      flatListRef.current?.scrollToIndex({ index, animated: false })
    })
  }

  // ── Pinch handler ─────────────────────────────────────────
  const onPinchStateChange = ({ nativeEvent }: any) => {
    if (nativeEvent.oldState === State.ACTIVE && !modoGaleria) {
      if (nativeEvent.scale < 0.78) {
        entrarGaleria()
      }
    }
  }

  // ── Feed viewability ──────────────────────────────────────
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setAtivo(viewableItems[0].index)
      }
    },
    []
  )

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 55,
  }).current

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#080806' }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <PinchGestureHandler onHandlerStateChange={onPinchStateChange}>
        <Animated.View style={{ flex: 1 }}>

          {/* ── Feed full-screen ── */}
          <Animated.View
            style={{
              ...StyleSheet.absoluteFillObject,
              opacity: feedOpacity,
              transform: [{ scale: feedScale }],
            }}
            pointerEvents={modoGaleria ? 'none' : 'auto'}
          >
            {/* Header flutuante */}
            <Animated.View
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                zIndex: 20,
                paddingTop: insets.top + 10,
                paddingHorizontal: 22,
                opacity: headerOpacity,
                paddingBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              pointerEvents="box-none"
            >
              <Text
                style={{
                  fontFamily: 'serif',
                  fontSize: 22,
                  fontWeight: '600',
                  color: '#FFFFFF',
                  textShadowColor: 'rgba(0,0,0,0.35)',
                  textShadowRadius: 8,
                  textShadowOffset: { width: 0, height: 1 },
                }}
              >
                Explorar
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={{
                  width: 38, height: 38, borderRadius: 19,
                  backgroundColor: 'rgba(0,0,0,0.35)',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
                  alignItems: 'center', justifyContent: 'center',
                }}
                onPress={entrarGaleria}
              >
                <Search size={17} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
            </Animated.View>

            {/* Feed */}
            <FlatList
              ref={flatListRef}
              data={REELS}
              keyExtractor={(item) => item.id}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={H}
              snapToAlignment="start"
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              getItemLayout={(_, index) => ({
                length: H, offset: H * index, index,
              })}
              renderItem={({ item, index }) => (
                <ReelItem
                  reel={item}
                  isActive={index === ativo}
                  mutado={mutado}
                  onToggleMute={() => setMutado((m) => !m)}
                  tabBarHeight={tabBarHeight}
                  overlayVisivel={overlayVisivel}
                  onToggleOverlay={() => setOverlayVisivel((v) => !v)}
                />
              )}
            />

            {/* Indicador de posição */}
            <View
              style={{
                position: 'absolute', right: 6, top: '50%',
                transform: [{ translateY: -(REELS.length * 10) / 2 }],
                gap: 5, zIndex: 10,
              }}
              pointerEvents="none"
            >
              {REELS.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 3,
                    height: i === ativo ? 18 : 5,
                    borderRadius: 2,
                    backgroundColor: i === ativo ? '#FFF' : 'rgba(255,255,255,0.28)',
                  }}
                />
              ))}
            </View>
          </Animated.View>

          {/* ── Galeria (overlay animado) ── */}
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: '#080806',
                opacity: galeriaOpacity,
                transform: [{ translateY: galeriaSlide }],
              },
            ]}
            pointerEvents={modoGaleria ? 'auto' : 'none'}
          >
            <GaleriaGrid
              ativo={ativo}
              onSelect={selecionarReel}
              insets={insets}
              visivel={modoGaleria}
            />
          </Animated.View>

        </Animated.View>
      </PinchGestureHandler>
    </GestureHandlerRootView>
  )
}
