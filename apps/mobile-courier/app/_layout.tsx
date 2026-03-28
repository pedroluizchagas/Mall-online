import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { registrarPushToken, useNotificacaoListener } from '@/lib/notificacoes'

export default function LayoutRaiz() {
  const { setUser, setCourier, setCarregando } = useAuthStore()

  useNotificacaoListener()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        await carregarCourier(session.user.id)
      }

      setCarregando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await carregarCourier(session.user.id)
        } else {
          setCourier(null)
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

    setCourier(data ?? null)

    if (data) {
      await registrarPushToken(null, data.id, 'courier')
    }
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="aguardando-aprovacao" />
        <Stack.Screen name="stripe-onboarding" />
        <Stack.Screen
          name="entrega/[id]"
          options={{ presentation: 'card' }}
        />
      </Stack>
    </GestureHandlerRootView>
  )
}
