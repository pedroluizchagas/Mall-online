import { Tabs, Redirect } from 'expo-router'
import { View, TouchableOpacity, ActivityIndicator } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { assinaturaPermiteOperar } from '@mallevo/lib'
import { useAuthStore } from '@/store/useAuthStore'
import { PartnerIcon } from '@/components/PartnerIcon'
import { TelaGate } from '@/components/TelaGate'
import { partnerDesign } from '@/lib/partner-design'

type TabIcon = 'home' | 'orders' | 'plus' | 'gallery' | 'menu'

// 5 tabs com "Publicar" central destacada (padrão Instagram/TikTok) —
// ver docs/partner-app/03-stage-1-scaffold.md.
const TABS: { name: string; icon: TabIcon; central?: boolean }[] = [
  { name: 'index',    icon: 'home'    },
  { name: 'pedidos',  icon: 'orders'  },
  { name: 'publicar', icon: 'plus', central: true },
  { name: 'conteudo', icon: 'gallery' },
  { name: 'menu',     icon: 'menu'    },
]

function TabBar({ state, navigation }: { state: any; navigation: any }) {
  const { colors, radius } = partnerDesign
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
            {tab.central ? (
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: radius.sm,
                  backgroundColor: colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PartnerIcon name={tab.icon} size={24} color={colors.ink} strokeWidth={2.4} />
              </View>
            ) : (
              <PartnerIcon
                name={tab.icon}
                size={22}
                color={isFocused ? colors.accent : '#6B6E75'}
                strokeWidth={isFocused ? 2.2 : 1.8}
              />
            )}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export default function LayoutTabs() {
  const { user, tenant, lojas, billingStatus, carregando } = useAuthStore()
  const { colors } = partnerDesign

  if (carregando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceDark }}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  if (!user) return <Redirect href="/(auth)/entrar" />

  // Gates (docs/partner-app/04-stage-2-auth-gate.md) — predicados em
  // @mallevo/lib, fluxos de resolução sempre no Dashboard web.
  if (!tenant) {
    return (
      <TelaGate
        titulo="Conta sem loja"
        descricao="Este login não tem um cadastro de lojista. Finalize o cadastro da sua loja no Dashboard para usar o app."
        ctaLabel="Finalizar cadastro"
        ctaCaminho="/onboarding"
      />
    )
  }

  if (!assinaturaPermiteOperar(billingStatus)) {
    return (
      <TelaGate
        titulo="Assinatura cancelada"
        descricao="Sua assinatura foi cancelada e o acesso está suspenso. Reative no Dashboard para voltar a operar."
        ctaLabel="Reativar assinatura"
        ctaCaminho="/minha-conta?aba=assinatura"
      />
    )
  }

  if (lojas.length === 0) {
    return (
      <TelaGate
        titulo="Crie sua loja"
        descricao="Seu cadastro existe, mas ainda não há nenhuma loja ativa. Crie sua loja no Dashboard para começar."
        ctaLabel="Abrir o Dashboard"
        ctaCaminho="/"
      />
    )
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
        <Tabs.Screen name="index"    />
        <Tabs.Screen name="pedidos"  />
        <Tabs.Screen name="publicar" />
        <Tabs.Screen name="conteudo" />
        <Tabs.Screen name="menu"     />
      </Tabs>
    </>
  )
}
