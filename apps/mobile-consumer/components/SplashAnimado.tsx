import { useRef } from 'react'
import { Animated, StyleSheet } from 'react-native'
import LottieView from 'lottie-react-native'

interface Props {
  onFim: () => void
}

export function SplashAnimado({ onFim }: Props) {
  const opacidade = useRef(new Animated.Value(1)).current

  function handleAnimacaoFim() {
    Animated.timing(opacidade, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(onFim)
  }

  return (
    <Animated.View style={[styles.container, { opacity: opacidade }]}>
      <LottieView
        source={require('../assets/shopping cart.json')}
        autoPlay
        loop={false}
        onAnimationFinish={handleAnimacaoFim}
        style={styles.animacao}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F4F0EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animacao: {
    width: 240,
    height: 240,
  },
})
