import { Tabs, Redirect } from 'expo-router'
import { View, Text, TouchableOpacity } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { assinaturaPermiteOperar } from '@mallevo/lib'
import { useAuthStore } from '@/store/useAuthStore'
import { usePedidosStore, contarNovos } from '@/store/usePedidosStore'
import { usePedidosRealtime } from '@/lib/pedidos-realtime'
import { PartnerIcon, type PartnerIconName } from '@/components/PartnerIcon'
import { TelaGate } from '@/components/TelaGate'
import { LoadingState } from '@/components/ui/LoadingState'
import { partnerDesign } from '@/lib/partner-design'

/**
 * Shell das tabs — a cápsula de vidro escuro do consumer (ink translúcido
 * + fio de luz, radius pill, flutuando 16px das bordas), com a régua do
 * lojista: 5 slots e o "Publicar" central aceso em accent
 * (docs/partner-app/03-stage-1-scaffold.md). Sem labels: o ícone é o
 * label. Badge de pedidos novos no ombro do ícone de Pedidos.
 *
 * Spec: docs/system-design/consumer/05-shell-app.md §1 (port) e
 * docs/system-design/partner/00-sistema.md §6.
 */

const TABS: { name: string; icon: PartnerIconName; rotulo: string; central?: boolean }[] = [
  { name: 'index', icon: 'home', rotulo: 'Início' },
  { name: 'pedidos', icon: 'orders', rotulo: 'Pedidos' },
  { name: 'publicar', icon: 'plus', rotulo: 'Publicar', central: true },
  { name: 'conteudo', icon: 'gallery', rotulo: 'Conteúdo' },
  { name: 'menu', icon: 'menu', rotulo: 'Menu' },
]

/** Cinza do ícone inativo sobre `inkGlass` — o mesmo tom literal do consumer. */
const COR_INATIVA = '#6B6E75'

interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] }
  navigation: {
    emit: (event: { type: string; target: string; canPreventDefault: boolean }) => {
      defaultPrevented: boolean
    }
    navigate: (name: string) => void
  }
}

function TabBar({ state, navigation }: TabBarProps) {
  const { colors, radius, shadow } = partnerDesign
  const insets = useSafeAreaInsets()
  const novos = usePedidosStore((s) => contarNovos(s.pedidos))
  const rotaAtual = state.routes[state.index]?.name ?? 'index'

  /** Navega por NOME, nunca por índice (rotas ocultas não desalinham). */
  function irPara(nome: string) {
    const rota = state.routes.find((r) => r.name === nome)
    if (!rota) return
    const evento = navigation.emit({
      type: 'tabPress',
      target: rota.key,
      canPreventDefault: true,
    })
    if (rota.name !== rotaAtual && !evento.defaultPrevented) {
      navigation.navigate(rota.name)
    }
  }

  return (
    <View
      style={[
        {
          position: 'absolute',
          left: 16,
          right: 16,
          // Pé da cápsula ecoa o vão lateral (16); em aparelhos com gesture
          // nav fica DENTRO da safe area (inset 34 → pé 18), sem colisão.
          bottom: Math.max(insets.bottom - 16, 16),
          height: 70,
          backgroundColor: colors.inkGlass,
          borderWidth: 1,
          borderColor: colors.marqueeLine,
          borderRadius: radius.pill,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
        },
        shadow.floating,
      ]}
    >
      {TABS.map((tab) => {
        const focused = rotaAtual === tab.name
        const cor = focused ? colors.accent : COR_INATIVA

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => irPara(tab.name)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={
              tab.name === 'pedidos' && novos > 0
                ? `${tab.rotulo}, ${novos} novos`
                : tab.rotulo
            }
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            {tab.central ? (
              // Publicar: a única moeda cheia da barra — accent sólido,
              // ícone ink. Quando é a rota atual, o fio accentRing marca.
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: focused ? 3 : 0,
                  borderColor: colors.accentRing,
                }}
              >
                <PartnerIcon name={tab.icon} size={22} color={colors.ink} strokeWidth={2.4} />
              </View>
            ) : (
              <View>
                <PartnerIcon
                  name={tab.icon}
                  size={22}
                  color={cor}
                  strokeWidth={focused ? 2.2 : 1.8}
                />
                {tab.name === 'pedidos' && novos > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -7,
                      right: -11,
                      minWidth: 17,
                      height: 17,
                      borderRadius: radius.pill,
                      backgroundColor: colors.accent,
                      borderWidth: 1.5,
                      borderColor: colors.ink,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text style={{ color: colors.ink, fontSize: 9.5, fontWeight: '800' }}>
                      {novos > 9 ? '9+' : novos}
                    </Text>
                  </View>
                )}
              </View>
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

  // Assinatura Realtime + som de pedido novo — montada uma única vez aqui;
  // o hook é no-op enquanto não há tenant (gates abaixo).
  usePedidosRealtime()

  if (carregando) {
    return (
      <>
        <StatusBar style="light" />
        <LoadingState modo="tela" variante="escuro" />
      </>
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
        tabBar={(props) => <TabBar {...(props as unknown as TabBarProps)} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Início' }} />
        <Tabs.Screen name="pedidos" options={{ title: 'Pedidos' }} />
        <Tabs.Screen name="publicar" options={{ title: 'Publicar' }} />
        <Tabs.Screen name="conteudo" options={{ title: 'Conteúdo' }} />
        <Tabs.Screen name="menu" options={{ title: 'Menu' }} />
      </Tabs>
    </>
  )
}
