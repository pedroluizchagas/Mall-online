import { useEffect, useRef } from 'react'
import { Animated } from 'react-native'

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
  const opacidade = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacidade, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(opacidade, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  return (
    <Animated.View
      style={[
        { opacity: opacidade },
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
