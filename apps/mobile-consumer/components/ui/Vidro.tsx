/**
 * Vidro — material das placas claras do consumer (diretório do shopping,
 * letreiros de corredor). Espelho CLARO da cápsula de vidro escuro da tab
 * bar (`inkGlass` + fio de luz na borda): aqui o corpo é um véu branco
 * translúcido sobre BlurView, o fio de luz é branco quase puro na borda
 * interna e um brilho vertical (SVG) faz o reflexo de acrílico iluminado —
 * a placa de sinalização retroiluminada de um shopping.
 *
 * Plataforma: BlurView ao vivo só no iOS. No Android cada blur
 * (`dimezisBlurView`) re-renderiza o fundo — com N placas na home o custo
 * explode; lá o véu `glassStrong` (mais opaco) simula o fosco. A diferença
 * é imperceptível porque o canvas atrás é quase chapado.
 *
 * A sombra fica no wrapper externo (iOS compõe a partir dos filhos);
 * elevation em fundo transparente não desenha no Android — sem fallback,
 * o recorte + fio de luz seguram a definição.
 */
import type { ReactNode } from 'react'
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { consumerDesign } from '@/lib/consumer-design'

const { colors, shadow } = consumerDesign

const USA_BLUR = Platform.OS === 'ios'

export function Vidro({
  raio,
  brilho = true,
  intensidade = 38,
  estilo,
  children,
}: {
  raio: number
  /** Reflexo de acrílico no topo (desligue em placas muito pequenas). */
  brilho?: boolean
  intensidade?: number
  estilo?: ViewStyle
  children: ReactNode
}) {
  return (
    <View style={[{ borderRadius: raio }, shadow.soft, estilo]}>
      <View style={{ borderRadius: raio, overflow: 'hidden' }}>
        {USA_BLUR && (
          <BlurView
            intensity={intensidade}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        )}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: USA_BLUR ? colors.glass : colors.glassStrong },
          ]}
        />
        {brilho && (
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <LinearGradient id="brilhoVidro" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.white} stopOpacity={0.55} />
                <Stop offset="0.6" stopColor={colors.white} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#brilhoVidro)" />
          </Svg>
        )}
        {children}
        {/* Fio de luz — sempre por último, acima do conteúdo. */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: raio,
              borderWidth: 1,
              borderColor: colors.glassEdge,
            },
          ]}
        />
      </View>
    </View>
  )
}
