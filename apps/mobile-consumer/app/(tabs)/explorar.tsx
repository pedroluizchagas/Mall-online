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
import { Image, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'

const { colors, radius, shadow } = consumerDesign

const { width: W, height: H } = Dimensions.get('window')

// Contrato da view public_explore_feed (docs/partner-app/02 §6) — o feed
// real publicado pelo Partner App. Fotos e vídeos no mesmo feed.
interface Reel {
  id: string
  tipo: 'video' | 'foto'
  loja_slug: string
  loja_nome: string
  loja_inicial: string
  media_url: string
  thumb_url: string | null
  descricao: string
  tags: string[]
  curtidas: number
  comentarios: number
  duracao_seg: number | null
  publicado_em: string
  produto?: { id: string; nome: string; preco: number } | null
}

const PAGINA = 20

// Carga do feed real: keyset por publicado_em (scroll infinito).
// anon lê SÓ a view — store_posts é bloqueada por RLS.
async function carregarFeed(antesDe?: string): Promise<Reel[]> {
  let query = supabase
    .from('public_explore_feed')
    .select('*')
    .order('publicado_em', { ascending: false })
    .limit(PAGINA)

  if (antesDe) query = query.lt('publicado_em', antesDe)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []).map((r) => ({
    id: r.id as string,
    tipo: (r.tipo as 'video' | 'foto') ?? 'video',
    loja_slug: r.loja_slug ?? '',
    loja_nome: r.loja_nome ?? '',
    loja_inicial: r.loja_inicial ?? '',
    media_url: r.media_url ?? '',
    thumb_url: r.thumb_url,
    descricao: r.descricao ?? '',
    tags: (r.tags ?? []).map((t) => (t.startsWith('#') ? t : `#${t}`)),
    curtidas: r.curtidas ?? 0,
    comentarios: r.comentarios ?? 0,
    duracao_seg: r.duracao_seg,
    publicado_em: r.publicado_em ?? '',
    produto: (r.produto as Reel['produto']) ?? null,
  }))
}

// Gradiente preto inferior para dar contraste ao texto sobre vídeo.
// Mantém rgba literal — overlay sobre vídeo é caso documentado em
// 01-tokens.md §11.
function GradienteOverlay() {
  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: H * 0.72,
      }}
      pointerEvents="none"
    >
      {[0, 0.04, 0.1, 0.18, 0.28, 0.42, 0.58, 0.74].map((opacidade, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: `rgba(0,0,0,${opacidade})`,
          }}
        />
      ))}
    </View>
  )
}

interface ReelItemProps {
  reel: Reel
  isActive: boolean
  mutado: boolean
  onToggleMute: () => void
  tabBarHeight: number
  overlayVisivel: boolean
  onToggleOverlay: () => void
}

function ReelItem({
  reel,
  isActive,
  mutado,
  onToggleMute,
  tabBarHeight,
  overlayVisivel,
  onToggleOverlay,
}: ReelItemProps) {
  const [curtido, setCurtido] = useState(false)
  const [curtidas, setCurtidas] = useState(reel.curtidas)

  const overlayOpacity = useRef(new Animated.Value(1)).current
  const contentY = useRef(new Animated.Value(32)).current
  const contentOpacity = useRef(new Animated.Value(0)).current
  const actionsX = useRef(new Animated.Value(40)).current
  const actionsOpacity = useRef(new Animated.Value(0)).current
  const heartScale = useRef(new Animated.Value(1)).current
  const muteScale = useRef(new Animated.Value(1)).current

  const ehVideo = reel.tipo === 'video'
  // Foto não instancia player (source null) — mesmo hook, sem custo.
  const player = useVideoPlayer(ehVideo ? reel.media_url : null, (p) => {
    p.loop = true
    p.muted = mutado
  })

  useEffect(() => {
    if (isActive) {
      if (ehVideo) player.play()
      contentY.setValue(32)
      contentOpacity.setValue(0)
      actionsX.setValue(40)
      actionsOpacity.setValue(0)

      Animated.parallel([
        Animated.sequence([
          Animated.delay(80),
          Animated.parallel([
            Animated.spring(contentY, {
              toValue: 0,
              damping: 18,
              stiffness: 120,
              useNativeDriver: true,
            }),
            Animated.timing(contentOpacity, {
              toValue: 1,
              duration: 280,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(180),
          Animated.parallel([
            Animated.spring(actionsX, {
              toValue: 0,
              damping: 18,
              stiffness: 120,
              useNativeDriver: true,
            }),
            Animated.timing(actionsOpacity, {
              toValue: 1,
              duration: 280,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start()
    } else if (ehVideo) {
      player.pause()
      player.currentTime = 0
    }
  }, [isActive])

  useEffect(() => {
    player.muted = mutado
  }, [mutado])

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
      Animated.spring(heartScale, {
        toValue: 1.45,
        damping: 6,
        stiffness: 200,
        useNativeDriver: true,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        damping: 10,
        stiffness: 180,
        useNativeDriver: true,
      }),
    ]).start()
    setCurtido((prev) => {
      setCurtidas((c) => c + (prev ? -1 : 1))
      return !prev
    })
  }

  function handleToggleMute() {
    Animated.sequence([
      Animated.spring(muteScale, {
        toValue: 0.75,
        damping: 8,
        stiffness: 220,
        useNativeDriver: true,
      }),
      Animated.spring(muteScale, {
        toValue: 1,
        damping: 10,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start()
    onToggleMute()
  }

  function formatarNumero(n: number) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
  }

  return (
    <View style={{ width: W, height: H, backgroundColor: colors.ink }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onToggleOverlay}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        {ehVideo ? (
          <VideoView
            player={player}
            style={{ width: W, height: H }}
            contentFit="cover"
            nativeControls={false}
          />
        ) : (
          <Image
            source={{ uri: reel.media_url }}
            style={{ width: W, height: H }}
            resizeMode="cover"
          />
        )}
      </TouchableOpacity>

      <GradienteOverlay />

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
        {/* Esquerda: loja + descrição + produto */}
        <Animated.View
          style={{
            flex: 1,
            gap: 10,
            opacity: contentOpacity,
            transform: [{ translateY: contentY }],
          }}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: colors.white,
              }}
            >
              <Text
                style={{
                  color: colors.ink,
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
                  color: colors.white,
                  fontWeight: '700',
                  fontSize: 14,
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
                borderRadius: radius.pill,
                borderWidth: 1.5,
                borderColor: colors.accent,
              }}
            >
              <Text
                style={{
                  color: colors.accent,
                  fontSize: 11,
                  fontWeight: '800',
                  letterSpacing: 0.3,
                }}
              >
                Seguir
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            style={{
              color: colors.white,
              fontSize: 13,
              lineHeight: 19,
              fontWeight: '500',
              textShadowColor: 'rgba(0,0,0,0.5)',
              textShadowRadius: 6,
              textShadowOffset: { width: 0, height: 1 },
            }}
            numberOfLines={3}
          >
            {reel.descricao}
          </Text>

          <Text
            style={{
              color: colors.inkSoft,
              fontSize: 12,
              fontWeight: '600',
            }}
          >
            {reel.tags.join('  ')}
          </Text>

          {reel.produto && (
            <TouchableOpacity
              onPress={() => router.push(`/loja/${reel.loja_slug}`)}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                alignSelf: 'flex-start',
                backgroundColor: 'rgba(17,18,22,0.6)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.18)',
                borderRadius: radius.pill,
                paddingHorizontal: 14,
                paddingVertical: 9,
              }}
            >
              <ConsumerIcon name="bag" size={13} color={colors.accent} />
              <Text
                style={{
                  color: colors.white,
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
                style={{
                  color: colors.accent,
                  fontSize: 13,
                  fontWeight: '800',
                }}
              >
                {/* preco em centavos (products.preco) */}
                R$ {(reel.produto.preco / 100).toFixed(2).replace('.', ',')}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Direita: ações */}
        <Animated.View
          style={{
            alignItems: 'center',
            gap: 22,
            paddingBottom: 4,
            opacity: actionsOpacity,
            transform: [{ translateX: actionsX }],
          }}
        >
          <TouchableOpacity
            onPress={handleToggleMute}
            activeOpacity={0.75}
            style={{ alignItems: 'center' }}
          >
            <Animated.View style={{ transform: [{ scale: muteScale }] }}>
              <ConsumerIcon
                name={mutado ? 'volume-off' : 'volume'}
                size={28}
                color={colors.white}
              />
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleCurtida}
            activeOpacity={0.75}
            style={{ alignItems: 'center', gap: 5 }}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <ConsumerIcon
                name="heart"
                size={28}
                color={curtido ? colors.danger : colors.white}
              />
            </Animated.View>
            <Text
              style={{
                color: colors.white,
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              {formatarNumero(curtidas)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            style={{ alignItems: 'center', gap: 5 }}
          >
            <ConsumerIcon name="comment" size={28} color={colors.white} />
            <Text
              style={{
                color: colors.white,
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              {formatarNumero(reel.comentarios)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            style={{ alignItems: 'center', gap: 5 }}
          >
            <ConsumerIcon name="send" size={28} color={colors.white} />
            <Text
              style={{
                color: colors.white,
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              Enviar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/loja/${reel.loja_slug}`)}
            activeOpacity={0.85}
            style={[
              {
                width: 44,
                height: 44,
                borderRadius: radius.sm,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
              },
              shadow.medium,
            ]}
          >
            <ConsumerIcon name="bag" size={20} color={colors.ink} strokeWidth={2.1} />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  )
}

// ── Galeria ──
const CELL_W = (W - 3) / 3
const CELL_H = CELL_W * 1.72

function GaleriaGrid({
  reels,
  ativo,
  onSelect,
  insets,
  visivel,
}: {
  reels: Reel[]
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
    ? reels.filter((r) => {
        const termo = busca.toLowerCase()
        return (
          r.loja_nome.toLowerCase().includes(termo) ||
          r.tags.some((t) => t.toLowerCase().includes(termo)) ||
          r.descricao.toLowerCase().includes(termo)
        )
      })
    : reels

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: (insets.bottom || 16) + 60 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
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
            borderRadius: radius.pill,
            paddingHorizontal: 16,
            paddingVertical: 11,
            borderWidth: 1,
            borderColor: busca
              ? 'rgba(255,255,255,0.22)'
              : 'rgba(255,255,255,0.08)',
          }}
        >
          <ConsumerIcon
            name="search"
            size={15}
            color="rgba(255,255,255,0.45)"
          />
          <TextInput
            ref={inputRef}
            value={busca}
            onChangeText={setBusca}
            placeholder="Pesquisar"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={{
              flex: 1,
              fontSize: 14,
              color: colors.white,
              fontWeight: '500',
              padding: 0,
            }}
            returnKeyType="search"
            autoCorrect={false}
          />
          {busca.length > 0 && (
            <TouchableOpacity onPress={() => setBusca('')} activeOpacity={0.7}>
              <ConsumerIcon
                name="close"
                size={16}
                color="rgba(255,255,255,0.55)"
                strokeWidth={2.2}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1.5 }}>
        {reelsFiltrados.length === 0 ? (
          <View
            style={{
              width: W,
              paddingVertical: 48,
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ConsumerIcon
              name="reels"
              size={28}
              color={colors.inkSoft}
              strokeWidth={1.6}
            />
            <Text
              style={{
                color: colors.inkSoft,
                fontSize: 14,
                fontWeight: '500',
              }}
            >
              Nenhum vídeo encontrado
            </Text>
          </View>
        ) : (
          reelsFiltrados.map((reel) => {
            const originalIndex = reels.indexOf(reel)
            const isAtivo = originalIndex === ativo
            return (
              <TouchableOpacity
                key={reel.id}
                onPress={() => onSelect(originalIndex)}
                activeOpacity={0.88}
                style={{
                  width: CELL_W,
                  height: CELL_H,
                  backgroundColor: colors.surfaceDark,
                  overflow: 'hidden',
                  borderWidth: isAtivo ? 2.5 : 0,
                  borderColor: colors.accent,
                }}
              >
                {/* Thumb real do post (antes: inicial gigante placeholder) */}
                {reel.thumb_url ? (
                  <Image
                    source={{ uri: reel.thumb_url }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                  />
                ) : (
                  <Text
                    style={{
                      position: 'absolute',
                      bottom: -8,
                      right: -4,
                      fontSize: 80,
                      fontWeight: '900',
                      color: colors.accentSoft,
                      lineHeight: 88,
                    }}
                  >
                    {reel.loja_inicial}
                  </Text>
                )}

                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {reel.tipo === 'video' && (
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: 'rgba(0,0,0,0.45)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ConsumerIcon name="play" size={16} color={colors.white} />
                    </View>
                  )}
                </View>

                {reel.tipo === 'video' && reel.duracao_seg ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 6,
                      left: 6,
                      backgroundColor: 'rgba(0,0,0,0.55)',
                      borderRadius: 4,
                      paddingHorizontal: 5,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ color: colors.white, fontSize: 9, fontWeight: '800' }}>
                      {reel.duracao_seg}s
                    </Text>
                  </View>
                ) : null}

                <View
                  style={{
                    padding: 8,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                  }}
                >
                  <Text
                    style={{
                      color: colors.white,
                      fontSize: 11,
                      fontWeight: '800',
                      letterSpacing: 0.1,
                    }}
                    numberOfLines={1}
                  >
                    {reel.loja_nome}
                  </Text>
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: 10,
                      marginTop: 1,
                      fontWeight: '500',
                    }}
                    numberOfLines={1}
                  >
                    {reel.tags[0]}
                  </Text>
                </View>

                {isAtivo && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 3,
                      borderRadius: 4,
                      backgroundColor: colors.accent,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.ink,
                        fontSize: 9,
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
          })
        )}
      </View>
    </ScrollView>
  )
}

// ── Tela ──
export default function TelaExplorar() {
  const [ativo, setAtivo] = useState(0)
  const [mutado, setMutado] = useState(false)
  const [modoGaleria, setModoGaleria] = useState(false)
  const [overlayVisivel, setOverlayVisivel] = useState(true)
  const [reels, setReels] = useState<Reel[]>([])
  const [carregandoFeed, setCarregandoFeed] = useState(true)
  const [erroFeed, setErroFeed] = useState<string | null>(null)
  const [fimDoFeed, setFimDoFeed] = useState(false)
  const carregandoMaisRef = useRef(false)
  // Dedupe de views por sessão — não inflar o contador do lojista.
  const vistosRef = useRef<Set<string>>(new Set())
  const insets = useSafeAreaInsets()
  const flatListRef = useRef<FlatList>(null)

  const carregarInicial = useCallback(async () => {
    setCarregandoFeed(true)
    setErroFeed(null)
    try {
      const pagina = await carregarFeed()
      setReels(pagina)
      setFimDoFeed(pagina.length < PAGINA)
    } catch (e) {
      setErroFeed(e instanceof Error ? e.message : 'Falha ao carregar o feed')
    } finally {
      setCarregandoFeed(false)
    }
  }, [])

  useEffect(() => {
    void carregarInicial()
  }, [carregarInicial])

  // Scroll infinito: keyset por publicado_em (docs/partner-app/11)
  const carregarMais = useCallback(async () => {
    if (carregandoMaisRef.current || fimDoFeed || reels.length === 0) return
    carregandoMaisRef.current = true
    try {
      const ultima = reels[reels.length - 1].publicado_em
      const pagina = await carregarFeed(ultima)
      if (pagina.length < PAGINA) setFimDoFeed(true)
      if (pagina.length > 0) {
        setReels((prev) => {
          const ids = new Set(prev.map((r) => r.id))
          return [...prev, ...pagina.filter((r) => !ids.has(r.id))]
        })
      }
    } catch {
      // silencioso — próxima tentativa no próximo onEndReached
    } finally {
      carregandoMaisRef.current = false
    }
  }, [reels, fimDoFeed])

  // View count: dispara quando um post fica ativo (dedupe por sessão)
  useEffect(() => {
    const reel = reels[ativo]
    if (!reel || vistosRef.current.has(reel.id)) return
    vistosRef.current.add(reel.id)
    void supabase.rpc('increment_post_view', { post_id: reel.id })
  }, [ativo, reels])

  const tabBarHeight = (insets.bottom || 16) + 52

  const headerOpacity = useRef(new Animated.Value(1)).current
  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: overlayVisivel ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start()
  }, [overlayVisivel])

  const galeriaAnim = useRef(new Animated.Value(0)).current

  const feedOpacity = galeriaAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  })
  const feedScale = galeriaAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.88],
  })
  const galeriaOpacity = galeriaAnim.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0, 1],
  })
  const galeriaSlide = galeriaAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [H * 0.06, 0],
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

  const onPinchStateChange = ({ nativeEvent }: any) => {
    if (nativeEvent.oldState === State.ACTIVE && !modoGaleria) {
      if (nativeEvent.scale < 0.78) {
        entrarGaleria()
      }
    }
  }

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
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.ink }}
    >
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <PinchGestureHandler onHandlerStateChange={onPinchStateChange}>
        <Animated.View style={{ flex: 1 }}>
          {/* Feed */}
          <Animated.View
            style={{
              ...StyleSheet.absoluteFillObject,
              opacity: feedOpacity,
              transform: [{ scale: feedScale }],
            }}
            pointerEvents={modoGaleria ? 'none' : 'auto'}
          >
            {/* Header */}
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
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
                  fontSize: 22,
                  fontWeight: '800',
                  color: colors.white,
                  letterSpacing: -0.3,
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
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: 'rgba(0,0,0,0.45)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={entrarGaleria}
              >
                <ConsumerIcon
                  name="search"
                  size={17}
                  color="rgba(255,255,255,0.85)"
                />
              </TouchableOpacity>
            </Animated.View>

            {carregandoFeed ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.accent} size="large" />
              </View>
            ) : erroFeed ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 }}>
                <ConsumerIcon name="reels" size={28} color={colors.inkSoft} strokeWidth={1.6} />
                <Text style={{ color: colors.inkSoft, fontSize: 14, fontWeight: '500', textAlign: 'center' }}>
                  Não foi possível carregar o Explorar.
                </Text>
                <TouchableOpacity
                  onPress={() => void carregarInicial()}
                  activeOpacity={0.8}
                  style={{
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: radius.pill,
                    backgroundColor: colors.accent,
                  }}
                >
                  <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 13 }}>
                    Tentar de novo
                  </Text>
                </TouchableOpacity>
              </View>
            ) : reels.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <ConsumerIcon name="reels" size={28} color={colors.inkSoft} strokeWidth={1.6} />
                <Text style={{ color: colors.inkSoft, fontSize: 14, fontWeight: '500' }}>
                  Nenhum vídeo encontrado
                </Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={reels}
                keyExtractor={(item) => item.id}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={H}
                snapToAlignment="start"
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                onEndReached={() => void carregarMais()}
                onEndReachedThreshold={2}
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
                    overlayVisivel={overlayVisivel}
                    onToggleOverlay={() => setOverlayVisivel((v) => !v)}
                  />
                )}
              />
            )}

            {/* Indicador de posição */}
            <View
              style={{
                position: 'absolute',
                right: 6,
                top: '50%',
                transform: [{ translateY: -(reels.length * 10) / 2 }],
                gap: 5,
                zIndex: 10,
              }}
              pointerEvents="none"
            >
              {reels.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 3,
                    height: i === ativo ? 18 : 5,
                    borderRadius: 2,
                    backgroundColor:
                      i === ativo ? colors.accent : 'rgba(255,255,255,0.3)',
                  }}
                />
              ))}
            </View>
          </Animated.View>

          {/* Galeria */}
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: colors.ink,
                opacity: galeriaOpacity,
                transform: [{ translateY: galeriaSlide }],
              },
            ]}
            pointerEvents={modoGaleria ? 'auto' : 'none'}
          >
            <GaleriaGrid
              reels={reels}
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
