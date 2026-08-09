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
import { GRADIENTE_HERO } from '@/components/loja/gradientes'
import { type ProdutoVitrine } from '@/components/loja/LojaEditorial'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * Vitrine volt — layout PRÓPRIO do arquétipo `volt` para fitness, esporte e
 * suplementos (docs/store-theme/02; referência: Nivest).
 *
 * DNA destilado da referência:
 * - FAIXA-ANÚNCIO fixa no topo (mensagem de oferta) + header branco com
 *   wordmark pesado e sacola com contador no accent;
 * - TICKER MARQUEE no accent rolando benefícios em loop contínuo;
 * - hero com caps pesadíssimas e CTA em PILL BRANCA;
 * - grid 2-col com palco cinza-claro, chip "Popular" preto / "-N%" vermelho,
 *   coração em círculo branco; preço promocional em vermelho;
 * - links de seção com prefixo "↳";
 * - ritmo de performance: o carrossel mais RÁPIDO do sistema.
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const HERO_H = Math.round(SCREEN_H * 0.44)
const ALTURA_BARRA_MENU = 58

interface SecaoLoja<T extends ProdutoVitrine> {
  titulo: string
  produtos: T[]
}

interface SlideVolt<T extends ProdutoVitrine> {
  imagem: string | null
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

function descontoPct(p: ProdutoVitrine): number {
  if (!p.preco_promocional || p.preco_promocional >= p.preco) return 0
  return Math.round((1 - p.preco_promocional / p.preco) * 100)
}

export function LojaVolt<T extends ProdutoVitrine>({
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

  const scrollRef = useRef<ScrollView>(null)
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set())
  const [expandidas, setExpandidas] = useState<Set<number>>(new Set())
  const [reduzirMovimento, setReduzirMovimento] = useState(false)

  // Autoplay do hero — o ritmo mais rápido do sistema (performance).
  const heroRef = useRef<ScrollView>(null)
  const heroX = useRef(new Animated.Value(0)).current
  const heroOffsetRef = useRef(0)
  const glideRef = useRef<Animated.CompositeAnimation | null>(null)
  const glideValor = useRef(new Animated.Value(0)).current
  const [slideAtivo, setSlideAtivo] = useState(0)
  const [autoplayPausado, setAutoplayPausado] = useState(false)
  const [depoisDoHero, setDepoisDoHero] = useState(false)

  const maxDesc = useMemo(
    () => Math.max(0, ...secoes.flatMap((s) => s.produtos).map(descontoPct)),
    [secoes],
  )

  // Frases da loja: 1ª vira headline do hero, o resto vira apoio.
  const [fraseUm, fraseDois] = useMemo(() => {
    const d = (loja.descricao ?? '').trim()
    if (!d) return [loja.nome, null as string | null]
    const ponto = d.indexOf('.')
    if (ponto < 0) return [d, null]
    return [d.slice(0, ponto), d.slice(ponto + 1).trim() || null]
  }, [loja.descricao, loja.nome])

  const slides = useMemo<SlideVolt<T>[]>(() => {
    const campanha: SlideVolt<T> = {
      imagem: loja.banner_url ?? null,
      titulo: fraseUm,
      legenda: fraseDois,
      cta: 'Ver tudo',
      produto: null,
    }
    const destaque = (secoes[0]?.produtos ?? [])
      .filter((p) => p.foto_url)
      .slice(0, 3)
      .map((p): SlideVolt<T> => ({
        imagem: p.foto_url,
        titulo: p.nome,
        legenda: formatarReais(p.preco_promocional ?? p.preco),
        cta: 'Ver produto',
        produto: p,
      }))
    return [campanha, ...destaque]
  }, [loja, secoes, fraseUm, fraseDois])

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

  // Glide rápido e seco: 300ms com aterrissagem firme.
  const deslizarPara = (prox: number) => {
    glideRef.current?.stop()
    glideValor.setValue(heroOffsetRef.current)
    const sub = glideValor.addListener(({ value }) => {
      heroRef.current?.scrollTo({ x: value, animated: false })
    })
    const anim = Animated.timing(glideValor, {
      toValue: prox * SCREEN_W,
      duration: 300,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
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
    const t = setTimeout(() => deslizarPara(slideAtivo + 1), 3800)
    return () => clearTimeout(t)
  }, [slideAtivo, autoplayPausado, depoisDoHero, reduzirMovimento, slides.length])

  useEffect(() => () => glideRef.current?.stop(), [])

  const slidesRender = slides.length > 1 ? [...slides, slides[0]] : slides

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="light" />

      {/* ── Bloco fixo: faixa-anúncio + header branco + ticker ── */}
      <View style={{ zIndex: 10 }}>
        <View
          style={{
            paddingTop: insets.top + 6,
            paddingBottom: 9,
            backgroundColor: colors.ink,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: colors.canvas,
              ...fontStyle(design.body, 600),
            }}
          >
            {maxDesc > 0
              ? `Descontos de até ${maxDesc}% esta semana`
              : 'Bem-vindo ao time · novidades toda semana'}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.screenX - 8,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <AcaoVolt icone="back" aoTocar={sairPara(() => router.back())} />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 19,
              letterSpacing: -0.3,
              color: colors.ink,
              ...fontStyle(design.display, 800),
            }}
          >
            {loja.nome}
          </Text>
          <AcaoVolt
            icone="bag"
            contador={totalItens}
            aoTocar={() => totalItens > 0 && router.push('/checkout')}
          />
        </View>

        <TickerVolt reduzirMovimento={reduzirMovimento} />
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) =>
          setDepoisDoHero(e.nativeEvent.contentOffset.y > HERO_H - 80)
        }
        contentContainerStyle={{
          paddingBottom: espacoFinal + ALTURA_BARRA_MENU + 12,
        }}
      >
        {/* ── Hero: caps pesadas + pill branca ── */}
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
                outputRange: [-SCREEN_W * 0.1, 0, SCREEN_W * 0.1],
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
                      bottom: 20,
                      gap: 8,
                      alignItems: 'flex-start',
                      opacity: reduzirMovimento ? 1 : opacidadeTexto,
                    }}
                  >
                    <Text
                      numberOfLines={2}
                      style={{
                        fontSize: Math.round(34 * typeFactor),
                        lineHeight: Math.round(38 * typeFactor),
                        letterSpacing: -0.5,
                        textTransform: 'uppercase',
                        color: '#FFFFFF',
                        ...fontStyle(design.display, 800),
                      }}
                    >
                      {slide.titulo}
                    </Text>
                    {slide.legenda && (
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 14,
                          color: 'rgba(255,255,255,0.9)',
                          ...fontStyle(design.body, 500),
                        }}
                      >
                        {slide.legenda}
                      </Text>
                    )}
                    {/* Pill branca sólida — o "Shop All" da referência */}
                    <TouchableOpacity
                      activeOpacity={consumerDesign.opacity.pressed}
                      onPress={() => {
                        if (slide.produto) aoAbrirProduto(slide.produto)
                        else
                          (scrollRef.current as any)?.scrollTo?.({
                            y: HERO_H - 20,
                            animated: true,
                          })
                      }}
                      style={{
                        marginTop: 4,
                        backgroundColor: '#FFFFFF',
                        paddingHorizontal: 22,
                        paddingVertical: 11,
                        borderRadius: 999,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: colors.ink,
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

          {slides.length > 1 && (
            <View
              style={{
                position: 'absolute',
                right: spacing.screenX,
                bottom: 22,
                flexDirection: 'row',
                gap: 6,
              }}
            >
              {slides.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: i === slideAtivo ? 20 : 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor:
                      i === slideAtivo ? colors.accent : 'rgba(255,255,255,0.55)',
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Seções: caps pesadas + link "↳" + grid com chips ── */}
        {secoes.map((secao, i) => {
          const expandida = expandidas.has(i)
          const visiveis = expandida ? secao.produtos : secao.produtos.slice(0, 4)
          return (
            <View key={secao.titulo} style={{ marginTop: 30 }}>
              <View style={{ paddingHorizontal: spacing.screenX, gap: 4 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: Math.round(26 * typeFactor),
                    letterSpacing: -0.5,
                    textTransform: 'uppercase',
                    color: colors.ink,
                    ...fontStyle(design.display, 800),
                  }}
                >
                  {secao.titulo}
                </Text>
                {secao.produtos.length > 4 && (
                  <TouchableOpacity
                    onPress={() => alternarExpandida(i)}
                    hitSlop={{ top: 8, bottom: 8, right: 12 }}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.inkMuted,
                        ...fontStyle(design.body, 500),
                      }}
                    >
                      {expandida ? '↳ Ver menos' : '↳ Ver tudo'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View
                style={{
                  marginTop: 14,
                  paddingHorizontal: spacing.screenX,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                {visiveis.map((p, idx) => (
                  <CardVolt
                    key={p.id}
                    produto={p}
                    destaque={idx === 0 && !expandida}
                    favorito={favoritos.has(p.id)}
                    alternarFavorito={() => alternarFavorito(p.id)}
                    aoTocar={() => aoAbrirProduto(p)}
                  />
                ))}
              </View>
            </View>
          )
        })}
      </ScrollView>

      <BarraMenuVolt sairPara={sairPara} />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Ticker marquee — benefícios rolando em loop no accent
// ─────────────────────────────────────────────────────────────

const BENEFICIOS: { icone: ConsumerIconName; rotulo: string }[] = [
  { icone: 'shield', rotulo: 'CHECKOUT SEGURO' },
  { icone: 'truck', rotulo: 'ENTREGA EXPRESSA' },
  { icone: 'check-circle', rotulo: 'TROCA FÁCIL' },
  { icone: 'spark', rotulo: 'DROPS SEMANAIS' },
]

function TickerVolt({ reduzirMovimento }: { reduzirMovimento: boolean }) {
  const design = useStoreDesign()
  const { colors } = design
  const deslocamento = useRef(new Animated.Value(0)).current
  const [larguraConteudo, setLarguraConteudo] = useState(0)

  useEffect(() => {
    if (reduzirMovimento || larguraConteudo === 0) return
    // Loop contínuo: anda a largura de UMA cópia e recomeça (as duas cópias
    // são idênticas — o salto é invisível). ~45 px/s.
    const anim = Animated.loop(
      Animated.timing(deslocamento, {
        toValue: -larguraConteudo,
        duration: (larguraConteudo / 45) * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    anim.start()
    return () => anim.stop()
  }, [larguraConteudo, reduzirMovimento, deslocamento])

  const Copia = ({ medir }: { medir?: boolean }) => (
    <View
      onLayout={
        medir ? (e) => setLarguraConteudo(e.nativeEvent.layout.width) : undefined
      }
      style={{ flexDirection: 'row', alignItems: 'center' }}
    >
      {BENEFICIOS.map((b) => (
        <View
          key={b.rotulo}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            marginRight: 28,
          }}
        >
          <ConsumerIcon
            name={b.icone}
            size={14}
            color={colors.accentInk}
            strokeWidth={2.2}
          />
          <Text
            style={{
              fontSize: 11,
              letterSpacing: 1,
              color: colors.accentInk,
              ...fontStyle(design.body, 700),
            }}
          >
            {b.rotulo}
          </Text>
        </View>
      ))}
    </View>
  )

  return (
    <View
      style={{
        backgroundColor: colors.accent,
        paddingVertical: 9,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          flexDirection: 'row',
          transform: reduzirMovimento ? [] : [{ translateX: deslocamento }],
        }}
      >
        <Copia medir />
        <Copia />
        <Copia />
      </Animated.View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Card volt — palco cinza, chip Popular/desconto, coração em círculo
// ─────────────────────────────────────────────────────────────

function CardVolt({
  produto,
  destaque,
  favorito,
  alternarFavorito,
  aoTocar,
}: {
  produto: ProdutoVitrine
  destaque: boolean
  favorito: boolean
  alternarFavorito: () => void
  aoTocar: () => void
}) {
  const design = useStoreDesign()
  const { colors, spacing } = design
  const largura = Math.round((SCREEN_W - spacing.screenX * 2 - 12) / 2)
  const desc = descontoPct(produto)
  const temPromo = desc > 0

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
            height: largura,
            borderRadius: design.radius.lg,
            backgroundColor: colors.canvasAlt,
          }}
          resizeMode="cover"
        />
        {/* Chip: desconto em vermelho > "Popular" em preto */}
        {(temPromo || destaque) && (
          <View
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              backgroundColor: temPromo ? colors.danger : colors.ink,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                color: '#FFFFFF',
                ...fontStyle(design.body, 600),
              }}
            >
              {temPromo ? `-${desc}%` : 'Popular'}
            </Text>
          </View>
        )}
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
            <CoracaoCheioVolt size={15} color={colors.danger} />
          ) : (
            <ConsumerIcon name="heart" size={15} color={colors.inkMuted} />
          )}
        </TouchableOpacity>
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
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 2 }}>
        <Text
          style={{
            fontSize: 14,
            color: temPromo ? colors.danger : colors.ink,
            ...fontStyle(design.body, temPromo ? 700 : 500),
          }}
        >
          {formatarReais(produto.preco_promocional ?? produto.preco)}
        </Text>
        {temPromo && (
          <Text
            style={{
              fontSize: 12,
              color: colors.inkSoft,
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

function CoracaoCheioVolt({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M12 20.5s-7.5-4.5-7.5-10A4 4 0 0 1 12 7.5 4 4 0 0 1 19.5 10.5c0 5.5-7.5 10-7.5 10z"
      />
    </Svg>
  )
}

/** Ação do header claro: ícone ink com badge no accent. */
function AcaoVolt({
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
      <ConsumerIcon name={icone} size={22} color={colors.ink} strokeWidth={2.2} />
      {contador > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 2,
            right: 0,
            minWidth: 17,
            height: 17,
            borderRadius: 9,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ fontSize: 10, color: colors.accentInk, fontWeight: '800' }}>
            {contador}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────────────────────────
// Barra de menu — branca, caps enérgicas
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

function BarraMenuVolt({
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
        const cor = item.ativo ? colors.ink : colors.inkMuted
        return (
          <TouchableOpacity
            key={item.rota}
            onPress={sairPara(() => router.navigate(item.rota as never))}
            activeOpacity={0.7}
            style={{ flex: 1, alignItems: 'center', gap: 4 }}
          >
            <ConsumerIcon
              name={item.icone}
              size={21}
              color={cor}
              strokeWidth={item.ativo ? 2.3 : 1.8}
            />
            <Text
              style={{
                fontSize: 8.5,
                letterSpacing: 1,
                color: cor,
                ...fontStyle(design.body, item.ativo ? 700 : 500),
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
