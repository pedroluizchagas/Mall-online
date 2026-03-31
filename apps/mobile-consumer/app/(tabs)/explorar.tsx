import { useState, useRef, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ViewToken,
  Platform,
  Animated,
  Easing,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useVideoPlayer, VideoView } from 'expo-video'
import {
  Heart,
  MessageCircle,
  Send,
  ShoppingBag,
  Volume2,
  VolumeX,
  Search,
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
}: {
  reel: Reel
  isActive: boolean
  mutado: boolean
  onToggleMute: () => void
  tabBarHeight: number
}) {
  const [curtido, setCurtido] = useState(false)
  const [curtidas, setCurtidas] = useState(reel.curtidas)
  const [overlayVisivel, setOverlayVisivel] = useState(true)

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
        onPress={() => setOverlayVisivel((v) => !v)}
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
// Tela principal
// ─────────────────────────────────────────────────────────
export default function TelaExplorar() {
  const [ativo, setAtivo] = useState(0)
  const [mutado, setMutado] = useState(false)
  const insets = useSafeAreaInsets()

  // Altura aproximada da tab bar (safe area bottom + barra)
  const tabBarHeight = (insets.bottom || 16) + 52

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
    <View style={{ flex: 1, backgroundColor: '#080806' }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header flutuante */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          paddingTop: insets.top + 10,
          paddingHorizontal: 22,
          paddingBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        pointerEvents="box-none"
      >
        <View>
          <Text
            style={{
              fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
              fontSize: 22,
              fontWeight: '600',
              color: '#FFF',
              letterSpacing: 0.2,
              textShadowColor: 'rgba(0,0,0,0.4)',
              textShadowRadius: 8,
              textShadowOffset: { width: 0, height: 1 },
            }}
          >
            Explorar
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: 'rgba(0,0,0,0.35)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => router.push('/(tabs)/buscar')}
        >
          <Search size={17} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
      </View>

      {/* Feed de vídeos */}
      <FlatList
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
          length: H,
          offset: H * index,
          index,
        })}
        renderItem={({ item, index }) => (
          <ReelItem
            reel={item}
            isActive={index === ativo}
            mutado={mutado}
            onToggleMute={() => setMutado((m) => !m)}
            tabBarHeight={tabBarHeight}
          />
        )}
      />

      {/* Indicador de posição (lado direito, estilo stories) */}
      <View
        style={{
          position: 'absolute',
          right: 6,
          top: '50%',
          transform: [{ translateY: -(REELS.length * 10) / 2 }],
          gap: 5,
          zIndex: 10,
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
              backgroundColor:
                i === ativo ? '#FFF' : 'rgba(255,255,255,0.28)',
            }}
          />
        ))}
      </View>
    </View>
  )
}
