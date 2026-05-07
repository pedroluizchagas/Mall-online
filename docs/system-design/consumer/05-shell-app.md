# 05 — Shell do app

> Esqueleto que envolve todas as telas: layout raiz, splash, layouts de grupo de rotas (`(auth)`, `(tabs)`), tab bar flutuante e padrão de header. Define o que aparece **antes** do conteúdo de cada tela.

## Componentes do shell

| Item | Onde | Status |
|---|---|---|
| Layout raiz (`Stack` + auth state + splash) | `app/_layout.tsx` | refactor mínimo |
| Splash animado (Lottie) | `components/SplashAnimado.tsx` | refactor (cores) |
| Layout `(auth)` | `app/(auth)/_layout.tsx` | refactor mínimo |
| Layout `(tabs)` + tab bar | `app/(tabs)/_layout.tsx` | **refactor pesado** (port da courier) |
| Header reutilizável | `components/HeaderTela.tsx` (novo) | criação |
| Splash native (Expo) | `app.json` | troca de cor |

---

## 1. Tab bar flutuante (port literal do courier)

### Visual alvo

```
                                                         (canvas, qualquer tela de tab)
─────────────────────────────────────────────────────────
                  ↓ 16px lateral, 12+inset bottom
            ┌──────────────────────────────────┐
            │  🏠     ▶︎     📋     👤        │  ← pill dark, h: 68, radius xl
            │ ativo                             │
            └──────────────────────────────────┘
```

- Pill flutuante posicionada `absolute` sobre o conteúdo (não empurra o layout).
- 4 tabs do consumer: **Início, Explorar, Pedidos, Perfil**.
- Ícone ativo: `colors.accent` strokeWidth `2.2`. Inativo: `#6B6E75` strokeWidth `1.8`.
- **Sem labels embaixo do ícone.** Igual courier — o ícone é o label. Reduz ruído visual.

### Comportamento

| Estado | Spec |
|---|---|
| Active tab | `<ConsumerIcon name={tab.icon} size={22} color={colors.accent} strokeWidth={2.2} />` |
| Inactive tab | `<ConsumerIcon name={tab.icon} size={22} color="#6B6E75" strokeWidth={1.8} />` |
| Pressed | `activeOpacity: 0.7` |

### Tabela de tabs

| `name` (route) | `icon` (ConsumerIcon) | Tela |
|---|---|---|
| `index` | `home` | Início |
| `explorar` | `reels` | Explorar (reels) |
| `pedidos` | `orders` | Pedidos |
| `perfil` | `user` | Perfil |

> `buscar` continua oculto da tab bar (`{ href: null }`) — só acessível via `router.push('/(tabs)/buscar')` a partir do header da home. Mantido como hoje.

### Implementação de referência

```tsx
// app/(tabs)/_layout.tsx
import { Tabs, Redirect } from 'expo-router'
import { View, TouchableOpacity, ActivityIndicator } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '@/store/useAuthStore'
import { ConsumerIcon, ConsumerIconName } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'

const TABS: { name: string; icon: ConsumerIconName }[] = [
  { name: 'index',    icon: 'home' },
  { name: 'explorar', icon: 'reels' },
  { name: 'pedidos',  icon: 'orders' },
  { name: 'perfil',   icon: 'user' },
]

function TabBar({ state, navigation }: { state: any; navigation: any }) {
  const { colors, radius } = consumerDesign
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
        ...consumerDesign.shadow.floating,
      }}
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }}>
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.ink} />
      </View>
    )
  }

  if (!user) return <Redirect href="/(auth)/boas-vindas" />

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
        <Tabs.Screen name="index" />
        <Tabs.Screen name="explorar" />
        <Tabs.Screen name="pedidos" />
        <Tabs.Screen name="perfil" />
        <Tabs.Screen name="buscar" options={{ href: null }} />
      </Tabs>
    </>
  )
}
```

### Compensação de altura nas telas

Como a tab bar é `absolute`, telas com `ScrollView`/`FlatList` precisam reservar espaço no fim para que o conteúdo não fique escondido atrás dela:

```tsx
const ESPACO_TAB_BAR = 68 + 16 + 12 // altura + bottom + folga

<ScrollView contentContainerStyle={{ paddingBottom: ESPACO_TAB_BAR }}>
  ...
</ScrollView>
```

Documentar essa constante em cada tela (ver [`07-telas.md`](./07-telas.md)).

### Particularidade da tela `explorar` (reels)

Reels é fullscreen e a tab bar precisa ficar **sobre** o vídeo. Manter `position: 'absolute'` resolve. Ajustar:
- `colors.ink` da pill já dá contraste suficiente sobre vídeo.
- Adicionar `consumerDesign.shadow.floating` (já no spec acima) reforça a separação visual.
- Em reels especificamente, a tab bar pode ficar com `opacity: 0.95` para deixar o vídeo respirar — opcional, decidido em [`07-telas.md`](./07-telas.md).

### Diferenças vs tab bar atual

| Antes | Depois |
|---|---|
| Branca `rgba(255,255,255,0.94)` fixa no fundo | Pill flutuante `colors.ink` com radius `xl` |
| Indicador superior 28x3 verde | Sem indicador — cor + stroke do ícone diferenciam |
| Ícone com fundo redondo `rgba(26,77,58,0.08)` quando ativo | Sem fundo — só cor e stroke |
| Label "Início" abaixo do ícone | Sem label |
| `borderTopWidth: 1` cinza | Sem borda |
| Lucide icons | ConsumerIcon |

---

## 2. Header de tela (novo componente)

Hoje cada tela desenha seu próprio header inline. Padrão diverge: tamanho de avatar, espaçamentos, cores de texto. Solução: `<HeaderTela>`.

### Visual alvo (3 variantes)

#### Variante `principal` (home, perfil)

```
┌─────────────────────────────────────────────────┐
│ [📍 ink, 40x40]   OLÁ, PEDRO          [bell]  │
│                   Divinópolis ▼                 │
└─────────────────────────────────────────────────┘
```

#### Variante `voltar` (loja, pedido detail, checkout)

```
┌─────────────────────────────────────────────────┐
│ [←]                Título da Tela               │
└─────────────────────────────────────────────────┘
```

#### Variante `simples` (pedidos, buscar)

```
┌─────────────────────────────────────────────────┐
│ Meus pedidos                          [opcional]│
└─────────────────────────────────────────────────┘
```

### API

```tsx
interface HeaderTelaProps {
  variante: 'principal' | 'voltar' | 'simples'

  // Comum
  acaoDireita?: React.ReactNode  // bell, contador de carrinho, etc.

  // Variante 'principal'
  rotuloLocalizacao?: string     // "OLÁ, PEDRO" ou "ENTREGAR EM"
  textoLocalizacao?: string      // "Divinópolis"
  aoTocarLocalizacao?: () => void

  // Variante 'voltar'
  titulo?: string
  aoVoltar?: () => void          // default: router.back()

  // Variante 'simples'
  // mesma prop `titulo`

  // Visual
  fundo?: 'canvas' | 'surface' | 'transparente'  // default 'canvas'
}
```

### Implementação de referência

```tsx
// components/HeaderTela.tsx
import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'

const { colors, radius } = consumerDesign

export function HeaderTela(props: HeaderTelaProps) {
  const insets = useSafeAreaInsets()
  const fundo = props.fundo ?? 'canvas'
  const corFundo = fundo === 'transparente' ? 'transparent'
                 : fundo === 'surface' ? colors.surface
                 : colors.canvas

  return (
    <View style={{
      paddingTop: insets.top + 6,
      paddingHorizontal: 24,
      paddingBottom: 12,
      backgroundColor: corFundo,
    }}>
      {props.variante === 'principal' && <HeaderPrincipal {...props} />}
      {props.variante === 'voltar' && <HeaderVoltar {...props} />}
      {props.variante === 'simples' && <HeaderSimples {...props} />}
    </View>
  )
}

function HeaderPrincipal({
  rotuloLocalizacao = 'Entregar em',
  textoLocalizacao = '—',
  aoTocarLocalizacao,
  acaoDireita,
}: HeaderTelaProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <TouchableOpacity
        onPress={aoTocarLocalizacao}
        activeOpacity={0.75}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}
      >
        <View style={{
          width: 40, height: 40, borderRadius: radius.sm,
          backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center',
        }}>
          <ConsumerIcon name="pin" size={18} color={colors.accent} />
        </View>
        <View>
          <Text style={{
            fontSize: 11, fontWeight: '700', color: colors.inkSoft,
            letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2,
          }}>
            {rotuloLocalizacao}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 }}>
              {textoLocalizacao}
            </Text>
            {aoTocarLocalizacao && (
              <ConsumerIcon name="chevron-down" size={14} color={colors.inkMuted} />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {acaoDireita}
    </View>
  )
}

function HeaderVoltar({ titulo, aoVoltar, acaoDireita }: HeaderTelaProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <TouchableOpacity
        onPress={aoVoltar ?? (() => router.back())}
        activeOpacity={0.7}
        style={{
          width: 40, height: 40, borderRadius: radius.sm,
          backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
        }}
      >
        <ConsumerIcon name="back" size={18} color={colors.ink} strokeWidth={2.1} />
      </TouchableOpacity>
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink, flex: 1, textAlign: 'center', marginRight: 40 }}>
        {titulo}
      </Text>
      {acaoDireita}
    </View>
  )
}

function HeaderSimples({ titulo, acaoDireita }: HeaderTelaProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 }}>
        {titulo}
      </Text>
      {acaoDireita}
    </View>
  )
}
```

### `acaoDireita` — exemplo do bell

```tsx
<HeaderTela
  variante="principal"
  rotuloLocalizacao={primeiroNome ? `OLÁ, ${primeiroNome.toUpperCase()}` : 'ENTREGAR EM'}
  textoLocalizacao={cidade}
  aoTocarLocalizacao={escolherEndereco}
  acaoDireita={
    <TouchableOpacity
      onPress={abrirNotificacoes}
      activeOpacity={0.75}
      style={{
        width: 40, height: 40, borderRadius: radius.sm,
        backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}
    >
      <ConsumerIcon name="bell" size={18} color={colors.ink} />
      {NOTIFICACOES_NAO_LIDAS > 0 && (
        <View style={{
          position: 'absolute', top: 8, right: 9,
          width: 8, height: 8, borderRadius: 4,
          backgroundColor: colors.danger,
          borderWidth: 1.5, borderColor: colors.canvas,
        }} />
      )}
    </TouchableOpacity>
  }
/>
```

---

## 3. Layout `(tabs)` — gating e splash de auth

```tsx
if (carregando) {
  return <LoadingState modo="tela" mensagem="Carregando..." />
}
if (!user) return <Redirect href="/(auth)/boas-vindas" />
```

`carregando` resolve em ms (sessão Supabase já em cache). O usuário não vê esse loading na maioria das vezes — é fallback.

---

## 4. Layout `(auth)`

```tsx
// app/(auth)/_layout.tsx
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

  if (user) return <Redirect href="/(tabs)" />

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surfaceDark },
      }}
    />
  )
}
```

### Decisão de cor

Telas de auth ficam **dark** (`colors.surfaceDark`) — port literal do courier. O usuário não logado vive em fundo dark; ao entrar, tudo vira `canvas`. Reforça a transição.

---

## 5. Layout raiz (`app/_layout.tsx`)

Refactor mínimo. Substituições:

| Antes | Depois |
|---|---|
| `<StatusBar style="dark" />` global | `<StatusBar style="dark" />` (sem mudança — cada grupo decide) |
| `<SplashAnimado>` em `bg #F4F0EB` | `<SplashAnimado>` em `bg colors.ink` |
| Todas as Stack.Screen herdam `headerShown: false` | sem mudança |

```tsx
// app/_layout.tsx — versão alvo (minimamente alterada)
import '../global.css'
import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'
import { registrarPushToken, useNotificacaoListener } from '@/lib/notificacoes'
import { SplashAnimado } from '@/components/SplashAnimado'
import { consumerDesign } from '@/lib/consumer-design'

export default function LayoutRaiz() {
  const { setUser, setCarregando } = useAuthStore()
  const [splashVisivel, setSplashVisivel] = useState(true)
  const { colors } = consumerDesign

  useNotificacaoListener()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setCarregando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await registrarPushToken(session.user.id, null, 'consumer')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />
      <StatusBar style="dark" />
      {splashVisivel && <SplashAnimado onFim={() => setSplashVisivel(false)} />}
    </GestureHandlerRootView>
  )
}
```

---

## 6. Splash (`SplashAnimado` + native)

### Splash native (Expo, antes da app montar)

`app.json`:
```json
"splash": {
  "image": "./assets/splash.png",
  "resizeMode": "contain",
  "backgroundColor": "#111216"
}
```

- `backgroundColor` muda de `#FFF8ED` (creme) para `#111216` (`colors.ink`).
- A imagem `splash.png` é mantida agora; **idealmente** se gera uma versão com a marca em `colors.accent` sobre o fundo dark, mas isso é entrega de design (asset PNG novo) que pode vir em PR separado.

### Splash JS (Lottie animado, depois do bundle)

`SplashAnimado.tsx` refactor:

```tsx
import { useRef } from 'react'
import { Animated, StyleSheet } from 'react-native'
import LottieView from 'lottie-react-native'
import { consumerDesign } from '@/lib/consumer-design'

interface Props {
  onFim: () => void
}

export function SplashAnimado({ onFim }: Props) {
  const opacidade = useRef(new Animated.Value(1)).current
  const { colors } = consumerDesign

  function handleAnimacaoFim() {
    Animated.timing(opacidade, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(onFim)
  }

  return (
    <Animated.View style={[styles.container, { opacity: opacidade, backgroundColor: colors.ink }]}>
      <LottieView
        source={require('../assets/shopping cart.json')}
        autoPlay
        loop={false}
        onAnimationFinish={handleAnimacaoFim}
        style={styles.animacao}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animacao: { width: 240, height: 240 },
})
```

### Sobre o asset Lottie atual

`assets/shopping cart.json` foi colorido para combinar com o creme original. Sobre o ink dark vai ficar ok mas perde muito contraste. Recomendação:

- **Curto prazo**: aceitar a perda de contraste neste PR (o splash dura ~1s).
- **Médio prazo**: trocar o asset por uma versão em accent lime (ex.: `assets/shopping-cart-accent.json`) ou substituir por animação custom mais simples (ícone `bag` em accent lime crescendo). Ficar para após a Fase 9.

### Adaptive icon Android

`app.json`:
```json
"android": {
  "adaptiveIcon": {
    "foregroundImage": "./assets/adaptive-icon.png",
    "backgroundColor": "#111216"
  }
}
```

`backgroundColor` muda de `#1A4D3A` para `#111216` (alinhamento com nova marca).

---

## 7. Status bar — regras

| Contexto | `<StatusBar style=...>` |
|---|---|
| Layout raiz (default) | `dark` (texto escuro sobre canvas claro) |
| `(tabs)` (background canvas) | `dark` |
| `(auth)` (background dark) | `light` |
| Reels (fullscreen video) | `light` |
| Pedido detail (mistura mapa + sheet) | `dark` |

---

## 8. Constante de espaço da tab bar

Definir em `consumer-design.ts` (mover lá pra ficar único):

```ts
// adicionar em consumerDesign:
spacing: {
  ...,
  tabBarHeight: 68 + 16 + 12, // 96
}
```

E nas telas:

```tsx
import { consumerDesign } from '@/lib/consumer-design'
const ESPACO_TAB_BAR = consumerDesign.spacing.tabBarHeight

<ScrollView contentContainerStyle={{ paddingBottom: ESPACO_TAB_BAR }}>
```

> Esta adição em `consumer-design.ts` é incluída na Fase 1 (já documentada como "spacing" em [`01-tokens.md`](./01-tokens.md), só registrar `tabBarHeight` quando criar o arquivo).

---

## 9. Critério de aceite (Fase 3, Shell)

- [ ] `app/(tabs)/_layout.tsx` reescrito conforme §1, sem imports de lucide.
- [ ] `components/HeaderTela.tsx` criado com 3 variantes.
- [ ] `app/_layout.tsx` consome `colors.canvas` no `GestureHandlerRootView`.
- [ ] `app/(auth)/_layout.tsx` define `contentStyle.backgroundColor: colors.surfaceDark`.
- [ ] `components/SplashAnimado.tsx` refatorado para usar `colors.ink`.
- [ ] `app.json` com `splash.backgroundColor: '#111216'` e `android.adaptiveIcon.backgroundColor: '#111216'`.
- [ ] Telas em `(tabs)` que tenham listas/scrolls reservam `paddingBottom: spacing.tabBarHeight`.
- [ ] `pnpm --filter mobile-consumer typecheck` passa.
- [ ] Visual smoke check: home, pedidos e perfil renderizam tab bar flutuante corretamente; auth abre em dark.

---

## 10. Decisões de design relevantes

| Decisão | Por quê |
|---|---|
| Tab bar sem labels | Reduz ruído; ícones do `ConsumerIcon` são claros o suficiente; courier provou que funciona. |
| Header com 3 variantes em vez de 1 | Cada tela tem necessidade diferente (localização, voltar, título grande); 1 componente com props daria muitas branches. 3 sub-componentes ficam mais legíveis. |
| Auth dark, conteúdo claro | Reforça o "estou entrando" → "estou dentro"; herdado do courier. |
| Splash em ink (#111216) | Alinhamento de marca; ink é a cor da tab bar e da identidade nova. |
| Sem indicador superior na tab bar | A combinação cor accent + stroke 2.2 já indica ativo; barra extra polui. |
| `MapPin` no header virou `pin` em ink + accent | Ícone de localização agora vive em fundo `ink` com `accent` — leitura imediata e consistente com tab bar. |
