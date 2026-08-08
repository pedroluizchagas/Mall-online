import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, StyleSheet, Text } from 'react-native'
import { consumerDesign } from '@/lib/consumer-design'
import { fontStyle } from '@/lib/store-fonts'
import type { StoreDesign } from '@/lib/store-theme'

interface Props {
  nome: string
  logoUrl: string | null
  design: StoreDesign
  /** Dados da loja carregados — a paleta é conhecida e a sequência pode rodar. */
  pronto: boolean
  onFim: () => void
}

// Curvas (personalidade "premium": sem overshoot, pouso suave)
const ENTRADA = Easing.bezier(0.16, 1, 0.3, 1)
const SAIDA = Easing.bezier(0.3, 0, 1, 1)
const SUAVE = Easing.bezier(0.4, 0, 0.2, 1)

/**
 * Splash de transição para dentro de uma loja parceira: cobre a tela com a
 * cor predominante da paleta do lojista, apresenta o logo e revela a página.
 *
 * Enquanto `pronto` é falso o overlay fica no canvas neutro Mallevo; quando a
 * loja chega, o accent do arquétipo entra por crossfade e a sequência roda
 * (logo → nome → saída). Salvaguarda: nunca segura a tela por mais de 6s.
 */
export function SplashLoja({ nome, logoUrl, design, pronto, onFim }: Props) {
  const { colors } = design

  const overlayOpacity = useRef(new Animated.Value(1)).current
  const overlayScale = useRef(new Animated.Value(1)).current
  const accentOpacity = useRef(new Animated.Value(0)).current
  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.88)).current
  const logoY = useRef(new Animated.Value(14)).current
  const nomeOpacity = useRef(new Animated.Value(0)).current
  const nomeY = useRef(new Animated.Value(8)).current
  const discoOpacity = useRef(new Animated.Value(0)).current
  const discoScale = useRef(new Animated.Value(0.85)).current
  const imagemOpacity = useRef(new Animated.Value(0)).current

  const encerrado = useRef(false)
  const [temLogo, setTemLogo] = useState(!!logoUrl)

  useEffect(() => {
    function sair() {
      if (encerrado.current) return
      encerrado.current = true
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          easing: SAIDA,
          useNativeDriver: true,
        }),
        Animated.timing(overlayScale, {
          toValue: 1.03,
          duration: 300,
          easing: SAIDA,
          useNativeDriver: true,
        }),
      ]).start(() => onFim())
    }

    // Salvaguarda: se os dados nunca chegarem, não prender o usuário aqui.
    const timeoutSeguro = setTimeout(sair, 6000)
    if (!pronto) return () => clearTimeout(timeoutSeguro)

    Animated.parallel([
      // Paleta do lojista assume o fundo
      Animated.timing(accentOpacity, {
        toValue: 1,
        duration: 240,
        easing: SUAVE,
        useNativeDriver: true,
      }),
      // Ambiente: disco respira atrás do logo
      Animated.timing(discoOpacity, {
        toValue: 1,
        duration: 700,
        easing: SUAVE,
        useNativeDriver: true,
      }),
      Animated.timing(discoScale, {
        toValue: 1.08,
        duration: 1400,
        easing: SUAVE,
        useNativeDriver: true,
      }),
      // Herói: logo pousa
      Animated.sequence([
        Animated.delay(80),
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 480,
            easing: ENTRADA,
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 480,
            easing: ENTRADA,
            useNativeDriver: true,
          }),
          Animated.timing(logoY, {
            toValue: 0,
            duration: 480,
            easing: ENTRADA,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Secundário: nome chega depois do logo
      Animated.sequence([
        Animated.delay(220),
        Animated.parallel([
          Animated.timing(nomeOpacity, {
            toValue: 1,
            duration: 420,
            easing: ENTRADA,
            useNativeDriver: true,
          }),
          Animated.timing(nomeY, {
            toValue: 0,
            duration: 420,
            easing: ENTRADA,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start()

    const timeoutSaida = setTimeout(sair, 1250)
    return () => {
      clearTimeout(timeoutSeguro)
      clearTimeout(timeoutSaida)
    }
  }, [pronto])

  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        StyleSheet.absoluteFillObject,
        {
          zIndex: 100,
          elevation: 100,
          backgroundColor: consumerDesign.colors.canvas,
          opacity: overlayOpacity,
          transform: [{ scale: overlayScale }],
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: colors.accent, opacity: accentOpacity },
        ]}
      />

      <Animated.View
        style={{
          position: 'absolute',
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: colors.accentInk,
          opacity: discoOpacity.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.07],
          }),
          transform: [{ scale: discoScale }],
        }}
      />

      <Animated.View
        style={[
          {
            width: 108,
            height: 108,
            borderRadius: 30,
            backgroundColor: colors.surface,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: logoOpacity,
            transform: [{ translateY: logoY }, { scale: logoScale }],
          },
          consumerDesign.shadow.floating,
        ]}
      >
        {temLogo && logoUrl ? (
          <Animated.Image
            source={{ uri: logoUrl }}
            style={{ width: '100%', height: '100%', opacity: imagemOpacity }}
            resizeMode="cover"
            onLoad={() =>
              Animated.timing(imagemOpacity, {
                toValue: 1,
                duration: 260,
                easing: SUAVE,
                useNativeDriver: true,
              }).start()
            }
            onError={() => setTemLogo(false)}
          />
        ) : (
          <Text
            style={{
              fontSize: 48,
              color: colors.accent,
              fontWeight: '800',
              letterSpacing: -1,
            }}
          >
            {(nome || '?').charAt(0).toUpperCase()}
          </Text>
        )}
      </Animated.View>

      <Animated.Text
        numberOfLines={1}
        style={{
          marginTop: 22,
          maxWidth: '80%',
          fontSize: 20,
          color: colors.accentInk,
          letterSpacing: -0.3,
          opacity: nomeOpacity,
          transform: [{ translateY: nomeY }],
          ...fontStyle(design.display, 800),
        }}
      >
        {nome}
      </Animated.Text>
    </Animated.View>
  )
}
