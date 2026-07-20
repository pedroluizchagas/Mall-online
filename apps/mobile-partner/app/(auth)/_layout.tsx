import { Redirect, Stack } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuthStore } from '@/store/useAuthStore'
import { partnerDesign } from '@/lib/partner-design'

// Garante que `entrar` (login) seja sempre a rota base deste grupo — mesma
// decisão do courier para evitar "GO_BACK was not handled" com pilha vazia.
export const unstable_settings = { initialRouteName: 'entrar' }

export default function LayoutAuth() {
  const { user, carregando } = useAuthStore()
  const { colors } = partnerDesign

  if (carregando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceDark }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  if (user) {
    // Lojista logado — Stage 2 adiciona os gates (tenant/loja/billing) aqui.
    return <Redirect href="/(tabs)" />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
