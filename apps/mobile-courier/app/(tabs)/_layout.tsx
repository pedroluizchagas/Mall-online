import { Tabs, Redirect } from 'expo-router'
import { View, TouchableOpacity, ActivityIndicator } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '@/store/useAuthStore'
import { CourierIcon } from '@/components/CourierIcon'
import { courierDesign } from '@/lib/courier-design'

type TabIcon = 'home' | 'route' | 'wallet' | 'user'

const TABS: { name: string; icon: TabIcon }[] = [
  { name: 'index',  icon: 'home'   },
  { name: 'ativa',  icon: 'route'  },
  { name: 'ganhos', icon: 'wallet' },
  { name: 'perfil', icon: 'user'   },
]

function TabBar({ state, navigation }: { state: any; navigation: any }) {
  const { colors, radius } = courierDesign
  const insets = useSafeAreaInsets()

  return (
    <View
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: Math.max(insets.bottom, 12) + 4,
        height: 68,
        backgroundColor: colors.ink,
        borderRadius: radius.xl,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
      }}
    >
      {TABS.map((tab, index) => {
        const isFocused = state.index === index
        const route = state.routes[index]

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              })
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name)
              }
            }}
            activeOpacity={0.7}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <CourierIcon
              name={tab.icon}
              size={22}
              color={isFocused ? colors.accent : '#6B6E75'}
              strokeWidth={isFocused ? 2.2 : 1.8}
            />
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export default function LayoutTabs() {
  const { user, courier, carregando } = useAuthStore()
  const { colors } = courierDesign

  if (carregando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceDark }}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  if (!user || !courier) return <Redirect href="/(auth)/entrar" />
  if (courier.status === 'pendente') return <Redirect href="/aguardando-aprovacao" />
  if (['reprovado', 'suspenso'].includes(courier.status)) {
    return <Redirect href="/(auth)/entrar" />
  }

  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Tabs.Screen name="index"  />
        <Tabs.Screen name="ativa"  />
        <Tabs.Screen name="ganhos" />
        <Tabs.Screen name="perfil" />
      </Tabs>
    </>
  )
}
