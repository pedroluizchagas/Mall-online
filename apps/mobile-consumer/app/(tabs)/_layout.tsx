import { Tabs, Redirect } from 'expo-router'
import { View, TouchableOpacity, ActivityIndicator } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '@/store/useAuthStore'
import { ConsumerIcon, ConsumerIconName } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'

const TABS: { name: string; icon: ConsumerIconName }[] = [
  { name: 'index', icon: 'home' },
  { name: 'explorar', icon: 'reels' },
  { name: 'pedidos', icon: 'orders' },
  { name: 'perfil', icon: 'user' },
]

interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] }
  navigation: {
    emit: (event: {
      type: string
      target: string
      canPreventDefault: boolean
    }) => { defaultPrevented: boolean }
    navigate: (name: string) => void
  }
}

function TabBar({ state, navigation }: TabBarProps) {
  const { colors, radius, shadow } = consumerDesign
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        {
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
        },
        shadow.floating,
      ]}
    >
      {TABS.map((tab, index) => {
        const focused = state.index === index
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
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name)
              }
            }}
            activeOpacity={0.7}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <ConsumerIcon
              name={tab.icon}
              size={22}
              color={focused ? colors.accent : '#6B6E75'}
              strokeWidth={focused ? 2.2 : 1.8}
            />
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export default function LayoutTabs() {
  const { user, carregando } = useAuthStore()
  const { colors } = consumerDesign

  if (carregando) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.canvas,
        }}
      >
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.ink} />
      </View>
    )
  }

  if (!user) {
    return <Redirect href="/(auth)/boas-vindas" />
  }

  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        tabBar={(props) => <TabBar {...(props as unknown as TabBarProps)} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Início' }} />
        <Tabs.Screen name="explorar" options={{ title: 'Explorar' }} />
        <Tabs.Screen name="pedidos" options={{ title: 'Pedidos' }} />
        <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
        {/* buscar permanece acessível via router.push mas não aparece na tab bar */}
        <Tabs.Screen name="buscar" options={{ href: null }} />
      </Tabs>
    </>
  )
}
