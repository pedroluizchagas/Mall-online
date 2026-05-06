import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuthStore } from '@/store/useAuthStore'
import { courierDesign } from '@/lib/courier-design'

export default function TelaInicial() {
  const { user, courier, carregando } = useAuthStore()
  const { colors } = courierDesign

  if (carregando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceDark }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  if (!user) {
    return <Redirect href="/(auth)/entrar" />
  }

  if (!courier) {
    return <Redirect href="/(auth)/cadastro" />
  }

  if (courier.status === 'pendente') {
    return <Redirect href="/aguardando-aprovacao" />
  }

  if (['reprovado', 'suspenso'].includes(courier.status)) {
    return <Redirect href="/(auth)/entrar" />
  }

  return <Redirect href="/(tabs)" />
}
