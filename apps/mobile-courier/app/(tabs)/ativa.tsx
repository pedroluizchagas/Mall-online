import { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Linking,
  ScrollView,
} from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useEntregaStore } from '@/store/useEntregaStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useLocalizacaoEntrega } from '@/hooks/useLocalizacaoEntrega'
import { ModalConfirmacaoEntrega } from '@/components/ModalConfirmacaoEntrega'
import { formatarReais } from '@mallora/lib'

export default function TelaEntregaAtiva() {
  const { ativa, setAtiva } = useEntregaStore()
  const { courier } = useAuthStore()
  const [locAtual, setLocAtual] = useState<{ latitude: number; longitude: number } | null>(null)
  const [modalConfirmacao, setModalConfirmacao] = useState(false)

  // Redirecionar se não há entrega ativa
  useEffect(() => {
    if (!ativa) {
      router.replace('/(tabs)')
    }
  }, [ativa])

  // Hook de rastreamento GPS — inicia ao montar, para ao desmontar ou ativa=null
  const { pararRastreamento } = useLocalizacaoEntrega({
    courierId: courier?.id ?? '',
    assignmentId: ativa?.assignment_id ?? '',
    ativo: !!ativa && !!courier?.id,
    onLocalizacaoAtualizada: setLocAtual,
  })

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

    // Parar transmissão e limpar assignment_id no banco
    await pararRastreamento()

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
  const destino =
    fase === 'ir_a_loja'
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
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {/* Endereço de destino */}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-xs font-semibold text-gray-500 uppercase mb-1">
              {fase === 'ir_a_loja' ? 'Endereço da loja' : 'Endereço de entrega'}
            </Text>
            <Text className="text-sm font-semibold text-gray-800">{destino.nome}</Text>
            <Text className="text-sm text-gray-500 mt-0.5">
              {fase === 'ir_a_loja'
                ? ativa.store_endereco ?? 'Endereço não disponível'
                : ativa.consumer_endereco}
            </Text>

            {destino.lat && destino.lng && (
              <TouchableOpacity
                onPress={() => abrirRota(destino.lat, destino.lng)}
                className="mt-3 border border-[#4CAF82] py-2.5 rounded-xl items-center"
                activeOpacity={0.75}
              >
                <Text className="text-[#4CAF82] text-sm font-semibold">
                  Abrir rota no Google Maps
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Valor da entrega */}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-gray-500">Valor da entrega</Text>
              <Text className="text-lg font-bold text-[#1A4D3A]">
                {formatarReais(ativa.valor_entrega)}
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
              className="bg-white rounded-2xl p-4 mb-4 flex-row items-center justify-between"
              activeOpacity={0.75}
            >
              <Text className="text-sm text-gray-700">Falar com {ativa.store_nome}</Text>
              <Text className="text-[#4CAF82] text-sm font-semibold">WhatsApp</Text>
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
              <Text className="text-white font-bold text-base">Confirmar coleta na loja</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setModalConfirmacao(true)}
              className="bg-[#4CAF82] py-4 rounded-2xl items-center"
              activeOpacity={0.85}
            >
              <Text className="text-white font-bold text-base">Confirmar entrega</Text>
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
