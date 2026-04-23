import '../global.css'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'
import { registrarPushToken, useNotificacaoListener } from '@/lib/notificacoes'

export default function LayoutRaiz() {
  const { setUser, setCarregando } = useAuthStore()

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  )
}
