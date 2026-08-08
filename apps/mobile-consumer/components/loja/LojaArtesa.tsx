import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
import { fontStyle } from '@/lib/store-fonts'

/**
 * Vitrine artesã — layout PRÓPRIO do arquétipo `artisan` para casa &
 * decoração e flores (docs/store-theme/02 §F; referência-âncora: Graft).
 *
 * DNA destilado da referência:
 * - hero full-bleed com o NOME gigante em sans arredondada e CTA de contorno
 *   em pill; header que vira BARRA ESPRESSO (accent) ao rolar;
 * - SEÇÕES NUMERADAS: cada bloco fecha com fio + "0N" à esquerda e o rótulo
 *   à direita — o ritmo de portfólio da referência;
 * - statement em DOIS TONS (descrição da loja: 1ª frase em ink, resto em
 *   accent) e nuvem "criamos para você" com CHIPS de foto inline no texto;
 * - peças autorais em carrossel de UM cartão por vez com SETAS finas;
 * - demais seções em grid de cartões arredondados com chip-etiqueta branco.
 *
 * Sacola única no header; saída via transição radial na cor espresso.
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const HERO_H = Math.round(SCREEN_H * 0.52)
const ALTURA_BARRA_MENU = 58

interface SecaoLoja<T extends ProdutoVitrine> {
  titulo: string
  produtos: T[]
}

interface SlideArtesa<T extends ProdutoVitrine> {
  imagem: string | null
  titulo: string
  apoio: string
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

export function LojaArtesa<T extends ProdutoVitrine>({
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

  // Autoplay do hero — motor compartilhado; personalidade artesã: morna.
  const heroRef = useRef<ScrollView>(null)
  const heroX = useRef(new Animated.Value(0)).current
  const heroOffsetRef = useRef(0)
  const glideRef = useRef<Animated.CompositeAnimation | null>(null)
  const glideValor = useRef(new Animated.Value(0)).current
  const [slideAtivo, setSlideAtivo] = useState(0)
  const [autoplayPausado, setAutoplayPausado] = useState(false)
  const [reduzirMovimento, setReduzirMovimento] = useState(false)

  const slides = useMemo<SlideArtesa<T>[]>(() => {
    const campanha: SlideArtesa<T> = {
      imagem: loja.banner_url ?? null,
      titulo: loja.nome,
      apoio: 'Conheça nosso trabalho',
      cta: 'Ver peças',
      produto: null,
    }
    const destaque = (secoes[0]?.produtos ?? [])
      .filter((p) => p.foto_url)
      .slice(0, 3)
      .map((p): SlideArtesa<T> => ({
        imagem: p.foto_url,
        titulo: p.nome,
        apoio: formatarReais(p.preco_promocional ?? p.preco),
        cta: 'Ver peça',
        produto: p,
      }))
    return [campanha, ...destaque]
  }, [loja, secoes])

  useEffect(() => {
    const limiar = HERO_H - 150
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

  // Glide morno: 600ms em curva suave.
  const deslizarPara = (prox: number) => {
    glideRef.current?.stop()
    glideValor.setValue(heroOffsetRef.current)
    const sub = glideValor.addListener(({ value }) => {
      heroRef.current?.scrollTo({ x: value, animated: false })
    })
    const anim = Animated.timing(glideValor, {
      toValue: prox * SCREEN_W,
      duration: 600,
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
    const t = setTimeout(() => deslizarPara(slideAtivo + 1), 5500)
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

  // Header espresso: transparente sobre o hero → barra no accent ao rolar.
  const headerBg = scrollY.interpolate({
    inputRange: [HERO_H - 170, HERO_H - 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  // Statement em dois tons: 1ª frase em ink, o resto em accent.
  const [fraseUm, fraseDois] = useMemo(() => {
    const d = (loja.descricao ?? '').trim()
    if (!d) return ['', '']
    const ponto = d.indexOf('.')
    if (ponto < 0 || ponto === d.length - 1) return [d, '']
    return [d.slice(0, ponto + 1), d.slice(ponto + 1).trim()]
  }, [loja.descricao])

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

  let numeroSecao = 0
  const numerar = () => {
    numeroSecao += 1
    return String(numeroSecao).padStart(2, '0')
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="light" />

      {/* Header: transparente → barra espresso */}
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
          backgroundColor: colors.accent,
          opacity: headerBg,
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
        <AcaoArtesa icone="back" aoTocar={sairPara(() => router.back())} />
        <Animated.Text
          numberOfLines={1}
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 16,
            color: colors.accentInk,
            opacity: headerBg,
            ...fontStyle(design.display, 600),
          }}
        >
          {loja.nome}
        </Animated.Text>
        <AcaoArtesa
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
        {/* ── Hero: nome gigante arredondado + CTA de contorno em pill ── */}
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
                      bottom: 24,
                      gap: 8,
                      alignItems: 'flex-start',
                      opacity: reduzirMovimento ? 1 : opacidadeTexto,
                    }}
                  >
                    <Text
                      numberOfLines={2}
                      style={{
                        fontSize: Math.round(44 * typeFactor),
                        lineHeight: Math.round(50 * typeFactor),
                        color: '#FFFFFF',
                        letterSpacing: -0.5,
                        ...fontStyle(design.display, 600),
                      }}
                    >
                      {slide.titulo}
                    </Text>
                    <Text
                      style={{
                        fontSize: 15,
                        color: 'rgba(255,255,255,0.92)',
                        ...fontStyle(design.body, 500),
                      }}
                    >
                      {slide.apoio}
                    </Text>
                    {/* CTA de contorno em pill com seta — como na referência */}
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
                        marginTop: 4,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        paddingHorizontal: 20,
                        paddingVertical: 11,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.85)',
                        borderRadius: 999,
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
                      <Text style={{ fontSize: 15, color: '#FFFFFF' }}>→</Text>
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
                bottom: 26,
                flexDirection: 'row',
                gap: 6,
              }}
            >
              {slides.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: i === slideAtivo ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor:
                      i === slideAtivo ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── 01 · Statement em dois tons, respirando sozinho ── */}
        <SecaoNumerada numero={numerar()} rotulo="O ateliê">
          {(fraseUm.length > 0 || fraseDois.length > 0) && (
            <Text
              style={{
                fontSize: Math.round(27 * typeFactor),
                lineHeight: Math.round(37 * typeFactor),
                letterSpacing: -0.3,
                ...fontStyle(design.display, 600),
              }}
            >
              <Text style={{ color: colors.ink }}>{fraseUm}</Text>
              {fraseDois.length > 0 && (
                <Text style={{ color: colors.accent }}> {fraseDois}</Text>
              )}
            </Text>
          )}
          <Text
            style={{
              marginTop: 20,
              fontSize: 13,
              letterSpacing: 0.3,
              color: colors.inkMuted,
              ...fontStyle(design.body, 500),
            }}
          >
            {meta}
          </Text>
        </SecaoNumerada>

        {/* ── 02 · "O que fazemos" — bandas de foto empilhadas ── */}
        <SecaoNumerada numero={numerar()} rotulo="O que fazemos" conteudoFullBleed>
          <BandasCriacoes secoes={secoes} aoAbrirProduto={aoAbrirProduto} />
        </SecaoNumerada>

        {/* ── 03 · Peças autorais: carrossel de um cartão com setas ── */}
        {secoes[0] && (
          <SecaoNumerada numero={numerar()} rotulo={secoes[0].titulo}>
            <CarrosselPecas
              produtos={secoes[0].produtos}
              aoAbrirProduto={aoAbrirProduto}
            />
          </SecaoNumerada>
        )}

        {/* ── 04+ · Demais seções em grid de cartões ── */}
        {secoes.slice(1).map((secao) => (
          <SecaoNumerada key={secao.titulo} numero={numerar()} rotulo={secao.titulo}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
              {secao.produtos.map((p) => (
                <CardArtesa
                  key={p.id}
                  produto={p}
                  aoTocar={() => aoAbrirProduto(p)}
                />
              ))}
            </View>
          </SecaoNumerada>
        ))}
      </Animated.ScrollView>

      <BarraMenuArtesa sairPara={sairPara} />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Seção numerada — fio + "0N" à esquerda e rótulo à direita
// ─────────────────────────────────────────────────────────────

function SecaoNumerada({
  numero,
  rotulo,
  conteudoFullBleed = false,
  children,
}: {
  numero: string
  rotulo: string
  /** Conteúdo sangrando de borda a borda (bandas de foto); o fio numerado
   *  continua dentro do gutter. */
  conteudoFullBleed?: boolean
  children: ReactNode
}) {
  const design = useStoreDesign()
  const { colors, spacing } = design
  return (
    <View style={{ paddingTop: 34 }}>
      {conteudoFullBleed ? (
        children
      ) : (
        <View style={{ paddingHorizontal: spacing.screenX }}>{children}</View>
      )}
      <View
        style={{
          marginHorizontal: spacing.screenX,
          marginTop: 28,
          borderTopWidth: 1,
          borderTopColor: colors.line,
          paddingTop: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            fontSize: 15,
            color: colors.accent,
            ...fontStyle(design.display, 600),
          }}
        >
          {numero}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: colors.inkMuted,
            ...fontStyle(design.body, 500),
          }}
        >
          {rotulo}
        </Text>
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// "O que fazemos" — bandas de foto empilhadas de borda a borda: título
// claro sobre a imagem escurecida, linha de apoio e seta circulada que
// abre a peça (o menu de serviços da referência, aplicado ao catálogo).
// ─────────────────────────────────────────────────────────────

function BandasCriacoes<T extends ProdutoVitrine>({
  secoes,
  aoAbrirProduto,
}: {
  secoes: SecaoLoja<T>[]
  aoAbrirProduto: (p: T) => void
}) {
  const design = useStoreDesign()
  const { spacing } = design

  // Uma banda por TIPO de peça (1ª palavra única do nome), com a foto e a
  // linha de apoio vindas da própria peça; a seta abre o produto.
  const bandas = useMemo(() => {
    const vistos = new Set<string>()
    const out: { palavra: string; produto: T }[] = []
    for (const p of secoes.flatMap((s) => s.produtos)) {
      if (!p.foto_url) continue
      const palavra = p.nome.split(' ')[0]
      if (vistos.has(palavra)) continue
      vistos.add(palavra)
      out.push({ palavra, produto: p })
      if (out.length >= 6) break
    }
    return out
  }, [secoes])

  if (bandas.length < 3) return null

  return (
    <View style={{ gap: 3 }}>
      {bandas.map(({ palavra, produto }) => (
        <TouchableOpacity
          key={palavra}
          activeOpacity={consumerDesign.opacity.pressedSoft}
          onPress={() => aoAbrirProduto(produto)}
          style={{ height: 148 }}
        >
          <Image
            source={{ uri: produto.foto_url ?? undefined }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
          {/* Véu escuro uniforme p/ legibilidade do título claro */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(24, 19, 12, 0.42)',
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              paddingHorizontal: spacing.screenX,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 27,
                  letterSpacing: -0.2,
                  color: 'rgba(255, 250, 242, 0.97)',
                  ...fontStyle(design.display, 500),
                }}
              >
                {palavra}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 12,
                  color: 'rgba(255, 250, 242, 0.72)',
                  ...fontStyle(design.body, 400),
                }}
              >
                {produto.descricao ?? produto.nome}
              </Text>
            </View>
            {/* Seta circulada fina — o convite da referência */}
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                borderWidth: 1.2,
                borderColor: 'rgba(255, 250, 242, 0.85)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 17, color: 'rgba(255, 250, 242, 0.95)' }}>
                ↗
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Carrossel de peças — um cartão por vez, setas finas
// ─────────────────────────────────────────────────────────────

function CarrosselPecas<T extends ProdutoVitrine>({
  produtos,
  aoAbrirProduto,
}: {
  produtos: T[]
  aoAbrirProduto: (p: T) => void
}) {
  const design = useStoreDesign()
  const { colors, spacing } = design
  const pagerRef = useRef<ScrollView>(null)
  const [indice, setIndice] = useState(0)
  const larguraCartao = SCREEN_W - spacing.screenX * 2

  const irPara = (prox: number) => {
    const alvo = Math.max(0, Math.min(produtos.length - 1, prox))
    pagerRef.current?.scrollTo({ x: alvo * larguraCartao, animated: true })
    setIndice(alvo)
  }

  return (
    <View>
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={larguraCartao}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) =>
          setIndice(Math.round(e.nativeEvent.contentOffset.x / larguraCartao))
        }
        style={{ width: larguraCartao, alignSelf: 'center' }}
      >
        {produtos.map((p) => (
          <TouchableOpacity
            key={p.id}
            activeOpacity={consumerDesign.opacity.pressedSoft}
            onPress={() => aoAbrirProduto(p)}
            style={{ width: larguraCartao }}
          >
            <View>
              <Image
                source={{ uri: p.foto_url ?? undefined }}
                style={{
                  width: larguraCartao,
                  // Retrato: a peça toma a dobra quase inteira.
                  height: Math.round(larguraCartao * 1.5),
                  borderRadius: design.radius.xl,
                  backgroundColor: colors.canvasAlt,
                }}
                resizeMode="cover"
              />
              <EtiquetaTipo nome={p.nome} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Legenda + posição + setas finas */}
      <View
        style={{
          marginTop: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 19,
              color: colors.ink,
              ...fontStyle(design.display, 600),
            }}
          >
            {produtos[indice]?.nome}
          </Text>
          <PrecoArtesa produto={produtos[indice]} tamanho={15} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Text
            style={{
              fontSize: 12,
              color: colors.inkMuted,
              ...fontStyle(design.body, 500),
            }}
          >
            {String(indice + 1).padStart(2, '0')} / {String(produtos.length).padStart(2, '0')}
          </Text>
          <TouchableOpacity
            onPress={() => irPara(indice - 1)}
            disabled={indice === 0}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 6 }}
          >
            <Text
              style={{
                fontSize: 28,
                color: indice === 0 ? colors.line : colors.accent,
              }}
            >
              ←
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => irPara(indice + 1)}
            disabled={indice >= produtos.length - 1}
            hitSlop={{ top: 12, bottom: 12, left: 6, right: 8 }}
          >
            <Text
              style={{
                fontSize: 28,
                color:
                  indice >= produtos.length - 1 ? colors.line : colors.accent,
              }}
            >
              →
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Grid de cartões + apoios
// ─────────────────────────────────────────────────────────────

function CardArtesa({
  produto,
  aoTocar,
}: {
  produto: ProdutoVitrine
  aoTocar: () => void
}) {
  const design = useStoreDesign()
  const { colors, spacing } = design
  const largura = Math.round((SCREEN_W - spacing.screenX * 2 - 14) / 2)
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
        <EtiquetaTipo nome={produto.nome} />
      </View>
      <Text
        numberOfLines={1}
        style={{
          marginTop: 8,
          fontSize: 14,
          color: colors.ink,
          ...fontStyle(design.display, 600),
        }}
      >
        {produto.nome}
      </Text>
      <PrecoArtesa produto={produto} tamanho={13} />
    </TouchableOpacity>
  )
}

/** Chip-etiqueta branco com o TIPO da peça (1ª palavra), como "SHELVES". */
function EtiquetaTipo({ nome }: { nome: string }) {
  const design = useStoreDesign()
  const { colors } = design
  return (
    <View
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: colors.surface,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: design.radius.sm,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: colors.accent,
          ...fontStyle(design.body, 700),
        }}
      >
        {nome.split(' ')[0]}
      </Text>
    </View>
  )
}

function PrecoArtesa({
  produto,
  tamanho,
}: {
  produto?: ProdutoVitrine
  tamanho: number
}) {
  const design = useStoreDesign()
  const { colors } = design
  if (!produto) return null
  const temPromo =
    !!produto.preco_promocional && produto.preco_promocional < produto.preco
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
      <Text
        style={{
          fontSize: tamanho,
          color: colors.inkMuted,
          ...fontStyle(design.body, 500),
        }}
      >
        {formatarReais(produto.preco_promocional ?? produto.preco)}
      </Text>
      {temPromo && (
        <Text
          style={{
            fontSize: tamanho - 2,
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

/** Ação do topo: ícone branco sobre a foto e sobre a barra espresso. */
function AcaoArtesa({
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
      <ConsumerIcon name={icone} size={22} color="#FFFFFF" strokeWidth={1.9} />
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

// ─────────────────────────────────────────────────────────────
// Barra de menu — creme morno, rótulos suaves
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

function BarraMenuArtesa({
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
            style={{ flex: 1, alignItems: 'center', gap: 4 }}
          >
            <ConsumerIcon
              name={item.icone}
              size={21}
              color={cor}
              strokeWidth={item.ativo ? 2 : 1.7}
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
