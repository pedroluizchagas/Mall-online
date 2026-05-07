import '../global.css'
import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'
import { registrarPushToken, useNotificacaoListener } from '@/lib/notificacoes'
import { SplashAnimado } from '@/components/SplashAnimado'
import { consumerDesign } from '@/lib/consumer-design'

export default function LayoutRaiz() {
  const { setUser, setCarregando } = useAuthStore()
  const [splashVisivel, setSplashVisivel] = useState(true)
  const { colors } = consumerDesign

  useNotificacaoListener()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setCarregando(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        await registrarPushToken(session.user.id, null, 'consumer')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.canvas },
        }}
      />
      <StatusBar style="dark" />
      {splashVisivel && (
        <SplashAnimado onFim={() => setSplashVisivel(false)} />
      )}
    </GestureHandlerRootView>
  )
}
