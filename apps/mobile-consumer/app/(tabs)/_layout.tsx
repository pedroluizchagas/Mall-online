import { Tabs, Redirect } from 'expo-router'
import { useAuthStore } from '@/store/useAuthStore'
import { View, ActivityIndicator } from 'react-native'
import { Home, Search, ShoppingBag, User } from 'lucide-react-native'

export default function LayoutTabs() {
  const { user, carregando } = useAuthStore()

  if (carregando) {
    return (
      <View className="flex-1 items-center justify-center bg-creme">
        <ActivityIndicator color="#1A4D3A" />
      </View>
    )
  }

  if (!user) {
    return <Redirect href="/(auth)/boas-vindas" />
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1A4D3A',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F3F4F6',
          paddingBottom: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="buscar"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: 'Pedidos',
          tabBarIcon: ({ color, size }) => (
            <ShoppingBag size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
