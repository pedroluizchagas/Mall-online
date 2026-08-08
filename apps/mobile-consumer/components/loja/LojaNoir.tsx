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
import { fontStyle, fontStyleItalico } from '@/lib/store-fonts'

/**
 * Vitrine noir gastronômica — layout PRÓPRIO do arquétipo `noir` para
 * restaurantes refinados (docs/store-theme/02 §D; referência: The Obscura).
 *
 * DNA destilado da referência:
 * - preto profundo, marfim e DOURADO; serifa de alto contraste (Cormorant);
 * - hero dramático com nome em serifa gigante e CTA de CONTORNO RETO em
 *   caps espaçadas ("RESERVE A TABLE");
 * - CARDÁPIO-LIVRO: nome do prato em serifa ITÁLICA, ingredientes em serifa
 *   apagada separados por " · ", preço em dourado à direita, fios finos;
 * - carrossel CENTRAL de pratos: cartão do meio em destaque, vizinhos
 *   encolhidos e apagados, setas circuladas finas;
 * - fecho "O espaço" com foto da casa.
 *
 * Sacola única no header; saída via transição radial dourada.
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const HERO_H = Math.round(SCREEN_H * 0.56)
const ALTURA_BARRA_MENU = 58
const MARFIM = 'rgba(248, 244, 236, 0.97)'

interface SecaoLoja<T extends ProdutoVitrine> {
  titulo: string
  produtos: T[]
}

interface SlideNoir<T extends ProdutoVitrine> {
  imagem: string | null
  eyebrow: string
  titulo: string
  legenda: string | null
  cta: string
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

function precoFinalDe(p: ProdutoVitrine): number {
  return p.preco_promocional ?? p.preco
}

export function LojaNoir<T extends ProdutoVitrine>({
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
  const [depoisDoHero, setDepoisDoHero] = useState(false)

  // Autoplay do hero — o ritmo mais dramático do sistema.
  const heroRef = useRef<ScrollView>(null)
  const heroX = useRef(new Animated.Value(0)).current
  const heroOffsetRef = useRef(0)
  const glideRef = useRef<Animated.CompositeAnimation | null>(null)
  const glideValor = useRef(new Animated.Value(0)).current
  const [slideAtivo, setSlideAtivo] = useState(0)
  const [autoplayPausado, setAutoplayPausado] = useState(false)
  const [reduzirMovimento, setReduzirMovimento] = useState(false)

  const slides = useMemo<SlideNoir<T>[]>(() => {
    const campanha: SlideNoir<T> = {
      imagem: loja.banner_url ?? null,
      eyebrow: 'Alta gastronomia',
      titulo: loja.nome,
      legenda: loja.descricao ?? null,
      cta: 'Ver o cardápio',
      produto: null,
    }
    const destaque = (secoes[0]?.produtos ?? [])
      .filter((p) => p.foto_url)
      .slice(0, 3)
      .map((p): SlideNoir<T> => ({
        imagem: p.foto_url,
        eyebrow: secoes[0].titulo,
        titulo: p.nome,
        legenda: formatarReais(precoFinalDe(p)),
        cta: 'Ver prato',
        produto: p,
      }))
    return [campanha, ...destaque]
  }, [loja, secoes])

  useEffect(() => {
    const limiar = HERO_H - 160
    const sub = scrollY.addListener(({ value }) => {
      setDepoisDoHero(value > limiar)
    })
    return () => scrollY.removeListener(sub)
  }, [scrollY])

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

  // Glide dramático: 700ms — a cortina abre devagar.
  const deslizarPara = (prox: number) => {
    glideRef.current?.stop()
    glideValor.setValue(heroOffsetRef.current)
    const sub = glideValor.addListener(({ value }) => {
      heroRef.current?.scrollTo({ x: value, animated: false })
    })
    const anim = Animated.timing(glideValor, {
      toValue: prox * SCREEN_W,
      duration: 700,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    })
    glideRef.current = anim
    anim.start(({ finished }) => {
      glideValor.removeListener(sub)
      if (!finished) return
      if (prox >= slides.length) {
        heroRef.current?.scrollTo({ x: 0, animated: false })
        setSlideAtivo(0)
      } else {
        setSlideAtivo(prox)
      }
    })
  }

  useEffect(() => {
    if (slides.length <= 1 || autoplayPausado || depoisDoHero || reduzirMovimento)
      return
    const t = setTimeout(() => deslizarPara(slideAtivo + 1), 6000)
    return () => clearTimeout(t)
  }, [slideAtivo, autoplayPausado, depoisDoHero, reduzirMovimento, slides.length])

  useEffect(() => () => glideRef.current?.stop(), [])

  const slidesRender = slides.length > 1 ? [...slides, slides[0]] : slides

  const sairPara = (acao: () => void) => (e: GestureResponderEvent) =>
    iniciarSaida({
      acao,
      cor: colors.accent,
      origem: { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY },
    })

  const headerBg = scrollY.interpolate({
    inputRange: [HERO_H - 180, HERO_H - 90],
    outputRange: [0, 1],
    extrapolate: 'clamp',
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
    .join('   ·   ')

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="light" />

      {/* Header: transparente → preto com fio */}
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
          backgroundColor: colors.canvas,
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
        <AcaoNoir icone="back" aoTocar={sairPara(() => router.back())} />
        {/* Wordmark dourado em itálico — a assinatura OBSCURA */}
        <Animated.Text
          numberOfLines={1}
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 14,
            letterSpacing: 2.5,
            textTransform: 'uppercase',
            color: colors.accent,
            opacity: headerBg,
            ...fontStyleItalico(design.display, 600),
          }}
        >
          {loja.nome}
        </Animated.Text>
        <AcaoNoir
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
        {/* ── Hero dramático ── */}
        <View style={{ height: HERO_H, backgroundColor: colors.canvas }}>
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
                outputRange: [-SCREEN_W * 0.1, 0, SCREEN_W * 0.1],
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
                        left: -Math.round(SCREEN_W * 0.1),
                        width: Math.round(SCREEN_W * 1.2),
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
                      bottom: 26,
                      gap: 10,
                      alignItems: 'flex-start',
                      opacity: reduzirMovimento ? 1 : opacidadeTexto,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        letterSpacing: 3,
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.8)',
                        ...fontStyle(design.body, 500),
                      }}
                    >
                      {slide.eyebrow}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{
                        fontSize: Math.round(44 * typeFactor),
                        lineHeight: Math.round(50 * typeFactor),
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        color: MARFIM,
                        ...fontStyle(design.display, 600),
                      }}
                    >
                      {slide.titulo}
                    </Text>
                    {slide.legenda && (
                      <Text
                        numberOfLines={2}
                        style={{
                          fontSize: 14,
                          lineHeight: 20,
                          color: 'rgba(255,255,255,0.85)',
                          ...fontStyle(design.body, 400),
                        }}
                      >
                        {slide.legenda}
                      </Text>
                    )}
                    {/* CTA de contorno RETO em caps espaçadas */}
                    <TouchableOpacity
                      activeOpacity={consumerDesign.opacity.pressed}
                      onPress={() => {
                        if (slide.produto) aoAbrirProduto(slide.produto)
                        else
                          (scrollRef.current as any)?.scrollTo?.({
                            y: HERO_H - insets.top,
                            animated: true,
                          })
                      }}
                      style={{
                        marginTop: 6,
                        paddingHorizontal: 24,
                        paddingVertical: 13,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.85)',
                        borderRadius: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          letterSpacing: 2.5,
                          textTransform: 'uppercase',
                          color: MARFIM,
                          ...fontStyle(design.body, 500),
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

          {slides.length > 1 && (
            <View
              style={{
                position: 'absolute',
                right: spacing.screenX,
                bottom: 28,
                flexDirection: 'row',
                gap: 6,
              }}
            >
              {slides.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: i === slideAtivo ? 20 : 8,
                    height: 2,
                    backgroundColor:
                      i === slideAtivo ? colors.accent : 'rgba(255,255,255,0.4)',
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── O cardápio-livro ── */}
        <View style={{ paddingHorizontal: spacing.screenX, paddingTop: 36 }}>
          <Text
            style={{
              fontSize: 11,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: colors.inkMuted,
              ...fontStyle(design.body, 500),
            }}
          >
            O cardápio
          </Text>
          <Text
            style={{
              marginTop: 10,
              fontSize: Math.round(34 * typeFactor),
              color: MARFIM,
              ...fontStyle(design.display, 500),
            }}
          >
            Da nossa cozinha
          </Text>
          <Text
            style={{
              marginTop: 10,
              fontSize: 13,
              color: colors.inkMuted,
              ...fontStyle(design.body, 400),
            }}
          >
            {meta}
          </Text>
        </View>

        {secoes.map((secao) => (
          <View
            key={secao.titulo}
            style={{ paddingHorizontal: spacing.screenX, marginTop: 34 }}
          >
            <Text
              style={{
                fontSize: 12,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: colors.accent,
                marginBottom: 6,
                ...fontStyle(design.body, 500),
              }}
            >
              {secao.titulo}
            </Text>
            {secao.produtos.map((p) => (
              <LinhaCardapio
                key={p.id}
                produto={p}
                aoTocar={() => aoAbrirProduto(p)}
              />
            ))}
          </View>
        ))}

        {/* ── Da casa: carrossel central com setas circuladas ── */}
        {secoes[0] && (
          <View style={{ marginTop: 40 }}>
            <Text
              style={{
                fontSize: 11,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: colors.inkMuted,
                textAlign: 'center',
                marginBottom: 18,
                ...fontStyle(design.body, 500),
              }}
            >
              Da casa
            </Text>
            <CarrosselCentral
              produtos={secoes[0].produtos.filter((p) => p.foto_url)}
              aoAbrirProduto={aoAbrirProduto}
            />
          </View>
        )}

        {/* ── O espaço ── */}
        {loja.banner_url && (
          <View style={{ marginTop: 42 }}>
            <View style={{ paddingHorizontal: spacing.screenX, marginBottom: 14 }}>
              <Text
                style={{
                  fontSize: 11,
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  color: colors.inkMuted,
                  ...fontStyle(design.body, 500),
                }}
              >
                O espaço
              </Text>
              <Text
                style={{
                  marginTop: 8,
                  fontSize: Math.round(30 * typeFactor),
                  color: MARFIM,
                  ...fontStyle(design.display, 500),
                }}
              >
                Feita para demorar
              </Text>
            </View>
            <Image
              source={{ uri: loja.banner_url }}
              style={{ width: '100%', height: 300 }}
              resizeMode="cover"
            />
          </View>
        )}
      </Animated.ScrollView>

      <BarraMenuNoir sairPara={sairPara} />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Linha do cardápio-livro — itálico, ingredientes apagados, preço dourado
// ─────────────────────────────────────────────────────────────

function LinhaCardapio({
  produto,
  aoTocar,
}: {
  produto: ProdutoVitrine
  aoTocar: () => void
}) {
  const design = useStoreDesign()
  const { colors } = design
  const temPromo =
    !!produto.preco_promocional && produto.preco_promocional < produto.preco
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 21,
            color: MARFIM,
            ...fontStyleItalico(design.display, 500),
          }}
        >
          {produto.nome}
        </Text>
        {produto.descricao && (
          <Text
            numberOfLines={2}
            style={{
              fontSize: 15,
              lineHeight: 21,
              color: colors.inkMuted,
              ...fontStyle(design.display, 500),
            }}
          >
            {produto.descricao}
          </Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text
          style={{
            fontSize: 18,
            color: colors.accent,
            ...fontStyle(design.display, 600),
          }}
        >
          {formatarReais(precoFinalDe(produto))}
        </Text>
        {temPromo && (
          <Text
            style={{
              fontSize: 12,
              color: colors.inkMuted,
              textDecorationLine: 'line-through',
              ...fontStyle(design.body, 400),
            }}
          >
            {formatarReais(produto.preco)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────────────────────────
// Carrossel central — cartão do meio em destaque, vizinhos apagados
// ─────────────────────────────────────────────────────────────

const CARTAO_W = Math.round(SCREEN_W * 0.6)
const CARTAO_GAP = 14

function CarrosselCentral<T extends ProdutoVitrine>({
  produtos,
  aoAbrirProduto,
}: {
  produtos: T[]
  aoAbrirProduto: (p: T) => void
}) {
  const design = useStoreDesign()
  const { colors } = design
  const pagerRef = useRef<ScrollView>(null)
  const scrollX = useRef(new Animated.Value(0)).current
  const [indice, setIndice] = useState(0)
  const passo = CARTAO_W + CARTAO_GAP
  const margemLateral = Math.round((SCREEN_W - CARTAO_W) / 2)

  const irPara = (prox: number) => {
    const alvo = Math.max(0, Math.min(produtos.length - 1, prox))
    pagerRef.current?.scrollTo({ x: alvo * passo, animated: true })
    setIndice(alvo)
  }

  if (produtos.length === 0) return null

  return (
    <View>
      <View>
        <Animated.ScrollView
          ref={pagerRef as any}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={passo}
          decelerationRate="fast"
          contentContainerStyle={{
            paddingHorizontal: margemLateral,
            gap: CARTAO_GAP,
          }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) =>
            setIndice(Math.round(e.nativeEvent.contentOffset.x / passo))
          }
        >
          {produtos.map((p, i) => {
            const escala = scrollX.interpolate({
              inputRange: [(i - 1) * passo, i * passo, (i + 1) * passo],
              outputRange: [0.88, 1, 0.88],
              extrapolate: 'clamp',
            })
            const opacidade = scrollX.interpolate({
              inputRange: [(i - 1) * passo, i * passo, (i + 1) * passo],
              outputRange: [0.4, 1, 0.4],
              extrapolate: 'clamp',
            })
            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={consumerDesign.opacity.pressedSoft}
                onPress={() => (i === indice ? aoAbrirProduto(p) : irPara(i))}
              >
                <Animated.Image
                  source={{ uri: p.foto_url ?? undefined }}
                  style={{
                    width: CARTAO_W,
                    height: Math.round(CARTAO_W * 1.3),
                    borderRadius: design.radius.md,
                    backgroundColor: colors.surface,
                    transform: [{ scale: escala }],
                    opacity: opacidade,
                  }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )
          })}
        </Animated.ScrollView>

        {/* Setas circuladas finas sobre o carrossel */}
        <SetaCircular lado="esquerda" ativa={indice > 0} aoTocar={() => irPara(indice - 1)} />
        <SetaCircular
          lado="direita"
          ativa={indice < produtos.length - 1}
          aoTocar={() => irPara(indice + 1)}
        />
      </View>

      {/* Legenda central */}
      <View style={{ alignItems: 'center', marginTop: 14, gap: 3 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 20,
            color: MARFIM,
            ...fontStyleItalico(design.display, 500),
          }}
        >
          {produtos[indice]?.nome}
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: colors.accent,
            ...fontStyle(design.display, 600),
          }}
        >
          {produtos[indice] ? formatarReais(precoFinalDe(produtos[indice])) : ''}
        </Text>
      </View>
    </View>
  )
}

function SetaCircular({
  lado,
  ativa,
  aoTocar,
}: {
  lado: 'esquerda' | 'direita'
  ativa: boolean
  aoTocar: () => void
}) {
  return (
    <TouchableOpacity
      onPress={aoTocar}
      disabled={!ativa}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{
        position: 'absolute',
        [lado === 'esquerda' ? 'left' : 'right']: 14,
        top: '50%',
        marginTop: -23,
        width: 46,
        height: 46,
        borderRadius: 23,
        borderWidth: 1,
        borderColor: ativa ? 'rgba(248,244,236,0.75)' : 'rgba(248,244,236,0.25)',
        backgroundColor: 'rgba(0,0,0,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 18,
          color: ativa ? MARFIM : 'rgba(248,244,236,0.3)',
        }}
      >
        {lado === 'esquerda' ? '←' : '→'}
      </Text>
    </TouchableOpacity>
  )
}

/** Ação do topo: ícone marfim sobre foto e sobre o preto. */
function AcaoNoir({
  icone,
  aoTocar,
  contador = 0,
}: {
  icone: 'back' | 'bag'
  aoTocar: (e: GestureResponderEvent) => void
  contador?: number
}) {
  const { colors } = useStoreDesign()
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={0.7}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
    >
      <ConsumerIcon name={icone} size={22} color={MARFIM} strokeWidth={1.8} />
      {contador > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 3,
            right: 0,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ fontSize: 10, color: colors.accentInk, fontWeight: '700' }}>
            {contador}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────────────────────────
// Barra de menu — preta, fios, dourado no ativo
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

function BarraMenuNoir({
  sairPara,
}: {
  sairPara: (acao: () => void) => (e: GestureResponderEvent) => void
}) {
  const design = useStoreDesign()
  const { colors } = design
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
        const cor = item.ativo ? colors.accent : colors.inkMuted
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
              strokeWidth={item.ativo ? 2 : 1.6}
            />
            <Text
              style={{
                fontSize: 8,
                letterSpacing: 1.5,
                color: cor,
                ...fontStyle(design.body, item.ativo ? 600 : 400),
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
