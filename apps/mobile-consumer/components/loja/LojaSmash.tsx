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
import { type ProdutoVitrine } from '@/components/loja/LojaEditorial'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * Vitrine smash — layout PRÓPRIO do arquétipo `smash` para hamburguerias e
 * fast-food (docs/store-theme/02; referência: Stack N Snack).
 *
 * DNA destilado da referência:
 * - HERO bordô com pill de entrega, manchete de apetite em caps pesadíssimas
 *   e MOLDURAS COLORIDAS (laranja/rosa/céu) emoldurando fotos dos destaques;
 * - FOLHA CREME do cardápio: chips de categoria (ativa em OURO) e cards de
 *   item em PAGER de um cartão por vez com dots laranja;
 * - FAIXA MARQUEE dourada rolando as categorias da casa;
 * - bloco de OFERTAS laranja: banner com fotos espiando pelas bordas e cards
 *   de combo com selo "ECONOMIZE" em ouro e lista de itens em bullets;
 * - header e barra de menu em PÍLULA FLUTUANTE bordô.
 *
 * Sacola única no header; saída via transição radial laranja.
 */

const { width: SCREEN_W } = Dimensions.get('window')
const ALTURA_BARRA_MENU = 60

// ── DNA fixo da vitrine (independe da paleta; a paleta muda bordô/accent) ──
/** Folha creme do cardápio — o "papel de bandeja" da lanchonete. */
const CREME = '#FAF3E4'
/** Cartão de item sobre o creme. */
const CARTAO = '#FFFFFF'
/** Fio dos cartões sobre o creme. */
const FIO_CREME = '#EFE5D2'
/** Chip de categoria em repouso. */
const CHIP = '#EFE4CC'
/** Ouro do chip ativo, do selo de economia e da faixa marquee. */
const OURO = '#F5C445'
/** Texto de apoio sobre o creme (AA sobre #FAF3E4). */
const TINTA_APOIO = '#6F6354'
/** Rosa e céu das molduras do hero (a 1ª moldura usa o accent da paleta). */
const MOLDURA_ROSA = '#F2A9C4'
const MOLDURA_CEU = '#8FD3EE'

/** rgba a partir de hex — pra véus e contornos derivados da paleta. */
function comAlfa(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, '')
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

interface SecaoLoja<T extends ProdutoVitrine> {
  titulo: string
  produtos: T[]
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

function temPromo(p: ProdutoVitrine): boolean {
  return !!p.preco_promocional && p.preco_promocional < p.preco
}

export function LojaSmash<T extends ProdutoVitrine>({
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
  const scrollY = useRef(new Animated.Value(0)).current
  const [reduzirMovimento, setReduzirMovimento] = useState(false)
  const cardapioY = useRef(0)
  const ofertasY = useRef(0)

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

  const sairPara = (acao: () => void) => (e: GestureResponderEvent) =>
    iniciarSaida({
      acao,
      cor: colors.accent,
      origem: { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY },
    })

  // Pílula do header: invisível sobre o hero bordô, flutua sobre o creme.
  const headerPill = scrollY.interpolate({
    inputRange: [300, 380],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  // Fotos dos destaques pras molduras coloridas do hero.
  const destaques = useMemo(
    () =>
      secoes
        .flatMap((s) => s.produtos)
        .filter((p) => p.foto_url)
        .slice(0, 6),
    [secoes],
  )

  // Ofertas da casa (itens em promoção, qualquer seção).
  const ofertas = useMemo(
    () => secoes.flatMap((s) => s.produtos).filter(temPromo),
    [secoes],
  )
  const maxDesconto = useMemo(
    () =>
      ofertas.length > 0
        ? Math.round(
            Math.max(
              ...ofertas.map((p) => 1 - (p.preco_promocional ?? p.preco) / p.preco),
            ) * 100,
          )
        : 0,
    [ofertas],
  )

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

  const rolarPara = (y: number) =>
    scrollRef.current?.scrollTo({ y: Math.max(y - 64, 0), animated: true })

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="light" />

      {/* Tira bordô atrás da status bar quando o creme rola por baixo */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: insets.top + 4,
          zIndex: 10,
          backgroundColor: colors.canvas,
          opacity: headerPill,
        }}
      />

      {/* Header: pílula flutuante bordô (invisível sobre o hero) */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + 6,
          left: 14,
          right: 14,
          zIndex: 11,
          height: 52,
          justifyContent: 'center',
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 999,
              backgroundColor: colors.canvas,
              borderWidth: 1,
              borderColor: colors.line,
              opacity: headerPill,
            },
            consumerDesign.shadow.floating,
          ]}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
          }}
        >
          <AcaoSmash icone="back" aoTocar={sairPara(() => router.back())} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <WordmarkSmash nome={loja.nome} tamanho={17} />
          </View>
          <AcaoSmash
            icone="bag"
            contador={totalItens}
            aoTocar={() => totalItens > 0 && router.push('/checkout')}
          />
        </View>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: espacoFinal + ALTURA_BARRA_MENU + insets.bottom + 24,
        }}
      >
        {/* ── Hero bordô: pill de entrega + manchete + molduras ── */}
        <View style={{ paddingTop: insets.top + 78, paddingBottom: 34 }}>
          <View
            style={{
              alignSelf: 'center',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              borderWidth: 1.5,
              borderColor: colors.accent,
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }}
          >
            <ConsumerIcon name="spark" size={14} color={colors.accent} strokeWidth={2.1} />
            <Text
              style={{
                fontSize: 12.5,
                color: colors.accent,
                ...fontStyle(design.body, 700),
              }}
            >
              {loja.tempo_entrega != null
                ? `Entrega em até ${loja.tempo_entrega} min`
                : 'Peça e receba rapidinho'}
            </Text>
          </View>

          <View style={{ marginTop: 24, paddingHorizontal: spacing.screenX }}>
            {['DEU FOME?', 'PEDE. CHEGOU.'].map((linha) => (
              <Text
                key={linha}
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  fontSize: Math.round(44 * typeFactor),
                  lineHeight: Math.round(50 * typeFactor),
                  letterSpacing: 0.5,
                  textAlign: 'center',
                  color: colors.ink,
                  ...fontStyle(design.display, 800),
                }}
              >
                {linha}
              </Text>
            ))}
          </View>

          <View
            style={{
              marginTop: 24,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => rolarPara(cardapioY.current)}
              style={{
                backgroundColor: colors.accent,
                borderRadius: 999,
                paddingHorizontal: 22,
                paddingVertical: 14,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  letterSpacing: 0.8,
                  color: colors.accentInk,
                  ...fontStyle(design.display, 800),
                }}
              >
                PEDIR AGORA  →
              </Text>
            </TouchableOpacity>
            {ofertas.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => rolarPara(ofertasY.current)}
                style={{
                  borderWidth: 1.5,
                  borderColor: comAlfa(colors.ink, 0.85),
                  borderRadius: 999,
                  paddingHorizontal: 22,
                  paddingVertical: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    letterSpacing: 0.8,
                    color: colors.ink,
                    ...fontStyle(design.display, 800),
                  }}
                >
                  VER OFERTAS
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Molduras coloridas — fotos dos destaques com peek */}
          {destaques.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              style={{ marginTop: 30 }}
              contentContainerStyle={{
                paddingHorizontal: spacing.screenX,
                gap: 14,
                paddingBottom: 4,
              }}
            >
              {destaques.map((p, i) => (
                <TouchableOpacity
                  key={p.id}
                  activeOpacity={0.9}
                  onPress={() => aoAbrirProduto(p)}
                  style={{
                    width: Math.round(SCREEN_W * 0.58),
                    height: Math.round(SCREEN_W * 0.58 * 1.28),
                    borderRadius: 28,
                    borderWidth: 5,
                    borderColor:
                      [colors.accent, MOLDURA_ROSA, MOLDURA_CEU][i % 3],
                    overflow: 'hidden',
                    backgroundColor: colors.surface,
                  }}
                >
                  <Image
                    source={{ uri: p.foto_url ?? undefined }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {loja.descricao && (
            <Text
              numberOfLines={2}
              style={{
                marginTop: 24,
                marginHorizontal: spacing.screenX + 8,
                textAlign: 'center',
                fontSize: 14.5,
                lineHeight: 21,
                color: colors.inkMuted,
                ...fontStyle(design.body, 500),
              }}
            >
              {loja.descricao}
            </Text>
          )}
          <Text
            style={{
              marginTop: 8,
              textAlign: 'center',
              fontSize: 12.5,
              color: colors.inkMuted,
              ...fontStyle(design.body, 500),
            }}
          >
            {meta}
          </Text>
        </View>

        {/* ── Folha creme: cardápio com chips + pager de cartões ── */}
        <View
          onLayout={(e) => {
            cardapioY.current = e.nativeEvent.layout.y
          }}
          style={{
            backgroundColor: CREME,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            paddingTop: 30,
            paddingBottom: 36,
          }}
        >
          <CardapioSmash secoes={secoes} aoAbrirProduto={aoAbrirProduto} />
        </View>

        {/* ── Faixa marquee dourada com as categorias da casa ── */}
        {secoes.length > 0 && (
          <MarqueeSmash
            palavras={secoes.map((s) => s.titulo)}
            reduzirMovimento={reduzirMovimento}
          />
        )}

        {/* ── Ofertas: banner laranja + cards de combo ── */}
        {ofertas.length > 0 && (
          <View
            onLayout={(e) => {
              ofertasY.current = e.nativeEvent.layout.y
            }}
          >
            <BannerOfertas
              fotos={ofertas
                .filter((p) => p.foto_url)
                .slice(0, 4)
                .map((p) => p.foto_url as string)}
              maxDesconto={maxDesconto}
            />
            <View
              style={{
                backgroundColor: CREME,
                paddingTop: 30,
                paddingBottom: 36,
              }}
            >
              <OfertasSmash ofertas={ofertas} aoAbrirProduto={aoAbrirProduto} />
            </View>
          </View>
        )}

        {/* ── Fecho bordô: wordmark + meta ── */}
        <View
          style={{
            alignItems: 'center',
            gap: 10,
            paddingVertical: 44,
            paddingHorizontal: spacing.screenX,
          }}
        >
          <WordmarkSmash nome={loja.nome} tamanho={24} />
          <Text
            style={{
              fontSize: 12.5,
              color: colors.inkMuted,
              ...fontStyle(design.body, 500),
            }}
          >
            {meta}
          </Text>
        </View>
      </Animated.ScrollView>

      <BarraMenuSmash sairPara={sairPara} />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Wordmark — caps pesadas com a palavra curta num disco laranja
// ─────────────────────────────────────────────────────────────

/**
 * A assinatura do header da referência: "STACK (N) SNACK" — a palavra-elo
 * curta vive num disco no accent. Nomes sem elo curto ficam só nas caps.
 */
function WordmarkSmash({ nome, tamanho }: { nome: string; tamanho: number }) {
  const design = useStoreDesign()
  const { colors } = design
  const palavras = nome.trim().split(/\s+/)
  const discoIdx = palavras.findIndex((p, i) => i > 0 && p.length <= 2)
  const disco = Math.round(tamanho * 1.45)

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: Math.round(tamanho * 0.3),
      }}
    >
      {palavras.map((palavra, i) =>
        i === discoIdx ? (
          <View
            key={`${palavra}-${i}`}
            style={{
              width: disco,
              height: disco,
              borderRadius: disco / 2,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: Math.round(tamanho * 0.62),
                color: colors.accentInk,
                textTransform: 'uppercase',
                ...fontStyle(design.display, 800),
              }}
            >
              {palavra}
            </Text>
          </View>
        ) : (
          <Text
            key={`${palavra}-${i}`}
            numberOfLines={1}
            style={{
              fontSize: tamanho,
              letterSpacing: 0.6,
              color: colors.ink,
              textTransform: 'uppercase',
              ...fontStyle(design.display, 800),
            }}
          >
            {palavra}
          </Text>
        ),
      )}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Cardápio — chips de categoria + pager de um cartão com dots
// ─────────────────────────────────────────────────────────────

function CardapioSmash<T extends ProdutoVitrine>({
  secoes,
  aoAbrirProduto,
}: {
  secoes: SecaoLoja<T>[]
  aoAbrirProduto: (p: T) => void
}) {
  const design = useStoreDesign()
  const { colors, spacing, typeFactor } = design
  const [secaoAtiva, setSecaoAtiva] = useState(0)
  const [pagina, setPagina] = useState(0)
  const pagerRef = useRef<ScrollView>(null)

  const secao = secoes[Math.min(secaoAtiva, Math.max(secoes.length - 1, 0))]

  function trocarSecao(i: number) {
    setSecaoAtiva(i)
    setPagina(0)
    pagerRef.current?.scrollTo({ x: 0, animated: false })
  }

  if (!secao) return null

  return (
    <View>
      <PillSecao rotulo="Cardápio" />
      <Text
        style={{
          marginTop: 14,
          textAlign: 'center',
          fontSize: Math.round(30 * typeFactor),
          letterSpacing: 0.6,
          color: colors.canvas,
          ...fontStyle(design.display, 800),
        }}
      >
        FOME DE QUÊ?
      </Text>
      <Text
        style={{
          marginTop: 8,
          marginHorizontal: spacing.screenX + 12,
          textAlign: 'center',
          fontSize: 14,
          lineHeight: 20,
          color: TINTA_APOIO,
          ...fontStyle(design.body, 500),
        }}
      >
        Cada mordida conta. Escolha a categoria e monte o pedido.
      </Text>

      {/* Chips de categoria — ativa em ouro */}
      <View
        style={{
          marginTop: 18,
          paddingHorizontal: spacing.screenX,
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {secoes.map((s, i) => (
          <TouchableOpacity
            key={s.titulo}
            activeOpacity={0.8}
            onPress={() => trocarSecao(i)}
            style={{
              backgroundColor: i === secaoAtiva ? OURO : CHIP,
              borderRadius: 999,
              paddingHorizontal: 16,
              paddingVertical: 9,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: colors.canvas,
                ...fontStyle(design.display, 800),
              }}
            >
              {s.titulo}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pager: um cartão por vez, como na referência */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setPagina(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
        }
        style={{ marginTop: 22 }}
      >
        {secao.produtos.map((p) => (
          <View
            key={p.id}
            style={{ width: SCREEN_W, paddingHorizontal: spacing.screenX }}
          >
            <CardSmash produto={p} aoTocar={() => aoAbrirProduto(p)} />
          </View>
        ))}
      </ScrollView>

      {secao.produtos.length > 1 && (
        <Dots total={secao.produtos.length} ativo={pagina} />
      )}
    </View>
  )
}

/** Cartão branco do item: palco de foto, nome em caps, preço laranja, CTA bordô. */
function CardSmash({
  produto,
  aoTocar,
}: {
  produto: ProdutoVitrine
  aoTocar: () => void
}) {
  const design = useStoreDesign()
  const { colors } = design
  const recorte = (produto as { metadata?: Record<string, unknown> | null })
    .metadata?.recorte as string | undefined
  const larguraFoto = SCREEN_W - design.spacing.screenX * 2 - 32

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={aoTocar}
      style={{
        backgroundColor: CARTAO,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: FIO_CREME,
        padding: 16,
      }}
    >
      <View
        style={{
          height: Math.round(larguraFoto * 0.76),
          borderRadius: 22,
          overflow: 'hidden',
          backgroundColor: recorte ? CARTAO : CREME,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {produto.foto_url || recorte ? (
          <Image
            source={{ uri: recorte ?? produto.foto_url ?? undefined }}
            style={{ width: '100%', height: '100%' }}
            // Recorte transparente do lojista → produto "solto" no palco
            // branco, o cutout da referência; foto comum cobre o quadro.
            resizeMode={recorte ? 'contain' : 'cover'}
          />
        ) : (
          <ConsumerIcon name="chef" size={54} color={FIO_CREME} />
        )}
      </View>

      <Text
        numberOfLines={1}
        style={{
          marginTop: 16,
          fontSize: 19,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: colors.canvas,
          ...fontStyle(design.display, 800),
        }}
      >
        {produto.nome}
      </Text>
      {produto.descricao && (
        <Text
          numberOfLines={2}
          style={{
            marginTop: 6,
            fontSize: 14,
            lineHeight: 20,
            color: TINTA_APOIO,
            ...fontStyle(design.body, 500),
          }}
        >
          {produto.descricao}
        </Text>
      )}

      <View
        style={{
          marginTop: 10,
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 8,
        }}
      >
        <Text
          style={{
            fontSize: 26,
            color: colors.accent,
            ...fontStyle(design.display, 800),
          }}
        >
          {formatarReais(precoFinalDe(produto))}
        </Text>
        {temPromo(produto) && (
          <Text
            style={{
              fontSize: 14,
              marginBottom: 3,
              color: '#B9AC97',
              textDecorationLine: 'line-through',
              ...fontStyle(design.body, 600),
            }}
          >
            {formatarReais(produto.preco)}
          </Text>
        )}
      </View>

      <View
        style={{
          marginTop: 14,
          backgroundColor: colors.canvas,
          borderRadius: 999,
          paddingVertical: 15,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 13,
            letterSpacing: 1,
            color: colors.ink,
            ...fontStyle(design.display, 800),
          }}
        >
          PEDIR AGORA
        </Text>
      </View>
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────────────────────────
// Ofertas — banner laranja + pager de cards de combo
// ─────────────────────────────────────────────────────────────

/** Banner "CHUVA DE OFERTAS" com fotos espiando pelas bordas, como na ref. */
function BannerOfertas({
  fotos,
  maxDesconto,
}: {
  fotos: string[]
  maxDesconto: number
}) {
  const design = useStoreDesign()
  const { colors } = design
  const posicoes = [
    { top: -18, left: -16, transform: [{ rotate: '-8deg' }] },
    { top: -22, right: -14, transform: [{ rotate: '7deg' }] },
    { bottom: -20, left: 22, transform: [{ rotate: '6deg' }] },
    { bottom: -16, right: 30, transform: [{ rotate: '-7deg' }] },
  ] as const

  return (
    <View
      style={{
        backgroundColor: colors.accent,
        paddingVertical: 52,
        overflow: 'hidden',
      }}
    >
      {fotos.map((uri, i) => (
        <View
          key={`${uri}-${i}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 92,
            height: 92,
            borderRadius: 20,
            borderWidth: 4,
            borderColor: CREME,
            overflow: 'hidden',
            ...posicoes[i % posicoes.length],
          }}
        >
          <Image
            source={{ uri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
      ))}

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          marginHorizontal: 84,
          textAlign: 'center',
          fontSize: Math.round(32 * design.typeFactor),
          letterSpacing: 0.6,
          color: colors.accentInk,
          ...fontStyle(design.display, 800),
        }}
      >
        CHUVA DE OFERTAS
      </Text>
      <Text
        style={{
          marginTop: 8,
          marginHorizontal: 64,
          textAlign: 'center',
          fontSize: 14,
          color: colors.accentInk,
          opacity: 0.82,
          ...fontStyle(design.body, 600),
        }}
      >
        {maxDesconto > 0
          ? `Economize até ${maxDesconto}% nos combos da casa`
          : 'Os combos da casa com preço de amigo'}
      </Text>
    </View>
  )
}

function OfertasSmash<T extends ProdutoVitrine>({
  ofertas,
  aoAbrirProduto,
}: {
  ofertas: T[]
  aoAbrirProduto: (p: T) => void
}) {
  const design = useStoreDesign()
  const { colors, spacing, typeFactor } = design
  const [pagina, setPagina] = useState(0)

  return (
    <View>
      <PillSecao rotulo="Ofertas" />
      <Text
        style={{
          marginTop: 14,
          marginHorizontal: spacing.screenX,
          textAlign: 'center',
          fontSize: Math.round(26 * typeFactor),
          letterSpacing: 0.5,
          color: colors.canvas,
          ...fontStyle(design.display, 800),
        }}
      >
        COMBOS QUE FAZEM SENTIDO
      </Text>
      <Text
        style={{
          marginTop: 8,
          marginHorizontal: spacing.screenX + 12,
          textAlign: 'center',
          fontSize: 14,
          lineHeight: 20,
          color: TINTA_APOIO,
          ...fontStyle(design.body, 500),
        }}
      >
        Empilhe os favoritos e economize de verdade — ofertas que valem a fome.
      </Text>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setPagina(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
        }
        style={{ marginTop: 22 }}
      >
        {ofertas.map((p) => (
          <View
            key={p.id}
            style={{ width: SCREEN_W, paddingHorizontal: spacing.screenX }}
          >
            <CardOferta produto={p} aoTocar={() => aoAbrirProduto(p)} />
          </View>
        ))}
      </ScrollView>

      {ofertas.length > 1 && <Dots total={ofertas.length} ativo={pagina} />}
    </View>
  )
}

/** Card laranja do combo: selo ECONOMIZE em ouro, itens em bullets, CTA bordô. */
function CardOferta({
  produto,
  aoTocar,
}: {
  produto: ProdutoVitrine
  aoTocar: () => void
}) {
  const design = useStoreDesign()
  const { colors } = design
  const larguraFoto = SCREEN_W - design.spacing.screenX * 2 - 32
  const economia = produto.preco - (produto.preco_promocional ?? produto.preco)
  // Combos descritos como "item + item + item" viram a lista em bullets da
  // referência; descrição corrida fica como parágrafo.
  const partes = (produto.descricao ?? '')
    .split('+')
    .map((s) => s.trim())
    .filter(Boolean)
  const ehLista = partes.length > 1

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={aoTocar}
      style={{
        backgroundColor: colors.accent,
        borderRadius: 30,
        padding: 16,
      }}
    >
      {produto.foto_url && (
        <View
          style={{
            height: Math.round(larguraFoto * 0.62),
            borderRadius: 22,
            overflow: 'hidden',
            backgroundColor: comAlfa(colors.accentInk, 0.14),
          }}
        >
          <Image
            source={{ uri: produto.foto_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
      )}

      {economia > 0 && (
        <View
          style={{
            marginTop: 14,
            alignSelf: 'flex-start',
            backgroundColor: OURO,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text
            style={{
              fontSize: 11.5,
              letterSpacing: 0.5,
              color: colors.canvas,
              ...fontStyle(design.display, 800),
            }}
          >
            ECONOMIZE {formatarReais(economia)}
          </Text>
        </View>
      )}

      <Text
        numberOfLines={1}
        style={{
          marginTop: 10,
          fontSize: 20,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: colors.accentInk,
          ...fontStyle(design.display, 800),
        }}
      >
        {produto.nome}
      </Text>

      {ehLista ? (
        <View style={{ marginTop: 8, gap: 4 }}>
          {partes.map((parte) => (
            <Text
              key={parte}
              numberOfLines={1}
              style={{
                fontSize: 14,
                lineHeight: 20,
                color: colors.accentInk,
                opacity: 0.85,
                ...fontStyle(design.body, 600),
              }}
            >
              •  {parte}
            </Text>
          ))}
        </View>
      ) : produto.descricao ? (
        <Text
          numberOfLines={2}
          style={{
            marginTop: 8,
            fontSize: 14,
            lineHeight: 20,
            color: colors.accentInk,
            opacity: 0.85,
            ...fontStyle(design.body, 600),
          }}
        >
          {produto.descricao}
        </Text>
      ) : null}

      <View
        style={{
          marginTop: 12,
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 10,
        }}
      >
        <Text
          style={{
            fontSize: 30,
            color: colors.accentInk,
            ...fontStyle(design.display, 800),
          }}
        >
          {formatarReais(precoFinalDe(produto))}
        </Text>
        {temPromo(produto) && (
          <Text
            style={{
              fontSize: 15,
              marginBottom: 4,
              color: colors.accentInk,
              opacity: 0.55,
              textDecorationLine: 'line-through',
              ...fontStyle(design.body, 600),
            }}
          >
            {formatarReais(produto.preco)}
          </Text>
        )}
      </View>

      <View
        style={{
          marginTop: 14,
          backgroundColor: colors.canvas,
          borderRadius: 999,
          paddingVertical: 15,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 13,
            letterSpacing: 1,
            color: colors.ink,
            ...fontStyle(design.display, 800),
          }}
        >
          PEGAR OFERTA
        </Text>
      </View>
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────────────────────────
// Faixa marquee dourada — as categorias rolando em loop
// ─────────────────────────────────────────────────────────────

function MarqueeSmash({
  palavras,
  reduzirMovimento,
}: {
  palavras: string[]
  reduzirMovimento: boolean
}) {
  const design = useStoreDesign()
  const { colors } = design
  const deslocamento = useRef(new Animated.Value(0)).current
  const [larguraConteudo, setLarguraConteudo] = useState(0)

  useEffect(() => {
    if (reduzirMovimento || larguraConteudo === 0) return
    // Loop contínuo: anda a largura de UMA cópia e recomeça (cópias
    // idênticas — o salto é invisível). ~38 px/s, ritmo de lanchonete.
    const anim = Animated.loop(
      Animated.timing(deslocamento, {
        toValue: -larguraConteudo,
        duration: (larguraConteudo / 38) * 1000,
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
      {palavras.map((palavra, i) => (
        <View
          key={`${palavra}-${i}`}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Text
            style={{
              fontSize: 13,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: colors.canvas,
              ...fontStyle(design.display, 800),
            }}
          >
            {palavra}
          </Text>
          <Text
            style={{
              marginHorizontal: 16,
              fontSize: 13,
              color: colors.canvas,
              opacity: 0.55,
            }}
          >
            •
          </Text>
        </View>
      ))}
    </View>
  )

  return (
    <View
      style={{
        backgroundColor: OURO,
        paddingVertical: 11,
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
// Apoio
// ─────────────────────────────────────────────────────────────

/** Pill de contorno laranja que abre cada seção da folha creme. */
function PillSecao({ rotulo }: { rotulo: string }) {
  const design = useStoreDesign()
  const { colors } = design
  return (
    <View
      style={{
        alignSelf: 'center',
        borderWidth: 1.5,
        borderColor: colors.accent,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 6,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          color: colors.accent,
          ...fontStyle(design.body, 700),
        }}
      >
        {rotulo}
      </Text>
    </View>
  )
}

/** Dots do pager — laranja cheio no ativo, laranja fantasma no resto. */
function Dots({ total, ativo }: { total: number; ativo: number }) {
  const { colors } = useStoreDesign()
  return (
    <View
      style={{
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 7,
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.accent,
            opacity: i === ativo ? 1 : 0.28,
          }}
        />
      ))}
    </View>
  )
}

/** Ação do topo: ícone creme num quadrado arredondado de contorno fino. */
function AcaoSmash({
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
      style={{
        width: 40,
        height: 40,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: comAlfa(colors.ink, 0.45),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ConsumerIcon name={icone} size={19} color={colors.ink} strokeWidth={2.1} />
      {contador > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            minWidth: 17,
            height: 17,
            borderRadius: 9,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
          }}
        >
          <Text
            style={{ fontSize: 10, color: colors.accentInk, fontWeight: '800' }}
          >
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

/** Barra de menu em pílula flutuante bordô — eco do header da referência. */
function BarraMenuSmash({
  sairPara,
}: {
  sairPara: (acao: () => void) => (e: GestureResponderEvent) => void
}) {
  const design = useStoreDesign()
  const { colors } = design
  const insets = useSafeAreaInsets()
  return (
    <View
      style={[
        {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: Math.max(insets.bottom, 12),
          zIndex: 12,
          height: ALTURA_BARRA_MENU,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.canvas,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.line,
        },
        consumerDesign.shadow.floating,
      ]}
    >
      {ITENS_MENU.map((item) => {
        const cor = item.ativo ? colors.accent : colors.inkMuted
        return (
          <TouchableOpacity
            key={item.rota}
            onPress={sairPara(() => router.navigate(item.rota as never))}
            activeOpacity={0.7}
            style={{ flex: 1, alignItems: 'center', gap: 3 }}
          >
            <ConsumerIcon
              name={item.icone}
              size={20}
              color={cor}
              strokeWidth={item.ativo ? 2.1 : 1.7}
            />
            <Text
              style={{
                fontSize: 10,
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
