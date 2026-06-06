import '../global.css'
import { useEffect, useRef, useState } from 'react'
import { StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as SplashScreen from 'expo-splash-screen'
import { useVideoPlayer, VideoView } from 'expo-video'
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

// Splash mudo por padrão: tocar áudio a cada abertura do app é intrusivo.
// Trocar para false caso a trilha do vídeo deva ser ouvida no boot.
const MUDO = true

export default function LayoutRaiz() {
  const { setUser, setCourier, setCarregando } = useAuthStore()
  const [splashVisivel, setSplashVisivel] = useState(true)

  useNotificacaoListener()

  useEffect(() => {
    SplashScreen.hideAsync()
  }, [])

  useEffect(() => {
    // Via única de resolução de sessão. No supabase-js v2, onAuthStateChange
    // dispara INITIAL_SESSION com a sessão atual logo na inscrição, cobrindo o
    // boot. Não usar getSession() em paralelo: duas vias liberariam `carregando`
    // em momentos diferentes (uma com courier ainda null), causando um redirect
    // transitório /(auth)/cadastro -> /(tabs) e o aviso "GO_BACK not handled".
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
        'pagarme_recipient_id, pagarme_onboarding_status, tenant_id, veiculo_tipo, veiculo_placa'
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
  const fechado = useRef(false)

  const estiloAnimado = useAnimatedStyle(() => ({
    opacity: opacidade.value,
  }))

  const player = useVideoPlayer(
    require('../assets/mallevo-copa.mp4'),
    (p) => {
      p.loop = false
      p.muted = MUDO
      p.play()
    },
  )

  useEffect(() => {
    function handleAnimacaoFim() {
      if (fechado.current) return
      fechado.current = true
      opacidade.value = withTiming(0, { duration: 480 })
      setTimeout(onConcluido, 480)
    }

    const sub = player.addListener('playToEnd', handleAnimacaoFim)
    // Salvaguarda: se o evento de fim não disparar, não travar o app no splash.
    const timeout = setTimeout(handleAnimacaoFim, 10000)
    return () => {
      sub.remove()
      clearTimeout(timeout)
    }
  }, [])

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: colors.splash }, estiloAnimado]}>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
