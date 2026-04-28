import '../global.css'
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as SplashScreen from 'expo-splash-screen'
import LottieView from 'lottie-react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { registrarPushToken, useNotificacaoListener } from '@/lib/notificacoes'
import { courierDesign } from '@/lib/courier-design'

SplashScreen.preventAutoHideAsync()

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const LOTTIE_W = SCREEN_WIDTH * 0.72
const LOTTIE_H = LOTTIE_W * (1024 / 1280)

export default function LayoutRaiz() {
  const { setUser, setCourier, setCarregando } = useAuthStore()
  const [splashVisivel, setSplashVisivel] = useState(true)

  useNotificacaoListener()

  useEffect(() => {
    SplashScreen.hideAsync()
  }, [])

  useEffect(() => {
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        try {
          setUser(session?.user ?? null)
          if (session?.user) {
            await carregarCourier(session.user.id)
          }
        } catch (error) {
          console.error('Falha ao carregar sessao inicial do courier:', error)
          setCourier(null)
        } finally {
          setCarregando(false)
        }
      })
      .catch((error) => {
        console.error('Falha ao verificar sessao:', error)
        setCarregando(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          setUser(session?.user ?? null)
          if (session?.user) {
            await carregarCourier(session.user.id)
          } else {
            setCourier(null)
          }
        } catch (error) {
          console.error('Falha ao atualizar autenticacao do courier:', error)
          setCourier(null)
        } finally {
          setCarregando(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function carregarCourier(userId: string) {
    const { data } = await supabase
      .from('couriers')
      .select(
        'id, nome, telefone, foto_url, tipo, status, online, ' +
        'stripe_account_id, stripe_onboarding_ok, tenant_id'
      )
      .eq('user_id', userId)
      .single()

    if (data && !('message' in data)) {
      setCourier(data as any)
      await registrarPushToken(null, (data as any).id, 'courier')
    } else {
      setCourier(null)
    }
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      {splashVisivel && (
        <SplashAnimacao onConcluido={() => setSplashVisivel(false)} />
      )}
    </GestureHandlerRootView>
  )
}

function SplashAnimacao({ onConcluido }: { onConcluido: () => void }) {
  const { colors } = courierDesign
  const opacidade = useSharedValue(1)

  const estiloAnimado = useAnimatedStyle(() => ({
    opacity: opacidade.value,
  }))

  function handleAnimacaoFim() {
    opacidade.value = withTiming(0, { duration: 480 })
    setTimeout(onConcluido, 480)
  }

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: colors.surfaceDark }, estiloAnimado]}>
      <LottieView
        source={require('../assets/Food Courier.json')}
        autoPlay
        loop={false}
        onAnimationFinish={handleAnimacaoFim}
        style={{ width: LOTTIE_W, height: LOTTIE_H }}
        resizeMode="contain"
      />

      <View style={styles.branding}>
        <Text style={[styles.brandingTitulo, { color: colors.accent }]}>
          Mallora
        </Text>
        <Text style={[styles.brandingSubtitulo, { color: '#6B6E75' }]}>
          Entregas
        </Text>
      </View>

      <View style={[styles.indicador, { backgroundColor: colors.accentSoft }]}>
        <View style={[styles.indicadorBarra, { backgroundColor: colors.accent }]} />
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branding: {
    alignItems: 'center',
    marginTop: 20,
  },
  brandingTitulo: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  brandingSubtitulo: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 3,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  indicador: {
    position: 'absolute',
    bottom: 60,
    width: 48,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  indicadorBarra: {
    height: '100%',
    width: '100%',
    borderRadius: 2,
  },
})
