import { Redirect, Stack } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuthStore } from '@/store/useAuthStore'
import { courierDesign } from '@/lib/courier-design'

export default function LayoutAuth() {
  const { user, courier, carregando } = useAuthStore()
  const { colors } = courierDesign

  if (carregando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceDark }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  if (user && courier) {
    // Entregador logado — verificar status e redirecionar
    if (courier.status === 'pendente') {
      return <Redirect href="/aguardando-aprovacao" />
    }
    if (courier.status === 'aprovado') {
      return <Redirect href="/(tabs)" />
    }
  }

  // user && !courier: usuário está no fluxo de cadastro — não redirecionar,
  // pois /(auth)/cadastro já está dentro deste grupo e causaria loop.
  // O index.tsx raiz trata esse caso ao abrir o app.
  return <Stack screenOptions={{ headerShown: false }} />
}
