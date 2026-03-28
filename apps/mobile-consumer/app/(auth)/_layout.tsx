import { Redirect, Stack } from 'expo-router'
import { useAuthStore } from '@/store/useAuthStore'
import { View, ActivityIndicator } from 'react-native'

export default function LayoutAuth() {
  const { user, carregando } = useAuthStore()

  if (carregando) {
    return (
      <View className="flex-1 items-center justify-center bg-creme">
        <ActivityIndicator color="#1A4D3A" />
      </View>
    )
  }

  if (user) {
    return <Redirect href="/(tabs)" />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
