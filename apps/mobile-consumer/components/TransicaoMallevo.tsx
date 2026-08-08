import { useEffect, useRef } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
} from 'react-native'
import { consumerDesign } from '@/lib/consumer-design'
import { useTransicaoSaida } from '@/store/useTransicaoSaida'

const { width: TELA_W, height: TELA_H } = Dimensions.get('window')

/** Diâmetro base do círculo — a expansão é feita por scale (native driver). */
const DIAMETRO = 100

// Expansão pousa macio (decelera forte); dissoluções em curva suave.
const EXPANDIR = Easing.bezier(0.16, 1, 0.3, 1)
const SUAVE = Easing.bezier(0.4, 0, 0.2, 1)

/**
 * Transição radial de saída de loja — o espelho cromático do SplashLoja.
 *
 * Entrar na loja é o neutro Mallevo virando a cor do lojista; sair é o
 * caminho de volta: um círculo na COR DA PALETA DA LOJA nasce do ponto do
 * toque e expande até cobrir a tela; coberta, a navegação roda escondida
 * enquanto a cor se dissolve no canvas Mallevo; o véu então desaparece
 * revelando o shopping. Sem marca, sem texto — só cor e movimento.
 *
 * Vive no layout raiz, acima do navigator — sobrevive ao desmonte da tela
 * que o disparou. Com "reduzir movimento" ativo, navega direto, sem véu.
 */
export function TransicaoMallevo() {
  const config = useTransicaoSaida((s) => s.config)
  const limpar = useTransicaoSaida((s) => s.limpar)
  const { colors } = consumerDesign

  const escala = useRef(new Animated.Value(0.01)).current
  const camadaMallevo = useRef(new Animated.Value(0)).current
  const veuOp = useRef(new Animated.Value(1)).current
  const executado = useRef(false)

  useEffect(() => {
    if (!config) return
    let cancelado = false
    executado.current = false

    escala.setValue(0.01)
    camadaMallevo.setValue(0)
    veuOp.setValue(1)

    const executar = () => {
      if (executado.current) return
      executado.current = true
      config.acao()
    }
    const finalizar = () => {
      executar()
      limpar()
    }

    // Salvaguarda: aconteça o que acontecer, nunca prender o usuário aqui.
    const salvaguarda = setTimeout(finalizar, 2600)

    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduzir) => {
        if (cancelado) return
        if (reduzir) {
          clearTimeout(salvaguarda)
          finalizar()
          return
        }

        const origem = config.origem ?? { x: TELA_W / 2, y: TELA_H / 2 }
        // Escala que leva o círculo até o canto mais distante da origem.
        const raioNecessario = Math.hypot(
          Math.max(origem.x, TELA_W - origem.x),
          Math.max(origem.y, TELA_H - origem.y),
        )
        const escalaFinal = ((raioNecessario * 2) / DIAMETRO) * 1.02

        // 1) A cor da loja floresce do toque e cobre a tela.
        Animated.timing(escala, {
          toValue: escalaFinal,
          duration: 360,
          easing: EXPANDIR,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (cancelado || !finished) return
          // 2) Tela coberta: navega escondido e dissolve para o canvas Mallevo.
          executar()
          Animated.timing(camadaMallevo, {
            toValue: 1,
            duration: 240,
            easing: SUAVE,
            useNativeDriver: true,
          }).start(() => {
            if (cancelado) return
            // 3) Respiro no neutro e o véu revela o shopping.
            setTimeout(() => {
              if (cancelado) return
              Animated.timing(veuOp, {
                toValue: 0,
                duration: 340,
                easing: SUAVE,
                useNativeDriver: true,
              }).start(() => {
                if (cancelado) return
                clearTimeout(salvaguarda)
                limpar()
              })
            }, 90)
          })
        })
      })
      .catch(() => {
        if (cancelado) return
        clearTimeout(salvaguarda)
        finalizar()
      })

    return () => {
      cancelado = true
      clearTimeout(salvaguarda)
    }
  }, [config])

  if (!config) return null

  const origem = config.origem ?? { x: TELA_W / 2, y: TELA_H / 2 }

  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        StyleSheet.absoluteFillObject,
        { zIndex: 200, elevation: 200, opacity: veuOp },
      ]}
    >
      {/* Círculo na cor da paleta da loja, nascendo do ponto do toque */}
      <Animated.View
        style={{
          position: 'absolute',
          left: origem.x - DIAMETRO / 2,
          top: origem.y - DIAMETRO / 2,
          width: DIAMETRO,
          height: DIAMETRO,
          borderRadius: DIAMETRO / 2,
          backgroundColor: config.cor ?? colors.ink,
          transform: [{ scale: escala }],
        }}
      />
      {/* Paleta Mallevo assumindo por cima, já com a tela coberta */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: colors.canvas, opacity: camadaMallevo },
        ]}
      />
    </Animated.View>
  )
}
