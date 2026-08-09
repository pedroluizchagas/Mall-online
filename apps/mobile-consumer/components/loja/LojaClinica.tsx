import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  Image,
  ScrollView,
  Text,
  TextInput,
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
 * Vitrine clínica — layout PRÓPRIO do arquétipo `clinic` para farmácia,
 * saúde & bem-estar e veterinária (docs/store-theme/02 §G).
 *
 * Estrutura no padrão das vitrines-irmãs (hero de fotos com carrossel calmo
 * e CTA fantasma; ABAS de categoria escritas no topo; produtos em CARTÕES
 * QUADRADOS — tocar no cartão abre o produto), com as armas da farmácia:
 * - BUSCA FLUTUANTE sobre a borda do hero, filtrando em tempo real
 *   (nome/princípio ativo);
 * - faixa de CONFIANÇA e cartão de oferta com a foto do item em promoção;
 * - ADIÇÃO RÁPIDA no próprio cartão (botão "+" com pouso elástico) — item
 *   com `metadata.exige_receita` ganha selo RECEITA e abre o detalhe em vez
 *   de adicionar às cegas;
 * - trilho horizontal com cartão "VER TODOS" no fim → expande em grade.
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const HERO_H = Math.round(SCREEN_H * 0.46)
const ALTURA_BARRA_MENU = 58

interface ProdutoClinica extends ProdutoVitrine {
  metadata?: Record<string, unknown> | null
}

interface SecaoLoja<T extends ProdutoClinica> {
  titulo: string
  produtos: T[]
}

interface SlideClinica<T extends ProdutoClinica> {
  imagem: string | null
  eyebrow: string
  titulo: string
  legenda: string | null
  cta: string
  produto: T | null
}

interface Props<T extends ProdutoClinica> {
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

function exigeReceita(p: ProdutoClinica): boolean {
  return (p.metadata as any)?.exige_receita === true
}

export function LojaClinica<T extends ProdutoClinica>({
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
  const scrollY = useRef(new Animated.Value(0)).current
  const [busca, setBusca] = useState('')
  const [abaAtiva, setAbaAtiva] = useState(0)
  const [expandida, setExpandida] = useState(false)
  const [adicionados, setAdicionados] = useState<Set<string>>(new Set())
  const [reduzirMovimento, setReduzirMovimento] = useState(false)
  const [depoisDoHero, setDepoisDoHero] = useState(false)

  // Autoplay do hero — ritmo clínico: calmo e preciso.
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
  const produtoPromo = useMemo(
    () =>
      secoes
        .flatMap((s) => s.produtos)
        .find((p) => descontoPct(p) === maxDesc && p.foto_url) ?? null,
    [secoes, maxDesc],
  )

  const slides = useMemo<SlideClinica<T>[]>(() => {
    const campanha: SlideClinica<T> = {
      imagem: loja.banner_url ?? null,
      eyebrow: loja.nome,
      titulo: 'Como podemos cuidar de você hoje?',
      legenda:
        loja.tempo_entrega != null
          ? `Entrega hoje, em até ${loja.tempo_entrega} min`
          : 'Entrega rápida na sua porta',
      cta: 'Ver produtos',
      produto: null,
    }
    const destaque = (secoes[0]?.produtos ?? [])
      .filter((p) => p.foto_url)
      .slice(0, 3)
      .map((p): SlideClinica<T> => ({
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
    const limiar = HERO_H - 140
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

  const deslizarPara = (prox: number) => {
    glideRef.current?.stop()
    glideValor.setValue(heroOffsetRef.current)
    const sub = glideValor.addListener(({ value }) => {
      heroRef.current?.scrollTo({ x: value, animated: false })
    })
    const anim = Animated.timing(glideValor, {
      toValue: prox * SCREEN_W,
      duration: 550,
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

  // Busca local: filtra por nome e descrição (princípio ativo).
  const termo = busca.trim().toLowerCase()
  const resultadoBusca = useMemo(() => {
    if (!termo) return []
    return secoes.flatMap((s) =>
      s.produtos.filter(
        (p) =>
          p.nome.toLowerCase().includes(termo) ||
          (p.descricao ?? '').toLowerCase().includes(termo),
      ),
    )
  }, [secoes, termo])

  const sairPara = (acao: () => void) => (e: GestureResponderEvent) =>
    iniciarSaida({
      acao,
      cor: colors.accent,
      origem: { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY },
    })

  const headerBg = scrollY.interpolate({
    inputRange: [HERO_H - 170, HERO_H - 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })
  const headerBgInverso = scrollY.interpolate({
    inputRange: [HERO_H - 170, HERO_H - 80],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  // Adição rápida: item com receita (ou carrinho de outra loja) abre o
  // detalhe — nunca adiciona às cegas.
  const adicionarRapido = (p: T) => {
    if (exigeReceita(p) || (storeAtual && storeAtual !== loja.id)) {
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
      1200,
    )
  }

  const secaoAtiva = secoes[abaAtiva] ?? secoes[0]

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style={depoisDoHero ? 'dark' : 'light'} />

      {/* Header fixo: transparente sobre o hero → branco com fio */}
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
        <AcaoClinica
          icone="back"
          progresso={{ claro: headerBgInverso, escuro: headerBg }}
          aoTocar={sairPara(() => router.back())}
        />
        <Animated.Text
          numberOfLines={1}
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 16,
            color: colors.ink,
            opacity: headerBg,
            ...fontStyle(design.display, 700),
          }}
        >
          {loja.nome}
        </Animated.Text>
        <AcaoClinica
          icone="bag"
          contador={totalItens}
          progresso={{ claro: headerBgInverso, escuro: headerBg }}
          aoTocar={() => totalItens > 0 && router.push('/checkout')}
        />
      </View>

      <Animated.ScrollView
        ref={scrollRef as any}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingBottom: espacoFinal + ALTURA_BARRA_MENU + 12,
        }}
      >
        {/* ── Hero de fotos com carrossel calmo ── */}
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
                      bottom: 44,
                      gap: 8,
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
                        ...fontStyle(design.body, 600),
                      }}
                    >
                      {slide.eyebrow}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{
                        fontSize: Math.round(25 * typeFactor),
                        lineHeight: Math.round(32 * typeFactor),
                        color: '#FFFFFF',
                        maxWidth: 310,
                        ...fontStyle(design.display, 700),
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
                    {/* CTA fantasma sobre a foto */}
                    <TouchableOpacity
                      activeOpacity={consumerDesign.opacity.pressed}
                      onPress={() => {
                        if (slide.produto) aoAbrirProduto(slide.produto)
                        else
                          (scrollRef.current as any)?.scrollTo?.({
                            y: HERO_H - 40,
                            animated: true,
                          })
                      }}
                      style={{
                        marginTop: 4,
                        paddingHorizontal: 20,
                        paddingVertical: 10,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.85)',
                        borderRadius: 999,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13.5,
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

          {/* Indicadores de linha no topo */}
          {slides.length > 1 && (
            <View
              style={{
                position: 'absolute',
                top: insets.top + 52,
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
                    height: 2.5,
                    borderRadius: 1.5,
                    backgroundColor:
                      i === slideAtivo ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Busca flutuante sobre a borda do hero ── */}
        <View
          style={[
            {
              marginTop: -25,
              marginHorizontal: spacing.screenX,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: colors.surface,
              borderRadius: design.radius.md,
              paddingHorizontal: 14,
              height: 50,
            },
            consumerDesign.shadow.medium,
          ]}
        >
          <ConsumerIcon name="search" size={19} color={colors.accent} strokeWidth={2.1} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar produto ou princípio ativo"
            placeholderTextColor={colors.inkSoft}
            style={{ flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 0 }}
            returnKeyType="search"
          />
          {busca.length > 0 && (
            <TouchableOpacity
              onPress={() => setBusca('')}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            >
              <ConsumerIcon name="close-circle" size={18} color={colors.inkSoft} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Faixa de confiança ── */}
        <View
          style={[
            {
              marginHorizontal: spacing.screenX,
              marginTop: 14,
              flexDirection: 'row',
              backgroundColor: colors.surface,
              borderRadius: design.radius.lg,
              paddingVertical: 14,
            },
            consumerDesign.shadow.soft,
          ]}
        >
          <ItemConfianca
            icone="truck"
            rotulo={
              loja.tempo_entrega != null
                ? `Entrega ${loja.tempo_entrega} min`
                : 'Entrega rápida'
            }
          />
          <Separador />
          <ItemConfianca icone="file" rotulo="Receita na entrega" />
          <Separador />
          <ItemConfianca icone="shield" rotulo="Compra segura" />
        </View>

        {/* ── Oferta da semana ── */}
        {maxDesc > 0 && !termo && (
          <View
            style={[
              {
                marginHorizontal: spacing.screenX,
                marginTop: 14,
                backgroundColor: colors.accent,
                borderRadius: design.radius.lg,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                overflow: 'hidden',
              },
              consumerDesign.shadow.soft,
            ]}
          >
            <View
              style={{
                position: 'absolute',
                left: -34,
                bottom: -44,
                width: 130,
                height: 130,
                borderRadius: 65,
                backgroundColor: 'rgba(255,255,255,0.10)',
              }}
            />
            <View style={{ flex: 1, gap: 3 }}>
              <Text
                style={{
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.8)',
                  ...fontStyle(design.body, 600),
                }}
              >
                Ofertas da semana
              </Text>
              <Text
                style={{
                  fontSize: 24,
                  color: colors.accentInk,
                  ...fontStyle(design.display, 700),
                }}
              >
                Até {maxDesc}% off
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.85)',
                  ...fontStyle(design.body, 500),
                }}
              >
                em itens selecionados
              </Text>
              {produtoPromo && (
                <TouchableOpacity
                  onPress={() => aoAbrirProduto(produtoPromo as T)}
                  activeOpacity={0.85}
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: 8,
                    backgroundColor: '#FFFFFF',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12.5,
                      color: colors.accent,
                      ...fontStyle(design.body, 700),
                    }}
                  >
                    Ver oferta
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {produtoPromo?.foto_url && (
              <View>
                <Image
                  source={{ uri: produtoPromo.foto_url }}
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: design.radius.md,
                  }}
                  resizeMode="cover"
                />
                <View
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    backgroundColor: colors.danger,
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text
                    style={{ fontSize: 10, color: '#FFFFFF', fontWeight: '800' }}
                  >
                    -{maxDesc}%
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Busca ativa: resultados em grade ── */}
        {termo.length > 0 ? (
          resultadoBusca.length > 0 ? (
            <View
              style={{
                marginTop: 20,
                paddingHorizontal: spacing.screenX,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: colors.inkMuted,
                  marginBottom: 12,
                  ...fontStyle(design.body, 500),
                }}
              >
                {resultadoBusca.length}{' '}
                {resultadoBusca.length === 1 ? 'resultado' : 'resultados'} para “
                {busca.trim()}”
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {resultadoBusca.map((p) => (
                  <CardClinico
                    key={p.id}
                    produto={p}
                    largura={Math.round((SCREEN_W - spacing.screenX * 2 - 12) / 2)}
                    adicionado={adicionados.has(p.id)}
                    aoTocar={() => aoAbrirProduto(p)}
                    aoAdicionar={() => adicionarRapido(p)}
                  />
                ))}
              </View>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingTop: 48, gap: 10 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: colors.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ConsumerIcon name="search" size={26} color={colors.accent} />
              </View>
              <Text
                style={{
                  fontSize: 15,
                  color: colors.ink,
                  ...fontStyle(design.body, 600),
                }}
              >
                Nada encontrado para “{busca.trim()}”
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.inkMuted,
                  ...fontStyle(design.body, 400),
                }}
              >
                Tente pelo nome do produto ou princípio ativo
              </Text>
            </View>
          )
        ) : (
          <>
            {/* ── Abas de categoria escritas no topo ── */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                marginTop: 26,
                marginBottom: 14,
              }}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: spacing.screenX,
                  gap: 18,
                }}
                style={{ flex: 1 }}
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
                          fontSize: Math.round(19 * typeFactor),
                          color: ativa ? colors.ink : colors.inkMuted,
                          ...fontStyle(design.display, ativa ? 700 : 400),
                        }}
                      >
                        {s.titulo}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
              {expandida && (
                <TouchableOpacity
                  onPress={() => setExpandida(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ paddingHorizontal: spacing.screenX }}
                >
                  <Text
                    style={{
                      fontSize: 13.5,
                      color: colors.accent,
                      ...fontStyle(design.body, 600),
                    }}
                  >
                    Ver menos
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── Cartões quadrados: trilho com "Ver todos" no fim, ou grade ── */}
            {expandida ? (
              <View
                style={{
                  paddingHorizontal: spacing.screenX,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                {(secaoAtiva?.produtos ?? []).map((p) => (
                  <CardClinico
                    key={p.id}
                    produto={p}
                    largura={Math.round((SCREEN_W - spacing.screenX * 2 - 12) / 2)}
                    adicionado={adicionados.has(p.id)}
                    aoTocar={() => aoAbrirProduto(p)}
                    aoAdicionar={() => adicionarRapido(p)}
                  />
                ))}
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: spacing.screenX,
                  gap: 12,
                }}
                decelerationRate="fast"
                snapToInterval={Math.round(SCREEN_W * 0.44) + 12}
                snapToAlignment="start"
              >
                {(secaoAtiva?.produtos ?? []).map((p) => (
                  <CardClinico
                    key={p.id}
                    produto={p}
                    largura={Math.round(SCREEN_W * 0.44)}
                    adicionado={adicionados.has(p.id)}
                    aoTocar={() => aoAbrirProduto(p)}
                    aoAdicionar={() => adicionarRapido(p)}
                  />
                ))}
                {/* Cartão "Ver todos" no fim do trilho */}
                {(secaoAtiva?.produtos.length ?? 0) > 2 && (
                  <TouchableOpacity
                    onPress={() => setExpandida(true)}
                    activeOpacity={0.85}
                    style={{
                      width: Math.round(SCREEN_W * 0.36),
                      height: Math.round(SCREEN_W * 0.44),
                      borderRadius: design.radius.lg,
                      backgroundColor: colors.accentSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: colors.accent,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ConsumerIcon
                        name="chevron-right"
                        size={20}
                        color={colors.accentInk}
                        strokeWidth={2.4}
                      />
                    </View>
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.accent,
                        textAlign: 'center',
                        ...fontStyle(design.body, 700),
                      }}
                    >
                      Ver todos{'\n'}({secaoAtiva?.produtos.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </>
        )}
      </Animated.ScrollView>

      <BarraMenuClinica sairPara={sairPara} />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Cartão quadrado clínico — tocar abre; "+" adiciona rápido; selo RECEITA
// ─────────────────────────────────────────────────────────────

function CardClinico<T extends ProdutoClinica>({
  produto,
  largura,
  adicionado,
  aoTocar,
  aoAdicionar,
}: {
  produto: T
  largura: number
  adicionado: boolean
  aoTocar: () => void
  aoAdicionar: () => void
}) {
  const design = useStoreDesign()
  const { colors } = design
  const desc = descontoPct(produto)
  const temPromo = desc > 0
  const receita = exigeReceita(produto)
  const escala = useRef(new Animated.Value(1)).current

  const aoTocarMais = () => {
    Animated.sequence([
      Animated.timing(escala, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(escala, {
        toValue: 1,
        speed: 24,
        bounciness: 9,
        useNativeDriver: true,
      }),
    ]).start()
    aoAdicionar()
  }

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
        {/* Selos: desconto (vermelho) e receita (âmbar) */}
        {(temPromo || receita) && (
          <View
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              flexDirection: 'row',
              gap: 6,
            }}
          >
            {temPromo && (
              <View
                style={[
                  {
                    backgroundColor: colors.surface,
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                    borderRadius: 999,
                  },
                  consumerDesign.shadow.soft,
                ]}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.danger,
                    ...fontStyle(design.body, 600),
                  }}
                >
                  -{desc}%
                </Text>
              </View>
            )}
            {receita && (
              <View
                style={[
                  {
                    backgroundColor: colors.surface,
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                    borderRadius: 999,
                  },
                  consumerDesign.shadow.soft,
                ]}
              >
                <Text
                  style={{
                    fontSize: 10,
                    letterSpacing: 0.5,
                    color: colors.warning,
                    ...fontStyle(design.body, 700),
                  }}
                >
                  RECEITA
                </Text>
              </View>
            )}
          </View>
        )}
        {/* Adição rápida no cartão, com pouso elástico */}
        <Animated.View
          style={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            transform: [{ scale: escala }],
          }}
        >
          <TouchableOpacity
            onPress={aoTocarMais}
            activeOpacity={0.85}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              {
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: adicionado ? colors.success : colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
              },
              consumerDesign.shadow.soft,
            ]}
          >
            <ConsumerIcon
              name={adicionado ? 'check' : 'plus'}
              size={16}
              color={colors.accentInk}
              strokeWidth={2.6}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Text
        numberOfLines={1}
        style={{
          marginTop: 9,
          fontSize: 13.5,
          color: colors.ink,
          ...fontStyle(design.body, 600),
        }}
      >
        {produto.nome}
      </Text>
      {produto.descricao && (
        <Text
          numberOfLines={1}
          style={{
            marginTop: 1,
            fontSize: 11.5,
            color: colors.inkMuted,
            ...fontStyle(design.body, 400),
          }}
        >
          {produto.descricao}
        </Text>
      )}
      <View
        style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 3 }}
      >
        <Text
          style={{ fontSize: 14, color: colors.accent, ...fontStyle(design.body, 700) }}
        >
          {formatarReais(produto.preco_promocional ?? produto.preco)}
        </Text>
        {temPromo && (
          <Text
            style={{
              fontSize: 11,
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

// ─────────────────────────────────────────────────────────────
// Apoio
// ─────────────────────────────────────────────────────────────

function ItemConfianca({
  icone,
  rotulo,
}: {
  icone: ConsumerIconName
  rotulo: string
}) {
  const design = useStoreDesign()
  const { colors } = design
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 7 }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ConsumerIcon name={icone} size={16} color={colors.accent} strokeWidth={2.1} />
      </View>
      <Text
        style={{
          fontSize: 10.5,
          textAlign: 'center',
          color: colors.inkMuted,
          ...fontStyle(design.body, 600),
        }}
      >
        {rotulo}
      </Text>
    </View>
  )
}

function Separador() {
  const { colors } = useStoreDesign()
  return <View style={{ width: 1, backgroundColor: colors.line, marginVertical: 4 }} />
}

/** Ação do header: crossfade branco (sobre foto) → ink (header claro). */
function AcaoClinica({
  icone,
  aoTocar,
  progresso,
  contador = 0,
}: {
  icone: 'back' | 'bag'
  aoTocar: (e: GestureResponderEvent) => void
  progresso: {
    claro: Animated.AnimatedInterpolation<number>
    escuro: Animated.AnimatedInterpolation<number>
  }
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
      <Animated.View style={{ position: 'absolute', opacity: progresso.claro }}>
        <ConsumerIcon name={icone} size={22} color="#FFFFFF" strokeWidth={2.1} />
      </Animated.View>
      <Animated.View style={{ opacity: progresso.escuro }}>
        <ConsumerIcon name={icone} size={22} color={colors.ink} strokeWidth={2.1} />
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

function BarraMenuClinica({
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
