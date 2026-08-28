import '../global.css'
import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'
import { registrarPushToken, useNotificacaoListener } from '@/lib/notificacoes'
import { garantirConsumer } from '@/lib/perfil'
import { SplashAnimado } from '@/components/SplashAnimado'
import { TransicaoMallevo } from '@/components/TransicaoMallevo'
import { consumerDesign } from '@/lib/consumer-design'

export default function LayoutRaiz() {
  const { setUser, setCarregando, limpar: limparAuth } = useAuthStore()
  const [splashVisivel, setSplashVisivel] = useState(true)
  const { colors } = consumerDesign

  useNotificacaoListener()

  useEffect(() => {
    // Via única de resolução de sessão. No supabase-js v2, onAuthStateChange
    // dispara INITIAL_SESSION com a sessão atual logo na inscrição, cobrindo o
    // boot. Não usar getSession() em paralelo: a segunda via não tem catch e,
    // quando o refresh token persistido está inválido (Invalid Refresh Token),
    // `setCarregando(false)` pode nunca rodar e o app trava no splash.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setUser(session?.user ?? null)
        if (session?.user) {
          // Cria a linha em `consumers` se ainda não existir e hidrata o
          // store. Sem isso, o checkout falha lá na frente ("Consumidor não
          // encontrado") e a saudação da Home nasce sem nome. Antes do push
          // porque é o dado que a UI espera.
          await garantirConsumer(session.user)
          await registrarPushToken(session.user.id, null, 'consumer')
        } else {
          // Logout (ou sessão expirada): o perfil do usuário anterior não
          // pode sobreviver ao próximo login.
          limparAuth()
        }
      } catch (error) {
        console.error('Falha ao atualizar autenticacao do consumer:', error)
      } finally {
        setCarregando(false)
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
      >
        {/*
         * `presentation` é prop de montagem do native-stack: alterá-la em
         * runtime força remontar a tela. Por isso o modal do checkout é
         * declarado aqui, estático — declarar via <Stack.Screen> dentro da
         * própria tela criava um loop de remontagem (abre cartão → pix → repete).
         */}
        <Stack.Screen name="checkout" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="checkout/pix"
          options={{ presentation: 'modal' }}
        />
      </Stack>
      <StatusBar style="dark" />
      {/* Véu de saída de loja (acima do navigator, abaixo do splash de boot) */}
      <TransicaoMallevo />
      {splashVisivel && (
        <SplashAnimado onFim={() => setSplashVisivel(false)} />
      )}
    </GestureHandlerRootView>
  )
}
