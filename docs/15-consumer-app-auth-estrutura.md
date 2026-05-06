# 15 — Consumer App — Auth e Estrutura

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

O app do consumidor é construído com Expo SDK 51 e Expo Router para
navegação file-based. A autenticação é feita via Supabase Auth com
Magic Link por email — sem senha para o consumidor memorizar. O estado
global é gerenciado com Zustand em três stores independentes.

A estrutura de pastas segue os grupos de rota do Expo Router:
`(auth)` para telas não autenticadas e `(tabs)` para a área principal
do app com a barra de navegação inferior.

-----

## CONFIGURACAO INICIAL DO EXPO

### app.json

```json
{
  "expo": {
    "name": "Mallora",
    "slug": "mallora-consumer",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#FFF8ED"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.mallora.consumer",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Usamos sua localização para mostrar lojas próximas."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1A4D3A"
      },
      "package": "com.mallora.consumer",
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    },
    "plugins": [
      "expo-router",
      "expo-notifications",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Usamos sua localização para mostrar lojas próximas."
        }
      ],
      "react-native-webview"
    ],
    "scheme": "mallora-consumer"
  }
}
```

### babel.config.js

```javascript
module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'nativewind/babel',
      'react-native-reanimated/plugin',
    ],
  }
}
```

### tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        verde: {
          profundo: '#1A4D3A',
          medio: '#4CAF82',
        },
        ambar: '#F5A623',
        creme: '#FFF8ED',
      },
    },
  },
  plugins: [],
}
```

-----

## CLIENTE SUPABASE PARA EXPO

### lib/supabase.ts

O Expo não tem cookies — a sessão é persistida via AsyncStorage.

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@mallora/types'

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

-----

## CONFIGURACAO DO CHECKOUT PAGAR.ME

O app do consumidor não usa SDK nativo do Pagar.me. O checkout é
feito via tokenização de cartão com Pagar.me.js (carregado em WebView)
ou via exibição de QR code Pix gerado pela Edge Function. Não é
necessário nenhum provider global de pagamento no `_layout.tsx`.

-----

## ESTRUTURA DE ROTAS (EXPO ROUTER)

```
app/
│
├── _layout.tsx                  Layout raiz — providers globais
│
├── (auth)/
│   ├── _layout.tsx              Layout sem tab bar
│   ├── boas-vindas.tsx          Onboarding slides (3 telas)
│   ├── entrar.tsx               Login com Magic Link
│   └── verificar.tsx            Tela de aguardo após enviar Magic Link
│
├── (tabs)/
│   ├── _layout.tsx              Tab bar inferior (4 abas)
│   ├── index.tsx                Home — lojas e destaques
│   ├── buscar.tsx               Busca global
│   ├── pedidos.tsx              Histórico e pedido ativo
│   └── perfil.tsx               Perfil, endereços e configurações
│
├── loja/
│   └── [slug].tsx               Página da loja (cardápio)
│
├── checkout.tsx                 Checkout e pagamento
│
└── pedido/
    └── [id].tsx                 Acompanhamento do pedido em tempo real
```

-----

## LAYOUT RAIZ

### app/_layout.tsx

```typescript
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'

export default function LayoutRaiz() {
  const { setUser, setCarregando } = useAuthStore()

  useEffect(() => {
    // Verificar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setCarregando(false)
    })

    // Escutar mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="loja/[slug]"
          options={{ presentation: 'card' }}
        />
        <Stack.Screen
          name="checkout"
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="pedido/[id]"
          options={{ presentation: 'card' }}
        />
      </Stack>
    </GestureHandlerRootView>
  )
}
```

-----

## LAYOUT AUTH

### app/(auth)/_layout.tsx

Redireciona para `(tabs)` se o usuário já está autenticado.

```typescript
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

  return (
    <Stack screenOptions={{ headerShown: false }} />
  )
}
```

-----

## LAYOUT TABS

### app/(tabs)/_layout.tsx

Tab bar com quatro abas. Redireciona para `(auth)` se não autenticado.

```typescript
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
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="buscar"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color, size }) => (
            <Search size={size} color={color} />
          ),
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
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
```

-----

## TELA DE BOAS-VINDAS

### app/(auth)/boas-vindas.tsx

Três slides de apresentação com navegação por swipe ou botão.
No último slide, botão para ir à tela de login.

```typescript
import { useRef, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native'
import { router } from 'expo-router'

const { width } = Dimensions.get('window')

const SLIDES = [
  {
    id: '1',
    titulo: 'Seu bairro na palma da mão',
    descricao:
      'Peça de restaurantes, mercados e lojas locais de Divinópolis sem sair de casa.',
    cor: '#1A4D3A',
  },
  {
    id: '2',
    titulo: 'Apoie o comércio local',
    descricao:
      'Cada pedido fortalece um negócio da sua cidade. Sem taxas absurdas para os lojistas.',
    cor: '#4CAF82',
  },
  {
    id: '3',
    titulo: 'Rápido e seguro',
    descricao:
      'Pague com cartão ou PIX. Acompanhe o entregador em tempo real até sua porta.',
    cor: '#F5A623',
  },
]

export default function TelaBoasVindas() {
  const [indiceAtual, setIndiceAtual] = useState(0)
  const listRef = useRef<FlatList>(null)

  function handleProximo() {
    if (indiceAtual < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: indiceAtual + 1 })
      setIndiceAtual((prev) => prev + 1)
    } else {
      router.replace('/(auth)/entrar')
    }
  }

  return (
    <View className="flex-1 bg-creme">
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width)
          setIndiceAtual(index)
        }}
        renderItem={({ item }) => (
          <View
            style={{ width }}
            className="flex-1 items-center justify-center px-8"
          >
            {/* Área da ilustração */}
            <View
              className="w-48 h-48 rounded-full mb-10 items-center justify-center"
              style={{ backgroundColor: item.cor + '20' }}
            >
              <View
                className="w-24 h-24 rounded-full"
                style={{ backgroundColor: item.cor }}
              />
            </View>

            <Text className="text-2xl font-bold text-verde-profundo text-center mb-3">
              {item.titulo}
            </Text>
            <Text className="text-gray-500 text-center leading-6">
              {item.descricao}
            </Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />

      {/* Indicadores de página */}
      <View className="flex-row justify-center gap-2 mb-6">
        {SLIDES.map((_, i) => (
          <View
            key={i}
            className="h-2 rounded-full transition-all"
            style={{
              width: i === indiceAtual ? 20 : 8,
              backgroundColor: i === indiceAtual ? '#1A4D3A' : '#D1D5DB',
            }}
          />
        ))}
      </View>

      {/* Botões */}
      <View className="px-6 pb-10 gap-3">
        <TouchableOpacity
          onPress={handleProximo}
          className="bg-verde-profundo py-4 rounded-2xl items-center"
          activeOpacity={0.85}
        >
          <Text className="text-white font-semibold text-base">
            {indiceAtual < SLIDES.length - 1 ? 'Próximo' : 'Começar'}
          </Text>
        </TouchableOpacity>

        {indiceAtual < SLIDES.length - 1 && (
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/entrar')}
            className="py-3 items-center"
            activeOpacity={0.7}
          >
            <Text className="text-gray-400 text-sm">Pular</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}
```

-----

## TELA DE LOGIN

### app/(auth)/entrar.tsx

Magic Link — o consumidor digita o email e recebe um link para entrar.
Sem senha para memorizar.

```typescript
import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function TelaEntrar() {
  const [email, setEmail] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleEnviarLink() {
    if (!email.trim()) {
      setErro('Digite seu email para continuar.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setErro('Email inválido.')
      return
    }

    setCarregando(true)
    setErro(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: 'mallora-consumer://auth/callback',
        data: { role: 'consumer' },
      },
    })

    setCarregando(false)

    if (error) {
      setErro('Não foi possível enviar o link. Tente novamente.')
      return
    }

    router.push(`/(auth)/verificar?email=${encodeURIComponent(email)}`)
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-creme"
    >
      <View className="flex-1 px-6 pt-20 pb-10">
        <View className="mb-10">
          <Text className="text-3xl font-bold text-verde-profundo mb-2">
            Entrar
          </Text>
          <Text className="text-gray-500 leading-6">
            Digite seu email e enviaremos um link de acesso.
            Sem senha para lembrar.
          </Text>
        </View>

        <View className="space-y-4">
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1.5">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={(t) => {
                setEmail(t)
                setErro(null)
              }}
              placeholder="seu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              className="border border-gray-200 rounded-xl px-4 py-3.5 text-base
                text-gray-800 bg-white"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {erro && (
            <Text className="text-red-500 text-sm">{erro}</Text>
          )}

          <TouchableOpacity
            onPress={handleEnviarLink}
            disabled={carregando}
            className="bg-verde-profundo py-4 rounded-2xl items-center mt-2"
            activeOpacity={0.85}
          >
            {carregando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Enviar link de acesso
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text className="text-xs text-gray-400 text-center mt-8 leading-5">
          Ao continuar, você concorda com os Termos de Uso e a
          Política de Privacidade da plataforma.
        </Text>
      </View>
    </KeyboardAvoidingView>
  )
}
```

-----

## TELA DE VERIFICACAO

### app/(auth)/verificar.tsx

Exibida após o envio do Magic Link. Instrui o usuário a verificar
o email. Tem opção de reenviar após 60 segundos.

```typescript
import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function TelaVerificar() {
  const { email } = useLocalSearchParams<{ email: string }>()
  const [segundos, setSegundos] = useState(60)
  const [reenviando, setReenviando] = useState(false)

  // Countdown para reenvio
  useEffect(() => {
    const timer = setInterval(() => {
      setSegundos((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Escutar quando o usuário confirmar o Magic Link
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_IN') {
          router.replace('/(tabs)')
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function handleReenviar() {
    if (segundos > 0 || !email) return

    setReenviando(true)
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'mallora-consumer://auth/callback' },
    })
    setReenviando(false)
    setSegundos(60)
  }

  return (
    <View className="flex-1 bg-creme px-6 pt-24 pb-10">
      <View className="items-center mb-10">
        <View className="w-20 h-20 bg-verde-medio/20 rounded-full
          items-center justify-center mb-6">
          <Text className="text-4xl">✉️</Text>
        </View>

        <Text className="text-2xl font-bold text-verde-profundo text-center mb-3">
          Verifique seu email
        </Text>
        <Text className="text-gray-500 text-center leading-6">
          Enviamos um link de acesso para{'\n'}
          <Text className="font-medium text-gray-700">{email}</Text>
        </Text>
      </View>

      <View className="bg-white rounded-2xl p-5 mb-6">
        <Text className="text-sm text-gray-600 leading-6">
          1. Abra o email no seu celular{'\n'}
          2. Toque no botão "Entrar na Mallora"{'\n'}
          3. Você será redirecionado automaticamente
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleReenviar}
        disabled={segundos > 0 || reenviando}
        className="py-3 items-center"
        activeOpacity={0.7}
      >
        <Text
          className={`text-sm ${
            segundos > 0 ? 'text-gray-400' : 'text-verde-medio'
          }`}
        >
          {segundos > 0
            ? `Reenviar em ${segundos}s`
            : reenviando
            ? 'Reenviando...'
            : 'Reenviar link'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.back()}
        className="py-3 items-center mt-2"
        activeOpacity={0.7}
      >
        <Text className="text-sm text-gray-400">Voltar e trocar email</Text>
      </TouchableOpacity>
    </View>
  )
}
```

-----

## ZUSTAND STORES

### store/useAuthStore.ts

```typescript
import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  consumer: {
    id: string
    nome: string
    telefone?: string
    foto_url?: string
    enderecos: any[]
  } | null
  carregando: boolean
  setUser: (user: User | null) => void
  setConsumer: (consumer: AuthState['consumer']) => void
  setCarregando: (carregando: boolean) => void
  limpar: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  consumer: null,
  carregando: true,

  setUser: (user) => set({ user }),
  setConsumer: (consumer) => set({ consumer }),
  setCarregando: (carregando) => set({ carregando }),

  limpar: () => set({ user: null, consumer: null }),
}))
```

### store/useCartStore.ts

```typescript
import { create } from 'zustand'
import type { ItemCarrinho } from '@mallora/types'

interface CartState {
  itens: ItemCarrinho[]
  store_id: string | null
  store_nome: string | null
  store_taxa_entrega: number

  adicionarItem: (item: ItemCarrinho, store_id: string, store_nome: string, taxa: number) => void
  removerItem: (product_id: string) => void
  aumentarQuantidade: (product_id: string) => void
  diminuirQuantidade: (product_id: string) => void
  limparCarrinho: () => void

  // Calculados
  totalItens: () => number
  subtotal: () => number
  total: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  itens: [],
  store_id: null,
  store_nome: null,
  store_taxa_entrega: 0,

  adicionarItem: (item, store_id, store_nome, taxa) => {
    const { itens, store_id: storeAtual } = get()

    // Se mudar de loja, limpar carrinho
    if (storeAtual && storeAtual !== store_id) {
      set({
        itens: [item],
        store_id,
        store_nome,
        store_taxa_entrega: taxa,
      })
      return
    }

    // Verificar se produto já está no carrinho
    const existente = itens.find((i) => i.product_id === item.product_id)

    if (existente) {
      set({
        itens: itens.map((i) =>
          i.product_id === item.product_id
            ? { ...i, quantidade: i.quantidade + item.quantidade }
            : i
        ),
      })
    } else {
      set({
        itens: [...itens, item],
        store_id,
        store_nome,
        store_taxa_entrega: taxa,
      })
    }
  },

  removerItem: (product_id) =>
    set((state) => ({
      itens: state.itens.filter((i) => i.product_id !== product_id),
    })),

  aumentarQuantidade: (product_id) =>
    set((state) => ({
      itens: state.itens.map((i) =>
        i.product_id === product_id
          ? { ...i, quantidade: i.quantidade + 1 }
          : i
      ),
    })),

  diminuirQuantidade: (product_id) =>
    set((state) => ({
      itens: state.itens
        .map((i) =>
          i.product_id === product_id
            ? { ...i, quantidade: i.quantidade - 1 }
            : i
        )
        .filter((i) => i.quantidade > 0),
    })),

  limparCarrinho: () =>
    set({ itens: [], store_id: null, store_nome: null, store_taxa_entrega: 0 }),

  totalItens: () => get().itens.reduce((acc, i) => acc + i.quantidade, 0),

  subtotal: () =>
    get().itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0),

  total: () => get().subtotal() + get().store_taxa_entrega,
}))
```

### store/useOrderStore.ts

```typescript
import { create } from 'zustand'

interface Localizacao {
  latitude: number
  longitude: number
}

interface OrderState {
  pedidoAtivoId: string | null
  statusAtual: string | null
  localizacaoEntregador: Localizacao | null

  setPedidoAtivo: (id: string | null) => void
  setStatusAtual: (status: string) => void
  setLocalizacaoEntregador: (loc: Localizacao | null) => void
  limpar: () => void
}

export const useOrderStore = create<OrderState>((set) => ({
  pedidoAtivoId: null,
  statusAtual: null,
  localizacaoEntregador: null,

  setPedidoAtivo: (id) => set({ pedidoAtivoId: id }),
  setStatusAtual: (status) => set({ statusAtual: status }),
  setLocalizacaoEntregador: (loc) => set({ localizacaoEntregador: loc }),
  limpar: () =>
    set({
      pedidoAtivoId: null,
      statusAtual: null,
      localizacaoEntregador: null,
    }),
}))
```

-----

## COMPONENTES BASE REUTILIZAVEIS

### components/Botao.tsx

```typescript
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native'

interface Props {
  label: string
  onPress: () => void
  variante?: 'primario' | 'secundario' | 'ghost'
  carregando?: boolean
  desabilitado?: boolean
}

export function Botao({
  label,
  onPress,
  variante = 'primario',
  carregando = false,
  desabilitado = false,
}: Props) {
  const estilos = {
    primario: 'bg-verde-profundo',
    secundario: 'bg-white border border-verde-profundo',
    ghost: 'bg-transparent',
  }

  const estilosTexto = {
    primario: 'text-white',
    secundario: 'text-verde-profundo',
    ghost: 'text-verde-medio',
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={desabilitado || carregando}
      className={`py-4 rounded-2xl items-center ${estilos[variante]}
        ${desabilitado || carregando ? 'opacity-50' : ''}`}
      activeOpacity={0.85}
    >
      {carregando ? (
        <ActivityIndicator
          color={variante === 'primario' ? '#fff' : '#1A4D3A'}
        />
      ) : (
        <Text className={`font-semibold text-base ${estilosTexto[variante]}`}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  )
}
```

### components/Skeleton.tsx

Usado em todas as telas de carregamento.

```typescript
import { View } from 'react-native'
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated'
import { useEffect } from 'react'

interface Props {
  largura?: number | string
  altura?: number
  arredondado?: boolean
}

export function Skeleton({ largura = '100%', altura = 16, arredondado = false }: Props) {
  const opacidade = useSharedValue(1)

  useEffect(() => {
    opacidade.value = withRepeat(
      withTiming(0.3, { duration: 800 }),
      -1,
      true
    )
  }, [])

  const estilo = useAnimatedStyle(() => ({
    opacity: opacidade.value,
  }))

  return (
    <Animated.View
      style={[
        estilo,
        {
          width: largura as any,
          height: altura,
          backgroundColor: '#E5E7EB',
          borderRadius: arredondado ? 999 : 8,
        },
      ]}
    />
  )
}
```

-----

## DEEP LINK — CALLBACK DO MAGIC LINK

O Supabase envia o Magic Link com o scheme `mallora-consumer://`.
O Expo Router captura este link e processa a sessão automaticamente
se o scheme estiver configurado corretamente no `app.json`.

Para testar em desenvolvimento com Expo Go, usar o scheme
`exp+mallora-consumer://` e configurar a URL de redirecionamento
no Supabase Dashboard:

```
Supabase Dashboard
  → Authentication
  → URL Configuration
  → Redirect URLs
  → Adicionar: mallora-consumer://auth/callback
  → Adicionar (dev): exp+mallora-consumer://auth/callback
```

-----

## CHECKLIST DE CONFIGURACAO

- [ ] `@react-native-async-storage/async-storage` instalado para persistência da sessão
- [ ] `react-native-reanimated` e `react-native-gesture-handler` configurados no babel
- [ ] NativeWind configurado com o preset no `tailwind.config.js`
- [ ] Scheme `mallora-consumer` registrado no `app.json`
- [ ] URL de callback do Magic Link adicionada no Supabase Dashboard
- [ ] `react-native-webview` instalado e listado nos plugins do app.json
- [ ] `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` no `.env.local`
- [ ] `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` no `.env.local`
- [ ] Permissão de localização adicionada no `app.json` (usada em telas futuras)
- [ ] `lucide-react-native` instalado para ícones da tab bar
- [ ] Consumer criado no banco ao primeiro login (trigger ou lógica no `onAuthStateChange`)

-----

*Arquivo 15 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 16 — Consumer App — Home e Exploração*
