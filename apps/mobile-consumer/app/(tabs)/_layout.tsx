import { useEffect, useRef, useState } from 'react'
import { Tabs, Redirect } from 'expo-router'
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '@/store/useAuthStore'
import { useImersao } from '@/store/useImersao'
import { ConsumerIcon, ConsumerIconName } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'

const TABS: { name: string; icon: ConsumerIconName; rotulo: string }[] = [
  { name: 'index', icon: 'home', rotulo: 'Início' },
  { name: 'explorar', icon: 'reels', rotulo: 'Explorar' },
  { name: 'pedidos', icon: 'orders', rotulo: 'Pedidos' },
  { name: 'perfil', icon: 'user', rotulo: 'Perfil' },
]

// Saída um pouco mais curta que a volta: some rápido, volta assentando.
const DUR_SAIDA = consumerDesign.motion.base
const DUR_VOLTA = 260
const DESLOC_Y = 14

/**
 * Slots que alternam com uma rota irmã sem botão próprio: 1 toque vai,
 * 1 toque volta, 2 toques seguidos sempre terminam na tab base.
 *
 * Duas telas de coleção pessoal (Seguindo e Favoritos) não cabiam na barra
 * — ela tem quatro slots e ganhar um quinto e um sexto quebraria a régua
 * do shell. Cada uma pendura na tab de que é vizinha semântica: Seguindo é
 * outro jeito de ver o shopping (Início); Favoritos é outra coisa que você
 * guardou (Pedidos).
 */
const ATALHOS: Record<string, { rota: string; icone: ConsumerIconName; rotulo: string }> = {
  index: { rota: 'seguindo', icone: 'users', rotulo: 'Seguindo' },
  pedidos: { rota: 'favoritos', icone: 'heart', rotulo: 'Favoritos' },
}

/**
 * Janela do toque duplo. Curta o bastante para não capturar dois toques com
 * intenção separada, longa o bastante para o polegar.
 */
const JANELA_TOQUE_DUPLO = 320

/** Cinza do ícone inativo sobre `ink` — já era o tom literal desta barra. */
const COR_INATIVA = '#6B6E75'

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
  const imersivo = useImersao((s) => s.imersivo)

  // Modo imersivo do Explorar: a barra desce e apaga; na volta sobe e acende.
  // Um valor só (1 = visível, 0 = oculta) — a ida é a volta espelhada, com a
  // curva invertida: sai acelerando (in) e entra desacelerando (out).
  const visivel = useRef(new Animated.Value(1)).current
  const [oculta, setOculta] = useState(false)
  const montado = useRef(false)

  useEffect(() => {
    // Sem animação no primeiro render — a barra já nasce visível.
    if (!montado.current) {
      montado.current = true
      if (!imersivo) return
    }

    if (!imersivo) setOculta(false)

    Animated.timing(visivel, {
      toValue: imersivo ? 0 : 1,
      duration: imersivo ? DUR_SAIDA : DUR_VOLTA,
      easing: imersivo ? Easing.in(Easing.cubic) : Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && imersivo) setOculta(true)
    })
  }, [imersivo])

  const deslocY = visivel.interpolate({
    inputRange: [0, 1],
    outputRange: [DESLOC_Y, 0],
  })

  // ── Atalhos (Início ⇄ Seguindo, Pedidos ⇄ Favoritos) ──
  // As rotas irmãs vivem em (tabs) sem botão próprio (href: null): quem as
  // alcança é o slot da tab base.
  const rotaAtual = state.routes[state.index]?.name ?? 'index'
  const ultimoToque = useRef<Record<string, number>>({})

  /**
   * Navega por NOME (não por índice): a lista de rotas inclui as telas sem
   * botão (`seguindo`, `favoritos`), então posição em `state.routes` não
   * corresponde à posição em `TABS`.
   */
  function irPara(nome: string, mesmoSeFocada = false) {
    const rota = state.routes.find((r) => r.name === nome)
    if (!rota) return

    const evento = navigation.emit({
      type: 'tabPress',
      target: rota.key,
      canPreventDefault: true,
    })
    const focada = rota.name === rotaAtual
    if ((mesmoSeFocada || !focada) && !evento.defaultPrevented) {
      navigation.navigate(rota.name)
    }
  }

  function aoTocarAtalho(base: string, irma: string) {
    const agora = Date.now()
    const duplo = agora - (ultimoToque.current[base] ?? 0) < JANELA_TOQUE_DUPLO
    ultimoToque.current[base] = agora

    // Sem a guarda de "já focada": no toque duplo o segundo toque pode chegar
    // antes de `state` refletir o primeiro, e a volta à base não pode falhar.
    irPara(duplo || rotaAtual !== base ? base : irma, true)
  }

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 16,
          right: 16,
          // Pé da cápsula: um pouco DENTRO da safe area (inset - 8), não
          // acima dela — em iPhone com inset 34 (12/14/15 Pro Max etc.) o
          // `inset + 4` antigo deixava a barra alta demais e o topo dela
          // passava da reserva `spacing.tabBarHeight`, cobrindo o fim das
          // listas. O indicador de home ocupa só os ~13px finais; 26px de
          // pé não colidem. Piso de 12 preserva aparelhos sem inset.
          bottom: Math.max(insets.bottom - 8, 12),
          height: 70,
          // Cápsula de vidro escuro: ink translúcido + fio de luz na borda —
          // o conteúdo passa por baixo e a barra "flutua" de verdade.
          backgroundColor: colors.inkGlass,
          borderWidth: 1,
          borderColor: colors.marqueeLine,
          borderRadius: radius.pill,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          opacity: visivel,
          transform: [{ translateY: deslocY }],
        },
        shadow.floating,
      ]}
      pointerEvents={oculta ? 'none' : 'auto'}
    >
      {TABS.map((tab) => {
        const atalho = ATALHOS[tab.name]
        const naIrma = rotaAtual === atalho?.rota
        // O slot fica aceso também na rota irmã — é a mesma casa, em outro modo.
        const focused = rotaAtual === tab.name || naIrma
        const cor = focused ? colors.accent : COR_INATIVA

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() =>
              atalho ? aoTocarAtalho(tab.name, atalho.rota) : irPara(tab.name)
            }
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={
              !atalho
                ? tab.rotulo
                : naIrma
                  ? `${atalho.rotulo} — toque para voltar a ${tab.rotulo}`
                  : `${tab.rotulo} — toque para ver ${atalho.rotulo}`
            }
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            {atalho ? (
              <IconeAlternado
                base={tab.icon}
                alternativo={atalho.icone}
                naIrma={naIrma}
                cor={cor}
                focado={focused}
              />
            ) : (
              <ConsumerIcon
                name={tab.icon}
                size={22}
                color={cor}
                strokeWidth={focused ? 2.2 : 1.8}
              />
            )}
          </TouchableOpacity>
        )
      })}
    </Animated.View>
  )
}

/**
 * Ícone de um slot com atalho: casinha ⇄ silhuetas no Início, prancheta ⇄
 * coração em Pedidos.
 *
 * A troca é o único aviso de que o atalho está ativo — sem ela, quem está na
 * rota irmã não teria como saber que o próximo toque volta. Cruzamento por
 * opacidade + escala, curto (`motion.fast`).
 */
function IconeAlternado({
  base,
  alternativo,
  naIrma,
  cor,
  focado,
}: {
  base: ConsumerIconName
  alternativo: ConsumerIconName
  naIrma: boolean
  cor: string
  focado: boolean
}) {
  const troca = useRef(new Animated.Value(naIrma ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(troca, {
      toValue: naIrma ? 1 : 0,
      duration: consumerDesign.motion.fast,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [naIrma])

  const espessura = focado ? 2.2 : 1.8
  const estilo = (saindo: boolean) => ({
    position: 'absolute' as const,
    opacity: saindo
      ? troca.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
      : troca,
    transform: [
      {
        scale: troca.interpolate({
          inputRange: [0, 1],
          outputRange: saindo ? [1, 0.7] : [0.7, 1],
        }),
      },
    ],
  })

  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={estilo(true)}>
        <ConsumerIcon name={base} size={22} color={cor} strokeWidth={espessura} />
      </Animated.View>
      <Animated.View style={estilo(false)}>
        <ConsumerIcon name={alternativo} size={22} color={cor} strokeWidth={espessura} />
      </Animated.View>
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
        {/* A busca não é rota: é o overlay Concierge dentro do Início. */}
        {/*
         * seguindo e favoritos também não têm botão próprio: chega-se pelo
         * Perfil ou pelo atalho da tab vizinha (1 toque vai, 2 voltam — ver
         * ATALHOS acima). Ficam em (tabs) para a barra continuar visível e o
         * slot base seguir aceso — é a mesma casa, em outro modo.
         */}
        <Tabs.Screen name="seguindo" options={{ href: null }} />
        <Tabs.Screen name="favoritos" options={{ href: null }} />
      </Tabs>
    </>
  )
}
