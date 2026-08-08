import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
} from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { formatarReais } from '@mallevo/lib'
import { ConsumerIcon, type ConsumerIconName } from '@/components/ConsumerIcon'
import { useCartStore } from '@/store/useCartStore'
import { useTransicaoSaida } from '@/store/useTransicaoSaida'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * Vitrine editorial de moda — layout PRÓPRIO do arquétipo `editorial` para
 * lojas de moda/beleza (vestuário, cosméticos, acessórios).
 *
 * DNA (destilado da referência de design, docs/store-theme/02 §C):
 * - hero full-bleed com overlay tipográfico (eyebrow + headline + CTA pill);
 * - cards sem chrome: foto retrato 3:4, separação por whitespace, não caixa;
 * - contraste tipográfico agressivo (título de seção pesado vs. "Ver tudo" cinza);
 * - rail horizontal com "peek" do próximo card convidando ao swipe;
 * - segunda seção em lista compacta (thumb + nome + preço) para dar ritmo;
 * - cor quase ausente: acento só em micro-momentos (favorito, badge).
 *
 * A página ([slug].tsx) mantém dados, splash, FAB do carrinho e modal;
 * este componente é a casca visual completa (header animado incluso).
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const HERO_H = Math.round(SCREEN_H * 0.5)

/** Altura útil da barra de menu inferior (sem o safe-area inset). */
const ALTURA_BARRA_MENU = 58

// Gradiente do overlay do hero (topo escurece p/ ícones, base p/ texto).
// PNG 1x96 inline: evita dependência de gradiente nativo. Perfil de DUAS
// bandas, específico do hero — para scrim de topo use uma rampa única
// (ver SCRIM_TOPO em ProdutoEditorial), senão a segunda banda vira uma
// linha de corte visível.
const GRADIENTE_HERO =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAABgCAYAAADcvRh2AAAAs0lEQVR42rXQMQtBYRTG8SMiF4m4KZESEbldqVvqllKEKGVQBmUwKIPBYFAGg+EOBotvy/8t5xt46/2N55znERFZfr8sYAYTGMEQBuBDHzzoQRccaEMT6lCFCpShCAXIQxbSkAQLYhCBkPzhmaFh3RHVlXFIQEqvykAObD3cRChpLBOwBg1oQQdcLcfTwnwt0dQ5hinM5df9CtawgS3sYA8HOMIJznCBK9zgDg8I4AkveH8AulgR2ymJR9MAAAAASUVORK5CYII='

export interface ProdutoVitrine {
  id: string
  nome: string
  descricao: string | null
  preco: number
  preco_promocional?: number | null
  foto_url: string | null
}

interface SecaoVitrine<T extends ProdutoVitrine> {
  titulo: string
  produtos: T[]
}

interface Slide<T extends ProdutoVitrine> {
  imagem: string | null
  eyebrow: string
  titulo: string
  subtitulo: string | null
  cta: string
  produto: T | null
}

interface Props<T extends ProdutoVitrine> {
  loja: {
    nome: string
    descricao?: string | null
    banner_url?: string | null
    logo_url?: string | null
    tempo_entrega?: number | null
    taxa_entrega?: number | null
  }
  secoes: SecaoVitrine<T>[]
  aoAbrirProduto: (produto: T) => void
  espacoFinal: number
}

function descontoPct(p: ProdutoVitrine): number {
  if (!p.preco_promocional || p.preco_promocional >= p.preco) return 0
  return Math.round((1 - p.preco_promocional / p.preco) * 100)
}

export function LojaEditorial<T extends ProdutoVitrine>({
  loja,
  secoes,
  aoAbrirProduto,
  espacoFinal,
}: Props<T>) {
  const design = useStoreDesign()
  const { colors, spacing, typeFactor } = design
  const insets = useSafeAreaInsets()
  const totalItens = useCartStore((s) => s.totalItens())
  const iniciarSaida = useTransicaoSaida((s) => s.iniciar)

  const scrollY = useRef(new Animated.Value(0)).current
  const scrollRef = useRef<ScrollView>(null)
  const [slideAtivo, setSlideAtivo] = useState(0)
  const [depoisDoHero, setDepoisDoHero] = useState(false)
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set())
  const [lojaFavorita, setLojaFavorita] = useState(false)
  const [expandidas, setExpandidas] = useState<Set<number>>(new Set())

  // Autoplay do hero
  const heroRef = useRef<ScrollView>(null)
  const heroX = useRef(new Animated.Value(0)).current
  const heroOffsetRef = useRef(0)
  const glideRef = useRef<Animated.CompositeAnimation | null>(null)
  const glideValor = useRef(new Animated.Value(0)).current
  const [autoplayPausado, setAutoplayPausado] = useState(false)
  const [reduzirMovimento, setReduzirMovimento] = useState(false)

  // Status bar: clara sobre a foto do hero, escura depois que o header assume.
  useEffect(() => {
    const limiar = HERO_H - 140
    const sub = scrollY.addListener(({ value }) => {
      setDepoisDoHero(value > limiar)
    })
    return () => scrollY.removeListener(sub)
  }, [scrollY])

  // Slides do hero: campanha (banner + oferta agregada) + primeiras peças.
  const slides = useMemo<Slide<T>[]>(() => {
    const todos = secoes.flatMap((s) => s.produtos)
    const maxDesc = Math.max(0, ...todos.map(descontoPct))
    const campanha: Slide<T> = {
      imagem: loja.banner_url ?? null,
      eyebrow: 'Nova coleção',
      titulo: maxDesc > 0 ? `${maxDesc}% OFF` : loja.nome,
      subtitulo:
        maxDesc > 0 ? 'Em peças selecionadas da estação' : 'A nova temporada chegou',
      cta: 'Comprar agora',
      produto: null,
    }
    const destaque = (secoes[0]?.produtos ?? [])
      .filter((p) => p.foto_url)
      .slice(0, 3)
      .map((p): Slide<T> => ({
        imagem: p.foto_url,
        eyebrow: secoes[0].titulo,
        titulo: p.nome,
        subtitulo: formatarReais(p.preco_promocional ?? p.preco),
        cta: 'Ver peça',
        produto: p,
      }))
    return [campanha, ...destaque]
  }, [loja, secoes])

  // Preferência de acessibilidade: com "reduzir movimento" ativo no sistema,
  // o carrossel não anda sozinho e as camadas de parallax/fade desligam.
  useEffect(() => {
    let ativo = true
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (ativo) setReduzirMovimento(v)
    })
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduzirMovimento,
    )
    return () => {
      ativo = false
      sub.remove()
    }
  }, [])

  // Glide programático com easing premium — o scrollTo nativo tem duração e
  // curva fixas; aqui a posição é dirigida por Animated.timing (560ms,
  // bezier 0.4/0/0.2/1), o glide "flutua" em vez de estalar.
  const deslizarPara = (prox: number) => {
    glideRef.current?.stop()
    glideValor.setValue(heroOffsetRef.current)
    const sub = glideValor.addListener(({ value }) => {
      heroRef.current?.scrollTo({ x: value, animated: false })
    })
    const anim = Animated.timing(glideValor, {
      toValue: prox * SCREEN_W,
      duration: 560,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    })
    glideRef.current = anim
    anim.start(({ finished }) => {
      glideValor.removeListener(sub)
      if (!finished) return
      if (prox >= slides.length) {
        // Chegou no clone do primeiro slide: salto invisível para o começo.
        heroRef.current?.scrollTo({ x: 0, animated: false })
        setSlideAtivo(0)
      } else {
        setSlideAtivo(prox)
      }
    })
  }

  // Autoplay: dwell de 5s por slide enquanto o hero está visível e o usuário
  // não interage. O loop é contínuo (sempre para frente) via slide-clone.
  useEffect(() => {
    if (slides.length <= 1 || autoplayPausado || depoisDoHero || reduzirMovimento)
      return
    const t = setTimeout(() => deslizarPara(slideAtivo + 1), 5000)
    return () => clearTimeout(t)
  }, [slideAtivo, autoplayPausado, depoisDoHero, reduzirMovimento, slides.length])

  // Interrompe qualquer glide pendente ao desmontar a tela.
  useEffect(() => () => glideRef.current?.stop(), [])

  const slidesRender = slides.length > 1 ? [...slides, slides[0]] : slides

  // Header fixo: transparente sobre o hero → surface com título ao rolar.
  const headerBg = scrollY.interpolate({
    inputRange: [HERO_H - 180, HERO_H - 90],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })
  const headerBgInverso = scrollY.interpolate({
    inputRange: [HERO_H - 180, HERO_H - 90],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  const alternarExpandida = (i: number) =>
    setExpandidas((atual) => {
      const prox = new Set(atual)
      if (prox.has(i)) prox.delete(i)
      else prox.add(i)
      return prox
    })

  const alternarFavorito = (id: string) =>
    setFavoritos((atual) => {
      const prox = new Set(atual)
      if (prox.has(id)) prox.delete(id)
      else prox.add(id)
      return prox
    })

  const meta = [
    loja.tempo_entrega != null ? `${loja.tempo_entrega} min` : null,
    loja.taxa_entrega === 0
      ? 'Entrega grátis'
      : loja.taxa_entrega != null
        ? `Entrega ${formatarReais(loja.taxa_entrega)}`
        : null,
    'Aberto',
  ]
    .filter(Boolean)
    .join('  ·  ')

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style={depoisDoHero ? 'dark' : 'light'} />

      {/* Header fixo animado */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: insets.top + 6,
          paddingBottom: 12,
          backgroundColor: colors.surface,
          opacity: headerBg,
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: insets.top + 6,
          left: spacing.screenX - 8,
          right: spacing.screenX - 8,
          zIndex: 11,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <AcaoHero
          icone="back"
          progresso={{ claro: headerBgInverso, escuro: headerBg }}
          aoTocar={(e) =>
            iniciarSaida({
              acao: () => router.back(),
              cor: colors.accent,
              origem: { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY },
            })
          }
        />
        <Animated.Text
          numberOfLines={1}
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 16,
            color: colors.ink,
            opacity: headerBg,
            letterSpacing: -0.2,
            ...fontStyle(design.display, 700),
          }}
        >
          {loja.nome}
        </Animated.Text>
        <AcaoHero
          icone="heart"
          cheio={lojaFavorita}
          progresso={{ claro: headerBgInverso, escuro: headerBg }}
          aoTocar={() => setLojaFavorita((v) => !v)}
        />
        <View style={{ width: 6 }} />
        <AcaoHero
          icone="bag"
          contador={totalItens}
          progresso={{ claro: headerBgInverso, escuro: headerBg }}
          aoTocar={() => totalItens > 0 && router.push('/checkout')}
        />
      </View>

      <Animated.ScrollView
        ref={scrollRef as any}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: espacoFinal + ALTURA_BARRA_MENU + 12,
        }}
      >
        {/* ── Hero full-bleed com carrossel de campanhas ── */}
        <View style={{ height: HERO_H, backgroundColor: colors.surfaceDark }}>
          <ScrollView
            ref={heroRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x
              heroOffsetRef.current = x
              heroX.setValue(x)
            }}
            onScrollBeginDrag={() => {
              // Usuário assumiu o controle: para o glide e segura o autoplay.
              glideRef.current?.stop()
              setAutoplayPausado(true)
            }}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W)
              if (idx >= slides.length) {
                heroRef.current?.scrollTo({ x: 0, animated: false })
                setSlideAtivo(0)
              } else {
                setSlideAtivo(idx)
              }
              setAutoplayPausado(false)
            }}
          >
            {slidesRender.map((slide, i) => {
              // Camadas: a foto anda a ~15% do glide (parallax de profundidade)
              // e o texto se dissolve ao sair do quadro. Com "reduzir
              // movimento", ambas desligam.
              const parallax = heroX.interpolate({
                inputRange: [
                  (i - 1) * SCREEN_W,
                  i * SCREEN_W,
                  (i + 1) * SCREEN_W,
                ],
                outputRange: [-SCREEN_W * 0.15, 0, SCREEN_W * 0.15],
                extrapolate: 'clamp',
              })
              const opacidadeTexto = heroX.interpolate({
                inputRange: [
                  (i - 0.55) * SCREEN_W,
                  i * SCREEN_W,
                  (i + 0.55) * SCREEN_W,
                ],
                outputRange: [0, 1, 0],
                extrapolate: 'clamp',
              })
              return (
              <View
                key={i}
                style={{ width: SCREEN_W, height: HERO_H, overflow: 'hidden' }}
              >
                {slide.imagem && (
                  <Animated.Image
                    source={{ uri: slide.imagem }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: -Math.round(SCREEN_W * 0.15),
                      width: Math.round(SCREEN_W * 1.3),
                      height: '100%',
                      transform: reduzirMovimento
                        ? []
                        : [{ translateX: parallax }],
                    }}
                    resizeMode="cover"
                  />
                )}
                <Image
                  source={{ uri: GRADIENTE_HERO }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100%',
                    height: '100%',
                  }}
                  resizeMode="stretch"
                />

                {/* Overlay tipográfico editorial */}
                <Animated.View
                  style={{
                    position: 'absolute',
                    left: spacing.screenX,
                    right: spacing.screenX,
                    bottom: 64,
                    gap: 6,
                    opacity: reduzirMovimento ? 1 : opacidadeTexto,
                  }}
                >
                  <View style={{ gap: 5, marginBottom: 4 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        letterSpacing: 2.2,
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.85)',
                        ...fontStyle(design.body, 500),
                      }}
                    >
                      {slide.eyebrow}
                    </Text>
                    <View
                      style={{
                        width: 36,
                        height: 1,
                        backgroundColor: 'rgba(255,255,255,0.55)',
                      }}
                    />
                  </View>
                  <Text
                    numberOfLines={2}
                    style={{
                      fontSize: Math.round(40 * typeFactor),
                      lineHeight: Math.round(44 * typeFactor),
                      color: '#FFFFFF',
                      letterSpacing: -0.8,
                      ...fontStyle(design.display, 800),
                    }}
                  >
                    {slide.titulo}
                  </Text>
                  {slide.subtitulo && (
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 15,
                        color: 'rgba(255,255,255,0.92)',
                        ...fontStyle(design.body, 500),
                      }}
                    >
                      {slide.subtitulo}
                    </Text>
                  )}
                </Animated.View>

                {/* CTA pill escura, discreta, à direita — como na referência */}
                <Animated.View
                  style={{
                    position: 'absolute',
                    right: spacing.screenX,
                    bottom: 18,
                    opacity: reduzirMovimento ? 1 : opacidadeTexto,
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={consumerDesign.opacity.pressed}
                    onPress={() => {
                      if (slide.produto) aoAbrirProduto(slide.produto)
                      else
                        (scrollRef.current as any)?.scrollTo?.({
                          y: HERO_H - insets.top - 48,
                          animated: true,
                        })
                    }}
                    style={{
                      backgroundColor: colors.ink,
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                      borderRadius: 999,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.canvas,
                        ...fontStyle(design.body, 600),
                      }}
                    >
                      {slide.cta}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
              )
            })}
          </ScrollView>

          {/* Dots do carrossel */}
          {slides.length > 1 && (
            <View
              style={{
                position: 'absolute',
                left: spacing.screenX,
                bottom: 26,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
              }}
            >
              {slides.map((_, i) =>
                i === slideAtivo ? (
                  <View
                    key={i}
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 5,
                      borderWidth: 1.5,
                      borderColor: '#FFFFFF',
                    }}
                  />
                ) : (
                  <View
                    key={i}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: 'rgba(255,255,255,0.6)',
                    }}
                  />
                ),
              )}
            </View>
          )}
        </View>

        {/* ── Identidade da loja: nome + meta, sem pills nem caixas ── */}
        <View
          style={{
            paddingHorizontal: spacing.screenX,
            paddingTop: 24,
            paddingBottom: 4,
            gap: 6,
            backgroundColor: colors.canvas,
          }}
        >
          <Text
            style={{
              fontSize: Math.round(24 * typeFactor),
              color: colors.ink,
              letterSpacing: -0.5,
              ...fontStyle(design.display, 800),
            }}
          >
            {loja.nome}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: colors.inkMuted,
              ...fontStyle(design.body, 500),
            }}
          >
            {meta}
          </Text>
          {loja.descricao && (
            <Text
              numberOfLines={2}
              style={{
                fontSize: 14,
                lineHeight: 20,
                color: colors.inkMuted,
                ...fontStyle(design.body, 400),
              }}
            >
              {loja.descricao}
            </Text>
          )}
        </View>

        {/* ── Seções ── */}
        {secoes.map((secao, i) => {
          const expandida = expandidas.has(i)
          return (
            <View key={secao.titulo} style={{ marginTop: 30 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  paddingHorizontal: spacing.screenX,
                  marginBottom: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: Math.round(22 * typeFactor),
                    color: colors.ink,
                    letterSpacing: -0.4,
                    ...fontStyle(design.display, 700),
                  }}
                >
                  {secao.titulo}
                </Text>
                {secao.produtos.length > 2 && (
                  <TouchableOpacity
                    onPress={() => alternarExpandida(i)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.inkMuted,
                        ...fontStyle(design.body, 500),
                      }}
                    >
                      {expandida ? 'Ver menos' : 'Ver tudo'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {i === 0 ? (
                <SecaoVitrineRail
                  produtos={secao.produtos}
                  expandida={expandida}
                  favoritos={favoritos}
                  alternarFavorito={alternarFavorito}
                  aoAbrirProduto={aoAbrirProduto}
                />
              ) : (
                <SecaoListaCompacta
                  produtos={secao.produtos}
                  expandida={expandida}
                  aoAbrirProduto={aoAbrirProduto}
                />
              )}
            </View>
          )
        })}
      </Animated.ScrollView>

      <BarraMenuEditorial />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Barra de menu inferior — estilo editorial da referência
// ─────────────────────────────────────────────────────────────

const ITENS_MENU: {
  rotulo: string
  icone: ConsumerIconName
  rota: string
  ativo?: boolean
}[] = [
  // A loja é navegada a partir do Início — é o item "aceso" da barra.
  { rotulo: 'Início', icone: 'home', rota: '/', ativo: true },
  { rotulo: 'Explorar', icone: 'reels', rota: '/explorar' },
  { rotulo: 'Pedidos', icone: 'orders', rota: '/pedidos' },
  { rotulo: 'Perfil', icone: 'user', rota: '/perfil' },
]

/**
 * Barra de menu no DNA da referência: fundo branco com fio superior, ícones
 * de traço fino com rótulo minúsculo, ativo em ink / inativo em cinza — sem a
 * pill escura flutuante do app (aqui a pele é da loja). Navegar sai da loja
 * para a aba correspondente.
 */
function BarraMenuEditorial() {
  const design = useStoreDesign()
  const { colors } = design
  const insets = useSafeAreaInsets()
  const iniciarSaida = useTransicaoSaida((s) => s.iniciar)

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 12,
        flexDirection: 'row',
        backgroundColor: colors.canvas,
        borderTopWidth: 1,
        borderTopColor: colors.line,
        paddingTop: 10,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      {ITENS_MENU.map((item) => {
        const cor = item.ativo ? colors.ink : colors.inkSoft
        return (
          <TouchableOpacity
            key={item.rota}
            onPress={(e) =>
              // Sair da loja é mudar de ambiente: a cor da paleta da loja
              // floresce do toque, cobre a tela e dissolve no Mallevo
              // (TransicaoMallevo) antes de revelar o destino.
              iniciarSaida({
                acao: () => router.navigate(item.rota as never),
                cor: colors.accent,
                origem: { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY },
              })
            }
            activeOpacity={0.7}
            style={{ flex: 1, alignItems: 'center', gap: 4 }}
          >
            <ConsumerIcon
              name={item.icone}
              size={21}
              color={cor}
              strokeWidth={item.ativo ? 2.1 : 1.7}
            />
            <Text
              style={{
                fontSize: 10,
                letterSpacing: 0.2,
                color: cor,
                ...fontStyle(design.body, item.ativo ? 600 : 500),
              }}
            >
              {item.rotulo}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Rail de vitrine — cards retrato 3:4 sem chrome, com peek
// ─────────────────────────────────────────────────────────────

function SecaoVitrineRail<T extends ProdutoVitrine>({
  produtos,
  expandida,
  favoritos,
  alternarFavorito,
  aoAbrirProduto,
}: {
  produtos: T[]
  expandida: boolean
  favoritos: Set<string>
  alternarFavorito: (id: string) => void
  aoAbrirProduto: (p: T) => void
}) {
  const { spacing } = useStoreDesign()
  // 2 cards inteiros + peek do terceiro na borda (convite ao swipe)
  const larguraRail = Math.round((SCREEN_W - spacing.screenX * 2 - 12) / 2.18)
  const larguraGrade = Math.round((SCREEN_W - spacing.screenX * 2 - 12) / 2)

  if (expandida) {
    return (
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
          paddingHorizontal: spacing.screenX,
        }}
      >
        {produtos.map((p, idx) => (
          <CardVitrine
            key={p.id}
            produto={p}
            largura={larguraGrade}
            primeiro={idx === 0}
            favorito={favoritos.has(p.id)}
            alternarFavorito={() => alternarFavorito(p.id)}
            aoTocar={() => aoAbrirProduto(p)}
          />
        ))}
      </View>
    )
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: spacing.screenX,
        gap: 12,
      }}
      decelerationRate="fast"
      snapToInterval={larguraRail + 12}
      snapToAlignment="start"
    >
      {produtos.map((p, idx) => (
        <CardVitrine
          key={p.id}
          produto={p}
          largura={larguraRail}
          primeiro={idx === 0}
          favorito={favoritos.has(p.id)}
          alternarFavorito={() => alternarFavorito(p.id)}
          aoTocar={() => aoAbrirProduto(p)}
        />
      ))}
    </ScrollView>
  )
}

function CardVitrine({
  produto,
  largura,
  primeiro,
  favorito,
  alternarFavorito,
  aoTocar,
}: {
  produto: ProdutoVitrine
  largura: number
  primeiro: boolean
  favorito: boolean
  alternarFavorito: () => void
  aoTocar: () => void
}) {
  const design = useStoreDesign()
  const { colors } = design
  const desc = descontoPct(produto)
  const badge = desc > 0 ? `-${desc}%` : primeiro ? 'Novo' : null

  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      style={{ width: largura }}
    >
      <View>
        <Image
          source={{ uri: produto.foto_url ?? undefined }}
          style={{
            width: largura,
            height: Math.round(largura * 1.33),
            borderRadius: design.radius.lg,
            backgroundColor: colors.canvasAlt,
          }}
          resizeMode="cover"
        />

        {/* Favorito: círculo branco flutuante, coração só no toque */}
        <TouchableOpacity
          onPress={alternarFavorito}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[
            {
              position: 'absolute',
              top: 10,
              right: 10,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
            },
            consumerDesign.shadow.soft,
          ]}
        >
          {favorito ? (
            <CoracaoCheio size={15} color={colors.danger} />
          ) : (
            <ConsumerIcon name="heart" size={15} color={colors.inkMuted} />
          )}
        </TouchableOpacity>

        {badge && (
          <View
            style={[
              {
                position: 'absolute',
                left: 10,
                bottom: 10,
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
              },
              consumerDesign.shadow.soft,
            ]}
          >
            <Text
              style={{
                fontSize: 11,
                color: colors.ink,
                ...fontStyle(design.body, 600),
              }}
            >
              {badge}
            </Text>
          </View>
        )}
      </View>

      <Text
        numberOfLines={1}
        style={{
          marginTop: 10,
          fontSize: 15,
          color: colors.ink,
          ...fontStyle(design.body, 600),
        }}
      >
        {produto.nome}
      </Text>
      <PrecoEditorial produto={produto} tamanho={14} />
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────────────────────────
// Lista compacta (thumb + nome + preço) — colunas de 2, com peek
// ─────────────────────────────────────────────────────────────

function SecaoListaCompacta<T extends ProdutoVitrine>({
  produtos,
  expandida,
  aoAbrirProduto,
}: {
  produtos: T[]
  expandida: boolean
  aoAbrirProduto: (p: T) => void
}) {
  const { spacing } = useStoreDesign()
  const larguraColuna = Math.round((SCREEN_W - spacing.screenX * 2) * 0.52)

  if (expandida) {
    return (
      <View style={{ paddingHorizontal: spacing.screenX, gap: 18 }}>
        {produtos.map((p) => (
          <ItemCompacto key={p.id} produto={p} aoTocar={() => aoAbrirProduto(p)} />
        ))}
      </View>
    )
  }

  // Chunk em colunas de 2 itens empilhados, roláveis na horizontal
  const colunas: T[][] = []
  for (let i = 0; i < produtos.length; i += 2) {
    colunas.push(produtos.slice(i, i + 2))
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: spacing.screenX, gap: 16 }}
      decelerationRate="fast"
      snapToInterval={larguraColuna + 16}
      snapToAlignment="start"
    >
      {colunas.map((coluna, i) => (
        <View key={i} style={{ width: larguraColuna, gap: 18 }}>
          {coluna.map((p) => (
            <ItemCompacto
              key={p.id}
              produto={p}
              aoTocar={() => aoAbrirProduto(p)}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  )
}

function ItemCompacto({
  produto,
  aoTocar,
}: {
  produto: ProdutoVitrine
  aoTocar: () => void
}) {
  const design = useStoreDesign()
  const { colors } = design
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
    >
      <Image
        source={{ uri: produto.foto_url ?? undefined }}
        style={{
          width: 64,
          height: 64,
          borderRadius: design.radius.md,
          backgroundColor: colors.canvasAlt,
        }}
        resizeMode="cover"
      />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text
          numberOfLines={2}
          style={{
            fontSize: 14,
            lineHeight: 18,
            color: colors.ink,
            ...fontStyle(design.body, 600),
          }}
        >
          {produto.nome}
        </Text>
        <PrecoEditorial produto={produto} tamanho={13} />
      </View>
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────────────────────────
// Apoio
// ─────────────────────────────────────────────────────────────

/** Preço no tom editorial: cinza discreto; promo = final em ink + original riscado. */
function PrecoEditorial({
  produto,
  tamanho,
}: {
  produto: ProdutoVitrine
  tamanho: number
}) {
  const design = useStoreDesign()
  const { colors } = design
  const temPromo = descontoPct(produto) > 0
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
      <Text
        style={{
          fontSize: tamanho,
          color: temPromo ? colors.ink : colors.inkMuted,
          ...fontStyle(design.body, temPromo ? 600 : 500),
        }}
      >
        {formatarReais(produto.preco_promocional ?? produto.preco)}
      </Text>
      {temPromo && (
        <Text
          style={{
            fontSize: tamanho - 1,
            color: colors.inkSoft,
            textDecorationLine: 'line-through',
            ...fontStyle(design.body, 400),
          }}
        >
          {formatarReais(produto.preco)}
        </Text>
      )}
    </View>
  )
}

/** Coração preenchido (a lib de ícones é stroke-only). */
function CoracaoCheio({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M12 20.5s-7.5-4.5-7.5-10A4 4 0 0 1 12 7.5 4 4 0 0 1 19.5 10.5c0 5.5-7.5 10-7.5 10z"
      />
    </Svg>
  )
}

/**
 * Ação do header do hero: ícone branco sem fundo sobre a foto que faz
 * crossfade para ink quando o header claro assume no scroll.
 */
function AcaoHero({
  icone,
  aoTocar,
  progresso,
  contador = 0,
  cheio = false,
}: {
  icone: 'back' | 'heart' | 'bag'
  aoTocar: (e: GestureResponderEvent) => void
  progresso: { claro: Animated.AnimatedInterpolation<number>; escuro: Animated.AnimatedInterpolation<number> }
  contador?: number
  cheio?: boolean
}) {
  const { colors } = useStoreDesign()
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={0.7}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View style={{ position: 'absolute', opacity: progresso.claro }}>
        {cheio ? (
          <CoracaoCheio size={22} color="#FFFFFF" />
        ) : (
          <ConsumerIcon name={icone} size={22} color="#FFFFFF" strokeWidth={2} />
        )}
      </Animated.View>
      <Animated.View style={{ opacity: progresso.escuro }}>
        {cheio ? (
          <CoracaoCheio size={22} color={colors.danger} />
        ) : (
          <ConsumerIcon name={icone} size={22} color={colors.ink} strokeWidth={2} />
        )}
      </Animated.View>
      {contador > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 3,
            right: 0,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: colors.danger,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ fontSize: 10, color: '#FFFFFF', fontWeight: '700' }}>
            {contador}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}
