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
 * Vitrine serena — layout PRÓPRIO do arquétipo `serene` para beleza feminina,
 * skincare e joias delicadas (docs/store-theme/02; referência: All Natural).
 *
 * DNA destilado da referência:
 * - header CLARO estruturado (não overlay): voltar | nome centrado | "Sacola (N)";
 * - hero com carrossel calmo e indicadores de LINHA segmentada no topo;
 * - headline em peso LEVE (400) e sentence case — a delicadeza vem do peso;
 * - CTA fantasma (contorno fino, fundo transparente);
 * - seções viram ABAS ("Trending | Bestsellers"), grid 2-col com cards no
 *   cinza-névoa (`surfaceAlt`), coração solto e chip de promo branco com
 *   texto vermelho; nome + preço FORA do card, na mesma linha;
 * - fecho com tile grande da marca (foto + convite).
 *
 * Sacola única no header; saída via transição radial na cor ardósia.
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const HERO_H = Math.round(SCREEN_H * 0.46)
const ALTURA_BARRA_MENU = 58

interface SecaoLoja<T extends ProdutoVitrine> {
  titulo: string
  produtos: T[]
}

interface SlideSereno<T extends ProdutoVitrine> {
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

function descontoPct(p: ProdutoVitrine): number {
  if (!p.preco_promocional || p.preco_promocional >= p.preco) return 0
  return Math.round((1 - p.preco_promocional / p.preco) * 100)
}

export function LojaSerena<T extends ProdutoVitrine>({
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
  const [abaAtiva, setAbaAtiva] = useState(0)
  const [expandida, setExpandida] = useState(false)

  // Autoplay do hero — motor compartilhado; personalidade serena: o glide
  // mais longo e calmo das vitrines, dwell generoso.
  const heroRef = useRef<ScrollView>(null)
  const heroX = useRef(new Animated.Value(0)).current
  const heroOffsetRef = useRef(0)
  const glideRef = useRef<Animated.CompositeAnimation | null>(null)
  const glideValor = useRef(new Animated.Value(0)).current
  const [slideAtivo, setSlideAtivo] = useState(0)
  const [autoplayPausado, setAutoplayPausado] = useState(false)
  const [depoisDoHero, setDepoisDoHero] = useState(false)
  const [reduzirMovimento, setReduzirMovimento] = useState(false)

  const slides = useMemo<SlideSereno<T>[]>(() => {
    const todos = secoes.flatMap((s) => s.produtos)
    const maxDesc = Math.max(0, ...todos.map(descontoPct))
    const campanha: SlideSereno<T> = {
      imagem: loja.banner_url ?? null,
      eyebrow: maxDesc > 0 ? `Até ${maxDesc}% off em selecionados` : 'Cuidado & ritual',
      titulo: 'Descubra a nova coleção',
      legenda: null,
      cta: 'Comprar agora',
      produto: null,
    }
    const destaque = (secoes[0]?.produtos ?? [])
      .filter((p) => p.foto_url)
      .slice(0, 3)
      .map((p): SlideSereno<T> => ({
        imagem: p.foto_url,
        eyebrow: secoes[0].titulo,
        titulo: p.nome,
        legenda: formatarReais(p.preco_promocional ?? p.preco),
        cta: 'Ver produto',
        produto: p,
      }))
    return [campanha, ...destaque]
  }, [loja, secoes])

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

  // Glide sereno: 650ms flutuando em curva suave — o mais calmo do sistema.
  const deslizarPara = (prox: number) => {
    glideRef.current?.stop()
    glideValor.setValue(heroOffsetRef.current)
    const sub = glideValor.addListener(({ value }) => {
      heroRef.current?.scrollTo({ x: value, animated: false })
    })
    const anim = Animated.timing(glideValor, {
      toValue: prox * SCREEN_W,
      duration: 650,
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

  // Dwell de 6s — ritmo de contemplação. Pausa fora da dobra do hero.
  useEffect(() => {
    if (slides.length <= 1 || autoplayPausado || depoisDoHero || reduzirMovimento)
      return
    const t = setTimeout(() => deslizarPara(slideAtivo + 1), 6000)
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

  const sairPara = (acao: () => void) => (e: GestureResponderEvent) =>
    iniciarSaida({
      acao,
      cor: colors.accent,
      origem: { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY },
    })

  const secaoAtiva = secoes[abaAtiva] ?? secoes[0]
  const produtosVisiveis = expandida
    ? secaoAtiva?.produtos ?? []
    : (secaoAtiva?.produtos ?? []).slice(0, 4)

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />

      {/* ── Header claro estruturado — a assinatura da referência ── */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 14,
          paddingHorizontal: spacing.screenX - 8,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
          flexDirection: 'row',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        <TouchableOpacity
          onPress={sairPara(() => router.back())}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ width: 40, height: 32, justifyContent: 'center' }}
        >
          <ConsumerIcon name="chevron-left" size={22} color={colors.ink} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 17,
            letterSpacing: 0.2,
            color: colors.ink,
            ...fontStyle(design.display, 500),
          }}
        >
          {loja.nome}
        </Text>
        <TouchableOpacity
          onPress={() => totalItens > 0 && router.push('/checkout')}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ minWidth: 40, height: 32, justifyContent: 'center', alignItems: 'flex-end' }}
        >
          <Text
            style={{
              fontSize: 14,
              color: totalItens > 0 ? colors.ink : colors.inkMuted,
              ...fontStyle(design.body, 500),
            }}
          >
            Sacola ({totalItens})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) =>
          setDepoisDoHero(e.nativeEvent.contentOffset.y > HERO_H - 100)
        }
        contentContainerStyle={{
          paddingBottom: espacoFinal + ALTURA_BARRA_MENU + 12,
        }}
      >
        {/* ── Hero calmo com indicadores de linha no topo ── */}
        <View style={{ height: HERO_H, backgroundColor: colors.canvasAlt }}>
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
                  (i - 0.6) * SCREEN_W,
                  i * SCREEN_W,
                  (i + 0.6) * SCREEN_W,
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
                      bottom: 22,
                      gap: 10,
                      alignItems: 'flex-start',
                      opacity: reduzirMovimento ? 1 : opacidadeTexto,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.85)',
                        ...fontStyle(design.body, 500),
                      }}
                    >
                      {slide.eyebrow}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{
                        fontSize: Math.round(30 * typeFactor),
                        lineHeight: Math.round(38 * typeFactor),
                        color: '#FFFFFF',
                        letterSpacing: 0.1,
                        // Peso LEVE — a assinatura delicada do arquétipo.
                        ...fontStyle(design.display, 400),
                      }}
                    >
                      {slide.titulo}
                    </Text>
                    {slide.legenda && (
                      <Text
                        style={{
                          fontSize: 14,
                          color: 'rgba(255,255,255,0.9)',
                          ...fontStyle(design.body, 400),
                        }}
                      >
                        {slide.legenda}
                      </Text>
                    )}
                    {/* CTA fantasma — contorno fino, fundo transparente */}
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
                        marginTop: 2,
                        paddingHorizontal: 22,
                        paddingVertical: 11,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.8)',
                        borderRadius: design.radius.md,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: '#FFFFFF',
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

          {/* Indicadores de linha segmentada — no TOPO, como na referência */}
          {slides.length > 1 && (
            <View
              style={{
                position: 'absolute',
                top: 14,
                left: 0,
                right: 0,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {slides.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 30,
                    height: 2,
                    borderRadius: 1,
                    backgroundColor:
                      i === slideAtivo ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Identidade breve ── */}
        {loja.descricao && (
          <Text
            numberOfLines={2}
            style={{
              paddingHorizontal: spacing.screenX,
              paddingTop: 20,
              fontSize: 14,
              lineHeight: 21,
              color: colors.inkMuted,
              ...fontStyle(design.body, 400),
            }}
          >
            {loja.descricao}
          </Text>
        )}

        {/* ── Abas de seções + "Ver tudo" ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            paddingHorizontal: spacing.screenX,
            marginTop: 26,
            marginBottom: 16,
            gap: 18,
          }}
        >
          {secoes.map((s, i) => {
            const ativa = i === abaAtiva
            return (
              <TouchableOpacity
                key={s.titulo}
                onPress={() => {
                  setAbaAtiva(i)
                  setExpandida(false)
                }}
                hitSlop={{ top: 8, bottom: 8 }}
              >
                <Text
                  style={{
                    fontSize: Math.round(20 * typeFactor),
                    color: ativa ? colors.ink : colors.inkMuted,
                    letterSpacing: 0.1,
                    ...fontStyle(design.display, ativa ? 600 : 400),
                  }}
                >
                  {s.titulo}
                </Text>
              </TouchableOpacity>
            )
          })}
          <View style={{ flex: 1 }} />
          {(secaoAtiva?.produtos.length ?? 0) > 4 && (
            <TouchableOpacity
              onPress={() => setExpandida((v) => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: colors.inkMuted,
                  ...fontStyle(design.body, 400),
                }}
              >
                {expandida ? 'Ver menos' : 'Ver tudo'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Grid da aba ativa ── */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 14,
            paddingHorizontal: spacing.screenX,
          }}
        >
          {produtosVisiveis.map((p) => (
            <CardSereno
              key={p.id}
              produto={p}
              favorito={favoritos.has(p.id)}
              alternarFavorito={() => alternarFavorito(p.id)}
              aoTocar={() => aoAbrirProduto(p)}
            />
          ))}
        </View>

        {/* ── Fecho: tile da marca ── */}
        {loja.banner_url && (
          <View
            style={{
              marginTop: 34,
              marginHorizontal: spacing.screenX,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <Text
                style={{
                  fontSize: Math.round(22 * typeFactor),
                  color: colors.ink,
                  ...fontStyle(design.display, 400),
                }}
              >
                Conheça {loja.nome}
              </Text>
            </View>
            <Image
              source={{ uri: loja.banner_url }}
              style={{
                width: '100%',
                height: Math.round(SCREEN_W * 1.1),
                borderRadius: design.radius.lg,
                backgroundColor: colors.canvasAlt,
              }}
              resizeMode="cover"
            />
          </View>
        )}
      </ScrollView>

      <BarraMenuSerena sairPara={sairPara} />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Card sereno — palco cinza-névoa, coração solto, chip de promo
// ─────────────────────────────────────────────────────────────

function CardSereno({
  produto,
  favorito,
  alternarFavorito,
  aoTocar,
}: {
  produto: ProdutoVitrine
  favorito: boolean
  alternarFavorito: () => void
  aoTocar: () => void
}) {
  const design = useStoreDesign()
  const { colors, spacing } = design
  const largura = Math.round((SCREEN_W - spacing.screenX * 2 - 14) / 2)
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
        {/* Coração solto sobre o palco — sem círculo, delicado */}
        <TouchableOpacity
          onPress={alternarFavorito}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ position: 'absolute', top: 12, right: 12 }}
        >
          {favorito ? (
            <CoracaoCheioSereno size={18} color={colors.danger} />
          ) : (
            <ConsumerIcon
              name="heart"
              size={18}
              color={colors.inkMuted}
              strokeWidth={1.6}
            />
          )}
        </TouchableOpacity>
        {/* Chip de promo: pill branca com texto vermelho, como na referência */}
        {temPromo && (
          <View
            style={[
              {
                position: 'absolute',
                top: 12,
                left: 12,
                backgroundColor: colors.surface,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
              },
              consumerDesign.shadow.soft,
            ]}
          >
            <Text
              style={{
                fontSize: 12,
                color: colors.danger,
                ...fontStyle(design.body, 500),
              }}
            >
              -{desc}%
            </Text>
          </View>
        )}
      </View>

      {/* Nome + preço FORA do card, mesma linha — referência exata */}
      <View
        style={{
          marginTop: 10,
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 15,
            color: colors.ink,
            ...fontStyle(design.body, 500),
          }}
        >
          {produto.nome}
        </Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={{
              fontSize: 15,
              color: colors.ink,
              ...fontStyle(design.body, 500),
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
      </View>
    </TouchableOpacity>
  )
}

function CoracaoCheioSereno({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M12 20.5s-7.5-4.5-7.5-10A4 4 0 0 1 12 7.5 4 4 0 0 1 19.5 10.5c0 5.5-7.5 10-7.5 10z"
      />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────
// Barra de menu — branca, traço fino, rótulos leves
// ─────────────────────────────────────────────────────────────

const ITENS_MENU: {
  rotulo: string
  icone: ConsumerIconName
  rota: string
  ativo?: boolean
}[] = [
  { rotulo: 'Início', icone: 'home', rota: '/', ativo: true },
  { rotulo: 'Explorar', icone: 'reels', rota: '/explorar' },
  { rotulo: 'Pedidos', icone: 'orders', rota: '/pedidos' },
  { rotulo: 'Perfil', icone: 'user', rota: '/perfil' },
]

function BarraMenuSerena({
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
        const cor = item.ativo ? colors.ink : colors.inkSoft
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
              strokeWidth={item.ativo ? 1.9 : 1.6}
            />
            <Text
              style={{
                fontSize: 10,
                color: cor,
                ...fontStyle(design.body, item.ativo ? 500 : 400),
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
