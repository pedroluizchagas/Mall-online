import '../global.css'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StripeProvider } from '@stripe/stripe-react-native'
import { STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'
import { registrarPushToken, useNotificacaoListener } from '@/lib/notificacoes'

export default function LayoutRaiz() {
  const { setUser, setCarregando } = useAuthStore()

  useNotificacaoListener()

  useEffect(() => {
    // Verificar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setCarregando(false)
    })

    // Escutar mudanças de auth
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
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="loja/[slug]"
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="checkout"
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="pedido/[id]"
            options={{ presentation: 'card' }}
          />
        </Stack>
      </StripeProvider>
    </GestureHandlerRootView>
  )
}
