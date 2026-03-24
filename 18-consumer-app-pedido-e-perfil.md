# 18 — Consumer App — Pedido e Perfil

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

Este arquivo cobre duas áreas do app do consumidor:

1. Acompanhamento do pedido em tempo real — timeline de status,
   localização do entregador no mapa e contato com a loja
1. Tela de perfil — dados pessoais, histórico de pedidos e
   gerenciamento de endereços salvos

-----

## TELA DE ACOMPANHAMENTO DO PEDIDO

### app/pedido/[id].tsx

```typescript
import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import MapView, { Marker, Polyline } from 'react-native-maps'
import { supabase } from '@/lib/supabase'
import { useOrderStore } from '@/store/useOrderStore'
import { formatarReais } from '@mallora/lib'

const LABELS_STATUS: Record<string, string> = {
  novo: 'Pedido recebido',
  confirmado: 'Pedido confirmado',
  em_preparo: 'Em preparo',
  aguardando_entregador: 'Aguardando entregador',
  saiu_para_entrega: 'Saiu para entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

const DESCRICAO_STATUS: Record<string, string> = {
  novo: 'Aguardando confirmação do restaurante',
  confirmado: 'O restaurante confirmou seu pedido',
  em_preparo: 'Seu pedido está sendo preparado',
  aguardando_entregador: 'Procurando um entregador disponível',
  saiu_para_entrega: 'Seu pedido está a caminho',
  entregue: 'Pedido entregue. Bom apetite!',
  cancelado: 'Seu pedido foi cancelado',
}

const ORDEM_STATUS = [
  'novo',
  'confirmado',
  'em_preparo',
  'aguardando_entregador',
  'saiu_para_entrega',
  'entregue',
]

export default function TelaAcompanhamento() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { setStatusAtual, setLocalizacaoEntregador } = useOrderStore()

  const [pedido, setPedido] = useState<any>(null)
  const [localizacao, setLocalizacao] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregarPedido() {
      const { data } = await supabase
        .from('orders')
        .select(`
          id, status, payment_status, forma_pagamento,
          subtotal, taxa_entrega, total, criado_em,
          endereco_entrega, observacoes, motivo_cancelamento,
          order_items (id, nome, quantidade, preco_unit, subtotal),
          delivery_assignments (
            id, status, courier_id,
            couriers (id, nome, telefone)
          ),
          stores (id, nome, telefone, slug)
        `)
        .eq('id', id)
        .single()

      if (!data) {
        router.back()
        return
      }

      setPedido(data)
      setStatusAtual(data.status)
      setCarregando(false)
    }

    carregarPedido()
  }, [id])

  // Realtime — atualizar status do pedido
  useEffect(() => {
    if (!id) return

    const canal = supabase
      .channel(`pedido-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setPedido((prev: any) =>
            prev ? { ...prev, ...payload.new } : prev
          )
          setStatusAtual(payload.new.status)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [id])

  // Realtime — localização do entregador
  useEffect(() => {
    const courierId = pedido?.delivery_assignments?.[0]?.courier_id
    if (!courierId) return

    // Buscar localização atual
    supabase
      .from('courier_locations')
      .select('latitude, longitude')
      .eq('courier_id', courierId)
      .single()
      .then(({ data }) => {
        if (data) {
          setLocalizacao(data)
          setLocalizacaoEntregador(data)
        }
      })

    const canal = supabase
      .channel(`loc-consumer-${courierId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'courier_locations',
          filter: `courier_id=eq.${courierId}`,
        },
        (payload) => {
          const coords = {
            latitude: payload.new.latitude,
            longitude: payload.new.longitude,
          }
          setLocalizacao(coords)
          setLocalizacaoEntregador(coords)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [pedido?.delivery_assignments?.[0]?.courier_id])

  function abrirWhatsApp() {
    const telefone = pedido?.stores?.telefone?.replace(/\D/g, '')
    if (!telefone) return
    const numero = telefone.startsWith('55') ? telefone : `55${telefone}`
    Linking.openURL(`https://wa.me/${numero}?text=Olá, tenho uma dúvida sobre meu pedido`)
  }

  if (carregando) {
    return (
      <View className="flex-1 bg-creme items-center justify-center">
        <ActivityIndicator size="large" color="#1A4D3A" />
      </View>
    )
  }

  const statusAtual = pedido?.status ?? 'novo'
  const indiceAtual = ORDEM_STATUS.indexOf(statusAtual)
  const courier = pedido?.delivery_assignments?.[0]?.couriers
  const enderecoEntrega = pedido?.endereco_entrega
  const exibirMapa =
    statusAtual === 'saiu_para_entrega' && localizacao && enderecoEntrega

  return (
    <View className="flex-1 bg-creme">
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Acompanhar pedido',
          headerTintColor: '#1A4D3A',
          headerStyle: { backgroundColor: '#FFF8ED' },
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Mapa com localização do entregador */}
        {exibirMapa && (
          <MapView
            style={{ height: 220 }}
            region={{
              latitude: localizacao.latitude,
              longitude: localizacao.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
          >
            <Marker
              coordinate={localizacao}
              title="Entregador"
              pinColor="#1A4D3A"
            />
            {enderecoEntrega?.latitude && enderecoEntrega?.longitude && (
              <Marker
                coordinate={{
                  latitude: enderecoEntrega.latitude,
                  longitude: enderecoEntrega.longitude,
                }}
                title="Destino"
                pinColor="#F5A623"
              />
            )}
          </MapView>
        )}

        {/* Status atual em destaque */}
        <View
          className={`px-5 py-6 ${
            statusAtual === 'cancelado' ? 'bg-red-50' : 'bg-white'
          }`}
        >
          <Text
            className={`text-xl font-bold mb-1 ${
              statusAtual === 'cancelado'
                ? 'text-red-600'
                : 'text-verde-profundo'
            }`}
          >
            {LABELS_STATUS[statusAtual]}
          </Text>
          <Text className="text-gray-500 text-sm">
            {DESCRICAO_STATUS[statusAtual]}
          </Text>

          {statusAtual === 'cancelado' && pedido?.motivo_cancelamento && (
            <Text className="text-xs text-red-400 mt-1">
              Motivo: {pedido.motivo_cancelamento}
            </Text>
          )}

          {/* Info do entregador quando saiu para entrega */}
          {statusAtual === 'saiu_para_entrega' && courier && (
            <View className="flex-row items-center gap-3 mt-4 p-3
              bg-gray-50 rounded-xl">
              <View className="w-10 h-10 rounded-full bg-verde-profundo/20
                items-center justify-center flex-shrink-0">
                <Text className="text-verde-profundo font-bold text-sm">
                  {courier.nome?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-800">
                  {courier.nome}
                </Text>
                <Text className="text-xs text-gray-400">Entregador</Text>
              </View>
            </View>
          )}
        </View>

        {/* Timeline de status */}
        {statusAtual !== 'cancelado' && (
          <View className="bg-white mt-2 px-5 py-5">
            <Text className="text-sm font-semibold text-gray-700 mb-4">
              Acompanhamento
            </Text>

            {ORDEM_STATUS.filter((s) => s !== 'cancelado').map((status, i) => {
              const concluido = i <= indiceAtual
              const atual = i === indiceAtual
              const ultimo = i === ORDEM_STATUS.length - 2

              return (
                <View key={status} className="flex-row gap-4">
                  {/* Linha vertical + bolinha */}
                  <View className="items-center" style={{ width: 20 }}>
                    <View
                      className={`w-4 h-4 rounded-full border-2 ${
                        concluido
                          ? 'bg-verde-profundo border-verde-profundo'
                          : 'bg-white border-gray-200'
                      } ${atual ? 'scale-125' : ''}`}
                    />
                    {!ultimo && (
                      <View
                        className={`w-0.5 flex-1 min-h-6 mt-1 ${
                          concluido ? 'bg-verde-profundo' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </View>

                  {/* Label */}
                  <View className="flex-1 pb-5">
                    <Text
                      className={`text-sm ${
                        concluido
                          ? 'font-semibold text-gray-800'
                          : 'text-gray-400'
                      }`}
                    >
                      {LABELS_STATUS[status]}
                    </Text>
                    {atual && (
                      <Text className="text-xs text-verde-medio mt-0.5">
                        {DESCRICAO_STATUS[status]}
                      </Text>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* Informações do pedido */}
        <View className="bg-white mt-2 px-5 py-5">
          <Text className="text-sm font-semibold text-gray-700 mb-3">
            Itens do pedido
          </Text>

          {pedido?.order_items?.map((item: any) => (
            <View
              key={item.id}
              className="flex-row justify-between py-1.5"
            >
              <Text className="text-sm text-gray-700">
                {item.quantidade}x {item.nome}
              </Text>
              <Text className="text-sm text-gray-600">
                {formatarReais(item.subtotal)}
              </Text>
            </View>
          ))}

          <View className="border-t border-gray-100 pt-3 mt-2 gap-1">
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-500">Subtotal</Text>
              <Text className="text-sm text-gray-600">
                {formatarReais(pedido?.subtotal ?? 0)}
              </Text>
            </View>
            {(pedido?.taxa_entrega ?? 0) > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-500">Taxa de entrega</Text>
                <Text className="text-sm text-gray-600">
                  {formatarReais(pedido.taxa_entrega)}
                </Text>
              </View>
            )}
            <View className="flex-row justify-between mt-1">
              <Text className="text-sm font-bold text-gray-800">Total</Text>
              <Text className="text-sm font-bold text-verde-profundo">
                {formatarReais(pedido?.total ?? 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Endereço de entrega */}
        <View className="bg-white mt-2 px-5 py-5">
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            Endereço de entrega
          </Text>
          <Text className="text-sm text-gray-600">
            {enderecoEntrega?.rua}, {enderecoEntrega?.numero}
            {enderecoEntrega?.complemento
              ? ` — ${enderecoEntrega.complemento}`
              : ''}
          </Text>
          <Text className="text-sm text-gray-500 mt-0.5">
            {enderecoEntrega?.bairro} — {enderecoEntrega?.cidade}
          </Text>
        </View>

        {/* Contato com a loja */}
        {pedido?.stores?.telefone &&
          !['entregue', 'cancelado'].includes(statusAtual) && (
            <TouchableOpacity
              onPress={abrirWhatsApp}
              className="mx-5 mt-4 border border-verde-medio py-3.5
                rounded-2xl items-center"
              activeOpacity={0.75}
            >
              <Text className="text-verde-medio text-sm font-semibold">
                Falar com {pedido.stores.nome}
              </Text>
            </TouchableOpacity>
          )}

        {/* Botão voltar para home após entrega */}
        {statusAtual === 'entregue' && (
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            className="mx-5 mt-4 bg-verde-profundo py-4 rounded-2xl items-center"
            activeOpacity={0.85}
          >
            <Text className="text-white font-semibold">Voltar ao início</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  )
}
```

-----

## TELA DE PEDIDOS (HISTORICO)

### app/(tabs)/pedidos.tsx

```typescript
import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { formatarReais } from '@mallora/lib'
import { Skeleton } from '@/components/Skeleton'

const LABELS_STATUS: Record<string, string> = {
  novo: 'Novo',
  confirmado: 'Confirmado',
  em_preparo: 'Em preparo',
  aguardando_entregador: 'Aguardando entregador',
  saiu_para_entrega: 'Saindo para entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

const CORES_STATUS: Record<string, string> = {
  novo: '#F59E0B',
  confirmado: '#3B82F6',
  em_preparo: '#8B5CF6',
  aguardando_entregador: '#F97316',
  saiu_para_entrega: '#06B6D4',
  entregue: '#10B981',
  cancelado: '#EF4444',
}

interface Pedido {
  id: string
  status: string
  total: number
  criado_em: string
  stores: { nome: string } | null
  order_items: { nome: string; quantidade: number }[]
}

export default function TelaPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)

  async function carregarPedidos() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: consumer } = await supabase
      .from('consumers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!consumer) return

    const { data } = await supabase
      .from('orders')
      .select(`
        id, status, total, criado_em,
        stores (nome),
        order_items (nome, quantidade)
      `)
      .eq('consumer_id', consumer.id)
      .order('criado_em', { ascending: false })
      .limit(30)

    setPedidos((data as Pedido[]) ?? [])
    setCarregando(false)
  }

  useEffect(() => {
    carregarPedidos()
  }, [])

  const onRefresh = useCallback(async () => {
    setAtualizando(true)
    await carregarPedidos()
    setAtualizando(false)
  }, [])

  const pedidosAtivos = pedidos.filter(
    (p) => !['entregue', 'cancelado'].includes(p.status)
  )
  const historico = pedidos.filter((p) =>
    ['entregue', 'cancelado'].includes(p.status)
  )

  if (carregando) {
    return (
      <View className="flex-1 bg-creme px-5 pt-14">
        <Skeleton largura="50%" altura={28} />
        <View className="mt-6 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} className="bg-white rounded-2xl p-4 gap-2">
              <Skeleton largura="60%" altura={18} />
              <Skeleton largura="40%" altura={14} />
              <Skeleton largura="30%" altura={14} />
            </View>
          ))}
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-creme">
      <FlatList
        data={[...pedidosAtivos, ...historico]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 20,
          paddingTop: 56,
          paddingBottom: 100,
        }}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={onRefresh}
            tintColor="#1A4D3A"
          />
        }
        ListHeaderComponent={
          <Text className="text-2xl font-bold text-verde-profundo mb-5">
            Pedidos
          </Text>
        }
        ListEmptyComponent={
          <View className="py-16 items-center">
            <Text className="text-gray-400 text-base">
              Nenhum pedido ainda.
            </Text>
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)')}
              className="mt-3"
              activeOpacity={0.7}
            >
              <Text className="text-verde-medio">Explorar lojas</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item, index }) => {
          const isFirstHistorico =
            pedidosAtivos.length > 0 && index === pedidosAtivos.length

          return (
            <>
              {isFirstHistorico && (
                <Text className="text-sm font-semibold text-gray-400
                  uppercase mb-3 mt-2">
                  Histórico
                </Text>
              )}
              {index === 0 && pedidosAtivos.length > 0 && (
                <Text className="text-sm font-semibold text-gray-400
                  uppercase mb-3">
                  Em andamento
                </Text>
              )}
              <TouchableOpacity
                onPress={() => router.push(`/pedido/${item.id}`)}
                className="bg-white rounded-2xl p-4 mb-3"
                activeOpacity={0.85}
              >
                <View className="flex-row items-start justify-between mb-2">
                  <Text
                    className="text-sm font-bold text-gray-800 flex-1 mr-3"
                    numberOfLines={1}
                  >
                    {item.stores?.nome ?? 'Loja'}
                  </Text>
                  <View
                    className="px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor:
                        (CORES_STATUS[item.status] ?? '#6B7280') + '20',
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{
                        color: CORES_STATUS[item.status] ?? '#6B7280',
                      }}
                    >
                      {LABELS_STATUS[item.status]}
                    </Text>
                  </View>
                </View>

                <Text className="text-xs text-gray-400 mb-2" numberOfLines={1}>
                  {item.order_items
                    ?.map((i) => `${i.quantidade}x ${i.nome}`)
                    .join(', ')}
                </Text>

                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-gray-400">
                    {new Date(item.criado_em).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text className="text-sm font-bold text-verde-profundo">
                    {formatarReais(item.total)}
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          )
        }}
      />
    </View>
  )
}
```

-----

## TELA DE PERFIL

### app/(tabs)/perfil.tsx

```typescript
import { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useCartStore } from '@/store/useCartStore'
import { useOrderStore } from '@/store/useOrderStore'
import { GerenciarEnderecos } from '@/components/GerenciarEnderecos'
import { EditarPerfil } from '@/components/EditarPerfil'

type SecaoAtiva = null | 'enderecos' | 'editar'

export default function TelaPerfil() {
  const { consumer, user, limpar: limparAuth } = useAuthStore()
  const { limparCarrinho } = useCartStore()
  const { limpar: limparOrder } = useOrderStore()
  const [secaoAtiva, setSecaoAtiva] = useState<SecaoAtiva>(null)
  const [atualizando, setAtualizando] = useState(false)

  const onRefresh = useCallback(async () => {
    setAtualizando(true)
    // Recarregar dados do consumer
    const { data: { user: u } } = await supabase.auth.getUser()
    if (u) {
      const { data } = await supabase
        .from('consumers')
        .select('id, nome, telefone, foto_url, enderecos')
        .eq('user_id', u.id)
        .single()
      if (data) {
        useAuthStore.getState().setConsumer(data)
      }
    }
    setAtualizando(false)
  }, [])

  async function handleSair() {
    Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          limparAuth()
          limparCarrinho()
          limparOrder()
          router.replace('/(auth)/entrar')
        },
      },
    ])
  }

  const primeiraLetra = consumer?.nome?.charAt(0).toUpperCase() ?? '?'

  return (
    <ScrollView
      className="flex-1 bg-creme"
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={onRefresh}
          tintColor="#1A4D3A"
        />
      }
    >
      <View className="px-5 pt-14 pb-6">
        <Text className="text-2xl font-bold text-verde-profundo">Perfil</Text>
      </View>

      {/* Avatar e dados básicos */}
      <View className="bg-white px-5 py-5 flex-row items-center gap-4">
        <View className="w-16 h-16 rounded-full bg-verde-profundo
          items-center justify-center">
          <Text className="text-white text-2xl font-bold">{primeiraLetra}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-800">
            {consumer?.nome ?? 'Usuário'}
          </Text>
          <Text className="text-sm text-gray-400 mt-0.5">
            {user?.email ?? ''}
          </Text>
          {consumer?.telefone && (
            <Text className="text-sm text-gray-400">{consumer.telefone}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() =>
            setSecaoAtiva(secaoAtiva === 'editar' ? null : 'editar')
          }
          className="py-1.5 px-3 border border-gray-200 rounded-xl"
          activeOpacity={0.75}
        >
          <Text className="text-xs text-gray-600 font-medium">Editar</Text>
        </TouchableOpacity>
      </View>

      {/* Seção de edição do perfil */}
      {secaoAtiva === 'editar' && (
        <EditarPerfil onFechar={() => setSecaoAtiva(null)} />
      )}

      {/* Menu de opções */}
      <View className="bg-white mt-4">
        <MenuItem
          label="Meus endereços"
          descricao={`${consumer?.enderecos?.length ?? 0} endereço(s) salvo(s)`}
          onPress={() =>
            setSecaoAtiva(secaoAtiva === 'enderecos' ? null : 'enderecos')
          }
          expandido={secaoAtiva === 'enderecos'}
        />

        {secaoAtiva === 'enderecos' && (
          <GerenciarEnderecos
            enderecos={consumer?.enderecos ?? []}
            onAtualizar={(novos) => {
              const c = useAuthStore.getState().consumer
              if (c) useAuthStore.getState().setConsumer({ ...c, enderecos: novos })
            }}
          />
        )}

        <MenuItem
          label="Histórico de pedidos"
          onPress={() => router.push('/(tabs)/pedidos')}
        />

        <MenuItem
          label="Termos de uso"
          onPress={() => {}}
        />

        <MenuItem
          label="Política de privacidade"
          onPress={() => {}}
        />
      </View>

      {/* Sair */}
      <TouchableOpacity
        onPress={handleSair}
        className="mx-5 mt-6 border border-red-200 py-4 rounded-2xl
          items-center"
        activeOpacity={0.75}
      >
        <Text className="text-red-500 font-semibold text-sm">Sair da conta</Text>
      </TouchableOpacity>

      <Text className="text-xs text-gray-300 text-center mt-6">
        Versão 1.0.0
      </Text>
    </ScrollView>
  )
}

function MenuItem({
  label,
  descricao,
  onPress,
  expandido,
}: {
  label: string
  descricao?: string
  onPress: () => void
  expandido?: boolean
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between px-5 py-4
        border-b border-gray-50"
      activeOpacity={0.75}
    >
      <View>
        <Text className="text-sm font-medium text-gray-800">{label}</Text>
        {descricao && (
          <Text className="text-xs text-gray-400 mt-0.5">{descricao}</Text>
        )}
      </View>
      <Text className="text-gray-300 text-lg">
        {expandido ? '∧' : '›'}
      </Text>
    </TouchableOpacity>
  )
}
```

-----

## COMPONENTE EDITAR PERFIL

### components/EditarPerfil.tsx

```typescript
import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'

export function EditarPerfil({ onFechar }: { onFechar: () => void }) {
  const { consumer, setConsumer } = useAuthStore()
  const [nome, setNome] = useState(consumer?.nome ?? '')
  const [telefone, setTelefone] = useState(consumer?.telefone ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSalvar() {
    if (!nome.trim()) {
      setErro('O nome é obrigatório.')
      return
    }

    setSalvando(true)
    setErro(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('consumers')
      .update({ nome: nome.trim(), telefone: telefone.trim() || null })
      .eq('user_id', user.id)

    if (error) {
      setErro('Erro ao salvar. Tente novamente.')
      setSalvando(false)
      return
    }

    if (consumer) {
      setConsumer({
        ...consumer,
        nome: nome.trim(),
        telefone: telefone.trim() || undefined,
      })
    }

    setSalvando(false)
    onFechar()
  }

  return (
    <View className="bg-gray-50 px-5 py-4 border-b border-gray-100">
      {erro && (
        <Text className="text-red-500 text-sm mb-3">{erro}</Text>
      )}

      <View className="gap-3">
        <View>
          <Text className="text-xs font-medium text-gray-600 mb-1">Nome</Text>
          <TextInput
            value={nome}
            onChangeText={setNome}
            placeholder="Seu nome completo"
            placeholderTextColor="#9CA3AF"
            className="bg-white border border-gray-200 rounded-xl
              px-4 py-3 text-sm text-gray-700"
          />
        </View>

        <View>
          <Text className="text-xs font-medium text-gray-600 mb-1">
            Telefone (opcional)
          </Text>
          <TextInput
            value={telefone}
            onChangeText={setTelefone}
            placeholder="(37) 99999-9999"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            className="bg-white border border-gray-200 rounded-xl
              px-4 py-3 text-sm text-gray-700"
          />
        </View>

        <View className="flex-row gap-2 mt-1">
          <TouchableOpacity
            onPress={onFechar}
            className="flex-1 border border-gray-200 py-3 rounded-xl items-center"
            activeOpacity={0.7}
          >
            <Text className="text-gray-500 text-sm font-medium">Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSalvar}
            disabled={salvando}
            className="flex-1 bg-verde-profundo py-3 rounded-xl items-center
              disabled:opacity-50"
            activeOpacity={0.85}
          >
            {salvando ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white text-sm font-semibold">Salvar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}
```

-----

## COMPONENTE GERENCIAR ENDERECOS

### components/GerenciarEnderecos.tsx

```typescript
import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import type { Endereco } from '@mallora/types'

interface Props {
  enderecos: Endereco[]
  onAtualizar: (novos: Endereco[]) => void
}

export function GerenciarEnderecos({ enderecos, onAtualizar }: Props) {
  const [removendo, setRemovendo] = useState<number | null>(null)

  async function handleRemover(indice: number) {
    Alert.alert(
      'Remover endereço',
      'Deseja remover este endereço?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            setRemovendo(indice)

            const novos = enderecos.filter((_, i) => i !== indice)
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
              await supabase
                .from('consumers')
                .update({ enderecos: novos })
                .eq('user_id', user.id)
            }

            onAtualizar(novos)
            setRemovendo(null)
          },
        },
      ]
    )
  }

  if (enderecos.length === 0) {
    return (
      <View className="bg-gray-50 px-5 py-4 border-b border-gray-100">
        <Text className="text-sm text-gray-400 text-center py-3">
          Nenhum endereço salvo ainda.
        </Text>
        <Text className="text-xs text-gray-300 text-center">
          Adicione um endereço ao fazer seu próximo pedido.
        </Text>
      </View>
    )
  }

  return (
    <View className="bg-gray-50 border-b border-gray-100">
      {enderecos.map((end, i) => (
        <View
          key={i}
          className="flex-row items-start justify-between
            px-5 py-4 border-b border-gray-100"
        >
          <View className="flex-1 mr-3">
            <Text className="text-sm font-semibold text-gray-800">
              {end.apelido ?? end.rua}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              {end.rua}, {end.numero}
              {end.complemento ? ` — ${end.complemento}` : ''}
            </Text>
            <Text className="text-xs text-gray-400">
              {end.bairro} — {end.cidade}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => handleRemover(i)}
            disabled={removendo === i}
            className="py-1"
            activeOpacity={0.7}
          >
            <Text className="text-red-400 text-xs font-medium">
              {removendo === i ? '...' : 'Remover'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  )
}
```

-----

## CHECKLIST DO MODULO

- [ ] Realtime ativo para a tabela `orders` no Supabase (arquivo 12)
- [ ] Realtime ativo para a tabela `courier_locations`
- [ ] `react-native-maps` instalado — requer configuração no Xcode (iOS)
  e no `android/app/src/main/AndroidManifest.xml` com a chave Google Maps
- [ ] Política RLS de `courier_locations` permite SELECT ao consumidor
  apenas enquanto entrega estiver ativa (arquivo 05)
- [ ] WhatsApp deeplink usa formato `https://wa.me/55XXXXXXXXXX`
  sem caracteres especiais no número
- [ ] Timeline de status oculta o status `cancelado` do fluxo normal
  e exibe mensagem de cancelamento separada
- [ ] `useOrderStore.limpar()` chamado ao fazer logout para não vazar estado
- [ ] Histórico de pedidos separado visualmente de pedidos em andamento
- [ ] Endereços removidos com `Alert.alert` de confirmação antes de deletar
- [ ] `onRefresh` no perfil recarrega dados atualizados do consumer do banco

-----

*Arquivo 18 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 19 — Entregador — Modelo, Auth e Cadastro*
