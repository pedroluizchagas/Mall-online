import { useEffect, useRef } from 'react'
import { Animated } from 'react-native'
import { courierDesign } from '@/lib/courier-design'

interface Props {
  largura: number | `${number}%`
  altura: number
  borderRadius?: number
}

export function Skeleton({ largura, altura, borderRadius = 14 }: Props) {
  const { colors } = courierDesign
  const opacidade = useRef(new Animated.Value(0.5)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacidade, { toValue: 1,   duration: 650, useNativeDriver: true }),
        Animated.timing(opacidade, { toValue: 0.5, duration: 650, useNativeDriver: true }),
      ])
    ).start()
  }, [opacidade])

  return (
    <Animated.View
      style={{
        width: largura,
        height: altura,
        borderRadius,
        backgroundColor: colors.canvasAlt,
        opacity: opacidade,
      }}
    />
  )
}
