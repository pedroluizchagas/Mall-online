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
import { supabase } from '@/lib/supabase'
import { useOrderStore } from '@/store/useOrderStore'
import { useLocalizacaoCourier } from '@/hooks/useLocalizacaoCourier'
import { MapaEntregador } from '@/components/MapaEntregador'
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
  const { setStatusAtual } = useOrderStore()

  const [pedido, setPedido] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)

  const courierId = pedido?.delivery_assignments?.[0]?.courier_id ?? null
  const localizacao = useLocalizacaoCourier(courierId)

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

    return () => {
      supabase.removeChannel(canal)
    }
  }, [id])

  function abrirWhatsApp() {
    const telefone = pedido?.stores?.telefone?.replace(/\D/g, '')
    if (!telefone) return
    const numero = telefone.startsWith('55') ? telefone : `55${telefone}`
    Linking.openURL(
      `https://wa.me/${numero}?text=Olá, tenho uma dúvida sobre meu pedido`
    )
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
          <MapaEntregador
            localizacao={localizacao}
            enderecoEntrega={enderecoEntrega}
          />
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
            <View className="flex-row items-center gap-3 mt-4 p-3 bg-gray-50 rounded-xl">
              <View className="w-10 h-10 rounded-full bg-verde-profundo/20 items-center justify-center flex-shrink-0">
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
              className="mx-5 mt-4 border border-verde-medio py-3.5 rounded-2xl items-center"
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
