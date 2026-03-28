import { useEffect } from 'react'
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated'

interface Props {
  largura?: number | string
  altura?: number
  arredondado?: boolean
}

export function Skeleton({
  largura = '100%',
  altura = 16,
  arredondado = false,
}: Props) {
  const opacidade = useSharedValue(1)

  useEffect(() => {
    opacidade.value = withRepeat(withTiming(0.3, { duration: 800 }), -1, true)
  }, [])

  const estilo = useAnimatedStyle(() => ({
    opacity: opacidade.value,
  }))

  return (
    <Animated.View
      style={[
        estilo,
        {
          width: largura as number,
          height: altura,
          backgroundColor: '#E5E7EB',
          borderRadius: arredondado ? 999 : 8,
        },
      ]}
    />
  )
}
