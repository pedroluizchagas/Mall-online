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
    const {
      data: { user },
    } = await supabase.auth.getUser()
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
                <Text className="text-sm font-semibold text-gray-400 uppercase mb-3 mt-2">
                  Histórico
                </Text>
              )}
              {index === 0 && pedidosAtivos.length > 0 && (
                <Text className="text-sm font-semibold text-gray-400 uppercase mb-3">
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
