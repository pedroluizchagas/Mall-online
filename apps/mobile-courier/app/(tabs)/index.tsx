import { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useEntregaStore } from '@/store/useEntregaStore'
import { EntregaDisponivelCard } from '@/components/EntregaDisponivelCard'
import { HistoricoEntregasDia } from '@/components/HistoricoEntregasDia'

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
      .channel(`entregas-disponiveis-${courier.id}`)
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
      if (!valor) setDisponiveis([])
    } else {
      Alert.alert('Erro', 'Não foi possível atualizar o status.')
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

    await supabase
      .from('orders')
      .update({ status: 'saiu_para_entrega' })
      .eq('id', entrega.id)

    await iniciarEntregaAtiva(entrega)
  }

  async function handleRecusar(entrega: any) {
    const chave = entrega.assignment_id
    const recusas = (recusasRef.current[chave] ?? 0) + 1
    recusasRef.current[chave] = recusas

    useEntregaStore.getState().removerDisponivel(entrega.id)

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
      store_endereco: formatarEndereco(d.orders.stores.endereco),
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
              <Text className="text-sm font-semibold text-gray-500 uppercase mb-4">
                {disponiveis.length} entrega{disponiveis.length !== 1 ? 's' : ''} disponível
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View className="py-16 items-center">
              {!courier?.online ? (
                <>
                  <HistoricoEntregasDia />
                  <Text className="text-gray-400 text-base font-medium mb-1 mt-4">
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
