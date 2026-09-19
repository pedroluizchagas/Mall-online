import { ReactNode, useEffect, useRef } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_600SemiBold_Italic,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import { PartnerIcon, type PartnerIconName } from '@/components/PartnerIcon'
import { partnerDesign } from '@/lib/partner-design'

/**
 * Marquise — a fachada escura no topo de cada tela principal do lojista.
 *
 * Port do system design do consumer (docs/system-design/consumer/07-telas.md
 * §1, §6, §7, §10): painel `marquee` (zinco quente) com o degradê
 * lima-profundo do painel web vazando por trás (GlowNeon), voz em Plus
 * Jakarta Sans e peças de VIDRO fumê (moedas, placas, cartões). O que está
 * AO VIVO mora aqui; o acervo/registro mora na folha clara que sobe por
 * cima (components/marquise/Folha.tsx).
 *
 * Extração do sistema: docs/system-design/partner/00-sistema.md §3.
 */

const { colors, radius, motion } = partnerDesign

// ─────────────────────────────────────────────────────────
// Voz da marca
// ─────────────────────────────────────────────────────────

/**
 * Fontes-assinatura — Plus Jakarta Sans, a MESMA do painel web do lojista:
 * `letreiro` (700) assina letreiros de seção; `statement` (600) e `acento`
 * (600 itálico — a linha acesa) montam o hero da marquise. Caem no peso de
 * sistema enquanto os assets carregam, sem flash bloqueante.
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

/** Micro caps mudo sobre a fachada — sobrelinhas e rótulos. */
export const estiloMicroMudo: TextStyle = {
  fontSize: 11,
  fontWeight: '700',
  color: colors.marqueeInkMuted,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
}

// ─────────────────────────────────────────────────────────
// Fachada
// ─────────────────────────────────────────────────────────

/**
 * O degradê da fachada — o MESMO do painel web do lojista: lima-profundo
 * em dois blobs difusos sobre o zinco quente (~22% topo-direito, ~12%
 * pé-esquerdo). No squint é um verde-oliva escuro, nunca neon.
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
 * Container da fachada: `marquee` + GlowNeon, safe area no topo e 48 de pé
 * (24 ficam escondidos atrás da folha que sobe por cima).
 */
export function Marquise({
  children,
  paddingBottom = 48,
}: {
  children: ReactNode
  paddingBottom?: number
}) {
  const insets = useSafeAreaInsets()
  return (
    <View
      style={{
        backgroundColor: colors.marquee,
        paddingTop: insets.top + 16,
        paddingBottom,
        overflow: 'hidden',
      }}
    >
      <GlowNeon />
      {children}
    </View>
  )
}

/** Linha de portaria: um slot à esquerda, outro à direita, no gutter 24. */
export function Portaria({
  esquerda,
  direita,
}: {
  esquerda?: ReactNode
  direita?: ReactNode
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        minHeight: 40,
      }}
    >
      <View style={{ flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {esquerda}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>{direita}</View>
    </View>
  )
}

/**
 * O hero da marquise: sobrelinha em micro caps, statement em Jakarta 600
 * com a última linha acesa em itálico accent, e uma sublinha mudinha.
 */
export function Statement({
  sobrelinha,
  linha,
  acento,
  sublinha,
  tamanho = 'lg',
  paddingTop = 22,
}: {
  sobrelinha: string
  linha: string
  /** A linha acesa (itálico, accent). Opcional. */
  acento?: string
  sublinha?: string
  tamanho?: 'lg' | 'md'
  paddingTop?: number
}) {
  const fontes = useFontesMarquee()
  const fonte = tamanho === 'lg' ? 30 : 24
  const linhaAltura = tamanho === 'lg' ? 35 : 28
  return (
    <View style={{ paddingHorizontal: 24, paddingTop }}>
      <Text style={estiloMicroMudo}>{sobrelinha}</Text>
      <Text
        style={[
          fontes.statement,
          {
            fontSize: fonte,
            lineHeight: linhaAltura,
            color: colors.white,
            letterSpacing: tamanho === 'lg' ? -0.7 : -0.5,
            marginTop: 8,
          },
        ]}
      >
        {linha}
        {acento ? (
          <>
            {'\n'}
            <Text style={[fontes.acento, { color: colors.accent }]}>{acento}</Text>
          </>
        ) : null}
      </Text>
      {sublinha ? (
        <Text
          style={{
            fontSize: 13.5,
            fontWeight: '500',
            color: colors.marqueeInkSoft,
            marginTop: 8,
          }}
        >
          {sublinha}
        </Text>
      ) : null}
    </View>
  )
}

// ─────────────────────────────────────────────────────────
// Peças de vidro
// ─────────────────────────────────────────────────────────

/** Moeda redonda de vidro com ícone de linha — voltar, ações da portaria. */
export function MoedaVidro({
  icone,
  aoTocar,
  rotulo,
  accent = false,
  tamanho = 40,
  badge,
}: {
  icone: PartnerIconName
  aoTocar?: () => void
  /** accessibilityLabel. */
  rotulo: string
  /** Moeda acesa (fundo accent, ícone ink). */
  accent?: boolean
  tamanho?: number
  /** Ponto de aviso no ombro (danger) — ex.: pedidos novos. */
  badge?: boolean
}) {
  return (
    <TouchableOpacity
      onPress={aoTocar}
      disabled={!aoTocar}
      activeOpacity={partnerDesign.opacity.pressedSoft}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho / 2,
        backgroundColor: accent ? colors.accent : colors.marqueeGlass,
        borderWidth: accent ? 0 : 1,
        borderColor: colors.marqueeLine,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <PartnerIcon
        name={icone}
        size={Math.round(tamanho * 0.45)}
        color={accent ? colors.ink : colors.white}
        strokeWidth={2}
      />
      {badge && (
        <View
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.danger,
            borderWidth: 1.5,
            borderColor: colors.marquee,
          }}
        />
      )}
    </TouchableOpacity>
  )
}

/** Cartão de vidro fumê — o material do que está ao vivo na fachada. */
export function CartaoVidro({
  children,
  padding = 18,
  raio = 'lg',
  aoTocar,
  rotulo,
  forte = false,
  aceso = false,
}: {
  children: ReactNode
  padding?: number
  raio?: 'md' | 'lg'
  aoTocar?: () => void
  /** accessibilityLabel quando tocável. */
  rotulo?: string
  /** Camada interna mais forte (`marqueeGlassStrong`). */
  forte?: boolean
  /** Fio `accentRing` — cartão selecionado / aberto. */
  aceso?: boolean
}) {
  const estilo = {
    backgroundColor: forte ? colors.marqueeGlassStrong : colors.marqueeGlass,
    borderWidth: 1,
    borderColor: aceso ? colors.accentRing : colors.marqueeLine,
    borderRadius: raio === 'lg' ? radius.lg : radius.md,
    padding,
  }
  if (aoTocar) {
    return (
      <TouchableOpacity
        onPress={aoTocar}
        activeOpacity={partnerDesign.opacity.pressed}
        accessibilityRole="button"
        accessibilityLabel={rotulo}
        style={estilo}
      >
        {children}
      </TouchableOpacity>
    )
  }
  return <View style={estilo}>{children}</View>
}

/**
 * Placa de vidro com número grande — um KPI ou uma coleção na fachada
 * (as "moedas de coleção" do perfil do consumer). Ícone accent, valor
 * 20/800 white, rótulo mudo.
 */
export function PlacaVidro({
  icone,
  valor,
  rotulo,
  aoTocar,
  ativo = false,
  alerta = false,
}: {
  icone: PartnerIconName
  valor: string
  rotulo: string
  aoTocar?: () => void
  /** Placa aberta/selecionada: camada forte + fio accent. */
  ativo?: boolean
  /** Valor em accent (ex.: pedidos novos > 0). */
  alerta?: boolean
}) {
  const conteudo = (
    <>
      <PartnerIcon name={icone} size={16} color={colors.accent} strokeWidth={2} />
      <View>
        <Text
          style={{
            fontSize: 20,
            fontWeight: '800',
            color: alerta ? colors.accent : colors.white,
            letterSpacing: -0.5,
          }}
          numberOfLines={1}
        >
          {valor}
        </Text>
        <Text
          style={{ fontSize: 11, fontWeight: '600', color: colors.marqueeInkSoft, marginTop: 1 }}
          numberOfLines={1}
        >
          {rotulo}
        </Text>
      </View>
    </>
  )
  const estilo = {
    flex: 1,
    backgroundColor: ativo ? colors.marqueeGlassStrong : colors.marqueeGlass,
    borderWidth: 1,
    borderColor: ativo ? colors.accentRing : colors.marqueeLine,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 8,
  }
  if (aoTocar) {
    return (
      <TouchableOpacity
        onPress={aoTocar}
        activeOpacity={partnerDesign.opacity.pressedSoft}
        accessibilityRole="button"
        accessibilityLabel={`${valor} ${rotulo}`}
        accessibilityState={{ expanded: ativo }}
        style={estilo}
      >
        {conteudo}
      </TouchableOpacity>
    )
  }
  return (
    <View style={estilo} accessibilityLabel={`${valor} ${rotulo}`}>
      {conteudo}
    </View>
  )
}

/** Pílula de vidro com ícone + texto — filtro/ação curta sobre a fachada. */
export function PilulaVidro({
  rotulo,
  icone,
  aoTocar,
  ativa = false,
}: {
  rotulo: string
  icone?: PartnerIconName
  aoTocar: () => void
  ativa?: boolean
}) {
  const cor = ativa ? colors.ink : colors.white
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={partnerDesign.opacity.pressedSoft}
      accessibilityRole="button"
      accessibilityState={{ selected: ativa }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 34,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        backgroundColor: ativa ? colors.accent : colors.marqueeGlass,
        borderWidth: 1,
        borderColor: ativa ? colors.accent : colors.marqueeLine,
      }}
    >
      {icone && <PartnerIcon name={icone} size={13} color={cor} strokeWidth={2.2} />}
      <Text style={{ fontSize: 13, fontWeight: '700', color: cor }}>{rotulo}</Text>
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────────────────────
// Sinais de "ao vivo"
// ─────────────────────────────────────────────────────────

/** Ponto accent respirando — respeita o reduce motion (fica aceso fixo). */
export function PontoAoVivo({ cor = colors.accent }: { cor?: string }) {
  const pulso = useRef(new Animated.Value(1)).current
  useEffect(() => {
    let ciclo: Animated.CompositeAnimation | undefined
    let vivo = true
    AccessibilityInfo.isReduceMotionEnabled().then((reduzido) => {
      if (!vivo || reduzido) return
      ciclo = Animated.loop(
        Animated.sequence([
          Animated.timing(pulso, {
            toValue: 0.3,
            duration: motion.pulse / 2,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulso, {
            toValue: 1,
            duration: motion.pulse / 2,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      )
      ciclo.start()
    })
    return () => {
      vivo = false
      ciclo?.stop()
    }
  }, [])
  return (
    <Animated.View
      style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: cor, opacity: pulso }}
    />
  )
}

/** Barra 4px sobre vidro, fill animado até `valor` (0–1). */
export function BarraProgresso({ valor, cor = colors.accent }: { valor: number; cor?: string }) {
  const progresso = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(progresso, {
      toValue: valor,
      duration: motion.slow * 2,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // anima width (layout)
    }).start()
  }, [valor])
  return (
    <View
      style={{
        flex: 1,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.marqueeGlassStrong,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          height: '100%',
          borderRadius: 2,
          backgroundColor: cor,
          width: progresso.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  )
}
