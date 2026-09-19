import { useRef } from 'react'
import {
  View,
  Text,
  Image,
  Pressable,
  Animated,
  Dimensions,
  TextStyle,
} from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { contrastRatio, formatarReais } from '@mallevo/lib'
import { ConsumerIcon, type ConsumerIconName } from '@/components/ConsumerIcon'
import { consumerDesign, tempoRelativo } from '@/lib/consumer-design'
import type { Post } from '@/lib/posts'
import { colorsFromTheme } from '@/lib/store-theme'

/**
 * Vitrine da marquise — um POST recente do parceiro, aceso na fachada.
 *
 * É o "marketing orgânico" do shopping: o lojista publica um status
 * vinculado a um produto (a mesma view `public_explore_feed` que alimenta
 * Explorar e Seguindo) e ele aparece aqui, na porta de entrada. Tocar leva
 * DIRETO a esse post no Seguindo (o explorar curado) — ou no Explorar, para
 * quem ainda não segue ninguém.
 *
 * Referência: cards "Novidades na Passarela". Anatomia, de cima para baixo:
 *
 *   pílula de momento no ombro (cheia, texto escuro sobre a cor; neutra em
 *     vidro) — derivada do POST: novo, em alta ou a duração do vídeo;
 *   mídia do post em TODA a layer (foto → thumb do vídeo → logo da loja),
 *     com uma SOMBRA subindo do pé — transparente na metade, quase sólida
 *     na base, na cor do fundo — para a legenda ler; sem corte, sem linha;
 *   legenda sobre a sombra: nome da LOJA como sobrelinha, na cor de accent
 *     da própria loja (a pele dela chega até aqui); PRODUTO vitrinado no
 *     post como título, na fonte-assinatura da casa (sem produto, a
 *     legenda do post); preço em fumê (sem produto, "há 3 sem").
 *
 * Card: fundo um degrau acima do marquee, fio neutro 1px `marqueeLine`.
 * Nada de halo nem fio colorido — a cor mora na pílula e na sobrelinha.
 *
 * Spec: docs/system-design/consumer/07-telas.md §1 (Marquise → vitrines)
 */

const { colors, radius } = consumerDesign

/** Post exibido na fileira de vitrines, com a pele da loja que o publicou. */
export interface VitrinePost {
  post: Post
  /** `stores.theme` cru da loja — a sobrelinha acende no accent dela. */
  theme: unknown
  /** Logo da loja — mídia de reserva quando o post não tem imagem. */
  logoUrl: string | null
}

const { width } = Dimensions.get('window')
/** Margem da fileira — a mesma do letreiro, para os cards alinharem com o título. */
export const VITRINE_GUTTER = 24
/** Passo entre cards. */
export const VITRINE_GAP = 10
/**
 * Quantos cards cabem na tela: dois inteiros e ~45% do terceiro — o card
 * cortado é o convite para rolar. A largura sai daí (referência: card com
 * ~37% da tela), então a composição é a mesma em qualquer aparelho.
 */
const CARDS_VISIVEIS = 2.45
export const VITRINE_W = Math.round(
  (width - VITRINE_GUTTER - VITRINE_GAP * 2) / CARDS_VISIVEIS,
)
/** Retrato ~1:1,56 (referência). */
export const VITRINE_H = Math.round(VITRINE_W * 1.56)
/** A partir de que fração do card a sombra começa a subir. */
const SOMBRA_DE = 0.46
/** Opacidade da sombra no pé do card — quase sólida, nunca chapada. */
const SOMBRA_PE = 0.96

/** Post publicado há menos que isto é "novo". */
const JANELA_NOVO_MS = 48 * 60 * 60 * 1000
/** Curtidas a partir daqui = "em alta". */
const LIMIAR_EM_ALTA = 1000
/** Sobrelinha só usa o accent da loja se ele ler sobre o fundo escuro. */
const CONTRASTE_MIN = 3

/**
 * Fundo do card: marquee clareado 5% — o degrau que separa o cartaz da
 * fachada sem precisar de sombra. Calculado dos tokens, sem hex novo.
 */
const FUNDO_CARD = clarear(colors.marquee, 0.05)

interface Momento {
  rotulo: string
  icone?: ConsumerIconName
  /** Cor sólida do momento. `null` = vidro neutro. */
  cor: string | null
}

/**
 * O momento sai do próprio post, nesta ordem: publicado nas últimas 48h →
 * "Novo"; ≥ 1000 curtidas → "Em alta"; vídeo → a duração em vidro. Foto
 * antiga e discreta fica sem pílula — o card não inventa urgência.
 */
function momentoDoPost(post: Post): Momento | null {
  const publicado = Date.parse(post.publicado_em)
  if (Number.isFinite(publicado) && Date.now() - publicado < JANELA_NOVO_MS) {
    return { rotulo: 'Novo', cor: colors.success }
  }
  if (post.curtidas >= LIMIAR_EM_ALTA) {
    return { rotulo: 'Em alta', icone: 'trend', cor: colors.warning }
  }
  if (post.tipo === 'video' && post.duracao_seg !== null) {
    return { rotulo: formatarDuracao(post.duracao_seg), icone: 'play', cor: null }
  }
  return null
}

export function VitrineCard({
  item,
  letreiro,
  aoTocar,
}: {
  item: VitrinePost
  /** `useFontesMarquee().letreiro` — vem da Marquise (uma carga de fonte só). */
  letreiro: TextStyle
  aoTocar: () => void
}) {
  const { post, theme, logoUrl } = item
  const momento = momentoDoPost(post)

  // Foto → thumb do vídeo → logo da loja. `media_url` de vídeo é o arquivo
  // de vídeo na view real — nunca vai para um <Image>.
  const foto =
    post.tipo === 'foto' ? post.media_url : (post.thumb_url ?? logoUrl)

  // A sobrelinha acende no accent da loja — se ele ler no escuro. Accent
  // escuro (heritage, artisan…) cairia invisível: vai de branco.
  const accentLoja = colorsFromTheme(theme).accent
  const corSobrelinha =
    contrastRatio(accentLoja, FUNDO_CARD) >= CONTRASTE_MIN
      ? accentLoja
      : colors.white

  const titulo = post.produto?.nome ?? post.descricao
  const sublinha = post.produto
    ? formatarReais(post.produto.preco)
    : quandoPublicou(post.publicado_em)

  // Toque: o card afunda 3% com mola curta.
  const escala = useRef(new Animated.Value(1)).current
  const pressionar = (ate: number) =>
    Animated.spring(escala, {
      toValue: ate,
      speed: 40,
      bounciness: 4,
      useNativeDriver: true,
    }).start()

  return (
    <Pressable
      onPress={aoTocar}
      onPressIn={() => pressionar(0.97)}
      onPressOut={() => pressionar(1)}
      accessibilityRole="button"
      accessibilityLabel={[post.loja_nome, titulo, momento?.rotulo]
        .filter(Boolean)
        .join(', ')}
    >
      <Animated.View
        style={{
          width: VITRINE_W,
          height: VITRINE_H,
          borderRadius: radius.md,
          backgroundColor: FUNDO_CARD,
          borderWidth: 1,
          borderColor: colors.marqueeLine,
          overflow: 'hidden',
          transform: [{ scale: escala }],
        }}
      >
        {/* Mídia em toda a layer + sombra de leitura */}
        {foto ? (
          <Image
            source={{ uri: foto }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <Monograma inicial={post.loja_inicial || post.loja_nome.charAt(0)} />
        )}
        <Sombra />

        {momento && <Pilula momento={momento} />}

        {/* Legenda sobre a sombra */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 12,
            paddingBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 1.1,
              textTransform: 'uppercase',
              color: corSobrelinha,
              marginBottom: 4,
            }}
            numberOfLines={1}
          >
            {post.loja_nome}
          </Text>
          <Text
            style={[
              letreiro,
              {
                fontSize: 14,
                lineHeight: 18,
                letterSpacing: -0.3,
                color: colors.white,
              },
            ]}
            numberOfLines={2}
          >
            {titulo}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '500',
              color: colors.marqueeInkSoft,
              marginTop: 4,
            }}
            numberOfLines={1}
          >
            {sublinha}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  )
}

/** Placeholder enquanto os posts carregam — vitrine ainda apagada. */
export function VitrineApagada() {
  return (
    <View
      style={{
        width: VITRINE_W,
        height: VITRINE_H,
        borderRadius: radius.md,
        backgroundColor: FUNDO_CARD,
        borderWidth: 1,
        borderColor: colors.marqueeLine,
        justifyContent: 'flex-end',
        padding: 12,
        gap: 7,
      }}
    >
      <Linha largura="45%" altura={8} />
      <Linha largura="85%" />
      <Linha largura="40%" altura={9} />
    </View>
  )
}

// ─────────────────────────────────────────────────────────
// Peças
// ─────────────────────────────────────────────────────────

/**
 * A sombra de leitura: sobe do pé do card na cor do fundo, de transparente
 * (em `SOMBRA_DE` da altura) até `SOMBRA_PE` na base, em curva ease-in
 * (0 → 0.32 → 0.78 → 0.96). A mídia nunca é cortada — segue atrás do
 * texto, só afundada na sombra; e a sombra nunca chega a 100%, para o
 * pé do card não virar uma faixa chapada colada na foto.
 */
function Sombra() {
  const meio = SOMBRA_DE + (1 - SOMBRA_DE) * 0.38
  const fim = SOMBRA_DE + (1 - SOMBRA_DE) * 0.72
  return (
    <Svg
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id="sombraVitrine" x1="0" y1="0" x2="0" y2="1">
          <Stop offset={String(SOMBRA_DE)} stopColor={FUNDO_CARD} stopOpacity={0} />
          <Stop offset={String(meio)} stopColor={FUNDO_CARD} stopOpacity={0.32} />
          <Stop offset={String(fim)} stopColor={FUNDO_CARD} stopOpacity={0.78} />
          <Stop offset="1" stopColor={FUNDO_CARD} stopOpacity={SOMBRA_PE} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#sombraVitrine)" />
    </Svg>
  )
}

/**
 * Pílula de momento no ombro. Colorida = tinta escura sobre a cor (a
 * referência usa preto sobre rosa/amarelo, nunca branco); neutra = vidro
 * escuro com texto branco. Maior que um badge comum: é o título do card.
 */
function Pilula({ momento }: { momento: Momento }) {
  const colorida = momento.cor !== null
  const corTexto = colorida ? colors.ink : colors.white

  return (
    <View
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        height: 26,
        paddingHorizontal: 11,
        borderRadius: radius.pill,
        backgroundColor: colorida ? momento.cor! : colors.inkGlass,
        borderWidth: colorida ? 0 : 1,
        borderColor: colors.marqueeLine,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {momento.icone && (
        <ConsumerIcon
          name={momento.icone}
          size={11}
          color={corTexto}
          strokeWidth={2.4}
        />
      )}
      <Text
        style={{
          fontSize: 10.5,
          fontWeight: '700',
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: corTexto,
        }}
      >
        {momento.rotulo}
      </Text>
    </View>
  )
}

/** Post sem mídia exibível: monograma da loja sobre o zinco, com o halo do accent. */
function Monograma({ inicial }: { inicial: string }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceDark,
      }}
    >
      <View
        style={{
          position: 'absolute',
          right: -30,
          top: -30,
          width: 130,
          height: 130,
          borderRadius: 65,
          backgroundColor: colors.accentSoft,
        }}
      />
      <Text
        style={{
          color: colors.accent,
          fontSize: 64,
          fontWeight: '800',
          letterSpacing: -2,
          opacity: 0.55,
          // Sobe: a legenda ocupa a base.
          marginBottom: 48,
        }}
      >
        {inicial.toUpperCase()}
      </Text>
    </View>
  )
}

/** Barra de skeleton em vidro, para a vitrine apagada. */
function Linha({ largura, altura = 12 }: { largura: `${number}%`; altura?: number }) {
  return (
    <View
      style={{
        width: largura,
        height: altura,
        borderRadius: altura / 2,
        backgroundColor: colors.marqueeGlassStrong,
      }}
    />
  )
}

/** "agora" fica "agora"; "3 sem" vira "há 3 sem"; data inválida, vazio. */
function quandoPublicou(iso: string): string {
  const relativo = tempoRelativo(iso)
  if (!relativo || relativo === 'agora') return relativo
  return `há ${relativo}`
}

/** 28 → "0:28"; 95 → "1:35". */
function formatarDuracao(segundos: number): string {
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Mistura um hex sólido com branco na fração dada (0–1). */
function clarear(hex: string, fracao: number): string {
  const n = parseInt(hex.slice(1), 16)
  const canal = (deslocamento: number) => {
    const v = (n >> deslocamento) & 0xff
    return Math.round(v + (255 - v) * fracao)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${canal(16)}${canal(8)}${canal(0)}`
}
