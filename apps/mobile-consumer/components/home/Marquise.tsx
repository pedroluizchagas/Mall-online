import { ReactNode, useEffect, useRef } from 'react'
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
  TextStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_600SemiBold_Italic,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { useNaoLidas } from '@/store/useNotificacoes'
import { consumerDesign } from '@/lib/consumer-design'

/**
 * Marquise — a fachada noturna do home.
 *
 * O topo do Início é o letreiro do shopping à noite: painel `marquee`
 * (zinco quente) com o degradê lima-profundo do brand web vazando por trás
 * (SVG radial — o mesmo do painel do lojista), saudação de portaria,
 * statement em Plus Jakarta Sans com a última linha acesa em itálico no
 * accent, busca em vidro fumê e a fileira de vitrines circulares (lojas
 * seguidas — ou as em alta, para quem ainda não segue ninguém). O conteúdo
 * claro sobe por cima como uma folha arredondada: sair da fachada e entrar
 * no shopping.
 *
 * Spec: docs/system-design/consumer/07-telas.md §1
 */

const { colors, radius, motion } = consumerDesign

/** Loja exibida na fileira de vitrines. */
export interface VitrineLoja {
  slug: string
  nome: string
  logoUrl: string | null
  tempoEntrega: number | null
  seguida: boolean
}

interface MarquiseProps {
  /** "Boa noite, Pedro" — já montada (saudacaoPorHorario + nome). */
  saudacao: string
  vitrines: VitrineLoja[]
  /** De onde a fileira veio: lojas seguidas ou as "em alta" (fallback). */
  modoVitrines: 'seguidas' | 'alta'
  /** Enquanto o catálogo carrega, a fileira mostra vitrines apagadas. */
  carregandoVitrines: boolean
  aoTocarLocalizacao?: () => void
  aoTocarBusca: () => void
  aoTocarSino: () => void
  aoTocarVitrine: (slug: string) => void
  aoTocarDescobrir: () => void
  /** Cartão de pedido ao vivo (renderizado no pé da fachada). */
  children?: ReactNode
}

/**
 * Fontes-assinatura da marca — Plus Jakarta Sans, a MESMA do painel web do
 * lojista (apps/web): `letreiro` (700) assina os letreiros de seção;
 * `statement` (600) e `acento` (600 itálico — a linha acesa, espelhando o
 * "futuro" itálico-lima do login web) montam o hero da marquise.
 * Caem no peso de sistema enquanto os assets carregam — sem flash
 * bloqueante, mesmo mecanismo do useThemeFonts das lojas.
 */
export function useFontesMarquee(): {
  letreiro: TextStyle
  statement: TextStyle
  acento: TextStyle
} {
  const [prontas] = useFonts({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_600SemiBold_Italic,
    PlusJakartaSans_700Bold,
  })
  if (!prontas) {
    return {
      letreiro: { fontWeight: '800' },
      statement: { fontWeight: '600' },
      acento: { fontWeight: '600', fontStyle: 'italic' },
    }
  }
  return {
    letreiro: { fontFamily: 'PlusJakartaSans_700Bold' },
    statement: { fontFamily: 'PlusJakartaSans_600SemiBold' },
    acento: { fontFamily: 'PlusJakartaSans_600SemiBold_Italic' },
  }
}

/** Quantas vitrines participam do stagger de entrada (o resto entra junto). */
const STAGGER_MAX = 6

export function Marquise({
  saudacao,
  vitrines,
  modoVitrines,
  carregandoVitrines,
  aoTocarLocalizacao,
  aoTocarBusca,
  aoTocarSino,
  aoTocarVitrine,
  aoTocarDescobrir,
  children,
}: MarquiseProps) {
  const insets = useSafeAreaInsets()
  const fontes = useFontesMarquee()

  // Entrada única: um valor só rege statement e vitrines — cada peça lê uma
  // janela do intervalo [0,1], então o stagger nunca dessincroniza.
  const entrada = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(entrada, {
      toValue: 1,
      duration: motion.slow * 2,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [])

  const janela = (de: number, ate: number) => ({
    opacity: entrada.interpolate({
      inputRange: [de, ate],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    transform: [
      {
        translateY: entrada.interpolate({
          inputRange: [de, ate],
          outputRange: [10, 0],
          extrapolate: 'clamp',
        }),
      },
    ],
  })

  return (
    <View
      style={{
        backgroundColor: colors.marquee,
        paddingTop: insets.top + 10,
        // 24 extras ficam escondidos atrás da folha clara que sobe por cima.
        paddingBottom: 40,
        overflow: 'hidden',
      }}
    >
      <GlowNeon />

      {/* Portaria: localização + sino */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 24,
        }}
      >
        <TouchableOpacity
          onPress={aoTocarLocalizacao}
          disabled={!aoTocarLocalizacao}
          activeOpacity={consumerDesign.opacity.pressedSoft}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          {/* Pin nu — a portaria não usa moedas de vidro: chrome zero no topo,
              vidro da fachada fica para busca, vitrines e cartão ao vivo. */}
          <ConsumerIcon
            name="pin"
            size={19}
            color={colors.accent}
            strokeWidth={2}
          />
          <View>
            <Text style={estilos.microMudo}>Entregar em</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '800',
                  color: colors.white,
                  letterSpacing: -0.3,
                }}
              >
                Divinópolis
              </Text>
              {aoTocarLocalizacao && (
                <ConsumerIcon
                  name="chevron-down"
                  size={13}
                  color={colors.marqueeInkSoft}
                />
              )}
            </View>
          </View>
        </TouchableOpacity>

        <SinoNoturno aoTocar={aoTocarSino} />
      </View>

      {/* Letreiro */}
      <Animated.View
        style={[{ paddingHorizontal: 24, paddingTop: 26 }, janela(0, 0.55)]}
      >
        <Text style={estilos.microMudo}>{saudacao}</Text>
        {/* Métricas da referência web: leading 1.1, tracking-tight; a linha
            acesa é itálica — o gesto do "futuro" do login do lojista. */}
        <Text
          style={[
            fontes.statement,
            {
              fontSize: 34,
              lineHeight: 39,
              color: colors.white,
              letterSpacing: -0.8,
              marginTop: 8,
            },
          ]}
        >
          A cidade inteira,{'\n'}
          <Text style={[fontes.acento, { color: colors.accent }]}>
            na sua mão.
          </Text>
        </Text>
        <Text
          style={{
            fontSize: 13.5,
            fontWeight: '500',
            color: colors.marqueeInkSoft,
            marginTop: 8,
          }}
        >
          O shopping digital de Divinópolis
        </Text>
      </Animated.View>

      {/* Busca em vidro fumê */}
      <Animated.View style={janela(0.15, 0.7)}>
        <TouchableOpacity
          onPress={aoTocarBusca}
          activeOpacity={consumerDesign.opacity.pressedSoft}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: colors.marqueeGlass,
            borderWidth: 1,
            borderColor: colors.marqueeLine,
            borderRadius: radius.pill,
            paddingHorizontal: 18,
            paddingVertical: 14,
            marginHorizontal: 24,
            marginTop: 24,
          }}
        >
          <ConsumerIcon name="search" size={17} color={colors.marqueeInkSoft} />
          <Text
            style={{
              fontSize: 14,
              color: colors.marqueeInkSoft,
              fontWeight: '500',
              flex: 1,
            }}
          >
            O que você procura hoje?
          </Text>
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ConsumerIcon
              name="chevron-right"
              size={14}
              color={colors.ink}
              strokeWidth={2.4}
            />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Vitrines acesas */}
      <View style={{ paddingTop: 26 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 24,
            marginBottom: 14,
          }}
        >
          <ConsumerIcon
            name={modoVitrines === 'seguidas' ? 'users' : 'spark'}
            size={12}
            color={colors.accent}
          />
          <Text style={estilos.microMudo}>
            {modoVitrines === 'seguidas' ? 'Suas lojas' : 'Em alta agora'}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
        >
          <Animated.View style={janela(0.2, 0.65)}>
            <SlotDescobrir aoTocar={aoTocarDescobrir} />
          </Animated.View>

          {carregandoVitrines && vitrines.length === 0
            ? Array.from({ length: 4 }).map((_, i) => (
                <VitrineApagada key={i} />
              ))
            : vitrines.map((loja, i) => {
                const passo = Math.min(i, STAGGER_MAX)
                return (
                  <Animated.View
                    key={loja.slug}
                    style={janela(0.25 + passo * 0.07, 0.7 + passo * 0.05)}
                  >
                    <VitrineAvatar
                      loja={loja}
                      aoTocar={() => aoTocarVitrine(loja.slug)}
                    />
                  </Animated.View>
                )
              })}
        </ScrollView>
      </View>

      {children && (
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>{children}</View>
      )}
    </View>
  )
}

// ─────────────────────────────────────────────────────────
// Peças da fachada
// ─────────────────────────────────────────────────────────

/**
 * O degradê da fachada — o MESMO do painel web do lojista: lima-profundo
 * (`marqueeGlow`) em dois blobs difusos sobre o zinco quente, ~22% no topo
 * direito e ~12% no pé esquerdo (no web: blobs de #C1F148/20 e /10 com
 * blur de 100px sobre #18181B). No squint a fachada é um verde-oliva
 * escuro, nunca neon.
 *
 * Exportado: o Concierge (overlay de busca) reusa o mesmo céu.
 */
export function GlowNeon() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="neonTopo" cx="88%" cy="-8%" r="95%">
          <Stop offset="0" stopColor={colors.marqueeGlow} stopOpacity={0.22} />
          <Stop offset="0.45" stopColor={colors.marqueeGlow} stopOpacity={0.08} />
          <Stop offset="1" stopColor={colors.marqueeGlow} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="neonBase" cx="-2%" cy="115%" r="80%">
          <Stop offset="0" stopColor={colors.marqueeGlow} stopOpacity={0.12} />
          <Stop offset="1" stopColor={colors.marqueeGlow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#neonTopo)" />
      <Rect width="100%" height="100%" fill="url(#neonBase)" />
    </Svg>
  )
}

/**
 * Sino nu, sem moeda de vidro — o hitSlop devolve o alvo de toque de ~44px
 * que o círculo dava. O badge senta no ombro do sino, com aro `marquee`
 * abrindo o vão contra o traço.
 */
function SinoNoturno({ aoTocar }: { aoTocar: () => void }) {
  const naoLidas = useNaoLidas()

  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessibilityRole="button"
      accessibilityLabel={
        naoLidas > 0 ? `Notificações, ${naoLidas} não lidas` : 'Notificações'
      }
    >
      <View>
        <ConsumerIcon name="bell" size={22} color={colors.white} />
        {naoLidas > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -1,
              right: -1,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.danger,
              borderWidth: 1.5,
              borderColor: colors.marquee,
            }}
          />
        )}
      </View>
    </TouchableOpacity>
  )
}

/** Primeiro slot da fileira: descobrir lojas novas para seguir. */
function SlotDescobrir({ aoTocar }: { aoTocar: () => void }) {
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      style={{ alignItems: 'center', width: 68 }}
    >
      <View
        style={{
          width: 62,
          height: 62,
          borderRadius: 31,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: colors.marqueeInkMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ConsumerIcon name="plus" size={20} color={colors.accent} />
      </View>
      <Text style={estilos.nomeVitrine} numberOfLines={1}>
        Descobrir
      </Text>
      <Text style={estilos.subVitrine} numberOfLines={1}>
        lojas novas
      </Text>
    </TouchableOpacity>
  )
}

function VitrineAvatar({
  loja,
  aoTocar,
}: {
  loja: VitrineLoja
  aoTocar: () => void
}) {
  const inicial = loja.nome.charAt(0).toUpperCase()

  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressed}
      style={{ alignItems: 'center', width: 68 }}
    >
      {/* Loja seguida ganha o aro aceso — vitrine com o neon ligado. */}
      <View
        style={{
          width: 62,
          height: 62,
          borderRadius: 31,
          borderWidth: 1.5,
          borderColor: loja.seguida ? colors.accentRing : colors.marqueeLine,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {loja.logoUrl ? (
          <Image
            source={{ uri: loja.logoUrl }}
            style={{
              width: 54,
              height: 54,
              borderRadius: 27,
              backgroundColor: colors.marqueeGlassStrong,
            }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 27,
              backgroundColor: colors.marqueeGlassStrong,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: colors.accent,
                fontSize: 21,
                fontWeight: '800',
                letterSpacing: -0.5,
              }}
            >
              {inicial}
            </Text>
          </View>
        )}
      </View>
      <Text style={estilos.nomeVitrine} numberOfLines={1}>
        {loja.nome}
      </Text>
      <Text style={estilos.subVitrine} numberOfLines={1}>
        {loja.tempoEntrega !== null ? `${loja.tempoEntrega} min` : 'Ver loja'}
      </Text>
    </TouchableOpacity>
  )
}

/** Placeholder enquanto o catálogo carrega — vitrine ainda apagada. */
function VitrineApagada() {
  return (
    <View style={{ alignItems: 'center', width: 68 }}>
      <View
        style={{
          width: 62,
          height: 62,
          borderRadius: 31,
          backgroundColor: colors.marqueeGlass,
        }}
      />
      <View
        style={{
          width: 44,
          height: 9,
          borderRadius: 5,
          marginTop: 10,
          backgroundColor: colors.marqueeGlass,
        }}
      />
    </View>
  )
}

const estilos = StyleSheet.create({
  microMudo: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.marqueeInkMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  nomeVitrine: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    marginTop: 8,
    maxWidth: 68,
  },
  subVitrine: {
    fontSize: 10.5,
    fontWeight: '500',
    color: colors.marqueeInkMuted,
    marginTop: 2,
  },
})
