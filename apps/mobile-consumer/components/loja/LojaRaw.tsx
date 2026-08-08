import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type TextStyle,
} from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { formatarReais } from '@mallevo/lib'
import { ConsumerIcon, type ConsumerIconName } from '@/components/ConsumerIcon'
import { useCartStore } from '@/store/useCartStore'
import { useTransicaoSaida } from '@/store/useTransicaoSaida'
import { GRADIENTE_HERO } from '@/components/loja/gradientes'
import { type ProdutoVitrine } from '@/components/loja/LojaEditorial'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * Vitrine raw/street — layout PRÓPRIO do arquétipo `raw` para streetwear
 * (docs/store-theme/02 §B; referência-âncora: Rawline).
 *
 * DNA destilado da referência:
 * - hero full-bleed estático com eyebrow MONO e headline condensada em caps;
 * - FAIXA CTA full-width no accent ("COMPRAR AGORA ↗") — nada de pill;
 * - drop em MOLDURA grossa no accent com rail de produtos;
 * - grid 2-col de cards com borda fina, coração à esquerda, tag de desconto
 *   no accent à direita e nome em MONO caps;
 * - flourish de contraste: primeira palavra do título de seção em serif
 *   itálico minúsculo, resto em caps no accent ("black friday SALE");
 * - cantos retos em tudo; sem vidro, sem sombra — só borda e cor.
 *
 * Como no editorial: sacola única no header (sem FAB) e saída via transição
 * radial na cor da paleta (aqui, o vermelhão).
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const HERO_H = Math.round(SCREEN_H * 0.48)
const ALTURA_BARRA_MENU = 58

/** Tipografia mono de sistema — o "typewriter" da referência, sem dep nova. */
const MONO_FAMILY = Platform.select({ ios: 'Menlo', default: 'monospace' })
const mono = (peso: TextStyle['fontWeight'] = '400'): TextStyle => ({
  fontFamily: MONO_FAMILY,
  fontWeight: peso,
})
/** Serif itálico de sistema para o flourish dos títulos de seção. */
const SERIF_ITALICO: TextStyle = {
  fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }),
  fontStyle: 'italic',
}

interface SecaoLoja<T extends ProdutoVitrine> {
  titulo: string
  produtos: T[]
}

interface SlideRaw<T extends ProdutoVitrine> {
  imagem: string | null
  eyebrow: string
  titulo: string
  legenda: string | null
  produto: T | null
}

interface Props<T extends ProdutoVitrine> {
  loja: {
    nome: string
    descricao?: string | null
    banner_url?: string | null
    tempo_entrega?: number | null
    taxa_entrega?: number | null
  }
  secoes: SecaoLoja<T>[]
  aoAbrirProduto: (produto: T) => void
  espacoFinal: number
}

function descontoPct(p: ProdutoVitrine): number {
  if (!p.preco_promocional || p.preco_promocional >= p.preco) return 0
  return Math.round((1 - p.preco_promocional / p.preco) * 100)
}

export function LojaRaw<T extends ProdutoVitrine>({
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
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set())
  const [lojaFavorita, setLojaFavorita] = useState(false)
  const [expandidas, setExpandidas] = useState<Set<number>>(new Set())

  // Autoplay do hero — mesmo motor da vitrine editorial, personalidade raw:
  // glide mais curto e seco, dwell menor.
  const heroRef = useRef<ScrollView>(null)
  const heroX = useRef(new Animated.Value(0)).current
  const heroOffsetRef = useRef(0)
  const glideRef = useRef<Animated.CompositeAnimation | null>(null)
  const glideValor = useRef(new Animated.Value(0)).current
  const [slideAtivo, setSlideAtivo] = useState(0)
  const [autoplayPausado, setAutoplayPausado] = useState(false)
  const [depoisDoHero, setDepoisDoHero] = useState(false)
  const [reduzirMovimento, setReduzirMovimento] = useState(false)

  const maxDesc = useMemo(
    () => Math.max(0, ...secoes.flatMap((s) => s.produtos).map(descontoPct)),
    [secoes],
  )

  // Slides: campanha (banner + oferta agregada) + primeiras peças do drop.
  const slides = useMemo<SlideRaw<T>[]>(() => {
    const campanha: SlideRaw<T> = {
      imagem: loja.banner_url ?? null,
      eyebrow:
        maxDesc > 0 ? `ATÉ ${maxDesc}% OFF NO DROP` : 'VISTA O INCONVENCIONAL',
      titulo: loja.nome,
      legenda: null,
      produto: null,
    }
    const destaque = (secoes[0]?.produtos ?? [])
      .filter((p) => p.foto_url)
      .slice(0, 3)
      .map((p): SlideRaw<T> => ({
        imagem: p.foto_url,
        eyebrow: secoes[0].titulo.toUpperCase(),
        titulo: p.nome,
        legenda: formatarReais(p.preco_promocional ?? p.preco),
        produto: p,
      }))
    return [campanha, ...destaque]
  }, [loja, secoes, maxDesc])

  // Pausa o autoplay quando o hero sai da tela.
  useEffect(() => {
    const limiar = HERO_H - 140
    const sub = scrollY.addListener(({ value }) => {
      setDepoisDoHero(value > limiar)
    })
    return () => scrollY.removeListener(sub)
  }, [scrollY])

  // "Reduzir movimento" desliga autoplay, parallax e dissolve.
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

  // Glide punchy (360ms, aterrissagem dura) — raw estala, não flutua.
  const deslizarPara = (prox: number) => {
    glideRef.current?.stop()
    glideValor.setValue(heroOffsetRef.current)
    const sub = glideValor.addListener(({ value }) => {
      heroRef.current?.scrollTo({ x: value, animated: false })
    })
    const anim = Animated.timing(glideValor, {
      toValue: prox * SCREEN_W,
      duration: 360,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    })
    glideRef.current = anim
    anim.start(({ finished }) => {
      glideValor.removeListener(sub)
      if (!finished) return
      if (prox >= slides.length) {
        // Clone do primeiro slide no fim → salto invisível para o começo.
        heroRef.current?.scrollTo({ x: 0, animated: false })
        setSlideAtivo(0)
      } else {
        setSlideAtivo(prox)
      }
    })
  }

  // Dwell de 4s por slide enquanto o hero está visível e sem interação.
  useEffect(() => {
    if (slides.length <= 1 || autoplayPausado || depoisDoHero || reduzirMovimento)
      return
    const t = setTimeout(() => deslizarPara(slideAtivo + 1), 4000)
    return () => clearTimeout(t)
  }, [slideAtivo, autoplayPausado, depoisDoHero, reduzirMovimento, slides.length])

  useEffect(() => () => glideRef.current?.stop(), [])

  const slidesRender = slides.length > 1 ? [...slides, slides[0]] : slides

  // Header fixo: bg dark entra ao rolar; ícones são cream o tempo todo (dark).
  const headerBg = scrollY.interpolate({
    inputRange: [HERO_H - 160, HERO_H - 70],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  const alternarFavorito = (id: string) =>
    setFavoritos((atual) => {
      const prox = new Set(atual)
      if (prox.has(id)) prox.delete(id)
      else prox.add(id)
      return prox
    })

  const alternarExpandida = (i: number) =>
    setExpandidas((atual) => {
      const prox = new Set(atual)
      if (prox.has(i)) prox.delete(i)
      else prox.add(i)
      return prox
    })

  const sairPara = (acao: () => void) => (e: GestureResponderEvent) =>
    iniciarSaida({
      acao,
      cor: colors.accent,
      origem: { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY },
    })

  const meta = [
    loja.tempo_entrega != null ? `${loja.tempo_entrega} MIN` : null,
    loja.taxa_entrega === 0
      ? 'ENTREGA GRÁTIS'
      : loja.taxa_entrega != null
        ? `ENTREGA ${formatarReais(loja.taxa_entrega)}`
        : null,
    'ABERTO',
  ]
    .filter(Boolean)
    .join('  ·  ')

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="light" />

      {/* Header fixo */}
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
        <AcaoTopo icone="back" aoTocar={sairPara(() => router.back())} />
        <Animated.Text
          numberOfLines={1}
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 13,
            color: colors.ink,
            opacity: headerBg,
            letterSpacing: 2,
            textTransform: 'uppercase',
            ...mono('700'),
          }}
        >
          {loja.nome}
        </Animated.Text>
        <AcaoTopo
          icone="heart"
          cheio={lojaFavorita}
          aoTocar={() => setLojaFavorita((v) => !v)}
        />
        <View style={{ width: 6 }} />
        <AcaoTopo
          icone="bag"
          contador={totalItens}
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
        {/* ── Hero: carrossel em autoplay (campanha + peças do drop) ── */}
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
              const parallax = heroX.interpolate({
                inputRange: [
                  (i - 1) * SCREEN_W,
                  i * SCREEN_W,
                  (i + 1) * SCREEN_W,
                ],
                outputRange: [-SCREEN_W * 0.12, 0, SCREEN_W * 0.12],
                extrapolate: 'clamp',
              })
              const opacidadeTexto = heroX.interpolate({
                inputRange: [
                  (i - 0.45) * SCREEN_W,
                  i * SCREEN_W,
                  (i + 0.45) * SCREEN_W,
                ],
                outputRange: [0, 1, 0],
                extrapolate: 'clamp',
              })
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.95}
                  disabled={!slide.produto}
                  onPress={() => slide.produto && aoAbrirProduto(slide.produto)}
                  style={{
                    width: SCREEN_W,
                    height: HERO_H,
                    overflow: 'hidden',
                  }}
                >
                  {slide.imagem && (
                    <Animated.Image
                      source={{ uri: slide.imagem }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: -Math.round(SCREEN_W * 0.12),
                        width: Math.round(SCREEN_W * 1.24),
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
                      width: '100%',
                      height: '100%',
                    }}
                    resizeMode="stretch"
                  />
                  <Animated.View
                    style={{
                      position: 'absolute',
                      left: spacing.screenX,
                      right: spacing.screenX,
                      bottom: 20,
                      gap: 8,
                      opacity: reduzirMovimento ? 1 : opacidadeTexto,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        letterSpacing: 2.4,
                        color: 'rgba(255,255,255,0.88)',
                        textTransform: 'uppercase',
                        ...mono('700'),
                      }}
                    >
                      {slide.eyebrow}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{
                        fontSize: Math.round(42 * typeFactor),
                        lineHeight: Math.round(43 * typeFactor),
                        color: '#FFFFFF',
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                        ...fontStyle(design.display, 800),
                      }}
                    >
                      {slide.titulo}
                    </Text>
                    {slide.legenda && (
                      <Text
                        style={{
                          fontSize: 13,
                          color: 'rgba(255,255,255,0.92)',
                          letterSpacing: 1,
                          ...mono('700'),
                        }}
                      >
                        {slide.legenda}
                      </Text>
                    )}
                  </Animated.View>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {/* Marcadores quadrados — o dot do raw tem canto reto */}
          {slides.length > 1 && (
            <View
              style={{
                position: 'absolute',
                right: spacing.screenX,
                bottom: 24,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {slides.map((_, i) => (
                <View
                  key={i}
                  style={
                    i === slideAtivo
                      ? { width: 8, height: 8, backgroundColor: colors.accent }
                      : {
                          width: 4,
                          height: 4,
                          backgroundColor: 'rgba(255,255,255,0.55)',
                        }
                  }
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Faixa CTA full-width no accent — a banda da referência ── */}
        <TouchableOpacity
          activeOpacity={consumerDesign.opacity.pressed}
          onPress={() =>
            (scrollRef.current as any)?.scrollTo?.({
              y: HERO_H + 40,
              animated: true,
            })
          }
          style={{
            height: 56,
            backgroundColor: colors.accent,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          {/* Texto grande (AA large) no creme da paleta, como na referência */}
          <Text
            style={{
              fontSize: 18,
              color: colors.ink,
              letterSpacing: 3,
              textTransform: 'uppercase',
              ...fontStyle(design.display, 800),
            }}
          >
            Comprar agora
          </Text>
          <Text style={{ fontSize: 20, color: colors.ink, ...mono('700') }}>↗</Text>
        </TouchableOpacity>

        {/* ── Identidade: descrição e meta em mono ── */}
        <View
          style={{
            paddingHorizontal: spacing.screenX,
            paddingTop: 18,
            gap: 8,
          }}
        >
          {loja.descricao && (
            <Text
              numberOfLines={2}
              style={{
                fontSize: 12,
                lineHeight: 18,
                color: colors.inkMuted,
                ...mono('400'),
              }}
            >
              {loja.descricao}
            </Text>
          )}
          <Text
            style={{
              fontSize: 10,
              letterSpacing: 1.6,
              color: colors.inkMuted,
              ...mono('700'),
            }}
          >
            {meta}
          </Text>
        </View>

        {/* ── Seções ── */}
        {secoes.map((secao, i) => {
          const expandida = expandidas.has(i)
          return (
            <View key={secao.titulo} style={{ marginTop: 30 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  paddingHorizontal: spacing.screenX,
                  marginBottom: 12,
                }}
              >
                <TituloRaw titulo={secao.titulo} />
                {i > 0 && secao.produtos.length > 4 && (
                  <TouchableOpacity
                    onPress={() => alternarExpandida(i)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        letterSpacing: 1.6,
                        color: colors.ink,
                        ...mono('700'),
                      }}
                    >
                      {expandida ? 'FECHAR ↖' : 'VER TUDO ↗'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {i === 0 ? (
                <MolduraDrop
                  produtos={secao.produtos}
                  aoAbrirProduto={aoAbrirProduto}
                />
              ) : (
                <GridRaw
                  produtos={expandida ? secao.produtos : secao.produtos.slice(0, 4)}
                  favoritos={favoritos}
                  alternarFavorito={alternarFavorito}
                  aoAbrirProduto={aoAbrirProduto}
                />
              )}
            </View>
          )
        })}
      </Animated.ScrollView>

      <BarraMenuRaw sairPara={sairPara} />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Título de seção — serif itálico + caps no accent
// ─────────────────────────────────────────────────────────────

function TituloRaw({ titulo }: { titulo: string }) {
  const design = useStoreDesign()
  const { colors, typeFactor } = design
  const [primeira, ...resto] = titulo.split(' ')
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        flexShrink: 1,
      }}
    >
      <Text
        style={{
          fontSize: Math.round(26 * typeFactor),
          color: colors.ink,
          ...SERIF_ITALICO,
        }}
      >
        {primeira.toLowerCase()}
      </Text>
      {resto.length > 0 && (
        <Text
          numberOfLines={1}
          style={{
            fontSize: Math.round(22 * typeFactor),
            color: colors.accent,
            letterSpacing: 1,
            textTransform: 'uppercase',
            flexShrink: 1,
            ...fontStyle(design.display, 800),
          }}
        >
          {resto.join(' ')}
        </Text>
      )}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Drop na moldura — rail horizontal dentro de borda grossa no accent
// ─────────────────────────────────────────────────────────────

function MolduraDrop<T extends ProdutoVitrine>({
  produtos,
  aoAbrirProduto,
}: {
  produtos: T[]
  aoAbrirProduto: (p: T) => void
}) {
  const design = useStoreDesign()
  const { colors, spacing } = design
  return (
    <View
      style={{
        marginHorizontal: spacing.screenX,
        borderWidth: 3,
        borderColor: colors.accent,
        backgroundColor: colors.canvas,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ padding: 12, gap: 12 }}
        decelerationRate="fast"
        snapToInterval={148 + 12}
        snapToAlignment="start"
      >
        {produtos.map((p) => {
          const desc = descontoPct(p)
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => aoAbrirProduto(p)}
              activeOpacity={consumerDesign.opacity.pressedSoft}
              style={{ width: 148 }}
            >
              <View>
                <Image
                  source={{ uri: p.foto_url ?? undefined }}
                  style={{
                    width: 148,
                    height: 148,
                    backgroundColor: colors.surfaceMuted,
                  }}
                  resizeMode="cover"
                />
                {desc > 0 && <TagDesconto pct={desc} />}
              </View>
              <Text
                numberOfLines={2}
                style={{
                  marginTop: 8,
                  fontSize: 10,
                  lineHeight: 14,
                  minHeight: 28,
                  color: colors.ink,
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                  ...mono('700'),
                }}
              >
                {p.nome}
              </Text>
              <PrecoRaw produto={p} tamanho={12} />
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Grid 2-col — cards com borda fina, coração e tag de desconto
// ─────────────────────────────────────────────────────────────

function GridRaw<T extends ProdutoVitrine>({
  produtos,
  favoritos,
  alternarFavorito,
  aoAbrirProduto,
}: {
  produtos: T[]
  favoritos: Set<string>
  alternarFavorito: (id: string) => void
  aoAbrirProduto: (p: T) => void
}) {
  const { spacing } = useStoreDesign()
  const largura = Math.round((SCREEN_W - spacing.screenX * 2 - 10) / 2)
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        paddingHorizontal: spacing.screenX,
      }}
    >
      {produtos.map((p) => (
        <CardRaw
          key={p.id}
          produto={p}
          largura={largura}
          favorito={favoritos.has(p.id)}
          alternarFavorito={() => alternarFavorito(p.id)}
          aoTocar={() => aoAbrirProduto(p)}
        />
      ))}
    </View>
  )
}

function CardRaw({
  produto,
  largura,
  favorito,
  alternarFavorito,
  aoTocar,
}: {
  produto: ProdutoVitrine
  largura: number
  favorito: boolean
  alternarFavorito: () => void
  aoTocar: () => void
}) {
  const design = useStoreDesign()
  const { colors } = design
  const desc = descontoPct(produto)
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      style={{
        width: largura,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
      }}
    >
      <View>
        <Image
          source={{ uri: produto.foto_url ?? undefined }}
          style={{
            width: '100%',
            height: largura,
            backgroundColor: colors.surfaceMuted,
          }}
          resizeMode="cover"
        />
        {/* Coração à ESQUERDA, como na referência */}
        <TouchableOpacity
          onPress={alternarFavorito}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ position: 'absolute', top: 10, left: 10 }}
        >
          {favorito ? (
            <CoracaoCheioRaw size={18} color={colors.accent} />
          ) : (
            <ConsumerIcon name="heart" size={18} color={colors.ink} strokeWidth={1.9} />
          )}
        </TouchableOpacity>
        {desc > 0 && <TagDesconto pct={desc} />}
      </View>

      <View style={{ padding: 12, gap: 8 }}>
        <Text
          numberOfLines={2}
          style={{
            fontSize: 11,
            lineHeight: 15,
            minHeight: 30,
            color: colors.ink,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            ...mono('700'),
          }}
        >
          {produto.nome}
        </Text>
        <PrecoRaw produto={produto} tamanho={13} />
      </View>
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────────────────────────
// Apoio
// ─────────────────────────────────────────────────────────────

function TagDesconto({ pct }: { pct: number }) {
  const { colors } = useStoreDesign()
  return (
    <View
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: colors.accent,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          color: colors.accentInk,
          letterSpacing: 0.6,
          ...mono('700'),
        }}
      >
        {pct}% OFF
      </Text>
    </View>
  )
}

/** Preço raw: final em mono cream, original riscado ao lado. */
function PrecoRaw({
  produto,
  tamanho,
}: {
  produto: ProdutoVitrine
  tamanho: number
}) {
  const { colors } = useStoreDesign()
  const temPromo = descontoPct(produto) > 0
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
      <Text style={{ fontSize: tamanho, color: colors.ink, ...mono('700') }}>
        {formatarReais(produto.preco_promocional ?? produto.preco)}
      </Text>
      {temPromo && (
        <Text
          style={{
            fontSize: tamanho - 2,
            color: colors.inkMuted,
            textDecorationLine: 'line-through',
            ...mono('400'),
          }}
        >
          {formatarReais(produto.preco)}
        </Text>
      )}
    </View>
  )
}

function CoracaoCheioRaw({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M12 20.5s-7.5-4.5-7.5-10A4 4 0 0 1 12 7.5 4 4 0 0 1 19.5 10.5c0 5.5-7.5 10-7.5 10z"
      />
    </Svg>
  )
}

/** Ação do topo: ícone cream direto sobre a foto/header (tema dark). */
function AcaoTopo({
  icone,
  aoTocar,
  contador = 0,
  cheio = false,
}: {
  icone: 'back' | 'heart' | 'bag'
  aoTocar: (e: GestureResponderEvent) => void
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
      {cheio ? (
        <CoracaoCheioRaw size={22} color={colors.accent} />
      ) : (
        <ConsumerIcon name={icone} size={22} color={colors.ink} strokeWidth={2} />
      )}
      {contador > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 3,
            right: 0,
            minWidth: 16,
            height: 16,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ fontSize: 9, color: colors.accentInk, ...mono('700') }}>
            {contador}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────────────────────────
// Barra de menu — dark, mono, cantos retos
// ─────────────────────────────────────────────────────────────

const ITENS_MENU: {
  rotulo: string
  icone: ConsumerIconName
  rota: string
  ativo?: boolean
}[] = [
  { rotulo: 'INÍCIO', icone: 'home', rota: '/', ativo: true },
  { rotulo: 'EXPLORAR', icone: 'reels', rota: '/explorar' },
  { rotulo: 'PEDIDOS', icone: 'orders', rota: '/pedidos' },
  { rotulo: 'PERFIL', icone: 'user', rota: '/perfil' },
]

function BarraMenuRaw({
  sairPara,
}: {
  sairPara: (acao: () => void) => (e: GestureResponderEvent) => void
}) {
  const { colors } = useStoreDesign()
  const insets = useSafeAreaInsets()
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 12,
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.line,
        paddingTop: 10,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      {ITENS_MENU.map((item) => {
        const cor = item.ativo ? colors.ink : colors.inkMuted
        return (
          <TouchableOpacity
            key={item.rota}
            onPress={sairPara(() => router.navigate(item.rota as never))}
            activeOpacity={0.7}
            style={{ flex: 1, alignItems: 'center', gap: 5 }}
          >
            <ConsumerIcon
              name={item.icone}
              size={20}
              color={cor}
              strokeWidth={item.ativo ? 2.1 : 1.7}
            />
            <Text
              style={{
                fontSize: 8,
                letterSpacing: 1.2,
                color: cor,
                ...mono(item.ativo ? '700' : '400'),
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
