import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuthStore } from '@/store/useAuthStore'
import { partnerDesign } from '@/lib/partner-design'

export default function TelaInicial() {
  const { user, carregando } = useAuthStore()
  const { colors } = partnerDesign

  if (carregando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.splash }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  if (!user) {
    return <Redirect href="/(auth)/entrar" />
  }

  // Stage 2: telas de gate (sem tenant / gate reprovado / sem loja) entram aqui.
  return <Redirect href="/(tabs)" />
}
