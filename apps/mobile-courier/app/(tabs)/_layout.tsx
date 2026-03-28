import { Tabs, Redirect } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuthStore } from '@/store/useAuthStore'

export default function LayoutTabs() {
  const { user, courier, carregando } = useAuthStore()

  if (carregando) {
    return (
      <View className="flex-1 items-center justify-center bg-[#1A4D3A]">
        <ActivityIndicator color="#4CAF82" />
      </View>
    )
  }

  if (!user || !courier) return <Redirect href="/(auth)/entrar" />
  if (courier.status === 'pendente') return <Redirect href="/aguardando-aprovacao" />
  if (courier.status === 'aprovado' && !courier.stripe_onboarding_ok && courier.tipo === 'autonomo') {
    return <Redirect href="/stripe-onboarding" />
  }
  if (['reprovado', 'suspenso'].includes(courier.status)) {
    return <Redirect href="/(auth)/entrar" />
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4CAF82',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#1A4D3A',
          borderTopColor: '#163d2e',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Entregas' }}
      />
      <Tabs.Screen
        name="ativa"
        options={{ title: 'Em rota' }}
      />
      <Tabs.Screen
        name="ganhos"
        options={{ title: 'Ganhos' }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil' }}
      />
    </Tabs>
  )
}
