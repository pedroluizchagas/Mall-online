import { useEffect, useRef } from 'react'
import { Animated, StyleSheet } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { consumerDesign } from '@/lib/consumer-design'

interface Props {
  onFim: () => void
}

// Splash mudo por padrão: tocar áudio a cada abertura do app é intrusivo.
// Trocar para false caso a trilha do vídeo deva ser ouvida no boot.
const MUDO = true

export function SplashAnimado({ onFim }: Props) {
  const opacidade = useRef(new Animated.Value(1)).current
  const fechado = useRef(false)
  const { colors } = consumerDesign

  const player = useVideoPlayer(
    require('../assets/mallevo-copa.mp4'),
    (p) => {
      p.loop = false
      p.muted = MUDO
      p.play()
    },
  )

  useEffect(() => {
    function handleVideoFim() {
      if (fechado.current) return
      fechado.current = true
      Animated.timing(opacidade, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(onFim)
    }

    const sub = player.addListener('playToEnd', handleVideoFim)
    // Salvaguarda: se o evento de fim não disparar, não travar o app no splash.
    const timeout = setTimeout(handleVideoFim, 10000)
    return () => {
      sub.remove()
      clearTimeout(timeout)
    }
  }, [])

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: opacidade, backgroundColor: colors.ink },
      ]}
    >
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
