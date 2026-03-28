import { Redirect, Stack } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuthStore } from '@/store/useAuthStore'

export default function LayoutAuth() {
  const { user, courier, carregando } = useAuthStore()

  if (carregando) {
    return (
      <View className="flex-1 items-center justify-center bg-[#1A4D3A]">
        <ActivityIndicator color="#4CAF82" />
      </View>
    )
  }

  if (user && courier) {
    // Entregador logado — verificar status e redirecionar
    if (courier.status === 'pendente') {
      return <Redirect href="/aguardando-aprovacao" />
    }
    if (courier.status === 'aprovado') {
      if (!courier.stripe_onboarding_ok && courier.tipo === 'autonomo') {
        return <Redirect href="/stripe-onboarding" />
      }
      return <Redirect href="/(tabs)" />
    }
  }

  if (user && !courier) {
    // Usuário logado mas sem cadastro de courier — ir para cadastro
    return <Redirect href="/(auth)/cadastro" />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
