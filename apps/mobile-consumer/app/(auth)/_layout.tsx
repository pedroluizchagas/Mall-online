import { Redirect, Stack } from 'expo-router'
import { useAuthStore } from '@/store/useAuthStore'
import { LoadingState } from '@/components/ui/LoadingState'
import { consumerDesign } from '@/lib/consumer-design'

export default function LayoutAuth() {
  const { user, carregando } = useAuthStore()
  const { colors } = consumerDesign

  if (carregando) {
    return <LoadingState modo="tela" variante="escuro" />
  }

  if (user) {
    return <Redirect href="/(tabs)" />
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surfaceDark },
      }}
    />
  )
}
