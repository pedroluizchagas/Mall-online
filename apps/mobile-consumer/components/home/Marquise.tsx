import { ReactNode, useEffect, useRef } from 'react'
import {
  View,
  Text,
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
import {
  VitrineCard,
  VitrineApagada,
  VITRINE_GUTTER,
  VITRINE_GAP,
  type VitrinePost,
} from '@/components/home/VitrineCard'
import { useNaoLidas } from '@/store/useNotificacoes'
import { consumerDesign } from '@/lib/consumer-design'

/**
 * Marquise — a fachada noturna do home.
 *
 * O topo do Início é o letreiro do shopping à noite: painel `marquee`
 * (zinco quente) com o degradê lima-profundo do brand web vazando por trás
 * (SVG radial — o mesmo do painel do lojista), saudação de portaria,
 * statement em Plus Jakarta Sans com a última linha acesa em itálico no
 * accent, busca em vidro fumê e a fileira de vitrines — os POSTS recentes
 * dos parceiros (VitrineCard: o status que o lojista publicou vinculado a
 * um produto), das lojas seguidas ou, para quem ainda não segue ninguém,
 * do shopping inteiro — sob o letreiro "Ao vivo no shopping". Tocar leva
 * direto ao post no Seguindo (ou no Explorar). O conteúdo claro sobe por
 * cima como uma folha arredondada: sair da fachada e entrar no shopping.
 *
 * Spec: docs/system-design/consumer/07-telas.md §1
 */

const { colors, radius, motion } = consumerDesign

// Re-export: a tela do home monta a lista com este tipo.
export type { VitrinePost }

interface MarquiseProps {
  /** "Boa noite, Pedro" — já montada (saudacaoPorHorario + nome). */
  saudacao: string
  vitrines: VitrinePost[]
  /** De onde a fileira veio: posts das lojas seguidas ou do shopping (fallback). */
  modoVitrines: 'seguidas' | 'alta'
  /** Enquanto os posts carregam, a fileira mostra vitrines apagadas. */
  carregandoVitrines: boolean
  /**
   * Texto da portaria ("Entregar em …"): apelido ou rua do endereço padrão.
   * Sem endereço salvo, o chamador manda o convite ("Adicionar endereço").
   */
  localizacao?: string
  aoTocarLocalizacao?: () => void
  aoTocarBusca: () => void
  aoTocarSino: () => void
  /** Toque num post — leva ao post no Seguindo/Explorar. */
  aoTocarVitrine: (item: VitrinePost) => void
  /** "Ver tudo" — Seguindo (modo seguidas) ou Explorar (modo alta). */
  aoTocarVerTudo: () => void
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
  localizacao,
  aoTocarLocalizacao,
  aoTocarBusca,
  aoTocarSino,
  aoTocarVitrine,
  aoTocarVerTudo,
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
          accessibilityRole="button"
          accessibilityLabel={`Entregar em ${localizacao ?? 'Divinópolis'}. Trocar endereço`}
          // flexShrink + paddingRight: endereço longo trunca antes do sino.
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            flexShrink: 1,
            paddingRight: 16,
          }}
        >
          {/* Pin nu — a portaria não usa moedas de vidro: chrome zero no topo,
              vidro da fachada fica para busca, vitrines e cartão ao vivo. */}
          <ConsumerIcon
            name="pin"
            size={19}
            color={colors.accent}
            strokeWidth={2}
          />
          <View style={{ flexShrink: 1 }}>
            <Text style={estilos.microMudo}>Entregar em</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '800',
                  color: colors.white,
                  letterSpacing: -0.3,
                  flexShrink: 1,
                }}
                numberOfLines={1}
              >
                {localizacao ?? 'Divinópolis'}
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

      {/* Vitrines acesas — letreiro de seção + cartazes em retrato */}
      <Animated.View style={[{ paddingTop: 30 }, janela(0.2, 0.65)]}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            paddingHorizontal: 24,
            marginBottom: 16,
          }}
        >
          <View style={{ flexShrink: 1, paddingRight: 12 }}>
            {/* Sobrelinha acesa: o accent marca o "ao vivo", como a
                sobrelinha de cada cartaz marca a categoria. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ConsumerIcon
                name={modoVitrines === 'seguidas' ? 'users' : 'trend'}
                size={11}
                color={colors.accent}
                strokeWidth={2.4}
              />
              <Text style={[estilos.microMudo, { color: colors.accent }]}>
                Ao vivo no shopping
              </Text>
            </View>
            <Text
              style={[
                fontes.letreiro,
                {
                  fontSize: 21,
                  letterSpacing: -0.4,
                  color: colors.white,
                  marginTop: 6,
                },
              ]}
              numberOfLines={1}
            >
              {modoVitrines === 'seguidas'
                ? 'Novidades das suas lojas'
                : 'Novidades na passarela'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={aoTocarVerTudo}
            activeOpacity={consumerDesign.opacity.pressedSoft}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={
              modoVitrines === 'seguidas'
                ? 'Ver todas as novidades das lojas que você segue'
                : 'Explorar todas as novidades'
            }
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 2,
              paddingBottom: 3,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: colors.marqueeInkSoft,
              }}
            >
              Ver tudo
            </Text>
            <ConsumerIcon
              name="chevron-right"
              size={14}
              color={colors.marqueeInkSoft}
              strokeWidth={2.2}
            />
          </TouchableOpacity>
        </View>

        {/* paddingVertical: o halo colorido dos cartazes vaza além do card e
            o ScrollView recorta nos limites — sem respiro, o halo some. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: VITRINE_GUTTER,
            paddingVertical: 14,
            gap: VITRINE_GAP,
          }}
          style={{ marginVertical: -14 }}
        >
          {carregandoVitrines && vitrines.length === 0
            ? Array.from({ length: 3 }).map((_, i) => (
                <VitrineApagada key={i} />
              ))
            : vitrines.map((item, i) => {
                const passo = Math.min(i, STAGGER_MAX)
                return (
                  <Animated.View
                    key={item.post.id}
                    style={janela(0.25 + passo * 0.07, 0.7 + passo * 0.05)}
                  >
                    <VitrineCard
                      item={item}
                      letreiro={fontes.letreiro}
                      aoTocar={() => aoTocarVitrine(item)}
                    />
                  </Animated.View>
                )
              })}
        </ScrollView>
      </Animated.View>

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

const estilos = StyleSheet.create({
  microMudo: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.marqueeInkMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
})
