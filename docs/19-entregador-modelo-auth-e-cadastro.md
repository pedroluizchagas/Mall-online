# 19 — Entregador — Modelo, Auth e Cadastro

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

O app do entregador (`apps/mobile-courier`) é uma aplicação Expo
independente do app do consumidor. Compartilha o mesmo projeto Supabase
e os mesmos packages internos, mas tem autenticação, navegação e
funcionalidades próprias.

Este arquivo cobre o modelo de negócio do entregador, a configuração
base do app, o fluxo de cadastro e aprovação, e o onboarding da
recipient Pagar.me (com KYC e Prova de Vida) para recebimento de pagamentos.

-----

## DOIS TIPOS DE ENTREGADOR

### Tipo 1 — Proprio do lojista

- Cadastrado pelo lojista ou pelo próprio entregador com vínculo ao tenant
- Atende exclusivamente pedidos daquele lojista
- Aprovação feita pelo próprio lojista via dashboard
- Remuneração combinada diretamente com o lojista (fora da plataforma no MVP)
- Recipient Pagar.me opcional — no MVP pode receber fora da plataforma

### Tipo 2 — Autonomo da plataforma

- Cadastrado diretamente na plataforma sem vínculo com lojista
- Atende pedidos de qualquer lojista que use o pool da plataforma
- Aprovação feita pelo admin via painel super admin
- Recebe via recipient Pagar.me — transfer da Mallora após alocação no pedido (estágio 2)
- Precisa completar KYC/Prova de Vida no Pagar.me antes de receber pedidos pagos online

-----

## CONFIGURACAO DO APP

### app.json (apps/mobile-courier)

```json
{
  "expo": {
    "name": "Mallora Entregador",
    "slug": "mallora-courier",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1A4D3A"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.mallora.courier",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Usamos sua localização para coordenar as entregas.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "Usamos sua localização em segundo plano durante entregas ativas.",
        "UIBackgroundModes": ["location", "fetch"]
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1A4D3A"
      },
      "package": "com.mallora.courier",
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE"
      ]
    },
    "plugins": [
      "expo-router",
      "expo-notifications",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "A Mallora usa sua localização durante entregas ativas para mostrar sua posição ao consumidor.",
          "isAndroidBackgroundLocationEnabled": true,
          "isAndroidForegroundServiceEnabled": true
        }
      ]
    ],
    "scheme": "mallora-courier"
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

-----

## ESTRUTURA DE ROTAS

```
app/
│
├── _layout.tsx                  Layout raiz — providers e auth listener
│
├── (auth)/
│   ├── _layout.tsx              Redireciona se já autenticado
│   ├── entrar.tsx               Login com Magic Link
│   ├── verificar.tsx            Aguardo do Magic Link
│   └── cadastro/
│       ├── _layout.tsx          Wizard de cadastro
│       ├── index.tsx            Etapa 1 — Dados pessoais
│       ├── veiculo.tsx          Etapa 2 — Dados do veículo
│       └── documentos.tsx       Etapa 3 — CNH e foto
│
├── aguardando-aprovacao.tsx     Tela exibida após cadastro, antes da aprovação
│
├── pagarme-onboarding.tsx       Onboarding KYC Pagar.me (recipient + Prova de Vida)
│
└── (tabs)/
    ├── _layout.tsx              Tab bar — bloqueada se não aprovado
    ├── index.tsx                Entregas disponíveis
    ├── ativa.tsx                Entrega em andamento
    ├── ganhos.tsx               Dashboard de ganhos
    └── perfil.tsx               Perfil e conta Pagar.me
```

-----

## CLIENTE SUPABASE

### lib/supabase.ts

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

## ZUSTAND STORES

### store/useAuthStore.ts

```typescript
import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'

interface Courier {
  id: string
  nome: string
  telefone?: string | null
  foto_url?: string | null
  tipo: 'proprio' | 'autonomo'
  status: 'pendente' | 'aprovado' | 'reprovado' | 'suspenso'
  online: boolean
  pagarme_recipient_id?: string | null
  pagarme_onboarding_status: string
  tenant_id?: string | null
}

interface AuthState {
  user: User | null
  courier: Courier | null
  carregando: boolean
  setUser: (user: User | null) => void
  setCourier: (courier: Courier | null) => void
  setCarregando: (v: boolean) => void
  setOnline: (online: boolean) => void
  limpar: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  courier: null,
  carregando: true,
  setUser: (user) => set({ user }),
  setCourier: (courier) => set({ courier }),
  setCarregando: (carregando) => set({ carregando }),
  setOnline: (online) =>
    set((s) => ({ courier: s.courier ? { ...s.courier, online } : null })),
  limpar: () => set({ user: null, courier: null }),
}))
```

### store/useEntregaStore.ts

```typescript
import { create } from 'zustand'

interface EntregaDisponivel {
  id: string                    // order_id
  assignment_id: string
  store_nome: string
  store_endereco: string
  consumer_endereco: string
  valor_entrega: number
  distancia_km?: number
}

interface EntregaAtiva {
  assignment_id: string
  order_id: string
  store_nome: string
  store_telefone?: string
  store_lat?: number
  store_lng?: number
  consumer_nome: string
  consumer_endereco: string
  consumer_lat?: number
  consumer_lng?: number
  valor_entrega: number
  status: 'aceita' | 'coletada'
  codigo_confirmacao?: string
}

interface EntregaState {
  disponiveis: EntregaDisponivel[]
  ativa: EntregaAtiva | null
  setDisponiveis: (entregas: EntregaDisponivel[]) => void
  setAtiva: (entrega: EntregaAtiva | null) => void
  removerDisponivel: (order_id: string) => void
}

export const useEntregaStore = create<EntregaState>((set) => ({
  disponiveis: [],
  ativa: null,
  setDisponiveis: (disponiveis) => set({ disponiveis }),
  setAtiva: (ativa) => set({ ativa }),
  removerDisponivel: (order_id) =>
    set((s) => ({
      disponiveis: s.disponiveis.filter((e) => e.id !== order_id),
    })),
}))
```

-----

## LAYOUT RAIZ

### app/_layout.tsx

```typescript
import { useEffect } from 'react'
import { Stack, router } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'

export default function LayoutRaiz() {
  const { setUser, setCourier, setCarregando } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        await carregarCourier(session.user.id)
      }

      setCarregando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await carregarCourier(session.user.id)
        } else {
          setCourier(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function carregarCourier(userId: string) {
    const { data } = await supabase
      .from('couriers')
      .select(
        'id, nome, telefone, foto_url, tipo, status, online, ' +
        'pagarme_recipient_id, pagarme_onboarding_status, tenant_id'
      )
      .eq('user_id', userId)
      .single()

    setCourier(data ?? null)
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="aguardando-aprovacao" />
        <Stack.Screen name="pagarme-onboarding" />
        <Stack.Screen
          name="entrega/[id]"
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

```typescript
import { Redirect, Stack } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuthStore } from '@/store/useAuthStore'

export default function LayoutAuth() {
  const { user, courier, carregando } = useAuthStore()

  if (carregando) {
    return (
      <View className="flex-1 items-center justify-center bg-[#1A4D3A]">
        <ActivityIndicator color="#4CAF82" />
      </View>
    )
  }

  if (user && courier) {
    // Entregador logado — verificar status e redirecionar
    if (courier.status === 'pendente') {
      return <Redirect href="/aguardando-aprovacao" />
    }
    if (courier.status === 'aprovado') {
      if (courier.pagarme_onboarding_status !== 'active' && courier.tipo === 'autonomo') {
        return <Redirect href="/pagarme-onboarding" />
      }
      return <Redirect href="/(tabs)" />
    }
  }

  if (user && !courier) {
    // Usuário logado mas sem cadastro de courier — ir para cadastro
    return <Redirect href="/(auth)/cadastro" />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
```

-----

## TELA DE LOGIN

### app/(auth)/entrar.tsx

Idêntica em estrutura à do consumer app. Magic Link por email.
A diferença está no `data.role = 'courier'` ao registrar.

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

    setCarregando(true)
    setErro(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: 'mallora-courier://auth/callback',
        data: { role: 'courier' },
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
      className="flex-1 bg-[#1A4D3A]"
    >
      <View className="flex-1 px-6 pt-20 pb-10">
        <View className="mb-10">
          <Text className="text-3xl font-bold text-white mb-2">
            Entrar como entregador
          </Text>
          <Text className="text-green-200 leading-6">
            Digite seu email e enviaremos um link de acesso.
          </Text>
        </View>

        <View>
          <Text className="text-sm font-medium text-green-100 mb-1.5">
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={(t) => { setEmail(t); setErro(null) }}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#4CAF82"
            className="border border-green-700 rounded-xl px-4 py-3.5
              text-base text-white bg-green-900/40"
          />

          {erro && (
            <Text className="text-red-300 text-sm mt-2">{erro}</Text>
          )}

          <TouchableOpacity
            onPress={handleEnviarLink}
            disabled={carregando}
            className="bg-[#4CAF82] py-4 rounded-2xl items-center mt-4"
            activeOpacity={0.85}
          >
            {carregando ? (
              <ActivityIndicator color="#1A4D3A" />
            ) : (
              <Text className="text-[#1A4D3A] font-bold text-base">
                Enviar link de acesso
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
```

-----

## WIZARD DE CADASTRO

### app/(auth)/cadastro/index.tsx — Etapa 1: Dados pessoais

```typescript
import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { useCadastroStore } from '@/store/useCadastroStore'

export default function EtapaDadosPessoais() {
  const { dados, setDados } = useCadastroStore()
  const [nome, setNome] = useState(dados.nome ?? '')
  const [cpf, setCpf] = useState(dados.cpf ?? '')
  const [telefone, setTelefone] = useState(dados.telefone ?? '')
  const [erro, setErro] = useState<string | null>(null)

  function handleAvancar() {
    if (!nome.trim()) { setErro('Nome obrigatório.'); return }
    if (cpf.replace(/\D/g, '').length !== 11) {
      setErro('CPF inválido.')
      return
    }
    if (telefone.replace(/\D/g, '').length < 10) {
      setErro('Telefone inválido.')
      return
    }
    setDados({ nome: nome.trim(), cpf, telefone })
    router.push('/(auth)/cadastro/veiculo')
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#FFF8ED]"
    >
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingTop: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-sm text-gray-400 mb-1">Etapa 1 de 3</Text>
        <Text className="text-2xl font-bold text-[#1A4D3A] mb-1">
          Dados pessoais
        </Text>
        <Text className="text-gray-500 text-sm mb-8">
          Suas informações serão usadas para criar sua conta de entregador.
        </Text>

        {erro && (
          <Text className="text-red-500 text-sm mb-4 bg-red-50
            px-3 py-2 rounded-xl">
            {erro}
          </Text>
        )}

        <View className="gap-4">
          <Campo
            label="Nome completo"
            value={nome}
            onChangeText={setNome}
            placeholder="Seu nome completo"
            autoCapitalize="words"
          />
          <Campo
            label="CPF"
            value={cpf}
            onChangeText={setCpf}
            placeholder="000.000.000-00"
            keyboardType="numeric"
            maxLength={14}
          />
          <Campo
            label="Telefone (WhatsApp)"
            value={telefone}
            onChangeText={setTelefone}
            placeholder="(37) 99999-9999"
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          onPress={handleAvancar}
          className="bg-[#1A4D3A] py-4 rounded-2xl items-center mt-8"
          activeOpacity={0.85}
        >
          <Text className="text-white font-bold text-base">Próximo</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Campo({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View>
      <Text className="text-xs font-medium text-gray-600 mb-1">{label}</Text>
      <TextInput
        placeholderTextColor="#9CA3AF"
        className="border border-gray-200 rounded-xl px-4 py-3 text-sm
          text-gray-800 bg-white"
        {...props}
      />
    </View>
  )
}
```

### app/(auth)/cadastro/veiculo.tsx — Etapa 2: Veículo

```typescript
import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native'
import { router } from 'expo-router'
import { useCadastroStore } from '@/store/useCadastroStore'

const TIPOS_VEICULO = [
  { id: 'moto', label: 'Moto' },
  { id: 'bicicleta', label: 'Bicicleta' },
  { id: 'carro', label: 'Carro' },
  { id: 'a_pe', label: 'A pé' },
]

export default function EtapaVeiculo() {
  const { dados, setDados } = useCadastroStore()
  const [tipo, setTipo] = useState(dados.veiculo_tipo ?? '')
  const [placa, setPlaca] = useState(dados.veiculo_placa ?? '')
  const [erro, setErro] = useState<string | null>(null)

  function handleAvancar() {
    if (!tipo) { setErro('Selecione o tipo de veículo.'); return }
    if (['moto', 'carro'].includes(tipo) && !placa.trim()) {
      setErro('Informe a placa do veículo.')
      return
    }
    setDados({ veiculo_tipo: tipo, veiculo_placa: placa.trim() || undefined })
    router.push('/(auth)/cadastro/documentos')
  }

  return (
    <ScrollView
      className="flex-1 bg-[#FFF8ED]"
      contentContainerStyle={{ padding: 24, paddingTop: 60 }}
    >
      <Text className="text-sm text-gray-400 mb-1">Etapa 2 de 3</Text>
      <Text className="text-2xl font-bold text-[#1A4D3A] mb-1">
        Seu veículo
      </Text>
      <Text className="text-gray-500 text-sm mb-8">
        Informe como você fará as entregas.
      </Text>

      {erro && (
        <Text className="text-red-500 text-sm mb-4 bg-red-50
          px-3 py-2 rounded-xl">
          {erro}
        </Text>
      )}

      {/* Seleção do tipo de veículo */}
      <Text className="text-xs font-medium text-gray-600 mb-2">
        Tipo de veículo
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-6">
        {TIPOS_VEICULO.map((v) => (
          <TouchableOpacity
            key={v.id}
            onPress={() => setTipo(v.id)}
            className={`px-5 py-3 rounded-xl border ${
              tipo === v.id
                ? 'bg-[#1A4D3A] border-[#1A4D3A]'
                : 'bg-white border-gray-200'
            }`}
            activeOpacity={0.75}
          >
            <Text
              className={`text-sm font-medium ${
                tipo === v.id ? 'text-white' : 'text-gray-700'
              }`}
            >
              {v.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Placa — apenas para moto e carro */}
      {['moto', 'carro'].includes(tipo) && (
        <View className="mb-6">
          <Text className="text-xs font-medium text-gray-600 mb-1">Placa</Text>
          <TextInput
            value={placa}
            onChangeText={setPlaca}
            placeholder="ABC-1234"
            autoCapitalize="characters"
            placeholderTextColor="#9CA3AF"
            className="border border-gray-200 rounded-xl px-4 py-3
              text-sm text-gray-800 bg-white"
          />
        </View>
      )}

      <View className="flex-row gap-3 mt-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-1 border border-gray-200 py-4 rounded-2xl items-center"
          activeOpacity={0.7}
        >
          <Text className="text-gray-500 font-medium">Voltar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleAvancar}
          className="flex-1 bg-[#1A4D3A] py-4 rounded-2xl items-center"
          activeOpacity={0.85}
        >
          <Text className="text-white font-bold">Próximo</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
```

### app/(auth)/cadastro/documentos.tsx — Etapa 3: CNH e foto

```typescript
import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useCadastroStore } from '@/store/useCadastroStore'

export default function EtapaDocumentos() {
  const { dados } = useCadastroStore()
  const { setCourier } = useAuthStore()
  const [cnh, setCnh] = useState('')
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null)
  const [fotoCnh, setFotoCnh] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function escolherImagem(setter: (uri: string) => void) {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Permita acesso à galeria para continuar.')
      return
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!resultado.canceled && resultado.assets[0]) {
      setter(resultado.assets[0].uri)
    }
  }

  async function uploadImagem(uri: string, caminho: string): Promise<string | null> {
    try {
      const resposta = await fetch(uri)
      const blob = await resposta.blob()
      const arrayBuffer = await blob.arrayBuffer()

      const { error } = await supabase.storage
        .from('courier-docs')
        .upload(caminho, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (error) return null

      const { data } = supabase.storage
        .from('courier-docs')
        .getPublicUrl(caminho)

      return data.publicUrl
    } catch {
      return null
    }
  }

  async function handleConcluir() {
    if (!cnh.trim()) { setErro('Número da CNH obrigatório.'); return }
    if (!fotoPerfil) { setErro('Adicione uma foto de perfil.'); return }

    setSalvando(true)
    setErro(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setErro('Sessão expirada. Faça login novamente.')
      setSalvando(false)
      return
    }

    // Upload das fotos
    const fotoPerfilUrl = await uploadImagem(
      fotoPerfil,
      `${user.id}/perfil.jpg`
    )

    let fotoCnhUrl: string | null = null
    if (fotoCnh) {
      fotoCnhUrl = await uploadImagem(fotoCnh, `${user.id}/cnh.jpg`)
    }

    if (!fotoPerfilUrl) {
      setErro('Erro ao fazer upload da foto. Tente novamente.')
      setSalvando(false)
      return
    }

    // Criar registro do courier
    const { data: courier, error: courierError } = await supabase
      .from('couriers')
      .insert({
        user_id: user.id,
        nome: dados.nome!,
        cpf: dados.cpf,
        telefone: dados.telefone,
        veiculo_tipo: dados.veiculo_tipo,
        veiculo_placa: dados.veiculo_placa,
        cnh_numero: cnh.trim(),
        cnh_foto_url: fotoCnhUrl,
        foto_url: fotoPerfilUrl,
        tipo: 'autonomo',
        status: 'pendente',
        online: false,
        pagarme_onboarding_status: false,
      })
      .select()
      .single()

    if (courierError) {
      setErro('Erro ao criar cadastro. Tente novamente.')
      setSalvando(false)
      return
    }

    setCourier(courier)
    setSalvando(false)
    router.replace('/aguardando-aprovacao')
  }

  return (
    <ScrollView
      className="flex-1 bg-[#FFF8ED]"
      contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 40 }}
    >
      <Text className="text-sm text-gray-400 mb-1">Etapa 3 de 3</Text>
      <Text className="text-2xl font-bold text-[#1A4D3A] mb-1">
        Documentos e foto
      </Text>
      <Text className="text-gray-500 text-sm mb-8">
        Necessários para verificar sua identidade e aprovar seu cadastro.
      </Text>

      {erro && (
        <Text className="text-red-500 text-sm mb-4 bg-red-50
          px-3 py-2 rounded-xl">
          {erro}
        </Text>
      )}

      {/* Foto de perfil */}
      <View className="mb-5">
        <Text className="text-xs font-medium text-gray-600 mb-2">
          Foto de perfil
        </Text>
        <TouchableOpacity
          onPress={() => escolherImagem(setFotoPerfil)}
          className={`h-24 w-24 rounded-full border-2 border-dashed
            items-center justify-center overflow-hidden ${
            fotoPerfil ? 'border-[#4CAF82]' : 'border-gray-300'
          }`}
          activeOpacity={0.75}
        >
          {fotoPerfil ? (
            // Exibir preview via Image
            <Text className="text-xs text-[#4CAF82]">Foto adicionada</Text>
          ) : (
            <Text className="text-gray-400 text-xs text-center px-2">
              Toque para adicionar
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Número da CNH */}
      <View className="mb-5">
        <Text className="text-xs font-medium text-gray-600 mb-1">
          Número da CNH
        </Text>
        <TextInput
          value={cnh}
          onChangeText={setCnh}
          placeholder="00000000000"
          keyboardType="numeric"
          maxLength={11}
          placeholderTextColor="#9CA3AF"
          className="border border-gray-200 rounded-xl px-4 py-3
            text-sm text-gray-800 bg-white"
        />
      </View>

      {/* Foto da CNH (opcional) */}
      <View className="mb-8">
        <Text className="text-xs font-medium text-gray-600 mb-1">
          Foto da CNH (opcional, mas recomendado)
        </Text>
        <TouchableOpacity
          onPress={() => escolherImagem(setFotoCnh)}
          className={`h-12 border border-dashed rounded-xl items-center
            justify-center ${
            fotoCnh ? 'border-[#4CAF82] bg-green-50' : 'border-gray-300'
          }`}
          activeOpacity={0.75}
        >
          <Text
            className={`text-sm ${
              fotoCnh ? 'text-[#4CAF82]' : 'text-gray-400'
            }`}
          >
            {fotoCnh ? 'Foto da CNH adicionada' : 'Toque para adicionar foto da CNH'}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          disabled={salvando}
          className="flex-1 border border-gray-200 py-4 rounded-2xl items-center"
          activeOpacity={0.7}
        >
          <Text className="text-gray-500 font-medium">Voltar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleConcluir}
          disabled={salvando}
          className="flex-1 bg-[#1A4D3A] py-4 rounded-2xl items-center
            disabled:opacity-50"
          activeOpacity={0.85}
        >
          {salvando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold">Enviar cadastro</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
```

-----

## STORE TEMPORARIO DO CADASTRO

### store/useCadastroStore.ts

Armazena dados do wizard de cadastro entre as etapas.
Limpo após conclusão do cadastro.

```typescript
import { create } from 'zustand'

interface DadosCadastro {
  nome?: string
  cpf?: string
  telefone?: string
  veiculo_tipo?: string
  veiculo_placa?: string
}

interface CadastroState {
  dados: DadosCadastro
  setDados: (novos: Partial<DadosCadastro>) => void
  limpar: () => void
}

export const useCadastroStore = create<CadastroState>((set) => ({
  dados: {},
  setDados: (novos) => set((s) => ({ dados: { ...s.dados, ...novos } })),
  limpar: () => set({ dados: {} }),
}))
```

-----

## TELA DE AGUARDANDO APROVACAO

### app/aguardando-aprovacao.tsx

```typescript
import { useEffect } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'

export default function TelaAguardandoAprovacao() {
  const { courier, setCourier } = useAuthStore()

  // Verificar periodicamente se foi aprovado
  useEffect(() => {
    if (!courier?.id) return

    const intervalo = setInterval(async () => {
      const { data } = await supabase
        .from('couriers')
        .select('status, pagarme_onboarding_status')
        .eq('id', courier.id)
        .single()

      if (data?.status === 'aprovado') {
        setCourier({ ...courier, status: 'aprovado' })
        clearInterval(intervalo)

        if (data.pagarme_onboarding_status !== 'active' && courier.tipo === 'autonomo') {
          router.replace('/pagarme-onboarding')
        } else {
          router.replace('/(tabs)')
        }
      }
    }, 15000) // verificar a cada 15 segundos

    return () => clearInterval(intervalo)
  }, [courier?.id])

  return (
    <View className="flex-1 bg-[#FFF8ED] px-6 items-center justify-center">
      <View className="w-20 h-20 rounded-full bg-[#4CAF82]/20
        items-center justify-center mb-6">
        <Text className="text-4xl">⏳</Text>
      </View>

      <Text className="text-2xl font-bold text-[#1A4D3A] text-center mb-3">
        Cadastro em análise
      </Text>

      <Text className="text-gray-500 text-center leading-6 mb-8">
        Recebemos seus dados e estamos analisando seu cadastro.
        Você será notificado assim que for aprovado.
      </Text>

      <View className="bg-white rounded-2xl p-5 w-full mb-6">
        <Text className="text-sm font-semibold text-gray-700 mb-3">
          O que acontece agora?
        </Text>
        <View className="gap-3">
          {[
            'Sua documentação será verificada pela equipe',
            'Você receberá uma notificação por email',
            'Após aprovação, configure sua conta de recebimentos',
            'Pronto para receber entregas!',
          ].map((passo, i) => (
            <View key={i} className="flex-row items-start gap-3">
              <View className="w-5 h-5 rounded-full bg-[#4CAF82]/20
                items-center justify-center flex-shrink-0 mt-0.5">
                <Text className="text-xs text-[#4CAF82] font-bold">
                  {i + 1}
                </Text>
              </View>
              <Text className="text-sm text-gray-600 flex-1">{passo}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        onPress={async () => {
          await supabase.auth.signOut()
          router.replace('/(auth)/entrar')
        }}
        className="py-3"
        activeOpacity={0.7}
      >
        <Text className="text-gray-400 text-sm">Sair da conta</Text>
      </TouchableOpacity>
    </View>
  )
}
```

-----

## TELA DE PAGARME ONBOARDING (KYC)

A Edge Function `onboard-courier` cria o recipient Pagar.me e devolve
um `kyc_url`. O app abre esse URL no navegador externo. Após concluir
a Prova de Vida, o webhook `recipient.status.changed` atualiza
`pagarme_onboarding_status = 'active'` no banco.

### app/pagarme-onboarding.tsx

```typescript
import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'

export default function TelaKycPagarme() {
  const { courier, setCourier } = useAuthStore()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleIniciarKyc() {
    setCarregando(true)
    setErro(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setErro('Sessão expirada. Faça login novamente.')
      setCarregando(false)
      return
    }

    const resposta = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/onboard-courier`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    )

    const resultado = await resposta.json()
    setCarregando(false)

    if (!resposta.ok) {
      setErro(resultado.error ?? 'Erro ao iniciar verificação.')
      return
    }

    // Abrir link KYC do Pagar.me no navegador externo
    if (resultado.kyc_url) {
      await Linking.openURL(resultado.kyc_url)
    }
  }

  async function handleVerificarStatus() {
    if (!courier?.id) return

    setCarregando(true)

    const { data } = await supabase
      .from('couriers')
      .select('pagarme_onboarding_status')
      .eq('id', courier.id)
      .single()

    setCarregando(false)

    if (data?.pagarme_onboarding_status === 'active') {
      setCourier({ ...courier, pagarme_onboarding_status: 'active' })
      router.replace('/(tabs)')
    } else {
      setErro('Verificação ainda não concluída. Complete todos os passos no Pagar.me e aguarde a análise.')
    }
  }

  return (
    <View className="flex-1 bg-[#FFF8ED] px-6 items-center justify-center">
      <View className="w-20 h-20 rounded-full bg-[#4CAF82]/20
        items-center justify-center mb-6">
        <Text className="text-4xl">💳</Text>
      </View>

      <Text className="text-2xl font-bold text-[#1A4D3A] text-center mb-3">
        Configure seus recebimentos
      </Text>

      <Text className="text-gray-500 text-center leading-6 mb-8">
        Para receber suas entregas, você precisa verificar sua identidade
        e cadastrar sua conta bancária no Pagar.me. O processo é rápido e seguro.
      </Text>

      <View className="bg-white rounded-2xl p-5 w-full mb-6">
        <Text className="text-sm font-semibold text-gray-700 mb-3">
          O que você vai precisar
        </Text>
        <View className="gap-2">
          {[
            'CPF e dados pessoais',
            'Conta bancária (PIX ou conta corrente)',
            'Selfie para Prova de Vida (Pagar.me KYC)',
          ].map((item, i) => (
            <View key={i} className="flex-row items-center gap-2">
              <View className="w-1.5 h-1.5 rounded-full bg-[#4CAF82]" />
              <Text className="text-sm text-gray-600">{item}</Text>
            </View>
          ))}
        </View>
      </View>

      {erro && (
        <Text className="text-red-500 text-sm text-center mb-4">
          {erro}
        </Text>
      )}

      <TouchableOpacity
        onPress={handleIniciarKyc}
        disabled={carregando}
        className="w-full bg-[#1A4D3A] py-4 rounded-2xl items-center
          mb-3 disabled:opacity-50"
        activeOpacity={0.85}
      >
        {carregando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-base">
            Iniciar verificação (KYC)
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleVerificarStatus}
        disabled={carregando}
        className="w-full border border-[#4CAF82] py-4 rounded-2xl items-center"
        activeOpacity={0.75}
      >
        <Text className="text-[#4CAF82] font-semibold text-sm">
          Já concluí — verificar status
        </Text>
      </TouchableOpacity>

      <Text className="text-xs text-gray-400 text-center mt-6 leading-5">
        Seus dados bancários são armazenados com segurança pelo Pagar.me.
        A plataforma não tem acesso direto às informações da sua conta bancária.
      </Text>
    </View>
  )
}
```

-----

## BUCKET SUPABASE STORAGE PARA DOCUMENTOS

```sql
-- Criar bucket para fotos dos entregadores
INSERT INTO storage.buckets (id, name, public)
VALUES ('courier-docs', 'courier-docs', false);
-- Privado — apenas service_role acessa para revisão do admin

-- Entregador faz upload apenas na sua pasta
CREATE POLICY "upload_courier_proprio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'courier-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Entregador lê apenas seus próprios documentos
CREATE POLICY "leitura_courier_proprio"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'courier-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin lê todos os documentos (para aprovação)
CREATE POLICY "leitura_admin_courier"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'courier-docs'
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
```

-----

## CHECKLIST DO MODULO

- [ ] Bucket `courier-docs` criado como privado no Supabase Storage
- [ ] Permissões de localização em background configuradas no `app.json`
- [ ] `expo-image-picker` instalado para seleção de fotos
- [ ] URL de callback `mallora-courier://auth/callback` adicionada no Supabase Dashboard
- [ ] Edge Function `onboard-courier` deployada (arquivo 07)
- [ ] Polling de aprovação na tela `aguardando-aprovacao` — intervalo de 15 segundos
- [ ] Entregador próprio pode pular o Pagar.me Onboarding no MVP (sem repasse online)
- [ ] `useCadastroStore` limpo após conclusão do cadastro
- [ ] Webhook `recipient.status.changed` do Pagar.me atualiza `pagarme_onboarding_status` no banco
- [ ] Layout `(auth)` redireciona corretamente conforme status: pendente, aprovado sem KYC, aprovado com KYC ativo

-----

*Arquivo 19 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 20 — Entregador — App Core (Entregas)*
