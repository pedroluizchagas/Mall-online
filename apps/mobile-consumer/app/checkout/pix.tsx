import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Share,
  Alert,
} from 'react-native'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { formatarReais } from '@mallora/lib'

interface PixOrder {
  id: string
  total: number
  payment_status: string
  pagarme_qr_code: string | null
  pagarme_qr_code_url: string | null
  pagarme_qr_code_expires_at: string | null
}

export default function TelaCheckoutPix() {
  const { order_id } = useLocalSearchParams<{ order_id: string }>()
  const [pedido, setPedido] = useState<PixOrder | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!order_id) {
      setErro('Pedido não informado.')
      setCarregando(false)
      return
    }

    let ativo = true

    async function carregar() {
      const { data, error } = await supabase
        .from('orders')
        .select(
          'id, total, payment_status, pagarme_qr_code, pagarme_qr_code_url, pagarme_qr_code_expires_at'
        )
        .eq('id', order_id!)
        .single()

      if (!ativo) return

      if (error) {
        setErro(error.message)
      } else {
        setPedido(data as PixOrder)
      }
      setCarregando(false)
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [order_id])

  // Realtime: aguardar payment_status='pago' e redirecionar para a tela
  // de acompanhamento do pedido.
  useEffect(() => {
    if (!order_id) return

    const canal = supabase
      .channel(`pedido-pix-${order_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order_id}`,
        },
        (payload) => {
          const novo = payload.new as PixOrder
          setPedido((prev) => (prev ? { ...prev, ...novo } : prev))

          if (novo.payment_status === 'pago') {
            router.replace(`/pedido/${order_id}`)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [order_id])

  async function compartilharCodigo() {
    if (!pedido?.pagarme_qr_code) return
    try {
      await Share.share({ message: pedido.pagarme_qr_code })
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível compartilhar.')
    }
  }

  if (carregando) {
    return (
      <View className="flex-1 bg-creme items-center justify-center">
        <ActivityIndicator size="large" color="#1A4D3A" />
        <Text className="text-gray-500 mt-4">Gerando seu Pix...</Text>
      </View>
    )
  }

  if (erro || !pedido) {
    return (
      <View className="flex-1 bg-creme items-center justify-center px-6">
        <Text className="text-base font-semibold text-gray-700 mb-2 text-center">
          {erro ?? 'Pedido não encontrado.'}
        </Text>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Text className="text-verde-medio">Voltar ao início</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const aguardandoQr =
    !pedido.pagarme_qr_code_url || !pedido.pagarme_qr_code

  return (
    <View className="flex-1 bg-creme">
      <Stack.Screen options={{ presentation: 'modal' }} />

      <View className="flex-row items-center justify-between px-5 pt-14 pb-4 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text className="text-verde-medio text-base">Fechar</Text>
        </TouchableOpacity>
        <Text className="text-base font-bold text-verde-profundo">
          Pagamento via Pix
        </Text>
        <View className="w-12" />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="bg-white border-t border-b border-gray-100 px-5 py-6 items-center">
          <Text className="text-sm text-gray-400 mb-1">Total a pagar</Text>
          <Text className="text-2xl font-bold text-verde-profundo mb-6">
            {formatarReais(pedido.total)}
          </Text>

          {aguardandoQr ? (
            <View className="items-center py-10">
              <ActivityIndicator size="large" color="#1A4D3A" />
              <Text className="text-gray-500 mt-4">
                Aguardando emissão do QR Code...
              </Text>
            </View>
          ) : (
            <Image
              source={{ uri: pedido.pagarme_qr_code_url! }}
              style={{ width: 240, height: 240 }}
              resizeMode="contain"
            />
          )}

          <Text className="text-xs text-gray-400 mt-4 text-center">
            Aponte o app do seu banco para o QR Code ou copie o código abaixo.
          </Text>
        </View>

        {!aguardandoQr && (
          <View className="bg-white border-t border-b border-gray-100 px-5 py-5 mt-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Pix Copia e Cola
            </Text>
            <Text
              selectable
              className="text-xs text-gray-700 border border-gray-200 rounded-xl px-4 py-3 bg-gray-50"
            >
              {pedido.pagarme_qr_code}
            </Text>

            <TouchableOpacity
              onPress={compartilharCodigo}
              className="bg-verde-profundo py-3 rounded-2xl items-center mt-3"
              activeOpacity={0.85}
            >
              <Text className="text-white font-bold text-sm">
                Copiar / Compartilhar código
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="bg-white border-t border-b border-gray-100 px-5 py-5 mt-4">
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#1A4D3A" />
            <Text className="text-sm text-gray-700 flex-1">
              Aguardando confirmação do pagamento. Esta tela atualiza
              automaticamente.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
