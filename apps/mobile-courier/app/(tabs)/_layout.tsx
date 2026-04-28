import { Tabs, Redirect } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useAuthStore } from '@/store/useAuthStore'
import { CourierIcon } from '@/components/CourierIcon'
import { courierDesign } from '@/lib/courier-design'

export default function LayoutTabs() {
  const { user, courier, carregando } = useAuthStore()
  const { colors, radius } = courierDesign

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
  if (courier.status === 'aprovado' && !courier.stripe_onboarding_ok && courier.tipo === 'autonomo') {
    return <Redirect href="/stripe-onboarding" />
  }
  if (['reprovado', 'suspenso'].includes(courier.status)) {
    return <Redirect href="/(auth)/entrar" />
  }

  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.canvas },
          tabBarActiveTintColor: colors.ink,
          tabBarInactiveTintColor: '#B9BCC2',
          tabBarShowLabel: true,
          tabBarStyle: {
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 16,
            height: 74,
            paddingHorizontal: 8,
            paddingTop: 10,
            paddingBottom: 12,
            backgroundColor: colors.ink,
            borderTopWidth: 0,
            borderRadius: radius.lg,
            elevation: 0,
          },
          tabBarItemStyle: {
            borderRadius: radius.pill,
            marginHorizontal: 4,
          },
          tabBarActiveBackgroundColor: colors.accent,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <CourierIcon
                name="home"
                size={20}
                color={focused ? colors.ink : color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="ativa"
          options={{
            title: 'Rota',
            tabBarIcon: ({ color, focused }) => (
              <CourierIcon
                name="route"
                size={20}
                color={focused ? colors.ink : color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="ganhos"
          options={{
            title: 'Ganhos',
            tabBarIcon: ({ color, focused }) => (
              <CourierIcon
                name="wallet"
                size={20}
                color={focused ? colors.ink : color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, focused }) => (
              <CourierIcon
                name="user"
                size={20}
                color={focused ? colors.ink : color}
              />
            ),
          }}
        />
      </Tabs>
    </>
  )
}
