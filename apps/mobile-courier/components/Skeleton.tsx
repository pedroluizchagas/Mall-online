import { useEffect, useRef } from 'react'
import { Animated, View } from 'react-native'

interface Props {
  largura: number | `${number}%`
  altura: number
  borderRadius?: number
}

export function Skeleton({ largura, altura, borderRadius = 12 }: Props) {
  const opacidade = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacidade, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacidade, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [opacidade])

  return (
    <Animated.View
      style={{
        width: largura,
        height: altura,
        borderRadius,
        backgroundColor: '#E5E7EB',
        opacity: opacidade,
      }}
    />
  )
}
