import { Redirect } from 'expo-router'
import { Tabs } from 'expo-router'
import { useAuthStore } from '@/store/useAuthStore'
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Home,
  Clapperboard,
  ClipboardList,
  User,
} from 'lucide-react-native'

const TABS = [
  { name: 'index',    label: 'Início',   Icon: Home },
  { name: 'explorar', label: 'Explorar', Icon: Clapperboard },
  { name: 'pedidos',  label: 'Pedidos',  Icon: ClipboardList },
  { name: 'perfil',   label: 'Perfil',   Icon: User },
]

interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] }
  navigation: { navigate: (name: string) => void }
  descriptors: Record<string, unknown>
}

function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(26,26,23,0.07)',
        paddingBottom: insets.bottom || 16,
        paddingTop: 2,
      }}
    >
      {TABS.map((tab, index) => {
        const active = state.index === index
        const { Icon } = tab

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => navigation.navigate(tab.name)}
            activeOpacity={0.7}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingTop: 10,
              paddingBottom: 4,
              position: 'relative',
            }}
          >
            {/* Indicador superior */}
            {active && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  width: 28,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: '#1A4D3A',
                }}
              />
            )}

            {/* Ícone com fundo ativo */}
            <View
              style={{
                width: 40,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active
                  ? 'rgba(26,77,58,0.08)'
                  : 'transparent',
              }}
            >
              <Icon
                size={20}
                color={active ? '#1A4D3A' : '#B0B0A5'}
                strokeWidth={active ? 2.2 : 1.8}
              />
            </View>

            <Text
              style={{
                fontSize: 10,
                fontWeight: active ? '700' : '500',
                color: active ? '#1A4D3A' : '#B0B0A5',
                marginTop: 3,
                letterSpacing: 0.1,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export default function LayoutTabs() {
  const { user, carregando } = useAuthStore()

  if (carregando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F0EB' }}>
        <ActivityIndicator color="#1A4D3A" />
      </View>
    )
  }

  if (!user) {
    return <Redirect href="/(auth)/boas-vindas" />
  }

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Início' }} />
      <Tabs.Screen name="explorar" options={{ title: 'Explorar' }} />
      <Tabs.Screen name="pedidos"  options={{ title: 'Pedidos' }} />
      <Tabs.Screen name="perfil"   options={{ title: 'Perfil' }} />
      {/* buscar permanece acessível via router.push mas não aparece na tab bar */}
      <Tabs.Screen name="buscar"   options={{ href: null }} />
    </Tabs>
  )
}
