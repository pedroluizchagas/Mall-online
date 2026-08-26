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
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2'
import { Caveat_700Bold } from '@expo-google-fonts/caveat'
import { useFonts } from 'expo-font'
import { formatarReais } from '@mallevo/lib'
import { ConsumerIcon, type ConsumerIconName } from '@/components/ConsumerIcon'
import { useCartStore } from '@/store/useCartStore'
import { useTransicaoSaida } from '@/store/useTransicaoSaida'
import { type ProdutoVitrine } from '@/components/loja/LojaEditorial'
import {
  BotaoAdesivo,
  FotoAdesivo,
  Rabisco,
  SeloRecortado,
  comAlfa,
} from '@/components/loja/horta-ui'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * Vitrine horta — layout PRÓPRIO do arquétipo `garden` para comida saudável e
 * cafés naturais (docs/store-theme/02 §A6; referência: Sonder & Sprout).
 *
 * DNA destilado da referência:
 * - PÁGINA CREME com seções FULL-BLEED empilhadas (o oposto da ritual, onde
 *   tudo flutua em cartão): as faixas coloridas sangram de borda a borda;
 * - HERO verde-floresta com o wordmark GIGANTE em caps gordas ROSA empilhado
 *   em duas linhas e um SELO RECORTADO creme carregando o conector "&";
 * - FOTO-ADESIVO (moldura branca de cantos assimétricos, levemente girada)
 *   pendurada na virada do verde para o creme;
 * - FAVORITOS em cartões PASTEL alternados (rosa/caramelo) com selo girado no
 *   canto, e a ficha do item escrita DIRETO no creme (rótulo tan + nome em
 *   serifa + linha de ingredientes);
 * - SOBRE com assinatura MANUSCRITA e pill rosa que rola até o cardápio;
 * - VISITE em caramelo com o horário de hoje, e fecho em faixa verde.
 *
 * Três vozes tipográficas: serifa macia (display do tema) nos títulos, sans
 * arredondada (body) no corpo, e duas fontes que são DNA DESTE layout — a
 * Baloo 2 gorda do wordmark e a Caveat da assinatura — carregadas localmente,
 * como o Shrikhand da ritual.
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

// ── DNA fixo da vitrine (independe da paleta; ela troca creme/verde) ──
/** Rosa-pastel dos cartões, pills e do wordmark sobre o verde. */
const ROSA = '#F2BCC9'
/** Caramelo da seção "visite" e dos cartões alternados. */
const CARAMELO = '#DCA57F'
/** Amarelo do blob decorativo — NUNCA carrega texto. */
const AMARELO = '#F2C34E'
/**
 * Tinta ÚNICA de tudo que é escrito sobre os pastéis. Fixa (e não
 * `colors.ink`) porque as paletas curadas trocam a tinta do tema: no vinho da
 * `beterraba` o texto do cartão rosa cairia abaixo de AA. 7,68:1 no rosa e
 * 5,83:1 no caramelo — validado para as três peles.
 */
const TINTA_PASTEL = '#22391B'
/** Rótulo de categoria escrito direto no creme (4,88:1 na pele default). */
const TAN_ROTULO = '#8A6038'

/** Frases da faixa marquee — humor de marca, neutro de nicho. */
const MARQUEE = [
  'SABOR DE VERDADE',
  'INGREDIENTES DA ESTAÇÃO',
  'FEITO À MÃO',
  'SEM ATALHOS',
]

/** Dias na ordem de `Date.getDay()` — chaves de `stores.horarios`. */
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const

/** Altura útil da barra de menu inferior (sem o safe-area inset). */
const ALTURA_BARRA_MENU = 58

interface Horario {
  abre: string
  fecha: string
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
    horarios?: Record<string, Horario> | null
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

/** Recorte transparente publicado pelo lojista (PNG sem fundo). */
function recorteDe(p: ProdutoVitrine): string | undefined {
  return (p as { metadata?: Record<string, unknown> | null }).metadata
    ?.recorte as string | undefined
}

/** Hora local curta pt-BR — a batida do relógio do fecho. */
function horaAgora(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Wordmark em duas linhas com o conector virando selo, como na referência.
 * "Broto & Grão" → linhas BROTO / GRÃO e o "&" carimbado entre elas. Sem
 * conector, o selo carrega a inicial da casa e a quebra cai depois da 1ª
 * palavra — a silhueta de duas linhas é a assinatura do hero.
 */
function partirWordmark(nome: string): { linhas: string[]; selo: string } {
  const palavras = nome.trim().split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return { linhas: [''], selo: '?' }

  const iConector = palavras.findIndex(
    (p, i) => i > 0 && i < palavras.length - 1 && /^(&|e|and)$/i.test(p),
  )
  if (iConector > 0) {
    return {
      linhas: [
        palavras.slice(0, iConector).join(' ').toUpperCase(),
        palavras.slice(iConector + 1).join(' ').toUpperCase(),
      ],
      // "e"/"and" também viram "&": o que o selo carrega é o glifo do
      // carimbo, não a palavra literal do nome.
      selo: '&',
    }
  }

  const linhas =
    palavras.length > 1
      ? [
          palavras[0].toUpperCase(),
          palavras.slice(1).join(' ').toUpperCase(),
        ]
      : [palavras[0].toUpperCase()]
  return { linhas, selo: palavras[0].charAt(0).toUpperCase() }
}

/**
 * As duas fontes que são DNA DESTE layout (mesmo racional do Shrikhand da
 * ritual): a Baloo gorda do wordmark e a Caveat da assinatura. Carregam local
 * e, enquanto não chegam — ou se falharem —, caem no display/body do tema.
 * Muda o sabor da assinatura, nunca o layout.
 */
function useFontesHorta(): { wordmark: TextStyle; manuscrita: TextStyle } {
  const { display, body } = useStoreDesign()
  const [prontas] = useFonts({ Baloo2_800ExtraBold, Caveat_700Bold })
  return {
    wordmark: prontas
      ? { fontFamily: 'Baloo2_800ExtraBold' }
      : fontStyle(display, 700),
    manuscrita: prontas
      ? { fontFamily: 'Caveat_700Bold' }
      : fontStyle(body, 600),
  }
}

export function LojaHorta<T extends ProdutoVitrine>({
  loja,
  secoes,
  aoAbrirProduto,
  espacoFinal,
}: Props<T>) {
  const design = useStoreDesign()
  const { colors, spacing } = design
  const insets = useSafeAreaInsets()
  const totalItens = useCartStore((s) => s.totalItens())
  const iniciarSaida = useTransicaoSaida((s) => s.iniciar)
  const [reduzirMovimento, setReduzirMovimento] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const cardapioY = useRef(0)
  // O hero é verde e o resto da página é creme: os ícones do sistema precisam
  // trocar de cor na virada, senão ficam invisíveis sobre o creme.
  const alturaHero = useRef(Math.round(SCREEN_H * 0.7))
  const [statusClaro, setStatusClaro] = useState(true)

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

  // Fotos da casa: banner na frente, produtos completando — o hero, o bloco
  // "sobre" e o "visite" pegam uma cada, sem repetir.
  const fotos = useMemo(() => {
    const urls = [
      loja.banner_url,
      ...secoes.flatMap((s) => s.produtos).map((p) => p.foto_url),
    ].filter((u): u is string => !!u)
    return Array.from(new Set(urls))
  }, [loja.banner_url, secoes])

  // Seção de favoritos (o carrossel-assinatura); sem ela, os primeiros itens
  // com foto servem de vitrine — o cartão nunca fica vazio.
  const secaoFavoritos = useMemo(
    () =>
      secoes.find((s) =>
        /favorit|destaque|especia|assinatura/i.test(s.titulo),
      ),
    [secoes],
  )
  const favoritos = useMemo(
    () =>
      (
        secaoFavoritos?.produtos ??
        secoes.flatMap((s) => s.produtos).filter((p) => p.foto_url)
      ).slice(0, 6),
    [secaoFavoritos, secoes],
  )
  // Uma seção que já virou carrossel não se repete no cardápio.
  const secoesCardapio = useMemo(
    () => secoes.filter((s) => s !== secaoFavoritos),
    [secoes, secaoFavoritos],
  )

  const rolarParaCardapio = () =>
    scrollRef.current?.scrollTo({
      y: Math.max(cardapioY.current - 12, 0),
      animated: !reduzirMovimento,
    })

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style={statusClaro ? 'light' : 'dark'} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        // Só reavalia a cor do status bar na VIRADA (o setState não corre a
        // cada frame de scroll) — 32ms basta para a troca não atrasar.
        scrollEventThrottle={32}
        onScroll={(e) => {
          const claro =
            e.nativeEvent.contentOffset.y < alturaHero.current - insets.top - 48
          if (claro !== statusClaro) setStatusClaro(claro)
        }}
        contentContainerStyle={{
          paddingBottom: espacoFinal + ALTURA_BARRA_MENU + insets.bottom,
        }}
      >
        {/* ── Hero: verde, wordmark com selo e a foto-adesivo pendurada ── */}
        <View
          // O zIndex mora AQUI, e não no hero: é este o irmão direto das
          // outras seções, e é o que deixa a foto-adesivo pender por cima do
          // creme em vez de ser coberta por ele.
          style={{ zIndex: 2 }}
          onLayout={(e) => {
            alturaHero.current = e.nativeEvent.layout.height
          }}
        >
          <HeroHorta nome={loja.nome} foto={fotos[0] ?? null} />
        </View>

        {/* Respiro do creme onde a foto-adesivo do hero se pendura. */}
        <View style={{ height: 92 }} />

        {/* ── Faixa marquee: o ticker verde de manifesto ── */}
        <MarqueeHorta reduzirMovimento={reduzirMovimento} />

        {/* ── Favoritos: cartões pastel com selo, ficha no creme ── */}
        {favoritos.length > 0 && (
          <FavoritosHorta
            nome={loja.nome}
            rotulo={secaoFavoritos?.titulo ?? 'Da casa'}
            produtos={favoritos}
            aoAbrirProduto={aoAbrirProduto}
          />
        )}

        {/* ── Sobre: texto da casa, assinatura manuscrita e pill rosa ── */}
        {loja.descricao && (
          <SobreHorta
            nome={loja.nome}
            descricao={loja.descricao}
            foto={fotos[1] ?? fotos[0] ?? null}
            aoVerCardapio={rolarParaCardapio}
          />
        )}

        {/* ── Cardápio: a lista completa em serifa sobre o creme ── */}
        <View
          onLayout={(e) => {
            cardapioY.current = e.nativeEvent.layout.y
          }}
          style={{ paddingTop: 40, paddingHorizontal: spacing.screenX }}
        >
          {secoesCardapio.map((secao) => (
            <SecaoCardapio
              key={secao.titulo}
              secao={secao}
              aoAbrirProduto={aoAbrirProduto}
            />
          ))}
        </View>

        {/* ── Visite: faixa caramelo com o horário de hoje ── */}
        <VisiteHorta
          horarios={loja.horarios ?? null}
          tempo={loja.tempo_entrega ?? null}
          taxa={loja.taxa_entrega ?? null}
          foto={fotos[2] ?? fotos[0] ?? null}
          aoPedir={rolarParaCardapio}
        />

        {/* ── Fecho: faixa verde com selo, nome e relógio ── */}
        <FechoHorta nome={loja.nome} tempo={loja.tempo_entrega ?? null} />
      </ScrollView>

      {/* Chrome: dois botões-adesivo fixos. Creme com fio e sombra — legíveis
          tanto sobre o verde do hero quanto sobre o creme da página. */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: insets.top + 8,
          left: spacing.screenX,
          right: spacing.screenX,
          zIndex: 30,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <BotaoAdesivo
          icone="chevron-left"
          aoTocar={sairPara(() => router.back())}
        />
        <BotaoAdesivo
          icone="bag"
          contador={totalItens}
          aoTocar={() => {
            if (totalItens > 0) router.push('/checkout')
          }}
        />
      </View>

      <BarraMenuHorta sairPara={sairPara} />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero — verde, wordmark rosa com selo e foto-adesivo pendurada
// ─────────────────────────────────────────────────────────────

function HeroHorta({ nome, foto }: { nome: string; foto: string | null }) {
  const design = useStoreDesign()
  const { colors } = design
  const insets = useSafeAreaInsets()
  const { wordmark } = useFontesHorta()
  const { linhas, selo } = partirWordmark(nome)

  const corpo = Math.round(SCREEN_W * 0.185)
  const ladoSelo = Math.round(SCREEN_W * 0.27)
  const larguraFoto = Math.round(SCREEN_W * 0.82)

  return (
    <View
      style={{
        minHeight: Math.round(SCREEN_H * 0.7),
        paddingTop: insets.top + 78,
        alignItems: 'center',
        backgroundColor: colors.accent,
      }}
    >
      {/* Blobs tom-sobre-tom: o relevo orgânico do fundo da referência. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -SCREEN_W * 0.25,
          right: -SCREEN_W * 0.3,
          width: SCREEN_W * 0.9,
          height: SCREEN_W * 0.9,
          borderRadius: SCREEN_W * 0.45,
          backgroundColor: comAlfa('#FFFFFF', 0.05),
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: SCREEN_H * 0.26,
          left: -SCREEN_W * 0.35,
          width: SCREEN_W * 0.8,
          height: SCREEN_W * 0.8,
          borderRadius: SCREEN_W * 0.4,
          backgroundColor: comAlfa('#FFFFFF', 0.04),
        }}
      />

      {/* Wordmark: linhas gordas em rosa com o selo carimbado no meio. */}
      <View style={{ alignItems: 'center', paddingHorizontal: 18 }}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            fontSize: corpo,
            lineHeight: Math.round(corpo * 1.05),
            letterSpacing: -0.5,
            textAlign: 'center',
            color: ROSA,
            ...wordmark,
          }}
        >
          {linhas[0]}
        </Text>

        <SeloRecortado
          tamanho={ladoSelo}
          cor={colors.accentInk}
          rotacao={-8}
          style={{
            // Negativos dos dois lados: o selo morde as duas linhas, como o
            // carimbo da referência. zIndex porque o irmão seguinte (a 2ª
            // linha) desenharia por cima dele.
            marginTop: -Math.round(ladoSelo * 0.34),
            marginBottom: -Math.round(ladoSelo * 0.34),
            zIndex: 2,
          }}
        >
          <Text
            style={{
              fontSize: Math.round(ladoSelo * 0.42),
              color: colors.accent,
              ...wordmark,
            }}
          >
            {selo}
          </Text>
        </SeloRecortado>

        {linhas[1] && (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              fontSize: corpo,
              lineHeight: Math.round(corpo * 1.05),
              letterSpacing: -0.5,
              textAlign: 'center',
              color: ROSA,
              ...wordmark,
            }}
          >
            {linhas[1]}
          </Text>
        )}
      </View>

      <Rabisco
        largura={Math.round(SCREEN_W * 0.16)}
        cor={comAlfa(colors.accentInk, 0.75)}
        style={{ alignSelf: 'flex-start', marginLeft: 22, marginTop: 18 }}
      />

      <View style={{ flex: 1 }} />

      {/* A foto-adesivo pendura na virada do verde para o creme. */}
      {foto && (
        <FotoAdesivo
          uri={foto}
          largura={larguraFoto}
          altura={Math.round(larguraFoto * 0.78)}
          rotacao={-2.5}
          style={[
            { marginTop: 26, marginBottom: -84 },
            consumerDesign.shadow.medium,
          ]}
        />
      )}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Marquee — o manifesto rolando em faixa verde
// ─────────────────────────────────────────────────────────────

function MarqueeHorta({ reduzirMovimento }: { reduzirMovimento: boolean }) {
  const design = useStoreDesign()
  const { colors } = design
  const deslocamento = useRef(new Animated.Value(0)).current
  const [larguraConteudo, setLarguraConteudo] = useState(0)

  useEffect(() => {
    if (reduzirMovimento || larguraConteudo === 0) return
    // Anda a largura de UMA cópia e recomeça — cópias idênticas, salto
    // invisível. ~32 px/s: passo de horta, mais calmo que o da lanchonete.
    const anim = Animated.loop(
      Animated.timing(deslocamento, {
        toValue: -larguraConteudo,
        duration: (larguraConteudo / 32) * 1000,
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
      {MARQUEE.map((frase, i) => (
        <View
          key={`${frase}-${i}`}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Text
            style={{
              fontSize: 12.5,
              letterSpacing: 1.6,
              color: colors.accentInk,
              ...fontStyle(design.body, 700),
            }}
          >
            {frase}
          </Text>
          <Text
            style={{
              marginHorizontal: 14,
              fontSize: 11,
              color: comAlfa(ROSA, 0.9),
            }}
          >
            ✦
          </Text>
        </View>
      ))}
    </View>
  )

  return (
    <View
      style={{
        backgroundColor: colors.accent,
        paddingVertical: 13,
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
// Favoritos — cartões pastel com selo, ficha escrita no creme
// ─────────────────────────────────────────────────────────────

function FavoritosHorta<T extends ProdutoVitrine>({
  nome,
  rotulo,
  produtos,
  aoAbrirProduto,
}: {
  nome: string
  rotulo: string
  produtos: T[]
  aoAbrirProduto: (p: T) => void
}) {
  const design = useStoreDesign()
  const { colors, spacing, typeFactor } = design

  const largura = Math.round(SCREEN_W * 0.76)
  const gap = 14

  return (
    <View style={{ paddingTop: 44 }}>
      <View style={{ paddingHorizontal: spacing.screenX, alignItems: 'center' }}>
        <Text
          style={{
            fontSize: Math.round(34 * typeFactor),
            lineHeight: Math.round(40 * typeFactor),
            color: colors.ink,
            ...fontStyle(design.display, 700),
          }}
        >
          Favoritos
        </Text>
        <Text
          style={{
            marginTop: 10,
            textAlign: 'center',
            fontSize: 15,
            lineHeight: 22,
            color: colors.inkMuted,
            ...fontStyle(design.body, 500),
          }}
        >
          Feitos com cuidado e pedidos de novo toda semana — os sabores que
          definem o {nome}.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={largura + gap}
        snapToAlignment="start"
        contentContainerStyle={{
          paddingTop: 34,
          paddingBottom: 8,
          paddingHorizontal: spacing.screenX,
          gap,
        }}
      >
        {produtos.map((p, i) => (
          <CartaoFavorito
            key={p.id}
            produto={p}
            rotulo={rotulo}
            largura={largura}
            // Pastéis alternados, como a fileira da referência.
            pastel={i % 2 === 0 ? ROSA : CARAMELO}
            aoTocar={() => aoAbrirProduto(p)}
          />
        ))}
      </ScrollView>
    </View>
  )
}

function CartaoFavorito<T extends ProdutoVitrine>({
  produto,
  rotulo,
  largura,
  pastel,
  aoTocar,
}: {
  produto: T
  rotulo: string
  largura: number
  pastel: string
  aoTocar: () => void
}) {
  const design = useStoreDesign()
  const { colors, typeFactor } = design
  const recorte = recorteDe(produto)
  const foto = recorte ?? produto.foto_url
  const altura = Math.round(largura * 1.02)
  const promo = temPromo(produto)

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={aoTocar}
      style={{ width: largura }}
    >
      <View
        style={{
          height: altura,
          borderRadius: 34,
          backgroundColor: pastel,
        }}
      >
        {foto && (
          <Image
            source={{ uri: foto }}
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              // A foto escapa por cima da borda: é o que dá o ar de adesivo
              // colado no cartão, e não de imagem enquadrada nele.
              top: -18,
              bottom: 16,
              borderRadius: recorte ? 0 : 26,
            }}
            resizeMode={recorte ? 'contain' : 'cover'}
          />
        )}

        <SeloRecortado
          tamanho={Math.round(largura * 0.28)}
          cor={colors.accent}
          rotacao={10}
          style={{ position: 'absolute', top: -12, right: -6 }}
        >
          <Text
            style={{
              fontSize: 11,
              letterSpacing: 0.6,
              color: colors.accentInk,
              ...fontStyle(design.body, 700),
            }}
          >
            {promo ? 'oferta' : 'da casa'}
          </Text>
        </SeloRecortado>
      </View>

      {/* Ficha direto no creme — sem cartão, como na referência. */}
      <View style={{ marginTop: 16 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 11,
            letterSpacing: 1.8,
            textTransform: 'uppercase',
            color: TAN_ROTULO,
            ...fontStyle(design.body, 700),
          }}
        >
          {rotulo}
        </Text>
        <Text
          numberOfLines={2}
          style={{
            marginTop: 6,
            fontSize: Math.round(20 * typeFactor),
            lineHeight: Math.round(25 * typeFactor),
            color: colors.ink,
            ...fontStyle(design.display, 700),
          }}
        >
          {produto.nome}
        </Text>
        {produto.descricao && (
          <Text
            numberOfLines={2}
            style={{
              marginTop: 6,
              fontSize: 13.5,
              lineHeight: 19,
              color: colors.inkMuted,
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
            alignItems: 'baseline',
            gap: 8,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              color: colors.accent,
              ...fontStyle(design.body, 700),
            }}
          >
            {formatarReais(precoFinalDe(produto))}
          </Text>
          {promo && (
            <Text
              style={{
                fontSize: 13,
                color: colors.inkMuted,
                textDecorationLine: 'line-through',
                ...fontStyle(design.body, 500),
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

// ─────────────────────────────────────────────────────────────
// Sobre — o texto da casa com assinatura manuscrita
// ─────────────────────────────────────────────────────────────

function SobreHorta({
  nome,
  descricao,
  foto,
  aoVerCardapio,
}: {
  nome: string
  descricao: string
  foto: string | null
  aoVerCardapio: () => void
}) {
  const design = useStoreDesign()
  const { colors, spacing, typeFactor } = design
  const { manuscrita } = useFontesHorta()
  const larguraFoto = Math.round(SCREEN_W * 0.66)

  return (
    <View style={{ paddingTop: 52, paddingHorizontal: spacing.screenX }}>
      <Text
        style={{
          fontSize: Math.round(32 * typeFactor),
          lineHeight: Math.round(38 * typeFactor),
          color: colors.ink,
          ...fontStyle(design.display, 700),
        }}
      >
        Sobre a casa
      </Text>

      <Text
        style={{
          marginTop: 14,
          fontSize: 15.5,
          lineHeight: 25,
          color: colors.ink,
          ...fontStyle(design.body, 500),
        }}
      >
        {descricao}
      </Text>

      <Text
        style={{
          marginTop: 26,
          fontSize: Math.round(30 * typeFactor),
          color: colors.ink,
          ...manuscrita,
        }}
      >
        {nome}
      </Text>
      <Text
        style={{
          marginTop: 2,
          fontSize: 12,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: colors.inkMuted,
          ...fontStyle(design.body, 600),
        }}
      >
        Feito na casa, todo dia
      </Text>

      <PillHorta rotulo="Ver cardápio" aoTocar={aoVerCardapio} />

      {foto && (
        <View style={{ marginTop: 34, alignItems: 'center' }}>
          {/* Blob amarelo atrás da foto — o respingo de cor da referência. */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 24,
              right: -SCREEN_W * 0.12,
              width: SCREEN_W * 0.42,
              height: SCREEN_W * 0.42,
              borderRadius: SCREEN_W * 0.21,
              backgroundColor: AMARELO,
            }}
          />
          <FotoAdesivo
            uri={foto}
            largura={larguraFoto}
            altura={Math.round(larguraFoto * 1.12)}
            rotacao={3}
            style={consumerDesign.shadow.medium}
          />
        </View>
      )}
    </View>
  )
}

/** Pill rosa de ação — o botão desta vitrine (READ MORE / RESERVE TABLE). */
function PillHorta({
  rotulo,
  aoTocar,
  style,
}: {
  rotulo: string
  aoTocar: () => void
  style?: StyleProp<ViewStyle>
}) {
  const design = useStoreDesign()
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={0.85}
      style={[
        {
          marginTop: 22,
          alignSelf: 'flex-start',
          paddingHorizontal: 26,
          paddingVertical: 15,
          borderRadius: 999,
          backgroundColor: ROSA,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: 12.5,
          letterSpacing: 1.6,
          textTransform: 'uppercase',
          color: TINTA_PASTEL,
          ...fontStyle(design.body, 700),
        }}
      >
        {rotulo}
      </Text>
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────────────────────────
// Cardápio — a lista completa em serifa sobre o creme
// ─────────────────────────────────────────────────────────────

function SecaoCardapio<T extends ProdutoVitrine>({
  secao,
  aoAbrirProduto,
}: {
  secao: SecaoLoja<T>
  aoAbrirProduto: (p: T) => void
}) {
  const design = useStoreDesign()
  const { colors, typeFactor } = design

  return (
    <View style={{ marginBottom: 30 }}>
      <Text
        style={{
          fontSize: Math.round(24 * typeFactor),
          lineHeight: Math.round(30 * typeFactor),
          color: colors.ink,
          ...fontStyle(design.display, 700),
        }}
      >
        {secao.titulo}
      </Text>
      <View
        style={{
          marginTop: 12,
          marginBottom: 4,
          height: 1,
          backgroundColor: colors.line,
        }}
      />

      {secao.produtos.map((p) => {
        const promo = temPromo(p)
        return (
          <TouchableOpacity
            key={p.id}
            activeOpacity={0.7}
            onPress={() => aoAbrirProduto(p)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingVertical: 14,
            }}
          >
            {p.foto_url && (
              <Image
                source={{ uri: p.foto_url }}
                style={{ width: 60, height: 60, borderRadius: 20 }}
                resizeMode="cover"
              />
            )}
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 17,
                  color: colors.ink,
                  ...fontStyle(design.display, 600),
                }}
              >
                {p.nome}
              </Text>
              {p.descricao && (
                <Text
                  numberOfLines={1}
                  style={{
                    marginTop: 3,
                    fontSize: 13,
                    color: colors.inkMuted,
                    ...fontStyle(design.body, 500),
                  }}
                >
                  {p.descricao}
                </Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={{
                  fontSize: 15,
                  color: colors.accent,
                  ...fontStyle(design.body, 700),
                }}
              >
                {formatarReais(precoFinalDe(p))}
              </Text>
              {promo && (
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.inkMuted,
                    textDecorationLine: 'line-through',
                    ...fontStyle(design.body, 500),
                  }}
                >
                  {formatarReais(p.preco)}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Visite — faixa caramelo com o horário de hoje
// ─────────────────────────────────────────────────────────────

function VisiteHorta({
  horarios,
  tempo,
  taxa,
  foto,
  aoPedir,
}: {
  horarios: Record<string, Horario> | null
  tempo: number | null
  taxa: number | null
  foto: string | null
  aoPedir: () => void
}) {
  const design = useStoreDesign()
  const { spacing, typeFactor } = design
  const larguraFoto = Math.round(SCREEN_W * 0.6)

  const hoje = horarios?.[DIAS[new Date().getDay()]]
  const linhas = [
    hoje ? `Hoje das ${hoje.abre} às ${hoje.fecha}` : null,
    tempo != null ? `Entrega em cerca de ${tempo} min` : null,
    taxa === 0
      ? 'Entrega grátis no bairro'
      : taxa != null
        ? `Taxa de entrega ${formatarReais(taxa)}`
        : null,
  ].filter((l): l is string => !!l)

  return (
    <View
      style={{
        marginTop: 42,
        paddingTop: 44,
        paddingBottom: 40,
        paddingHorizontal: spacing.screenX,
        backgroundColor: CARAMELO,
      }}
    >
      <Rabisco
        largura={Math.round(SCREEN_W * 0.15)}
        cor={comAlfa(TINTA_PASTEL, 0.55)}
        style={{ alignSelf: 'flex-end', marginBottom: 8 }}
      />

      <Text
        style={{
          fontSize: Math.round(32 * typeFactor),
          lineHeight: Math.round(38 * typeFactor),
          color: TINTA_PASTEL,
          ...fontStyle(design.display, 700),
        }}
      >
        Visite a gente
      </Text>

      <View style={{ marginTop: 16, gap: 7 }}>
        {linhas.map((linha) => (
          <Text
            key={linha}
            style={{
              fontSize: 15,
              lineHeight: 22,
              color: TINTA_PASTEL,
              ...fontStyle(design.body, 600),
            }}
          >
            {linha}
          </Text>
        ))}
      </View>

      <PillHorta rotulo="Pedir agora" aoTocar={aoPedir} />

      {foto && (
        <View style={{ marginTop: 32, alignItems: 'center' }}>
          <FotoAdesivo
            uri={foto}
            largura={larguraFoto}
            altura={Math.round(larguraFoto * 0.94)}
            rotacao={-3}
            style={consumerDesign.shadow.medium}
          />
        </View>
      )}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Fecho — faixa verde com selo, nome e relógio vivo
// ─────────────────────────────────────────────────────────────

function FechoHorta({ nome, tempo }: { nome: string; tempo: number | null }) {
  const design = useStoreDesign()
  const { colors } = design
  const { wordmark } = useFontesHorta()
  const [hora, setHora] = useState(horaAgora)

  // Meio minuto basta pra nunca mostrar hora velha sem acordar o app à toa.
  useEffect(() => {
    const id = setInterval(() => setHora(horaAgora()), 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <View
      style={{
        paddingTop: 40,
        paddingBottom: 46,
        paddingHorizontal: 24,
        alignItems: 'center',
        backgroundColor: colors.accent,
      }}
    >
      <SeloRecortado tamanho={62} cor={ROSA} rotacao={-6}>
        <Text
          style={{
            fontSize: 26,
            color: TINTA_PASTEL,
            ...wordmark,
          }}
        >
          {nome.trim().charAt(0).toUpperCase()}
        </Text>
      </SeloRecortado>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          marginTop: 16,
          fontSize: 30,
          textAlign: 'center',
          color: colors.accentInk,
          ...wordmark,
        }}
      >
        {nome.toUpperCase()}
      </Text>

      <Text
        style={{
          marginTop: 10,
          fontSize: 11,
          letterSpacing: 1.8,
          textTransform: 'uppercase',
          color: comAlfa(colors.accentInk, 0.85),
          ...fontStyle(design.body, 600),
        }}
      >
        {['ABERTO', tempo != null ? `${tempo} MIN` : null, hora]
          .filter(Boolean)
          .join('  ·  ')}
      </Text>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Barra de menu inferior — o adesivo creme que fecha a página
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
 * Barra fixa em creme com fio e sombra — o mesmo vocabulário dos
 * botões-adesivo do chrome, para ela ler tanto no fecho VERDE quanto sobre o
 * creme das seções claras (a página alterna faixas de borda a borda, e uma
 * barra chapada sem sombra sumiria dentro da faixa verde).
 */
function BarraMenuHorta({
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
