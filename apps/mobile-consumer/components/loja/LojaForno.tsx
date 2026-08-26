import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  Dimensions,
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
import { Archivo_900Black } from '@expo-google-fonts/archivo'
import { useFonts } from 'expo-font'
import { formatarReais } from '@mallevo/lib'
import { ConsumerIcon, type ConsumerIconName } from '@/components/ConsumerIcon'
import { useCartStore } from '@/store/useCartStore'
import { useTransicaoSaida } from '@/store/useTransicaoSaida'
import { type ProdutoVitrine } from '@/components/loja/LojaEditorial'
import {
  BotaoForno,
  CirculosConcentricos,
  Coroa,
  Fatia,
  PizzaRedonda,
  RabiscoCozinha,
  comAlfa,
} from '@/components/loja/forno-ui'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * Vitrine forno — layout PRÓPRIO do arquétipo `slice` para pizzarias e
 * cantinas (docs/store-theme/02 §A7; referência: Restaurin / "Pizza Lounge").
 *
 * DNA destilado da referência:
 * - QUATRO CORES EM BLOCOS CHAPADOS full-bleed: creme de página, PRETO de
 *   forno (hero e fecho), OURO (o cardápio-pôster) e o vermelho do tema, que
 *   aqui não é só CTA — é a TINTA de todo o display sobre o creme;
 * - UMA GROTESCA SÓ, esmagada em caps, trocando de cor por seção: ouro sobre
 *   o preto, vermelho sobre o ouro, vermelho sobre o creme;
 * - COROA real do logo isolada acima do wordmark e nos badges;
 * - PIZZA EM RECORTE REDONDO, sem moldura, vazando de um bloco para o outro;
 * - CARDÁPIO-PÔSTER: um item por vez sobre o ouro, disco grande e nome
 *   gigante embaixo;
 * - ALVO: a pizza sobre anéis concêntricos num cartão vermelho, com o nome da
 *   casa em ouro atravessando e sendo cortado pelas bordas.
 *
 * Duas vozes só de peso: a Archivo do tema no corpo e nos títulos menores, e a
 * Archivo Black 900 que é DNA DESTE layout — carregada localmente, como o
 * Shrikhand da ritual e a Baloo gorda da horta.
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

// ── DNA fixo da vitrine (independe da paleta; ela troca o creme e o vermelho) ──
/** Preto de forno: o bloco do hero e o do fecho. */
const PRETO_FORNO = '#1A150F'
/** Ouro do cardápio-pôster e do wordmark sobre o preto (8,66:1). */
const OURO = '#F2A31B'
/**
 * Creme ÚNICO de tudo que é escrito sobre o preto e sobre o accent. Fixo (e
 * não `colors.bg`) pelo mesmo motivo da horta: as paletas curadas trocam o
 * creme da página, e o contraste sobre os blocos precisa valer nas três peles.
 */
const CREME_FIXO = '#F6EFDE'
/** Tinta de todo texto PEQUENO sobre o ouro (8,66:1). */
const TINTA_OURO = '#1A150F'

/** Frase do statement quando a casa não tem uma curta o bastante. */
const STATEMENT_PADRAO = 'UMA EXPERIÊNCIA DE PIZZA INESQUECÍVEL'

/** Dias na ordem de `Date.getDay()` — chaves de `stores.horarios`. */
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const

/** Altura da pílula de menu inferior (o inset entra por fora dela). */
const ALTURA_BARRA_MENU = 58

/** Disco do hero e o quanto ele desce por cima do bloco seguinte. */
const DISCO_HERO = Math.round(SCREEN_W * 0.92)
const VAZAMENTO = Math.round(DISCO_HERO * 0.3)

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

/** Hora local curta pt-BR — a batida do relógio do fecho. */
function horaAgora(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Wordmark empilhado do hero: "Forno Real" → FORNO / REAL. Duas linhas é a
 * silhueta da referência ("PIZZA LOUNGE"); nome de uma palavra fica em uma só.
 */
function partirWordmark(nome: string): string[] {
  const palavras = nome.trim().split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return ['']
  if (palavras.length === 1) return [palavras[0].toUpperCase()]
  return [
    palavras[0].toUpperCase(),
    palavras.slice(1).join(' ').toUpperCase(),
  ]
}

/**
 * Reparte a descrição da casa entre as DUAS vozes que a mostram, para o mesmo
 * texto não aparecer duas vezes na mesma rolagem: o STATEMENT leva a primeira
 * oração em caps gigantes (o manifesto da referência) e o cartão da casa leva
 * o que sobra. Oração curta ou longa demais não vira caps gigantes — aí o
 * statement usa a frase de DNA e o cartão fica com o texto inteiro.
 */
function repartirDescricao(descricao: string | null | undefined): {
  manifesto: string
  detalhe: string | null
} {
  const texto = descricao?.trim() ?? ''
  if (!texto) return { manifesto: STATEMENT_PADRAO, detalhe: null }

  const corte = texto.search(/[—.!?]/)
  const primeira = (corte === -1 ? texto : texto.slice(0, corte)).trim()
  if (primeira.length < 8 || primeira.length > 54) {
    return { manifesto: STATEMENT_PADRAO, detalhe: texto }
  }
  const resto = corte === -1 ? '' : texto.slice(corte + 1).trim()
  return { manifesto: primeira.toUpperCase(), detalhe: resto || null }
}

/**
 * A Archivo Black 900 é DNA DESTE layout (mesmo racional do Shrikhand da
 * ritual): carrega local e, enquanto não chega — ou se falhar —, cai no
 * display do tema. Muda o esmagamento da voz, nunca o layout.
 */
function useFonteForno(): { black: TextStyle } {
  const { display } = useStoreDesign()
  const [pronta] = useFonts({ Archivo_900Black })
  return {
    black: pronta ? { fontFamily: 'Archivo_900Black' } : fontStyle(display, 800),
  }
}

export function LojaForno<T extends ProdutoVitrine>({
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
  // O hero é preto e o resto da página é claro: os ícones do sistema precisam
  // trocar de cor na virada, senão somem sobre o creme.
  const alturaHero = useRef(Math.round(SCREEN_H * 0.82))
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
      // Fecha no PRETO, não no accent como as irmãs: o botão de voltar mora
      // sobre o hero preto, então a onda sai da própria cor de baixo dele.
      cor: PRETO_FORNO,
      origem: { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY },
    })

  // Fotos da casa: banner na frente, produtos completando — o hero e o alvo
  // pegam uma cada, sem repetir.
  const fotos = useMemo(() => {
    const urls = [
      loja.banner_url,
      ...secoes.flatMap((s) => s.produtos).map((p) => p.foto_url),
    ].filter((u): u is string => !!u)
    return Array.from(new Set(urls))
  }, [loja.banner_url, secoes])

  // Seção do pôster (o cartaz de ouro); sem ela, os primeiros itens com foto
  // servem de cartaz — o bloco nunca fica vazio.
  const secaoPoster = useMemo(
    () =>
      secoes.find((s) => /pizza|favorit|destaque|especia|da casa/i.test(s.titulo)),
    [secoes],
  )
  const doPoster = useMemo(
    () =>
      (
        secaoPoster?.produtos ??
        secoes.flatMap((s) => s.produtos).filter((p) => p.foto_url)
      )
        .filter((p) => p.foto_url)
        .slice(0, 4),
    [secaoPoster, secoes],
  )
  // A seção do cartaz só sai do cardápio quando o cartaz mostra TODOS os seus
  // itens. Numa pizzaria de verdade "Pizzas" tem 18 sabores e o cartaz leva 4:
  // tirá-la esconderia os outros 14 do app inteiro — e, se nenhum item tivesse
  // foto, o cartaz nem renderiza e a seção sumiria por completo. Repetir 4
  // itens no cardápio é barato; perder produto, não.
  const secoesCardapio = useMemo(
    () =>
      secoes.filter(
        (s) => s !== secaoPoster || doPoster.length < s.produtos.length,
      ),
    [secoes, secaoPoster, doPoster],
  )

  // O manifesto do statement e o texto do cartão da casa saem da MESMA
  // descrição, repartida — o hero não a imprime (a referência não tem
  // parágrafo no hero: é wordmark, botão e pizza).
  const { manifesto, detalhe } = useMemo(
    () => repartirDescricao(loja.descricao),
    [loja.descricao],
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
          paddingBottom:
            espacoFinal + ALTURA_BARRA_MENU + Math.max(insets.bottom, 12) + 12,
        }}
      >
        {/* ── Hero: bloco preto, coroa, wordmark ouro e o disco vazando ── */}
        <View
          // O zIndex mora AQUI, e não no hero: é este o irmão direto das outras
          // seções, e é o que deixa o disco descer por cima do ouro em vez de
          // ser coberto por ele.
          style={{ zIndex: 2 }}
          onLayout={(e) => {
            alturaHero.current = e.nativeEvent.layout.height
          }}
        >
          <HeroForno
            nome={loja.nome}
            foto={fotos[0] ?? null}
            // Só há para onde vazar se o bloco de ouro vier logo abaixo: sem
            // pôster, o disco desceria por cima do statement no creme.
            vazar={doPoster.length > 0}
            aoVerCardapio={rolarParaCardapio}
          />
        </View>

        {/* ── Cardápio-pôster: um disco por vez sobre o ouro ── */}
        <PosterForno
          rotulo={secaoPoster?.titulo ?? 'As pizzas da casa'}
          produtos={doPoster}
          temDiscoVazando={!!fotos[0]}
          aoAbrirProduto={aoAbrirProduto}
        />

        {/* ── Statement: o manifesto em caps vermelhas sobre o creme ── */}
        <StatementForno frase={manifesto} />

        {/* ── Alvo: a pizza sobre os anéis, no cartão vermelho ── */}
        {fotos.length > 0 && (
          <AlvoForno nome={loja.nome} foto={fotos[1] ?? fotos[0]} />
        )}

        {/* ── A casa: badges redondos, texto e o line-art fantasma ── */}
        {detalhe && <CasaForno nome={loja.nome} descricao={detalhe} />}

        {/* ── Cardápio: a lista completa sobre o creme ── */}
        <View
          onLayout={(e) => {
            cardapioY.current = e.nativeEvent.layout.y
          }}
          style={{ paddingTop: 44, paddingHorizontal: spacing.screenX }}
        >
          {secoesCardapio.map((secao) => (
            <SecaoCardapio
              key={secao.titulo}
              secao={secao}
              aoAbrirProduto={aoAbrirProduto}
            />
          ))}
        </View>

        {/* ── Fecho: bloco preto com coroa, nome e relógio ── */}
        <FechoForno
          nome={loja.nome}
          tempo={loja.tempo_entrega ?? null}
          taxa={loja.taxa_entrega ?? null}
          horarios={loja.horarios ?? null}
        />
      </ScrollView>

      {/* Chrome: dois botões fixos. Creme com fio e sombra — legíveis sobre o
          preto do hero, o ouro do pôster e o creme da página. */}
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
        <BotaoForno
          icone="chevron-left"
          aoTocar={sairPara(() => router.back())}
        />
        <BotaoForno
          icone="bag"
          contador={totalItens}
          aoTocar={() => {
            if (totalItens > 0) router.push('/checkout')
          }}
        />
      </View>

      <BarraMenuForno sairPara={sairPara} />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero — bloco preto, coroa, wordmark ouro e o disco vazando
// ─────────────────────────────────────────────────────────────

function HeroForno({
  nome,
  foto,
  vazar,
  aoVerCardapio,
}: {
  nome: string
  foto: string | null
  vazar: boolean
  aoVerCardapio: () => void
}) {
  const design = useStoreDesign()
  const { colors } = design
  const insets = useSafeAreaInsets()
  const { black } = useFonteForno()
  const linhas = partirWordmark(nome)

  const corpo = Math.round(SCREEN_W * 0.19)

  return (
    <View
      style={{
        minHeight: Math.round(SCREEN_H * 0.82),
        paddingTop: insets.top + 84,
        alignItems: 'center',
        backgroundColor: PRETO_FORNO,
      }}
    >
      {/* Veios de mármore: o relevo quase imperceptível do fundo da ref. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -SCREEN_W * 0.3,
          left: -SCREEN_W * 0.2,
          width: SCREEN_W * 1.1,
          height: SCREEN_W * 0.9,
          borderRadius: SCREEN_W * 0.5,
          backgroundColor: comAlfa('#FFFFFF', 0.03),
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: SCREEN_H * 0.3,
          right: -SCREEN_W * 0.4,
          width: SCREEN_W * 0.95,
          height: SCREEN_W * 0.75,
          borderRadius: SCREEN_W * 0.45,
          backgroundColor: comAlfa('#FFFFFF', 0.025),
        }}
      />

      <Coroa tamanho={Math.round(SCREEN_W * 0.1)} cor={OURO} />

      {/* Wordmark: as linhas esmagadas em ouro sobre o preto. */}
      <View style={{ alignItems: 'center', paddingHorizontal: 18, marginTop: 14 }}>
        {/* Índice como chave: "Pizza Pizza" partiria em duas linhas iguais. */}
        {linhas.map((linha, i) => (
          <Text
            key={i}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              fontSize: corpo,
              lineHeight: Math.round(corpo * 1.02),
              letterSpacing: -1,
              textAlign: 'center',
              color: OURO,
              ...black,
            }}
          >
            {linha}
          </Text>
        ))}
      </View>

      {/* CTA: o retângulo-pill vermelho da referência. */}
      <TouchableOpacity
        onPress={aoVerCardapio}
        activeOpacity={0.88}
        style={{
          marginTop: 30,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 30,
          paddingVertical: 16,
          borderRadius: 14,
          backgroundColor: colors.accent,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            color: colors.accentInk,
            ...fontStyle(design.body, 700),
          }}
        >
          Ver cardápio
        </Text>
        <ConsumerIcon
          name="chevron-down"
          size={15}
          color={colors.accentInk}
          strokeWidth={2.4}
        />
      </TouchableOpacity>

      <View style={{ flex: 1 }} />

      {/* O disco desce por cima do ouro — o overlap da referência. */}
      {foto && (
        <PizzaRedonda
          uri={foto}
          tamanho={DISCO_HERO}
          style={[
            { marginTop: 30, marginBottom: vazar ? -VAZAMENTO : 24 },
            consumerDesign.shadow.medium,
          ]}
        />
      )}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Cardápio-pôster — um disco por vez sobre o bloco de ouro
// ─────────────────────────────────────────────────────────────

function PosterForno<T extends ProdutoVitrine>({
  rotulo,
  produtos,
  temDiscoVazando,
  aoAbrirProduto,
}: {
  rotulo: string
  produtos: T[]
  temDiscoVazando: boolean
  aoAbrirProduto: (p: T) => void
}) {
  const design = useStoreDesign()
  const { spacing } = design

  if (produtos.length === 0) return null

  return (
    <View
      style={{
        // O respiro do topo é o que o disco do hero ocupa; sem disco, o bloco
        // volta ao seu próprio respiro.
        paddingTop: temDiscoVazando ? VAZAMENTO + 34 : 46,
        paddingBottom: 48,
        paddingHorizontal: spacing.screenX,
        alignItems: 'center',
        backgroundColor: OURO,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          letterSpacing: 2.4,
          textTransform: 'uppercase',
          textAlign: 'center',
          color: TINTA_OURO,
          ...fontStyle(design.body, 700),
        }}
      >
        {rotulo}
      </Text>

      {produtos.map((p) => (
        <ItemPoster key={p.id} produto={p} aoTocar={() => aoAbrirProduto(p)} />
      ))}
    </View>
  )
}

function ItemPoster<T extends ProdutoVitrine>({
  produto,
  aoTocar,
}: {
  produto: T
  aoTocar: () => void
}) {
  const design = useStoreDesign()
  const { colors, typeFactor } = design
  const { black } = useFonteForno()
  const promo = temPromo(produto)
  const disco = Math.round(SCREEN_W * 0.72)

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={aoTocar}
      style={{ alignItems: 'center', marginTop: 40 }}
    >
      {produto.foto_url && (
        <PizzaRedonda
          uri={produto.foto_url}
          tamanho={disco}
          anel={comAlfa(TINTA_OURO, 0.15)}
        />
      )}

      {/* O nome gigante em vermelho sobre o ouro. O par de cores vale como AA
          LARGE (≥ 3, travado em __tests__), e "large" é ≥ 24px em peso — então
          o encolhimento automático precisa de piso: 37 × 0,7 ≈ 26px ainda é
          large. Nome comprido ganha uma 3ª linha antes de encolher. Se o corpo
          base cair, recalcular o `minimumFontScale`. */}
      <Text
        numberOfLines={3}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{
          marginTop: 16,
          fontSize: Math.round(37 * typeFactor),
          lineHeight: Math.round(38 * typeFactor),
          letterSpacing: -0.8,
          textAlign: 'center',
          textTransform: 'uppercase',
          color: colors.accent,
          ...black,
        }}
      >
        {produto.nome}
      </Text>

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
            fontSize: 15,
            letterSpacing: 0.4,
            color: TINTA_OURO,
            ...fontStyle(design.body, 700),
          }}
        >
          {formatarReais(precoFinalDe(produto))}
        </Text>
        {promo && (
          <Text
            style={{
              fontSize: 13,
              color: comAlfa(TINTA_OURO, 0.65),
              textDecorationLine: 'line-through',
              ...fontStyle(design.body, 500),
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
// Statement — o manifesto em caps vermelhas sobre o creme
// ─────────────────────────────────────────────────────────────

function StatementForno({ frase }: { frase: string }) {
  const design = useStoreDesign()
  const { colors, spacing, typeFactor } = design
  const { black } = useFonteForno()

  return (
    <View
      style={{
        paddingTop: 54,
        paddingBottom: 34,
        paddingHorizontal: spacing.screenX,
      }}
    >
      <Text
        style={{
          fontSize: Math.round(31 * typeFactor),
          lineHeight: Math.round(33 * typeFactor),
          letterSpacing: -0.6,
          textAlign: 'center',
          color: colors.accent,
          ...black,
        }}
      >
        {frase}
      </Text>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Alvo — a pizza sobre os anéis, no cartão vermelho
// ─────────────────────────────────────────────────────────────

function AlvoForno({ nome, foto }: { nome: string; foto: string }) {
  const design = useStoreDesign()
  const { colors, spacing } = design
  const { black } = useFonteForno()

  const larguraCartao = SCREEN_W - spacing.screenX * 2
  const alvo = Math.round(larguraCartao * 0.9)
  const disco = Math.round(alvo * 0.62)

  return (
    <View
      style={{
        marginHorizontal: spacing.screenX,
        paddingTop: 18,
        paddingBottom: 30,
        borderRadius: 28,
        alignItems: 'center',
        backgroundColor: colors.accent,
        // O nome atravessa o cartão e é CORTADO pelas bordas, como a palavra
        // gigante que corre atrás da pizza na referência.
        overflow: 'hidden',
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          // Bem mais largo que o cartão: o texto fica inteiro (sem reticências)
          // e é a borda do cartão que o corta.
          width: SCREEN_W * 2,
          fontSize: Math.round(SCREEN_W * 0.19),
          lineHeight: Math.round(SCREEN_W * 0.21),
          letterSpacing: -1.5,
          textAlign: 'center',
          color: OURO,
          ...black,
        }}
      >
        {nome.toUpperCase()}
      </Text>

      <View
        style={{
          marginTop: -Math.round(SCREEN_W * 0.05),
          width: alvo,
          height: alvo,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CirculosConcentricos
          tamanho={alvo}
          cor={comAlfa(CREME_FIXO, 0.28)}
          style={{ position: 'absolute' }}
        />
        <PizzaRedonda uri={foto} tamanho={disco} />
      </View>

      <Text
        style={{
          marginTop: 10,
          fontSize: 11.5,
          letterSpacing: 2.2,
          textTransform: 'uppercase',
          color: comAlfa(CREME_FIXO, 0.9),
          ...fontStyle(design.body, 700),
        }}
      >
        Direto do forno
      </Text>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// A casa — badges redondos e o line-art fantasma de cozinha
// ─────────────────────────────────────────────────────────────

function CasaForno({ nome, descricao }: { nome: string; descricao: string }) {
  const design = useStoreDesign()
  const { colors, spacing, typeFactor } = design

  return (
    <View
      style={{
        marginTop: 22,
        marginHorizontal: spacing.screenX,
        paddingVertical: 34,
        paddingHorizontal: 26,
        borderRadius: 28,
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        overflow: 'hidden',
      }}
    >
      {/* Fantasmas de cozinha nos cantos — traço quase invisível, como na ref. */}
      <RabiscoCozinha
        largura={Math.round(SCREEN_W * 0.09)}
        cor={comAlfa(colors.ink, 0.09)}
        motivo="garfo"
        style={{ position: 'absolute', top: 16, left: 14 }}
      />
      <RabiscoCozinha
        largura={Math.round(SCREEN_W * 0.26)}
        cor={comAlfa(colors.ink, 0.09)}
        motivo="raminho"
        style={{ position: 'absolute', bottom: 10, right: 8 }}
      />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.accent,
          }}
        >
          <Coroa tamanho={22} cor={colors.accentInk} />
        </View>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.accent,
          }}
        >
          <Fatia tamanho={21} cor={colors.accentInk} />
        </View>
      </View>

      <Text
        style={{
          marginTop: 18,
          fontSize: Math.round(21 * typeFactor),
          lineHeight: Math.round(26 * typeFactor),
          letterSpacing: 0.2,
          textAlign: 'center',
          textTransform: 'uppercase',
          color: colors.accent,
          ...fontStyle(design.display, 800),
        }}
      >
        {nome}
      </Text>

      <Text
        style={{
          marginTop: 12,
          fontSize: 15,
          lineHeight: 23,
          textAlign: 'center',
          color: colors.inkMuted,
          ...fontStyle(design.body, 400),
        }}
      >
        {descricao}
      </Text>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Cardápio — a lista completa sobre o creme
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
          fontSize: Math.round(20 * typeFactor),
          lineHeight: Math.round(26 * typeFactor),
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: colors.accent,
          ...fontStyle(design.display, 800),
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
              <PizzaRedonda
                uri={p.foto_url}
                tamanho={56}
                anel={comAlfa(colors.ink, 0.1)}
              />
            )}
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 16,
                  color: colors.ink,
                  ...fontStyle(design.body, 700),
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
                    ...fontStyle(design.body, 400),
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
// Fecho — bloco preto com coroa, nome e relógio vivo
// ─────────────────────────────────────────────────────────────

function FechoForno({
  nome,
  tempo,
  taxa,
  horarios,
}: {
  nome: string
  tempo: number | null
  taxa: number | null
  horarios: Record<string, Horario> | null
}) {
  const design = useStoreDesign()
  const { black } = useFonteForno()
  const [hora, setHora] = useState(horaAgora)

  // Meio minuto basta pra nunca mostrar hora velha sem acordar o app à toa.
  useEffect(() => {
    const id = setInterval(() => setHora(horaAgora()), 30_000)
    return () => clearInterval(id)
  }, [])

  const hoje = horarios?.[DIAS[new Date().getDay()]]
  const meta = [
    hoje ? `HOJE ${hoje.abre}–${hoje.fecha}` : 'ABERTO',
    tempo != null ? `${tempo} MIN` : null,
    taxa === 0 ? 'ENTREGA GRÁTIS' : null,
    hora,
  ].filter(Boolean)

  return (
    <View
      style={{
        marginTop: 34,
        paddingTop: 42,
        paddingBottom: 48,
        paddingHorizontal: 24,
        alignItems: 'center',
        backgroundColor: PRETO_FORNO,
      }}
    >
      <Coroa tamanho={Math.round(SCREEN_W * 0.075)} cor={OURO} />

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          marginTop: 14,
          fontSize: 32,
          letterSpacing: -0.5,
          textAlign: 'center',
          color: OURO,
          ...black,
        }}
      >
        {nome.toUpperCase()}
      </Text>

      <Text
        style={{
          marginTop: 12,
          fontSize: 11,
          letterSpacing: 1.8,
          textAlign: 'center',
          color: comAlfa(CREME_FIXO, 0.85),
          ...fontStyle(design.body, 600),
        }}
      >
        {meta.join('  ·  ')}
      </Text>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Barra de menu inferior — pílula preta que atravessa os palcos
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
 * PÍLULA e não barra colada, pelo mesmo motivo dos botões circulares do
 * chrome: a página é fatiada em blocos chapados que trocam de cor por seção, e
 * uma barra rente à base herdaria a cor de baixo dela a cada rolagem. Preta —
 * o palco do hero e do fecho —, com o ativo em OURO (8,66:1) e o inativo no
 * creme fixo a meio tom.
 */
function BarraMenuForno({
  sairPara,
}: {
  sairPara: (acao: () => void) => (e: GestureResponderEvent) => void
}) {
  const design = useStoreDesign()
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
          backgroundColor: PRETO_FORNO,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: comAlfa(CREME_FIXO, 0.14),
        },
        consumerDesign.shadow.floating,
      ]}
    >
      {ITENS_MENU.map((item) => {
        const cor = item.ativo ? OURO : comAlfa(CREME_FIXO, 0.62)
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
                letterSpacing: 0.6,
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
