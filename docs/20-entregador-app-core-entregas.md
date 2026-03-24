# 20 — Entregador — App Core (Entregas)

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

Este arquivo cobre o núcleo operacional do app do entregador: o toggle
de disponibilidade, a fila de entregas disponíveis, o fluxo de aceitar
ou recusar uma entrega, o roteiro ativo (loja → consumidor) e a
confirmação de entrega com foto ou código.

O entregador só recebe pedidos quando está marcado como online.
A localização começa a ser transmitida ao aceitar uma entrega e para
ao confirmar a entrega ou cancelar.

-----

## FLUXO COMPLETO DO ENTREGADOR

```
Entregador abre o app
      ↓
Toggle ONLINE
      ↓
Recebe notificação de novo pedido disponível
      ↓
Tela: lista de entregas disponíveis
  → Ver detalhes (loja, endereço consumidor, valor)
  → Aceitar ou Recusar
        ↓ (aceitar)
  delivery_assignments.status = 'aceita'
  orders.status = 'saiu_para_entrega'
  Localização começa a ser transmitida
        ↓
Tela: entrega ativa
  → Rota até a loja (fase 1)
  → Confirmar coleta na loja
        ↓
  delivery_assignments.status = 'coletada'
        ↓
  → Rota até o consumidor (fase 2)
  → Confirmar entrega (foto ou código)
        ↓
  delivery_assignments.status = 'entregue'
  orders.status = 'entregue'
  Localização para de ser transmitida
  Repasse agendado para D+1
```

-----

## LAYOUT DAS TABS

### app/(tabs)/_layout.tsx

```typescript
import { Tabs, Redirect } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuthStore } from '@/store/useAuthStore'

export default function LayoutTabs() {
  const { user, courier, carregando } = useAuthStore()

  if (carregando) {
    return (
      <View className="flex-1 items-center justify-center bg-[#1A4D3A]">
        <ActivityIndicator color="#4CAF82" />
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
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4CAF82',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#1A4D3A',
          borderTopColor: '#163d2e',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Entregas' }}
      />
      <Tabs.Screen
        name="ativa"
        options={{ title: 'Em rota' }}
      />
      <Tabs.Screen
        name="ganhos"
        options={{ title: 'Ganhos' }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil' }}
      />
    </Tabs>
  )
}
```

-----

## TELA PRINCIPAL — ENTREGAS DISPONIVEIS

### app/(tabs)/index.tsx

```typescript
import { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useEntregaStore } from '@/store/useEntregaStore'
import { formatarReais } from '@mallora/lib'
import { EntregaDisponivelCard } from '@/components/EntregaDisponivelCard'

export default function TelaEntregas() {
  const { courier, setOnline } = useAuthStore()
  const { disponiveis, setDisponiveis, ativa } = useEntregaStore()
  const [toggleCarregando, setToggleCarregando] = useState(false)
  const recusasRef = useRef<Record<string, number>>({})

  // Se há entrega ativa, redirecionar para tela de entrega ativa
  useEffect(() => {
    if (ativa) {
      router.replace('/(tabs)/ativa')
    }
  }, [ativa])

  // Ao ficar online, escutar novos pedidos via Realtime
  useEffect(() => {
    if (!courier?.online || !courier?.id) return

    carregarEntregasDisponiveis()

    const canal = supabase
      .channel(`entregas-disponíveis-${courier.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_assignments',
          filter: `courier_id=eq.${courier.id}`,
        },
        (payload) => {
          carregarDetalhesEntrega(payload.new.id)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_assignments',
          filter: `courier_id=eq.${courier.id}`,
        },
        (payload) => {
          // Se atribuição foi cancelada, remover da lista
          if (payload.new.status === 'cancelada') {
            useEntregaStore.getState().removerDisponivel(payload.new.order_id)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [courier?.online, courier?.id])

  async function carregarEntregasDisponiveis() {
    if (!courier?.id) return

    const { data } = await supabase
      .from('delivery_assignments')
      .select(`
        id,
        order_id,
        valor_entrega,
        orders!inner (
          id,
          endereco_entrega,
          stores!inner (
            nome,
            endereco
          )
        )
      `)
      .eq('courier_id', courier.id)
      .eq('status', 'pendente')

    if (!data) return

    const entregas = data.map((a: any) => ({
      id: a.order_id,
      assignment_id: a.id,
      store_nome: a.orders.stores.nome,
      store_endereco: formatarEndereco(a.orders.stores.endereco),
      consumer_endereco: formatarEndereco(a.orders.endereco_entrega),
      valor_entrega: a.valor_entrega,
    }))

    setDisponiveis(entregas)
  }

  async function carregarDetalhesEntrega(assignment_id: string) {
    const { data: a } = await supabase
      .from('delivery_assignments')
      .select(`
        id,
        order_id,
        valor_entrega,
        orders!inner (
          id,
          endereco_entrega,
          stores!inner (nome, endereco)
        )
      `)
      .eq('id', assignment_id)
      .single()

    if (!a) return

    const entrega = {
      id: (a as any).order_id,
      assignment_id: (a as any).id,
      store_nome: (a as any).orders.stores.nome,
      store_endereco: formatarEndereco((a as any).orders.stores.endereco),
      consumer_endereco: formatarEndereco((a as any).orders.endereco_entrega),
      valor_entrega: (a as any).valor_entrega,
    }

    setDisponiveis([...useEntregaStore.getState().disponiveis, entrega])
  }

  async function handleToggleOnline(valor: boolean) {
    if (!courier?.id) return

    setToggleCarregando(true)

    const { error } = await supabase
      .from('couriers')
      .update({ online: valor })
      .eq('id', courier.id)

    if (!error) {
      setOnline(valor)
      if (!valor) setDisponiveis([]) // limpar lista ao ficar offline
    }

    setToggleCarregando(false)
  }

  async function handleAceitar(entrega: any) {
    const { error } = await supabase
      .from('delivery_assignments')
      .update({ status: 'aceita', aceito_em: new Date().toISOString() })
      .eq('id', entrega.assignment_id)

    if (error) {
      Alert.alert('Erro', 'Não foi possível aceitar a entrega.')
      return
    }

    // Atualizar status do pedido
    await supabase
      .from('orders')
      .update({ status: 'saiu_para_entrega' })
      .eq('id', entrega.id)

    // Carregar detalhes completos para a entrega ativa
    await iniciarEntregaAtiva(entrega)
  }

  async function handleRecusar(entrega: any) {
    const chave = entrega.assignment_id
    const recusas = (recusasRef.current[chave] ?? 0) + 1
    recusasRef.current[chave] = recusas

    // Remover da lista local
    useEntregaStore.getState().removerDisponivel(entrega.id)

    // Após 3 recusas do mesmo entregador no mesmo dia, registrar no banco
    if (recusas >= 3) {
      await supabase
        .from('delivery_assignments')
        .update({ status: 'cancelada' })
        .eq('id', entrega.assignment_id)
    }
  }

  async function iniciarEntregaAtiva(entrega: any) {
    const { data } = await supabase
      .from('delivery_assignments')
      .select(`
        id,
        order_id,
        valor_entrega,
        codigo_confirmacao,
        orders!inner (
          endereco_entrega,
          consumers!inner (nome),
          stores!inner (
            nome, telefone, endereco
          )
        )
      `)
      .eq('id', entrega.assignment_id)
      .single()

    if (!data) return

    const d = data as any

    useEntregaStore.getState().setAtiva({
      assignment_id: d.id,
      order_id: d.order_id,
      store_nome: d.orders.stores.nome,
      store_telefone: d.orders.stores.telefone,
      store_lat: d.orders.stores.endereco?.latitude,
      store_lng: d.orders.stores.endereco?.longitude,
      consumer_nome: d.orders.consumers.nome,
      consumer_endereco: formatarEndereco(d.orders.endereco_entrega),
      consumer_lat: d.orders.endereco_entrega?.latitude,
      consumer_lng: d.orders.endereco_entrega?.longitude,
      valor_entrega: d.valor_entrega,
      status: 'aceita',
      codigo_confirmacao: d.codigo_confirmacao,
    })

    router.replace('/(tabs)/ativa')
  }

  return (
    <View className="flex-1 bg-[#1A4D3A]">
      {/* Header com toggle online/offline */}
      <View className="px-5 pt-14 pb-5">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-xl font-bold">
              {courier?.online ? 'Você está online' : 'Você está offline'}
            </Text>
            <Text className="text-green-300 text-sm mt-0.5">
              {courier?.online
                ? 'Aguardando novos pedidos...'
                : 'Ative para receber pedidos'}
            </Text>
          </View>

          {toggleCarregando ? (
            <ActivityIndicator color="#4CAF82" />
          ) : (
            <Switch
              value={courier?.online ?? false}
              onValueChange={handleToggleOnline}
              trackColor={{ false: '#374151', true: '#4CAF82' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#374151"
            />
          )}
        </View>
      </View>

      {/* Lista de entregas disponíveis */}
      <View className="flex-1 bg-[#FFF8ED] rounded-t-3xl overflow-hidden">
        <FlatList
          data={disponiveis}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 20,
            paddingTop: 24,
            paddingBottom: 100,
          }}
          ListHeaderComponent={
            disponiveis.length > 0 ? (
              <Text className="text-sm font-semibold text-gray-500
                uppercase mb-4">
                {disponiveis.length} entrega{disponiveis.length !== 1 ? 's' : ''} disponível
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View className="py-16 items-center">
              {!courier?.online ? (
                <>
                  <Text className="text-gray-400 text-base font-medium mb-1">
                    Você está offline
                  </Text>
                  <Text className="text-gray-300 text-sm text-center">
                    Ative o botão acima para começar a receber pedidos
                  </Text>
                </>
              ) : (
                <>
                  <Text className="text-gray-400 text-base font-medium mb-1">
                    Nenhum pedido no momento
                  </Text>
                  <Text className="text-gray-300 text-sm text-center">
                    Fique online para receber notificações de novos pedidos
                  </Text>
                </>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <EntregaDisponivelCard
              entrega={item}
              onAceitar={() => handleAceitar(item)}
              onRecusar={() => handleRecusar(item)}
            />
          )}
        />
      </View>
    </View>
  )
}

function formatarEndereco(end: any): string {
  if (!end) return 'Endereço não disponível'
  return `${end.rua ?? ''}, ${end.numero ?? ''} — ${end.bairro ?? ''}`
}
```

-----

## COMPONENTE ENTREGA DISPONIVEL CARD

### components/EntregaDisponivelCard.tsx

```typescript
import { View, Text, TouchableOpacity } from 'react-native'
import { formatarReais } from '@mallora/lib'

interface Props {
  entrega: {
    id: string
    store_nome: string
    store_endereco: string
    consumer_endereco: string
    valor_entrega: number
  }
  onAceitar: () => void
  onRecusar: () => void
}

export function EntregaDisponivelCard({ entrega, onAceitar, onRecusar }: Props) {
  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
      {/* Valor de destaque */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-2xl font-bold text-[#1A4D3A]">
          {formatarReais(entrega.valor_entrega)}
        </Text>
        <View className="bg-[#4CAF82]/10 px-3 py-1 rounded-full">
          <Text className="text-xs font-semibold text-[#4CAF82]">
            Nova entrega
          </Text>
        </View>
      </View>

      {/* Rota */}
      <View className="gap-2 mb-4">
        {/* Origem */}
        <View className="flex-row items-start gap-3">
          <View className="w-3 h-3 rounded-full bg-[#1A4D3A] mt-1
            flex-shrink-0" />
          <View className="flex-1">
            <Text className="text-xs font-semibold text-gray-500 uppercase">
              Coletar em
            </Text>
            <Text className="text-sm font-semibold text-gray-800 mt-0.5">
              {entrega.store_nome}
            </Text>
            <Text className="text-xs text-gray-400" numberOfLines={1}>
              {entrega.store_endereco}
            </Text>
          </View>
        </View>

        {/* Linha conectora */}
        <View className="ml-1.5 w-px h-4 bg-gray-200" />

        {/* Destino */}
        <View className="flex-row items-start gap-3">
          <View className="w-3 h-3 rounded-full bg-[#F5A623] mt-1
            flex-shrink-0" />
          <View className="flex-1">
            <Text className="text-xs font-semibold text-gray-500 uppercase">
              Entregar em
            </Text>
            <Text className="text-sm text-gray-700 mt-0.5" numberOfLines={2}>
              {entrega.consumer_endereco}
            </Text>
          </View>
        </View>
      </View>

      {/* Ações */}
      <View className="flex-row gap-3">
        <TouchableOpacity
          onPress={onRecusar}
          className="flex-1 border border-gray-200 py-3 rounded-xl
            items-center"
          activeOpacity={0.7}
        >
          <Text className="text-gray-500 text-sm font-medium">Recusar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onAceitar}
          className="flex-2 bg-[#1A4D3A] py-3 px-6 rounded-xl items-center"
          style={{ flex: 2 }}
          activeOpacity={0.85}
        >
          <Text className="text-white text-sm font-bold">Aceitar entrega</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

-----

## TELA DE ENTREGA ATIVA

### app/(tabs)/ativa.tsx

```typescript
import { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Linking,
  ScrollView,
} from 'react-native'
import MapView, { Marker, Polyline } from 'react-native-maps'
import * as Location from 'expo-location'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useEntregaStore } from '@/store/useEntregaStore'
import { useAuthStore } from '@/store/useAuthStore'
import { LOCATION_UPDATE_INTERVAL_MS } from '@mallora/lib'
import { ModalConfirmacaoEntrega } from '@/components/ModalConfirmacaoEntrega'

export default function TelaEntregaAtiva() {
  const { ativa, setAtiva } = useEntregaStore()
  const { courier } = useAuthStore()
  const [locAtual, setLocAtual] = useState<{ latitude: number; longitude: number } | null>(null)
  const [modalConfirmacao, setModalConfirmacao] = useState(false)
  const watchRef = useRef<Location.LocationSubscription | null>(null)

  // Redirecionar se não há entrega ativa
  useEffect(() => {
    if (!ativa) {
      router.replace('/(tabs)')
    }
  }, [ativa])

  // Iniciar transmissão de localização
  useEffect(() => {
    if (!ativa || !courier?.id) return

    async function iniciarLocalizacao() {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Permissão negada',
          'A localização é necessária para transmitir sua posição ao consumidor.'
        )
        return
      }

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: LOCATION_UPDATE_INTERVAL_MS,
          distanceInterval: 10,
        },
        async (loc) => {
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          }
          setLocAtual(coords)

          // Transmitir para Supabase via UPSERT
          await supabase
            .from('courier_locations')
            .upsert({
              courier_id: courier!.id,
              assignment_id: ativa.assignment_id,
              latitude: coords.latitude,
              longitude: coords.longitude,
              precisao_m: loc.coords.accuracy,
              atualizado_em: new Date().toISOString(),
            })
        }
      )
    }

    iniciarLocalizacao()

    return () => {
      watchRef.current?.remove()
      watchRef.current = null
    }
  }, [ativa?.assignment_id, courier?.id])

  async function handleConfirmarColeta() {
    if (!ativa) return

    const { error } = await supabase
      .from('delivery_assignments')
      .update({
        status: 'coletada',
        coletado_em: new Date().toISOString(),
      })
      .eq('id', ativa.assignment_id)

    if (error) {
      Alert.alert('Erro', 'Não foi possível confirmar a coleta.')
      return
    }

    setAtiva({ ...ativa, status: 'coletada' })
  }

  async function handleEntregaConcluida(comprovante_url?: string) {
    if (!ativa) return

    const { error: assignError } = await supabase
      .from('delivery_assignments')
      .update({
        status: 'entregue',
        entregue_em: new Date().toISOString(),
        comprovante_url: comprovante_url ?? null,
      })
      .eq('id', ativa.assignment_id)

    if (assignError) {
      Alert.alert('Erro', 'Não foi possível confirmar a entrega.')
      return
    }

    await supabase
      .from('orders')
      .update({ status: 'entregue' })
      .eq('id', ativa.order_id)

    // Parar transmissão de localização
    watchRef.current?.remove()

    // Limpar localização do banco
    if (courier?.id) {
      await supabase
        .from('courier_locations')
        .update({ assignment_id: null })
        .eq('courier_id', courier.id)
    }

    setAtiva(null)
    setModalConfirmacao(false)
    router.replace('/(tabs)')
  }

  function abrirRota(lat?: number, lng?: number) {
    if (!lat || !lng) return
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
    )
  }

  if (!ativa) return null

  const fase = ativa.status === 'aceita' ? 'ir_a_loja' : 'ir_ao_consumidor'
  const destino = fase === 'ir_a_loja'
    ? { lat: ativa.store_lat, lng: ativa.store_lng, nome: ativa.store_nome }
    : { lat: ativa.consumer_lat, lng: ativa.consumer_lng, nome: ativa.consumer_nome }

  return (
    <View className="flex-1 bg-[#1A4D3A]">
      {/* Header */}
      <View className="px-5 pt-14 pb-4">
        <Text className="text-white text-lg font-bold">
          {fase === 'ir_a_loja' ? 'Vá até a loja' : 'Entregar ao consumidor'}
        </Text>
        <Text className="text-green-300 text-sm mt-0.5">
          {fase === 'ir_a_loja' ? ativa.store_nome : ativa.consumer_nome}
        </Text>
      </View>

      {/* Mapa */}
      <MapView
        style={{ height: 220 }}
        showsUserLocation
        region={
          locAtual
            ? {
                latitude: locAtual.latitude,
                longitude: locAtual.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }
            : undefined
        }
      >
        {destino.lat && destino.lng && (
          <Marker
            coordinate={{ latitude: destino.lat, longitude: destino.lng }}
            title={destino.nome}
            pinColor={fase === 'ir_a_loja' ? '#1A4D3A' : '#F5A623'}
          />
        )}
      </MapView>

      {/* Painel de ação */}
      <View className="flex-1 bg-[#FFF8ED] rounded-t-3xl overflow-hidden">
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        >
          {/* Endereço de destino */}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-xs font-semibold text-gray-500 uppercase mb-1">
              {fase === 'ir_a_loja' ? 'Endereço da loja' : 'Endereço de entrega'}
            </Text>
            <Text className="text-sm font-semibold text-gray-800">
              {destino.nome}
            </Text>
            <Text className="text-sm text-gray-500 mt-0.5">
              {fase === 'ir_a_loja'
                ? ativa.store_endereco ?? 'Endereço não disponível'
                : ativa.consumer_endereco}
            </Text>

            {destino.lat && destino.lng && (
              <TouchableOpacity
                onPress={() => abrirRota(destino.lat, destino.lng)}
                className="mt-3 border border-[#4CAF82] py-2.5 rounded-xl
                  items-center"
                activeOpacity={0.75}
              >
                <Text className="text-[#4CAF82] text-sm font-semibold">
                  Abrir rota no Google Maps
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Info da entrega */}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-gray-500">Valor da entrega</Text>
              <Text className="text-lg font-bold text-[#1A4D3A]">
                {require('@mallora/lib').formatarReais(ativa.valor_entrega)}
              </Text>
            </View>
          </View>

          {/* Contato com a loja (apenas na fase de coleta) */}
          {fase === 'ir_a_loja' && ativa.store_telefone && (
            <TouchableOpacity
              onPress={() => {
                const num = ativa.store_telefone!.replace(/\D/g, '')
                Linking.openURL(`https://wa.me/55${num}`)
              }}
              className="bg-white rounded-2xl p-4 mb-4 flex-row
                items-center justify-between"
              activeOpacity={0.75}
            >
              <Text className="text-sm text-gray-700">
                Falar com {ativa.store_nome}
              </Text>
              <Text className="text-[#4CAF82] text-sm font-semibold">
                WhatsApp
              </Text>
            </TouchableOpacity>
          )}

          {/* Botão de ação principal */}
          {fase === 'ir_a_loja' ? (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Confirmar coleta',
                  `Você coletou o pedido em ${ativa.store_nome}?`,
                  [
                    { text: 'Não', style: 'cancel' },
                    { text: 'Sim, coletei', onPress: handleConfirmarColeta },
                  ]
                )
              }}
              className="bg-[#1A4D3A] py-4 rounded-2xl items-center"
              activeOpacity={0.85}
            >
              <Text className="text-white font-bold text-base">
                Confirmar coleta na loja
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setModalConfirmacao(true)}
              className="bg-[#4CAF82] py-4 rounded-2xl items-center"
              activeOpacity={0.85}
            >
              <Text className="text-white font-bold text-base">
                Confirmar entrega
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Modal de confirmação de entrega */}
      {modalConfirmacao && (
        <ModalConfirmacaoEntrega
          codigoEsperado={ativa.codigo_confirmacao}
          onConfirmar={handleEntregaConcluida}
          onFechar={() => setModalConfirmacao(false)}
        />
      )}
    </View>
  )
}
```

-----

## MODAL DE CONFIRMACAO DE ENTREGA

### components/ModalConfirmacaoEntrega.tsx

O entregador pode confirmar a entrega de duas formas:

- Digitando o código que o consumidor mostra no app
- Tirando uma foto do local de entrega (comprovante)

```typescript
import { useState } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'

interface Props {
  codigoEsperado?: string | null
  onConfirmar: (comprovante_url?: string) => Promise<void>
  onFechar: () => void
}

export function ModalConfirmacaoEntrega({
  codigoEsperado,
  onConfirmar,
  onFechar,
}: Props) {
  const { courier } = useAuthStore()
  const [modo, setModo] = useState<'codigo' | 'foto'>('codigo')
  const [codigo, setCodigo] = useState('')
  const [fotoUri, setFotoUri] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function tirarFoto() {
    const permissao = await ImagePicker.requestCameraPermissionsAsync()
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Permita acesso à câmera.')
      return
    }

    const resultado = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.7,
    })

    if (!resultado.canceled && resultado.assets[0]) {
      setFotoUri(resultado.assets[0].uri)
    }
  }

  async function handleConfirmar() {
    setErro(null)

    if (modo === 'codigo') {
      if (!codigo.trim()) {
        setErro('Digite o código de confirmação.')
        return
      }
      if (codigoEsperado && codigo.trim() !== codigoEsperado) {
        setErro('Código incorreto. Verifique com o consumidor.')
        return
      }
    }

    if (modo === 'foto' && !fotoUri) {
      setErro('Tire uma foto como comprovante.')
      return
    }

    setConfirmando(true)

    let comprovante_url: string | undefined

    // Upload da foto de comprovante
    if (modo === 'foto' && fotoUri && courier?.id) {
      try {
        const resposta = await fetch(fotoUri)
        const blob = await resposta.blob()
        const buffer = await blob.arrayBuffer()
        const caminho = `${courier.id}/comprovante-${Date.now()}.jpg`

        const { error } = await supabase.storage
          .from('courier-docs')
          .upload(caminho, buffer, {
            contentType: 'image/jpeg',
            upsert: false,
          })

        if (!error) {
          const { data } = supabase.storage
            .from('courier-docs')
            .getPublicUrl(caminho)
          comprovante_url = data.publicUrl
        }
      } catch {
        // Continuar mesmo sem foto se upload falhar
      }
    }

    await onConfirmar(comprovante_url)
    setConfirmando(false)
  }

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onFechar}
    >
      <TouchableOpacity
        className="flex-1 bg-black/40"
        activeOpacity={1}
        onPress={onFechar}
      />

      <View className="bg-white rounded-t-3xl p-6">
        <Text className="text-xl font-bold text-[#1A4D3A] mb-1">
          Confirmar entrega
        </Text>
        <Text className="text-gray-500 text-sm mb-5">
          Confirme que o pedido foi entregue ao consumidor.
        </Text>

        {/* Seletor de modo */}
        <View className="flex-row gap-2 mb-5">
          {[
            { id: 'codigo', label: 'Código' },
            { id: 'foto', label: 'Foto' },
          ].map((op) => (
            <TouchableOpacity
              key={op.id}
              onPress={() => {
                setModo(op.id as any)
                setErro(null)
              }}
              className={`flex-1 py-2.5 rounded-xl items-center border ${
                modo === op.id
                  ? 'bg-[#1A4D3A] border-[#1A4D3A]'
                  : 'border-gray-200'
              }`}
              activeOpacity={0.75}
            >
              <Text
                className={`text-sm font-semibold ${
                  modo === op.id ? 'text-white' : 'text-gray-600'
                }`}
              >
                {op.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Modo código */}
        {modo === 'codigo' && (
          <View className="mb-4">
            <Text className="text-xs font-medium text-gray-600 mb-2">
              Peça ao consumidor o código de confirmação exibido no app dele
            </Text>
            <TextInput
              value={codigo}
              onChangeText={(t) => { setCodigo(t.toUpperCase()); setErro(null) }}
              placeholder="Ex: A7B3"
              autoCapitalize="characters"
              maxLength={6}
              placeholderTextColor="#9CA3AF"
              className="border border-gray-200 rounded-xl px-4 py-3
                text-xl font-bold text-gray-800 text-center tracking-widest"
            />
          </View>
        )}

        {/* Modo foto */}
        {modo === 'foto' && (
          <View className="mb-4">
            <Text className="text-xs font-medium text-gray-600 mb-2">
              Tire uma foto do local de entrega como comprovante
            </Text>
            <TouchableOpacity
              onPress={tirarFoto}
              className={`h-28 border-2 border-dashed rounded-2xl
                items-center justify-center ${
                fotoUri ? 'border-[#4CAF82] bg-green-50' : 'border-gray-300'
              }`}
              activeOpacity={0.75}
            >
              <Text
                className={`text-sm font-medium ${
                  fotoUri ? 'text-[#4CAF82]' : 'text-gray-400'
                }`}
              >
                {fotoUri ? 'Foto tirada — toque para refazer' : 'Toque para abrir a câmera'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {erro && (
          <Text className="text-red-500 text-sm mb-3">{erro}</Text>
        )}

        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={onFechar}
            disabled={confirmando}
            className="flex-1 border border-gray-200 py-3.5 rounded-2xl
              items-center"
            activeOpacity={0.7}
          >
            <Text className="text-gray-500 font-medium text-sm">Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleConfirmar}
            disabled={confirmando}
            className="flex-2 bg-[#4CAF82] py-3.5 rounded-2xl items-center
              disabled:opacity-50"
            style={{ flex: 2 }}
            activeOpacity={0.85}
          >
            {confirmando ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-bold text-sm">
                Confirmar entrega
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
```

-----

## HISTORICO DE ENTREGAS DO DIA

### components/HistoricoEntregasDia.tsx

Exibido na tela de entregas quando o entregador está offline,
mostrando um resumo das entregas do dia.

```typescript
import { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { formatarReais } from '@mallora/lib'

export function HistoricoEntregasDia() {
  const { courier } = useAuthStore()
  const [resumo, setResumo] = useState({
    total: 0,
    ganhos: 0,
    entregues: 0,
  })

  useEffect(() => {
    if (!courier?.id) return

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    supabase
      .from('delivery_assignments')
      .select('valor_entrega, status')
      .eq('courier_id', courier.id)
      .gte('criado_em', hoje.toISOString())
      .then(({ data }) => {
        if (!data) return
        const entregues = data.filter((d) => d.status === 'entregue')
        setResumo({
          total: data.length,
          entregues: entregues.length,
          ganhos: entregues.reduce((acc, d) => acc + d.valor_entrega, 0),
        })
      })
  }, [courier?.id])

  if (resumo.total === 0) return null

  return (
    <View className="mx-5 mb-4 bg-white rounded-2xl p-4">
      <Text className="text-xs font-semibold text-gray-500 uppercase mb-3">
        Hoje
      </Text>
      <View className="flex-row justify-between">
        <View className="items-center">
          <Text className="text-xl font-bold text-[#1A4D3A]">
            {resumo.entregues}
          </Text>
          <Text className="text-xs text-gray-400 mt-0.5">Entregues</Text>
        </View>
        <View className="items-center">
          <Text className="text-xl font-bold text-[#1A4D3A]">
            {resumo.total}
          </Text>
          <Text className="text-xs text-gray-400 mt-0.5">Total</Text>
        </View>
        <View className="items-center">
          <Text className="text-xl font-bold text-[#4CAF82]">
            {formatarReais(resumo.ganhos)}
          </Text>
          <Text className="text-xs text-gray-400 mt-0.5">Ganhos</Text>
        </View>
      </View>
    </View>
  )
}
```

-----

## CHECKLIST DO MODULO

- [ ] `expo-location` com `isAndroidBackgroundLocationEnabled: true` no `app.json`
- [ ] `expo-image-picker` instalado para foto de comprovante
- [ ] `react-native-maps` configurado com chave Google Maps no Android
- [ ] Permissão de localização solicitada antes de iniciar `watchPositionAsync`
- [ ] `watchRef.current?.remove()` no cleanup do `useEffect` para parar rastreamento
- [ ] UPSERT em `courier_locations` — chave única por `courier_id` (arquivo 03)
- [ ] `assignment_id` em `courier_locations` preenchido durante entrega ativa
  e limpo ao finalizar (para a RLS do consumidor funcionar corretamente)
- [ ] Confirmação de coleta com `Alert.alert` para evitar toque acidental
- [ ] Modal de confirmação de entrega com dois modos — código e foto
- [ ] Código de confirmação gerado e armazenado em `delivery_assignments.codigo_confirmacao`
  — gerado pelo lojista ao atribuir o entregador (lógica no arquivo 12)
- [ ] Após entrega concluída: parar localização, limpar `ativa` no store
  e redirecionar para `/(tabs)`
- [ ] Contagem de recusas via `useRef` — não persiste entre sessões (adequado para MVP)
- [ ] Realtime escutando `delivery_assignments` apenas quando online

-----

*Arquivo 20 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 21 — Entregador — Localização em Tempo Real*
