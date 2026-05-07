import { useEffect, useRef } from 'react'
import { Animated } from 'react-native'
import { consumerDesign } from '@/lib/consumer-design'

/**
 * Placeholder pulsante para loading.
 *
 * Spec: docs/system-design/consumer/03-componentes-base.md §6
 */

const { colors, motion } = consumerDesign

interface SkeletonProps {
  largura: number | `${number}%`
  altura: number
  /** Default 14 (radius.sm). */
  raio?: number
}

export function Skeleton({ largura, altura, raio = 14 }: SkeletonProps) {
  const opacidade = useRef(new Animated.Value(0.5)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacidade, {
          toValue: 1,
          duration: motion.pulse / 2,
          useNativeDriver: true,
        }),
        Animated.timing(opacidade, {
          toValue: 0.5,
          duration: motion.pulse / 2,
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
        borderRadius: raio,
        backgroundColor: colors.canvasAlt,
        opacity: opacidade,
      }}
    />
  )
}
