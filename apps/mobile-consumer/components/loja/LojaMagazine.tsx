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
 * Vitrine magazine — layout PRÓPRIO do arquétipo `magazine` para lojas de
 * departamento que vendem de tudo (docs/store-theme/02; referência: Revive).
 *
 * DNA destilado da referência:
 * - FAIXA-ANÚNCIO no topo + header claro com WORDMARK EM SERIFA;
 * - hero com CAIXA EMOLDURADA translúcida centrada (eyebrow + título em
 *   serifa caps + parágrafo + pill escura "Ver ofertas ›");
 * - "Compre por categoria" em TILES de foto cheia com o nome centrado;
 * - grid de produtos com chip NOVO, coração, CHIP VERDE de oferta e o botão
 *   "Adicionar" em pill contornada dentro do próprio cartão;
 * - "Ver tudo ›" em pill escura centrada expandindo a seção.
 *
 * Sacola única no header; saída via transição radial no accent.
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const HERO_H = Math.round(SCREEN_H * 0.42)
const ALTURA_BARRA_MENU = 58

interface ProdutoMagazineItem extends ProdutoVitrine {
  metadata?: Record<string, unknown> | null
}

interface SecaoLoja<T extends ProdutoMagazineItem> {
  titulo: string
  produtos: T[]
}

interface SlideMagazine<T extends ProdutoMagazineItem> {
  imagem: string | null
  eyebrow: string
  titulo: string
  paragrafo: string | null
  cta: string
  produto: T | null
}

interface Props<T extends ProdutoMagazineItem> {
  loja: {
    id: string
    nome: string
    descricao?: string | null
    banner_url?: string | null
    taxa_entrega?: number | null
    tempo_entrega?: number | null
  }
  secoes: SecaoLoja<T>[]
  aoAbrirProduto: (produto: T) => void
  espacoFinal: number
}

function descontoPct(p: ProdutoVitrine): number {
  if (!p.preco_promocional || p.preco_promocional >= p.preco) return 0
  return Math.round((1 - p.preco_promocional / p.preco) * 100)
}

export function LojaMagazine<T extends ProdutoMagazineItem>({
  loja,
  secoes,
  aoAbrirProduto,
  espacoFinal,
}: Props<T>) {
  const design = useStoreDesign()
  const { colors, spacing, typeFactor } = design
  const insets = useSafeAreaInsets()
  const totalItens = useCartStore((s) => s.totalItens())
  const adicionarItem = useCartStore((s) => s.adicionarItem)
  const storeAtual = useCartStore((s) => s.store_id)
  const iniciarSaida = useTransicaoSaida((s) => s.iniciar)

  const scrollRef = useRef<ScrollView>(null)
  const posicoesRef = useRef<Record<string, number>>({})
  const [expandidas, setExpandidas] = useState<Set<number>>(new Set())
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set())
  const [adicionados, setAdicionados] = useState<Set<string>>(new Set())
  const [reduzirMovimento, setReduzirMovimento] = useState(false)
  const [depoisDoHero, setDepoisDoHero] = useState(false)

  // Autoplay do hero — varejo em cadência constante.
  const heroRef = useRef<ScrollView>(null)
  const heroX = useRef(new Animated.Value(0)).current
  const heroOffsetRef = useRef(0)
  const glideRef = useRef<Animated.CompositeAnimation | null>(null)
  const glideValor = useRef(new Animated.Value(0)).current
  const [slideAtivo, setSlideAtivo] = useState(0)
  const [autoplayPausado, setAutoplayPausado] = useState(false)

  const maxDesc = useMemo(
    () => Math.max(0, ...secoes.flatMap((s) => s.produtos).map(descontoPct)),
    [secoes],
  )

  const slides = useMemo<SlideMagazine<T>[]>(() => {
    const campanha: SlideMagazine<T> = {
      imagem: loja.banner_url ?? null,
      eyebrow: 'Ofertas da semana',
      titulo: maxDesc > 0 ? `Até ${maxDesc}% off` : loja.nome,
      paragrafo: loja.descricao ?? null,
      cta: 'Ver ofertas',
      produto: null,
    }
    const destaque = secoes
      .flatMap((s) => s.produtos.map((p) => ({ secao: s.titulo, p })))
      .filter(({ p }) => p.foto_url)
      .slice(0, 3)
      .map(({ secao, p }): SlideMagazine<T> => ({
        imagem: p.foto_url,
        eyebrow: secao,
        titulo: p.nome,
        paragrafo: formatarReais(p.preco_promocional ?? p.preco),
        cta: 'Ver produto',
        produto: p,
      }))
    return [campanha, ...destaque]
  }, [loja, secoes, maxDesc])

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

  const deslizarPara = (prox: number) => {
    glideRef.current?.stop()
    glideValor.setValue(heroOffsetRef.current)
    const sub = glideValor.addListener(({ value }) => {
      heroRef.current?.scrollTo({ x: value, animated: false })
    })
    const anim = Animated.timing(glideValor, {
      toValue: prox * SCREEN_W,
      duration: 520,
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
    const t = setTimeout(() => deslizarPara(slideAtivo + 1), 5000)
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

  const irParaSecao = (titulo: string) => {
    const y = posicoesRef.current[titulo]
    if (y != null) scrollRef.current?.scrollTo({ y: y - 70, animated: true })
  }

  // Adição rápida do cartão; carrinho de outra loja abre o detalhe (a
  // guarda de troca vive lá).
  const adicionarRapido = (p: T) => {
    if (storeAtual && storeAtual !== loja.id) {
      aoAbrirProduto(p)
      return
    }
    adicionarItem(
      {
        product_id: p.id,
        nome: p.nome,
        preco: p.preco_promocional ?? p.preco,
        quantidade: 1,
        foto_url: p.foto_url ?? undefined,
      },
      loja.id,
      loja.nome,
      (loja.taxa_entrega ?? 0) as number,
    )
    setAdicionados((atual) => new Set(atual).add(p.id))
    setTimeout(
      () =>
        setAdicionados((atual) => {
          const prox = new Set(atual)
          prox.delete(p.id)
          return prox
        }),
      1300,
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="light" />

      {/* ── Bloco fixo: faixa-anúncio + header claro com wordmark serif ── */}
      <View style={{ zIndex: 10 }}>
        <View
          style={{
            paddingTop: insets.top + 6,
            paddingBottom: 9,
            backgroundColor: colors.accent,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 10.5,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: colors.accentInk,
              ...fontStyle(design.body, 600),
            }}
          >
            {maxDesc > 0
              ? `Até ${maxDesc}% off em ofertas da semana`
              : 'Tudo para a sua casa em um só lugar'}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.screenX - 8,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            borderBottomWidth: 1,
            borderBottomColor: colors.line,
          }}
        >
          <AcaoMagazine icone="back" aoTocar={sairPara(() => router.back())} />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 21,
              letterSpacing: 0.3,
              color: colors.ink,
              ...fontStyle(design.display, 600),
            }}
          >
            {loja.nome}
          </Text>
          <AcaoMagazine
            icone="bag"
            contador={totalItens}
            aoTocar={() => totalItens > 0 && router.push('/checkout')}
          />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) =>
          setDepoisDoHero(e.nativeEvent.contentOffset.y > HERO_H - 60)
        }
        contentContainerStyle={{
          paddingBottom: espacoFinal + ALTURA_BARRA_MENU + 12,
        }}
      >
        {/* ── Hero com caixa emoldurada ── */}
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
                outputRange: [-SCREEN_W * 0.08, 0, SCREEN_W * 0.08],
                extrapolate: 'clamp',
              })
              const opacidadeCaixa = heroX.interpolate({
                inputRange: [
                  (i - 0.5) * SCREEN_W,
                  i * SCREEN_W,
                  (i + 0.5) * SCREEN_W,
                ],
                outputRange: [0, 1, 0],
                extrapolate: 'clamp',
              })
              return (
                <View
                  key={i}
                  style={{
                    width: SCREEN_W,
                    height: HERO_H,
                    overflow: 'hidden',
                    justifyContent: 'center',
                  }}
                >
                  {slide.imagem && (
                    <Animated.Image
                      source={{ uri: slide.imagem }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: -Math.round(SCREEN_W * 0.08),
                        width: Math.round(SCREEN_W * 1.16),
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
                      opacity: 0.5,
                    }}
                    resizeMode="stretch"
                  />

                  {/* A caixa emoldurada da referência */}
                  <Animated.View
                    style={{
                      marginHorizontal: spacing.screenX + 8,
                      backgroundColor: 'rgba(28, 22, 20, 0.5)',
                      borderRadius: design.radius.md,
                      paddingVertical: 20,
                      paddingHorizontal: 18,
                      alignItems: 'center',
                      gap: 8,
                      opacity: reduzirMovimento ? 1 : opacidadeCaixa,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.88)',
                        ...fontStyle(design.body, 600),
                      }}
                    >
                      {slide.eyebrow}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{
                        fontSize: Math.round(28 * typeFactor),
                        lineHeight: Math.round(34 * typeFactor),
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        color: '#FFFFFF',
                        ...fontStyle(design.display, 600),
                      }}
                    >
                      {slide.titulo}
                    </Text>
                    {slide.paragrafo && (
                      <Text
                        numberOfLines={2}
                        style={{
                          fontSize: 13,
                          lineHeight: 19,
                          textAlign: 'center',
                          color: 'rgba(255,255,255,0.88)',
                          ...fontStyle(design.body, 400),
                        }}
                      >
                        {slide.paragrafo}
                      </Text>
                    )}
                    <TouchableOpacity
                      activeOpacity={consumerDesign.opacity.pressed}
                      onPress={() => {
                        if (slide.produto) aoAbrirProduto(slide.produto)
                        else
                          (scrollRef.current as any)?.scrollTo?.({
                            y: HERO_H + 30,
                            animated: true,
                          })
                      }}
                      style={{
                        marginTop: 6,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: colors.accent,
                        paddingHorizontal: 22,
                        paddingVertical: 11,
                        borderRadius: 999,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13.5,
                          color: colors.accentInk,
                          ...fontStyle(design.body, 600),
                        }}
                      >
                        {slide.cta}
                      </Text>
                      <Text style={{ fontSize: 14, color: colors.accentInk }}>›</Text>
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
                bottom: 14,
                left: 0,
                right: 0,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 7,
              }}
            >
              {slides.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: i === slideAtivo ? 9 : 6,
                    height: i === slideAtivo ? 9 : 6,
                    borderRadius: 5,
                    backgroundColor:
                      i === slideAtivo ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Compre por categoria: tiles de foto cheia ── */}
        {secoes.length > 1 && (
          <View style={{ marginTop: 28 }}>
            <Text
              style={{
                textAlign: 'center',
                fontSize: Math.round(24 * typeFactor),
                color: colors.ink,
                marginBottom: 14,
                ...fontStyle(design.display, 600),
              }}
            >
              Compre por categoria
            </Text>
            <View style={{ paddingHorizontal: spacing.screenX, gap: 12 }}>
              {secoes.map((s) => {
                const capa = s.produtos.find((p) => p.foto_url)?.foto_url
                return (
                  <TouchableOpacity
                    key={s.titulo}
                    activeOpacity={consumerDesign.opacity.pressedSoft}
                    onPress={() => irParaSecao(s.titulo)}
                    style={{
                      height: 140,
                      borderRadius: design.radius.lg,
                      overflow: 'hidden',
                      backgroundColor: colors.surfaceMuted,
                    }}
                  >
                    {capa && (
                      <Image
                        source={{ uri: capa }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    )}
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(20, 16, 14, 0.34)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: Math.round(26 * typeFactor),
                          color: '#FFFFFF',
                          ...fontStyle(design.display, 600),
                        }}
                      >
                        {s.titulo}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {/* ── Seções de produtos ── */}
        {secoes.map((secao, i) => {
          const expandida = expandidas.has(i)
          const visiveis = expandida ? secao.produtos : secao.produtos.slice(0, 4)
          return (
            <View
              key={secao.titulo}
              onLayout={(e) => {
                posicoesRef.current[secao.titulo] = e.nativeEvent.layout.y
              }}
              style={{ marginTop: 30 }}
            >
              <Text
                style={{
                  textAlign: 'center',
                  fontSize: Math.round(24 * typeFactor),
                  color: colors.ink,
                  marginBottom: 14,
                  ...fontStyle(design.display, 600),
                }}
              >
                {secao.titulo}
              </Text>

              <View
                style={{
                  paddingHorizontal: spacing.screenX,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                {visiveis.map((p, idx) => (
                  <CardMagazine
                    key={p.id}
                    produto={p}
                    destaque={idx === 0}
                    favorito={favoritos.has(p.id)}
                    adicionado={adicionados.has(p.id)}
                    alternarFavorito={() => alternarFavorito(p.id)}
                    aoTocar={() => aoAbrirProduto(p)}
                    aoAdicionar={() => adicionarRapido(p)}
                  />
                ))}
              </View>

              {secao.produtos.length > 4 && (
                <TouchableOpacity
                  onPress={() => alternarExpandida(i)}
                  activeOpacity={consumerDesign.opacity.pressed}
                  style={{
                    alignSelf: 'center',
                    marginTop: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: colors.accent,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 999,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13.5,
                      color: colors.accentInk,
                      ...fontStyle(design.body, 600),
                    }}
                  >
                    {expandida ? 'Ver menos' : 'Ver tudo'}
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.accentInk }}>›</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        })}
      </ScrollView>

      <BarraMenuMagazine sairPara={sairPara} />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Cartão magazine — chip NOVO, coração, chip verde e "Adicionar" no cartão
// ─────────────────────────────────────────────────────────────

function CardMagazine<T extends ProdutoMagazineItem>({
  produto,
  destaque,
  favorito,
  adicionado,
  alternarFavorito,
  aoTocar,
  aoAdicionar,
}: {
  produto: T
  destaque: boolean
  favorito: boolean
  adicionado: boolean
  alternarFavorito: () => void
  aoTocar: () => void
  aoAdicionar: () => void
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
            borderRadius: design.radius.md,
            backgroundColor: colors.canvasAlt,
          }}
          resizeMode="cover"
        />
        {destaque && !temPromo && (
          <View
            style={[
              {
                position: 'absolute',
                top: 10,
                left: 10,
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
                fontSize: 10,
                letterSpacing: 0.6,
                color: colors.ink,
                ...fontStyle(design.body, 700),
              }}
            >
              NOVO
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
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            },
            consumerDesign.shadow.soft,
          ]}
        >
          {favorito ? (
            <CoracaoCheioMagazine size={15} color={colors.danger} />
          ) : (
            <ConsumerIcon name="heart" size={15} color={colors.inkMuted} />
          )}
        </TouchableOpacity>
      </View>

      <Text
        numberOfLines={2}
        style={{
          marginTop: 9,
          fontSize: 13.5,
          lineHeight: 18,
          minHeight: 36,
          color: colors.ink,
          ...fontStyle(design.body, 600),
        }}
      >
        {produto.nome}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginTop: 4,
          flexWrap: 'wrap',
        }}
      >
        <Text
          style={{ fontSize: 15, color: colors.ink, ...fontStyle(design.body, 700) }}
        >
          {formatarReais(produto.preco_promocional ?? produto.preco)}
        </Text>
        {temPromo && (
          <>
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
            {/* Chip verde de oferta — a assinatura varejista */}
            <View
              style={{
                backgroundColor: 'rgba(22, 163, 74, 0.14)',
                paddingHorizontal: 7,
                paddingVertical: 2.5,
                borderRadius: 999,
              }}
            >
              <Text
                style={{
                  fontSize: 10.5,
                  color: colors.success,
                  ...fontStyle(design.body, 700),
                }}
              >
                -{desc}% OFF
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Adicionar em pill contornada, dentro do cartão */}
      <TouchableOpacity
        onPress={aoAdicionar}
        activeOpacity={0.8}
        style={{
          marginTop: 9,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          paddingVertical: 10,
          borderRadius: 999,
          borderWidth: 1.4,
          borderColor: adicionado ? colors.success : colors.ink,
          backgroundColor: adicionado ? colors.success : 'transparent',
        }}
      >
        <ConsumerIcon
          name={adicionado ? 'check' : 'bag'}
          size={14}
          color={adicionado ? '#FFFFFF' : colors.ink}
          strokeWidth={2.2}
        />
        <Text
          style={{
            fontSize: 12.5,
            color: adicionado ? '#FFFFFF' : colors.ink,
            ...fontStyle(design.body, 600),
          }}
        >
          {adicionado ? 'Na sacola' : 'Adicionar'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

function CoracaoCheioMagazine({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M12 20.5s-7.5-4.5-7.5-10A4 4 0 0 1 12 7.5 4 4 0 0 1 19.5 10.5c0 5.5-7.5 10-7.5 10z"
      />
    </Svg>
  )
}

/** Ação do header claro. */
function AcaoMagazine({
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
      <ConsumerIcon name={icone} size={22} color={colors.ink} strokeWidth={2} />
      {contador > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 2,
            right: 0,
            minWidth: 17,
            height: 17,
            borderRadius: 9,
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

function BarraMenuMagazine({
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
              strokeWidth={item.ativo ? 2.1 : 1.7}
            />
            <Text
              style={{
                fontSize: 10,
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
