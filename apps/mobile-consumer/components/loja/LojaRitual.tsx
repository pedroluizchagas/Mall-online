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
  type TextStyle,
} from 'react-native'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Shrikhand_400Regular, useFonts } from '@expo-google-fonts/shrikhand'
import { formatarReais } from '@mallevo/lib'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { useCartStore } from '@/store/useCartStore'
import { useTransicaoSaida } from '@/store/useTransicaoSaida'
import { type ProdutoVitrine } from '@/components/loja/LojaEditorial'
import { GRADIENTE_HERO, SCRIM_TOPO } from '@/components/loja/gradientes'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * Vitrine ritual — layout PRÓPRIO do arquétipo `ritual` para açaiterias e
 * alimentação lifestyle (docs/store-theme/02; referência: OCHA).
 *
 * DNA destilado da referência:
 * - PÁGINA ROSA onde toda seção é um cartão de canto redondo FLUTUANDO — o
 *   gutter rosa contorna tudo e é a assinatura nº 1 do layout;
 * - PILL FLUTUANTE centrado como ÚNICO chrome (saída · status · sacola),
 *   fixo o scroll inteiro — sem barra de menu inferior, como na referência;
 * - HERO cartão-foto com o wordmark groovy GIGANTE em rosa sobre a foto,
 *   statement de marca em caps condensadas creme, fileira de miniaturas que
 *   trocam a foto por crossfade e um RELÓGIO VIVO no rodapé;
 * - ESPECIAIS: a palavra gigante FIXA no cartão e os produtos deslizando por
 *   cima dela, com os nomes dos vizinhos rotacionados sangrando nos cantos;
 * - CARDÁPIO em cartões creme PURAMENTE TIPOGRÁFICOS (nome + preço, sem foto
 *   e sem descrição), no respiro vertical largo da referência.
 *
 * Sacola única no pill; saída via transição radial no accent.
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

/** Gutter rosa visível ao redor de TODO cartão — a assinatura da página. */
const GUTTER = 12
/** Canto dos cartões: sempre o mesmo, o layout inteiro é uma família de pills. */
const RAIO_CARTAO = 28
const ALTURA_PILL = 52
/**
 * Folga lateral da palavra-assinatura, como FRAÇÃO da largura do cartão. Um
 * Text absoluto SEM `left`/`right` é medido pelo Yoga em AtMost(largura) e
 * reticenciado — o oposto do efeito. Com offsets negativos o box ganha largura
 * determinada, e o `overflow: 'hidden'` do cartão faz o corte nas bordas.
 * Proporcional, e não fixa, porque o corpo também deriva da largura: em fração
 * o box vale sempre 2× o cartão, folga que cobre até a face de sistema (~1,8×)
 * enquanto a Anton não carrega — numa tela de tablet uma folga fixa viraria
 * pouca coisa e a palavra voltaria a ser cortada no fim.
 */
const SANGRIA_FRACAO = 0.5

// ── DNA fixo da vitrine (independe da paleta; a paleta muda rosa/accent) ──
/** Papel creme do cardápio — o cartão tipográfico da referência. */
const CREME = '#FBF3DC'
/** Itens e preços do menu sobre o creme (4.85:1 — o rosa claro da ref reprova AA). */
const ROSA_MENU = '#B93A72'
/** Anel da miniatura ativa do hero. */
const ANEL_ATIVO = '#FFFFFF'
/** Disco de status do pill — menta que lê sobre qualquer accent do arquétipo. */
const MENTA = '#7FE0A8'

/** A voz de manifesto da casa: humor de marca, neutro de nicho. */
const MANIFESTO =
  'A GENTE PREPARA. AS AMIZADES, OS ROLÊS E AS BOAS IDEIAS QUE VIEREM DEPOIS SÃO POR SUA CONTA.'

/**
 * Véu de legibilidade dos cartões-foto. O GRADIENTE_HERO é um perfil de duas
 * bandas: alpha 0,32 no topo, ZERO no miolo, 0,58 na base — texto claro posto
 * fora das duas bandas (o wordmark lá em cima, o statement no terço inferior)
 * nada sobre foto clara. O SCRIM_TOPO é uma rampa única; ele serve o topo
 * direto e a base de cabeça pra baixo, e empilhar cópias multiplica a
 * densidade — 1-(1-a)^n — sem criar linha de corte, porque a ponta fraca da
 * rampa continua em zero.
 */
function Veu({
  lado,
  fracao,
  copias = 2,
}: {
  lado: 'topo' | 'base'
  fracao: number
  copias?: number
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        ...(lado === 'topo' ? { top: 0 } : { bottom: 0 }),
        height: `${Math.round(fracao * 100)}%`,
        transform: lado === 'base' ? [{ rotate: '180deg' }] : [],
      }}
    >
      {Array.from({ length: copias }).map((_, i) => (
        <Image
          key={i}
          source={{ uri: SCRIM_TOPO }}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          resizeMode="stretch"
        />
      ))}
    </View>
  )
}

/** rgba a partir de hex — pra véus e contornos derivados da paleta. */
function comAlfa(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, '')
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * A Shrikhand groovy é DNA DESTA vitrine, não token do arquétipo (mesmo
 * racional do mono da vitrine raw): carrega local e, enquanto não chega — ou
 * se falhar —, cai nas caps condensadas do display. Muda o sabor do wordmark,
 * nunca o layout.
 */
function useFonteGroovy(): TextStyle {
  const { display } = useStoreDesign()
  const [pronta] = useFonts({ Shrikhand_400Regular })
  return pronta
    ? { fontFamily: 'Shrikhand_400Regular' }
    : fontStyle(display, 800)
}

/** Recorte transparente publicado pelo lojista (PNG sem fundo). */
function recorteDe(p: ProdutoVitrine): string | undefined {
  return (p as { metadata?: Record<string, unknown> | null }).metadata
    ?.recorte as string | undefined
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

export function LojaRitual<T extends ProdutoVitrine>({
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
  const [reduzirMovimento, setReduzirMovimento] = useState(false)

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

  // Fotos do hero: banner da casa na frente, produtos completando até 4.
  const heroFotos = useMemo(() => {
    const urls = [
      loja.banner_url,
      ...secoes.flatMap((s) => s.produtos).map((p) => p.foto_url),
    ].filter((u): u is string => !!u)
    return Array.from(new Set(urls)).slice(0, 4)
  }, [loja.banner_url, secoes])

  // Seção de especiais da casa; sem ela, os primeiros itens com foto servem
  // de vitrine — o cartão-assinatura nunca fica vazio.
  const secaoEspeciais = useMemo(
    () => secoes.find((s) => s.titulo.toLowerCase().includes('especia')),
    [secoes],
  )
  const especiais = useMemo(
    () =>
      (
        secaoEspeciais?.produtos ??
        secoes
          .flatMap((s) => s.produtos)
          .filter((p) => p.foto_url)
          .slice(0, 4)
      ).slice(0, 6),
    [secaoEspeciais, secoes],
  )
  // Uma seção que já virou cartão de especiais não se repete no cardápio.
  const secoesCardapio = useMemo(
    () => secoes.filter((s) => s !== secaoEspeciais),
    [secoes, secaoEspeciais],
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />

      {/* Nada aqui reage ao scroll — o pill é fixo, então a página é um
          ScrollView simples e o único Animated.Value vive nos especiais. */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + ALTURA_PILL + 16,
          paddingBottom: espacoFinal + insets.bottom + 24,
        }}
      >
        {/* ── Hero: cartão-foto com wordmark groovy e seletor de miniaturas ── */}
        <HeroRitual
          nome={loja.nome}
          descricao={loja.descricao}
          tempo={loja.tempo_entrega}
          fotos={heroFotos}
          reduzirMovimento={reduzirMovimento}
        />

        {/* ── Manifesto: sem cartão, direto no rosa (o respiro da página) ── */}
        <Text
          style={{
            marginTop: 6,
            paddingVertical: 44,
            paddingHorizontal: spacing.screenX + 8,
            textAlign: 'center',
            fontSize: Math.round(27 * typeFactor),
            lineHeight: Math.round(29 * typeFactor),
            letterSpacing: 0.3,
            color: colors.accent,
            ...fontStyle(design.display, 800),
          }}
        >
          {MANIFESTO}
        </Text>

        {/* ── Especiais: a palavra gigante atrás dos produtos ── */}
        {especiais.length > 0 && (
          <EspeciaisRitual
            produtos={especiais}
            aoAbrirProduto={aoAbrirProduto}
            reduzirMovimento={reduzirMovimento}
          />
        )}

        {/* ── Cardápio: cartões creme puramente tipográficos ── */}
        {secoesCardapio.map((secao) => (
          <CartaoCardapio
            key={secao.titulo}
            secao={secao}
            aoAbrirProduto={aoAbrirProduto}
          />
        ))}

        {/* ── Fecho: foto do ambiente com a assinatura da casa ── */}
        <FechoRitual
          nome={loja.nome}
          foto={heroFotos[0] ?? null}
          meta={meta}
        />
      </ScrollView>

      {/* Pill flutuante — o único chrome da vitrine, fixo o scroll inteiro */}
      <View
        style={[
          {
            position: 'absolute',
            top: insets.top + 6,
            alignSelf: 'center',
            // Teto de largura + texto que encolhe: com o corpo do sistema em
            // fontScale alto o status quebraria em 2 linhas e vazaria da
            // pílula de altura fixa, espremendo o chevron — a ÚNICA saída
            // desta vitrine (não há barra de menu inferior).
            maxWidth: SCREEN_W - 28,
            zIndex: 20,
            height: ALTURA_PILL,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingLeft: 6,
            paddingRight: 8,
            borderRadius: 999,
            backgroundColor: colors.accent,
            borderWidth: 1,
            borderColor: comAlfa(colors.accentInk, 0.18),
          },
          consumerDesign.shadow.floating,
        ]}
      >
        <TouchableOpacity
          onPress={sairPara(() => router.back())}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
          style={{
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ConsumerIcon
            name="chevron-left"
            size={20}
            color={colors.accentInk}
            strokeWidth={2.2}
          />
        </TouchableOpacity>

        <View
          style={{
            flexShrink: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: MENTA,
            }}
          />
          <Text
            numberOfLines={1}
            style={{
              flexShrink: 1,
              fontSize: 12.5,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: colors.accentInk,
              ...fontStyle(design.display, 800),
            }}
          >
            Aberto para pedidos
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => totalItens > 0 && router.push('/checkout')}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.canvas,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ConsumerIcon
            name="bag"
            size={17}
            color={colors.accent}
            strokeWidth={2.1}
          />
          {totalItens > 0 && (
            <View
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 17,
                height: 17,
                borderRadius: 9,
                paddingHorizontal: 4,
                backgroundColor: colors.accent,
                borderWidth: 1.5,
                borderColor: colors.canvas,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 9.5,
                  color: colors.accentInk,
                  fontWeight: '800',
                }}
              >
                {totalItens}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero — cartão-foto, wordmark groovy, miniaturas e relógio vivo
// ─────────────────────────────────────────────────────────────

function HeroRitual({
  nome,
  descricao,
  tempo,
  fotos,
  reduzirMovimento,
}: {
  nome: string
  descricao?: string | null
  tempo?: number | null
  fotos: string[]
  reduzirMovimento: boolean
}) {
  const design = useStoreDesign()
  const { colors, typeFactor } = design
  const groovy = useFonteGroovy()

  const [indiceFoto, setIndiceFoto] = useState(0)
  const [proximaFoto, setProximaFoto] = useState<number | null>(null)
  const fade = useRef(new Animated.Value(0)).current
  // O anel marca o DESTINO do toque, não o fim da fusão: quem tocou já vê a
  // seleção mudar enquanto a imagem ainda corre atrás.
  const selecionada = proximaFoto ?? indiceFoto

  // Relógio vivo do rodapé (o "NEW YORK · 7:23 PM" da referência): meio minuto
  // basta pra nunca mostrar hora velha e não acordar o app à toa.
  const [hora, setHora] = useState(horaAgora)
  useEffect(() => {
    const id = setInterval(() => setHora(horaAgora()), 30_000)
    return () => clearInterval(id)
  }, [])

  const alturaCartao = Math.round(SCREEN_H * 0.78)
  const palavra = (nome.trim().split(/\s+/)[0] ?? nome).toUpperCase()

  /** Troca a foto do hero por fusão de 500ms; reduce-motion troca a seco. */
  function trocarFoto(i: number) {
    if (i === selecionada) return
    if (reduzirMovimento) {
      setIndiceFoto(i)
      setProximaFoto(null)
      return
    }
    // Tocar durante a fusão REDIRECIONA para o novo alvo (a timing anterior é
    // interrompida e cai no guarda de `finished`) — engolir o toque fazia o
    // seletor parecer travado. A base passa a ser o que já estava entrando:
    // zerar o fade mantendo a base velha daria um salto para trás, mostrando
    // de novo a foto que o usuário acabou de trocar.
    setIndiceFoto(selecionada)
    setProximaFoto(i)
    fade.setValue(0)
    Animated.timing(fade, {
      toValue: 1,
      duration: 500,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return
      setIndiceFoto(i)
      setProximaFoto(null)
    })
  }

  return (
    <View
      style={{
        marginHorizontal: GUTTER,
        height: alturaCartao,
        borderRadius: RAIO_CARTAO,
        overflow: 'hidden',
        backgroundColor: colors.accent,
      }}
    >
      {fotos[indiceFoto] && (
        <Image
          source={{ uri: fotos[indiceFoto] }}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      )}
      {proximaFoto != null && fotos[proximaFoto] && (
        <Animated.Image
          source={{ uri: fotos[proximaFoto] }}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity: fade,
          }}
          resizeMode="cover"
        />
      )}

      {/* Scrim de duas bandas: segura o wordmark no topo e o rodapé na base */}
      <Image
        source={{ uri: GRADIENTE_HERO }}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
        resizeMode="stretch"
      />
      {/* O wordmark é a identidade da casa e mora na banda de topo, que sozinha
          entrega no máximo 0,32 — insuficiente sobre banner claro. Como na
          referência, o hero pede foto de ambiente em meio-tom: o véu segura o
          corpo do glifo, não uma foto estourada de estúdio. */}
      <Veu lado="topo" fracao={0.4} copias={3} />
      {/* Statement, miniaturas e relógio moram no terço inferior, onde o
          gradiente é fraco. Três cópias porque o statement pode subir até a
          altura de três linhas de caps. */}
      <Veu lado="base" fracao={0.66} copias={3} />

      <View
        style={{
          flex: 1,
          paddingHorizontal: 18,
          paddingTop: 30,
          paddingBottom: 20,
        }}
      >
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            textAlign: 'center',
            fontSize: Math.round(96 * typeFactor),
            color: colors.canvas,
            // Halo, não sombra decorativa: é ele que descola o pé do glifo da
            // foto onde a rampa do véu já afinou.
            textShadowColor: comAlfa('#000000', 0.45),
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 12,
            ...groovy,
          }}
        >
          {palavra}
        </Text>

        <View style={{ flex: 1 }} />

        {descricao && (
          // Três linhas é o teto: o bloco cresce PARA CIMA e, mais alto que
          // isso, a primeira linha escapa da faixa densa do véu. Também é o
          // comprimento do statement na referência — manifesto, não texto.
          <Text
            numberOfLines={3}
            style={{
              textAlign: 'center',
              fontSize: Math.round(25 * typeFactor),
              lineHeight: Math.round(27 * typeFactor),
              letterSpacing: 0.3,
              textTransform: 'uppercase',
              color: CREME,
              textShadowColor: comAlfa('#000000', 0.28),
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 6,
              ...fontStyle(design.display, 800),
            }}
          >
            {descricao}
          </Text>
        )}

        {fotos.length > 1 && (
          <View
            style={{
              marginTop: 22,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            {fotos.map((uri, i) => (
              <TouchableOpacity
                key={uri}
                activeOpacity={0.85}
                onPress={() => trocarFoto(i)}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  overflow: 'hidden',
                  backgroundColor: comAlfa('#000000', 0.2),
                  borderWidth: i === selecionada ? 2.5 : 0,
                  borderColor: ANEL_ATIVO,
                  transform: [{ scale: i === selecionada ? 1.06 : 1 }],
                }}
              >
                <Image
                  source={{ uri }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text
          style={{
            marginTop: 16,
            textAlign: 'center',
            fontSize: 11,
            letterSpacing: 1.8,
            color: CREME,
            ...fontStyle(design.body, 700),
          }}
        >
          {['ABERTO', tempo != null ? `${tempo} MIN` : null, hora]
            .filter(Boolean)
            .join('  ·  ')}
        </Text>
      </View>
    </View>
  )
}

/** Hora local no formato curto pt-BR — a batida do relógio vivo do hero. */
function horaAgora(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─────────────────────────────────────────────────────────────
// Especiais — a palavra gigante fixa e os produtos passando por cima
// ─────────────────────────────────────────────────────────────

/**
 * O momento-assinatura da referência: "ESPECIAIS" fica CRAVADA no cartão e o
 * pager desliza os produtos por cima dela. O affordance de swipe não são dots
 * — são os nomes dos itens vizinhos, rotacionados e cortados pelos cantos
 * inferiores, que giram junto como um carrossel visto de lado.
 */
function EspeciaisRitual<T extends ProdutoVitrine>({
  produtos,
  aoAbrirProduto,
  reduzirMovimento,
}: {
  produtos: T[]
  aoAbrirProduto: (p: T) => void
  reduzirMovimento: boolean
}) {
  const design = useStoreDesign()
  const { colors } = design
  const [ativo, setAtivo] = useState(0)
  // Só transforms bebem deste valor — pode ir tudo pelo driver nativo.
  const scrollX = useRef(new Animated.Value(0)).current

  const largura = SCREEN_W - GUTTER * 2
  const sangria = Math.round(largura * SANGRIA_FRACAO)
  const altura = Math.round(SCREEN_W * 1.5)
  const ladoRecorte = Math.round(largura * 0.72)
  const ladoFoto = Math.round(largura * 0.62)

  // Vizinhos NÃO circulares: o pager não dá a volta, então anunciar um item
  // nas pontas seria prometer um swipe que não acontece — e aqui o vizinho é
  // o único affordance (esta vitrine não tem dots).
  const anterior = produtos[ativo - 1]
  const proximo = produtos[ativo + 1]

  // Os vizinhos acompanham o dedo: deslizam ~30px no sentido do swipe.
  const deslizeVizinhos = scrollX.interpolate({
    inputRange: [(ativo - 1) * largura, ativo * largura, (ativo + 1) * largura],
    outputRange: [30, 0, -30],
    extrapolate: 'clamp',
  })

  return (
    <View
      style={{
        marginTop: 12,
        marginHorizontal: GUTTER,
        height: altura,
        borderRadius: RAIO_CARTAO,
        overflow: 'hidden',
        backgroundColor: colors.accent,
      }}
    >
      {/*
        A palavra sangra pelas bordas de propósito — sem adjustsFontSizeToFit.
        O corpo vem da LARGURA do cartão, não de um número fixo: "ESPECIAIS" na
        Anton mede 3,63 em, então 33% da largura garante que ela ultrapasse as
        duas bordas em qualquer tela. `clip` e `allowFontScaling={false}` tiram
        a reticência da jogada, inclusive com o texto do sistema ampliado.
      */}
      <Text
        pointerEvents="none"
        numberOfLines={1}
        ellipsizeMode="clip"
        allowFontScaling={false}
        style={{
          position: 'absolute',
          left: -sangria,
          right: -sangria,
          textAlign: 'center',
          top: Math.round(altura * 0.33),
          fontSize: Math.round(largura * 0.33),
          color: colors.canvas,
          ...fontStyle(design.display, 800),
        }}
      >
        ESPECIAIS
      </Text>

      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true },
        )}
        onMomentumScrollEnd={(e) =>
          setAtivo(Math.round(e.nativeEvent.contentOffset.x / largura))
        }
        style={{ flex: 1 }}
      >
        {produtos.map((p, i) => {
          const recorte = recorteDe(p)
          // Parallax: a foto fica um passo atrás da página, dando profundidade
          // entre ela e a palavra cravada no fundo.
          const parallax = scrollX.interpolate({
            inputRange: [(i - 1) * largura, i * largura, (i + 1) * largura],
            outputRange: [-14, 0, 14],
            extrapolate: 'clamp',
          })

          return (
            <TouchableOpacity
              key={p.id}
              activeOpacity={0.92}
              onPress={() => aoAbrirProduto(p)}
              style={{
                width: largura,
                height: altura,
                alignItems: 'center',
                paddingTop: 48,
                paddingBottom: 96,
              }}
            >
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Animated.View
                  style={{
                    transform: reduzirMovimento
                      ? []
                      : [{ translateX: parallax }],
                  }}
                >
                  {recorte ? (
                    /* Recorte transparente do lojista: o cutout SOLTO da
                       referência, sem moldura entre ele e a palavra. */
                    <Image
                      source={{ uri: recorte }}
                      style={{
                        width: ladoRecorte,
                        height: Math.round(ladoRecorte * 1.05),
                      }}
                      resizeMode="contain"
                    />
                  ) : (
                    <View
                      style={{
                        width: ladoFoto,
                        height: Math.round(ladoFoto * 1.15),
                        borderRadius: 24,
                        overflow: 'hidden',
                        backgroundColor: comAlfa(colors.accentInk, 0.12),
                      }}
                    >
                      <Image
                        source={{ uri: p.foto_url ?? undefined }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                </Animated.View>
              </View>

              <View
                style={{
                  alignItems: 'center',
                  gap: 5,
                  marginTop: 20,
                  paddingHorizontal: 28,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 20,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    color: colors.accentInk,
                    ...fontStyle(design.display, 800),
                  }}
                >
                  {p.nome}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: comAlfa(colors.accentInk, 0.7),
                    ...fontStyle(design.body, 600),
                  }}
                >
                  {formatarReais(precoFinalDe(p))}
                </Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </Animated.ScrollView>

      {anterior && (
        <NomeVizinho
          nome={anterior.nome}
          lado="esquerda"
          deslize={reduzirMovimento ? null : deslizeVizinhos}
        />
      )}
      {proximo && (
        <NomeVizinho
          nome={proximo.nome}
          lado="direita"
          deslize={reduzirMovimento ? null : deslizeVizinhos}
        />
      )}
    </View>
  )
}

/** Nome do item vizinho: girado e sangrando pelo canto, como na referência. */
function NomeVizinho({
  nome,
  lado,
  deslize,
}: {
  nome: string
  lado: 'esquerda' | 'direita'
  deslize: Animated.AnimatedInterpolation<number> | null
}) {
  const design = useStoreDesign()
  const { colors } = design
  const rotacao = lado === 'esquerda' ? '-20deg' : '20deg'

  return (
    <Animated.Text
      pointerEvents="none"
      numberOfLines={1}
      style={{
        position: 'absolute',
        bottom: 30,
        ...(lado === 'esquerda' ? { left: -22 } : { right: -22 }),
        maxWidth: SCREEN_W * 0.5,
        fontSize: 16,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        // 0.70 é o piso: abaixo disso o vizinho reprova AA sobre o accent da
        // paleta `pitaya` — e ele não é enfeite, é o affordance do carrossel.
        color: comAlfa(colors.accentInk, 0.7),
        transform: deslize
          ? [{ translateX: deslize }, { rotate: rotacao }]
          : [{ rotate: rotacao }],
        ...fontStyle(design.display, 800),
      }}
    >
      {nome}
    </Animated.Text>
  )
}

// ─────────────────────────────────────────────────────────────
// Cardápio — cartão creme puramente tipográfico
// ─────────────────────────────────────────────────────────────

/**
 * O cardápio da referência não tem foto nem descrição: só nome e preço em
 * caps rosa sobre o creme, com respiro vertical largo. O produto é vendido
 * pelo hero e pelos especiais; aqui manda a lista limpa.
 */
function CartaoCardapio<T extends ProdutoVitrine>({
  secao,
  aoAbrirProduto,
}: {
  secao: SecaoLoja<T>
  aoAbrirProduto: (p: T) => void
}) {
  const design = useStoreDesign()

  return (
    <View
      style={{
        marginTop: 12,
        marginHorizontal: GUTTER,
        borderRadius: RAIO_CARTAO,
        backgroundColor: CREME,
        paddingHorizontal: 22,
        paddingVertical: 26,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          letterSpacing: 2.2,
          textTransform: 'uppercase',
          // Sem opacidade: num cardápio sem foto e sem descrição, o título é o
          // único ponto de orientação da lista. A hierarquia sai do corpo 11 e
          // do letterSpacing, não de apagar a tinta abaixo de AA.
          color: ROSA_MENU,
          ...fontStyle(design.body, 700),
        }}
      >
        {secao.titulo}
      </Text>

      <View style={{ marginTop: 8 }}>
        {secao.produtos.map((p) => (
          <TouchableOpacity
            key={p.id}
            activeOpacity={0.6}
            onPress={() => aoAbrirProduto(p)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingVertical: 13,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                fontSize: 17,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                color: ROSA_MENU,
                ...fontStyle(design.display, 800),
              }}
            >
              {p.nome}
            </Text>
            <View
              style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}
            >
              {temPromo(p) && (
                <Text
                  style={{
                    // Tinta cheia: o preço antigo já se distingue pelo corpo
                    // menor e pelo risco. Diluí-lo o levava a 2,3:1 no creme.
                    fontSize: 12,
                    color: ROSA_MENU,
                    textDecorationLine: 'line-through',
                    ...fontStyle(design.body, 600),
                  }}
                >
                  {formatarReais(p.preco)}
                </Text>
              )}
              <Text
                style={{
                  fontSize: 17,
                  color: ROSA_MENU,
                  ...fontStyle(design.display, 800),
                }}
              >
                {formatarReais(precoFinalDe(p))}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Fecho — cartão de ambiente com a assinatura da casa
// ─────────────────────────────────────────────────────────────

function FechoRitual({
  nome,
  foto,
  meta,
}: {
  nome: string
  foto: string | null
  meta: string
}) {
  const design = useStoreDesign()
  const { colors } = design
  const groovy = useFonteGroovy()
  const palavra = (nome.trim().split(/\s+/)[0] ?? nome).toUpperCase()

  return (
    <View
      style={{
        marginTop: 12,
        marginHorizontal: GUTTER,
        height: 220,
        borderRadius: RAIO_CARTAO,
        overflow: 'hidden',
        backgroundColor: colors.accent,
        // Assinatura ancorada na BASE, não centrada: o meio do gradiente de
        // duas bandas é transparente, e centrar punha o wordmark exatamente
        // no vão — sumia sobre qualquer foto clara. O respiro vive no bloco
        // de texto, NÃO como padding do cartão: padding aqui encolheria os
        // filhos absolutos (medidos contra a altura interna) e abriria uma
        // faixa de accent no topo, por cima da foto.
        justifyContent: 'flex-end',
      }}
    >
      {foto && (
        <Image
          source={{ uri: foto }}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      )}
      <Image
        source={{ uri: GRADIENTE_HERO }}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
        resizeMode="stretch"
      />
      {/* Três cópias como no hero: o wordmark do fecho fica acima da meta, onde
          a rampa ainda está subindo. */}
      <Veu lado="base" fracao={0.7} copias={3} />

      <View style={{ alignItems: 'center', gap: 8, paddingBottom: 22 }}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            paddingHorizontal: 24,
            fontSize: 32,
            color: colors.canvas,
            textShadowColor: comAlfa('#000000', 0.22),
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 8,
            ...groovy,
          }}
        >
          {palavra}
        </Text>
        <Text
          style={{
            fontSize: 11,
            letterSpacing: 1.8,
            textTransform: 'uppercase',
            color: CREME,
            ...fontStyle(design.body, 700),
          }}
        >
          {meta}
        </Text>
      </View>
    </View>
  )
}
