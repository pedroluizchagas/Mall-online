import { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useEntregaStore } from '@/store/useEntregaStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useLocalizacaoEntrega } from '@/hooks/useLocalizacaoEntrega'
import { ModalConfirmacaoEntrega } from '@/components/ModalConfirmacaoEntrega'
import { formatarReais } from '@mallora/lib'
import { CourierIcon } from '@/components/CourierIcon'
import { courierDesign } from '@/lib/courier-design'

export default function TelaEntregaAtiva() {
  const { ativa, setAtiva } = useEntregaStore()
  const { courier } = useAuthStore()
  const [locAtual, setLocAtual] = useState<{ latitude: number; longitude: number } | null>(null)
  const [modalConfirmacao, setModalConfirmacao] = useState(false)
  const [aba, setAba] = useState<'tracking' | 'detalhes'>('tracking')
  const { colors } = courierDesign

  useEffect(() => {
    if (!ativa) {
      setAba('tracking')
    }
  }, [ativa])

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

  const regiaoInicial = useMemo(() => {
    const latitude = locAtual?.latitude ?? ativa?.store_lat ?? ativa?.consumer_lat
    const longitude = locAtual?.longitude ?? ativa?.store_lng ?? ativa?.consumer_lng

    if (!latitude || !longitude) return undefined

    return {
      latitude,
      longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }
  }, [ativa?.consumer_lat, ativa?.consumer_lng, ativa?.store_lat, ativa?.store_lng, locAtual])

  if (!ativa) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.canvas }}>
        <View className="flex-1 px-5 items-center justify-center">
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-5"
            style={{ backgroundColor: colors.accentSoft }}
          >
            <CourierIcon name="route" color={colors.ink} size={24} />
          </View>
          <Text className="text-2xl font-bold mb-2" style={{ color: colors.ink }}>
            Nenhuma rota ativa
          </Text>
          <Text className="text-center mb-6" style={{ color: colors.inkMuted }}>
            Assim que voce aceitar uma entrega, o mapa e o acompanhamento ao vivo aparecem aqui.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)')}
            className="rounded-full px-6 py-3"
            style={{ backgroundColor: colors.ink }}
            activeOpacity={0.85}
          >
            <Text className="font-bold" style={{ color: colors.accent }}>
              Voltar para a home
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const fase = ativa.status === 'aceita' ? 'ir_a_loja' : 'ir_ao_consumidor'
  const destino =
    fase === 'ir_a_loja'
      ? { lat: ativa.store_lat, lng: ativa.store_lng, nome: ativa.store_nome }
      : { lat: ativa.consumer_lat, lng: ativa.consumer_lng, nome: ativa.consumer_nome }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.canvas }}>
      <MapView
        style={{ flex: 1 }}
        showsUserLocation
        region={regiaoInicial}
      >
        {!!ativa.store_lat && !!ativa.store_lng && (
          <Marker
            coordinate={{ latitude: ativa.store_lat, longitude: ativa.store_lng }}
            title={ativa.store_nome}
            pinColor={fase === 'ir_a_loja' ? colors.accentStrong : colors.ink}
          />
        )}

        {!!ativa.consumer_lat && !!ativa.consumer_lng && (
          <Marker
            coordinate={{ latitude: ativa.consumer_lat, longitude: ativa.consumer_lng }}
            title={ativa.consumer_nome}
            pinColor={fase === 'ir_ao_consumidor' ? colors.accentStrong : '#9CA3AF'}
          />
        )}
      </MapView>

      <SafeAreaView className="absolute inset-x-0 top-0 bottom-0">
        <View className="px-5 pt-4 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.push('/(tabs)')}
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}
            activeOpacity={0.8}
          >
            <CourierIcon name="back" color={colors.ink} />
          </TouchableOpacity>

          <View
            className="px-4 py-2 rounded-full"
            style={{ backgroundColor: 'rgba(17,18,22,0.9)' }}
          >
            <Text className="text-sm font-semibold" style={{ color: colors.accent }}>
              {fase === 'ir_a_loja' ? 'Coleta' : 'Entrega'}
            </Text>
          </View>
        </View>

        <View className="flex-1 justify-end px-3 pb-3">
          <View
            className="rounded-[34px] px-4 pt-4 pb-5"
            style={{ backgroundColor: colors.ink }}
          >
            <View className="items-center mb-4">
              <View className="w-12 h-1.5 rounded-full" style={{ backgroundColor: '#5A5D64' }} />
            </View>

            <View
              className="rounded-full p-1 flex-row mb-4"
              style={{ backgroundColor: colors.surfaceDarkSoft }}
            >
              <TouchableOpacity
                onPress={() => setAba('tracking')}
                className="flex-1 py-3 rounded-full items-center"
                style={{ backgroundColor: aba === 'tracking' ? colors.accent : 'transparent' }}
                activeOpacity={0.85}
              >
                <Text className="text-sm font-semibold" style={{ color: aba === 'tracking' ? colors.ink : '#BFC2C8' }}>
                  Tracking Detail
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setAba('detalhes')}
                className="flex-1 py-3 rounded-full items-center"
                style={{ backgroundColor: aba === 'detalhes' ? colors.accent : 'transparent' }}
                activeOpacity={0.85}
              >
                <Text className="text-sm font-semibold" style={{ color: aba === 'detalhes' ? colors.ink : '#BFC2C8' }}>
                  Shipping Detail
                </Text>
              </TouchableOpacity>
            </View>

            {aba === 'tracking' ? (
              <>
                <Text className="text-xs mb-1" style={{ color: '#8D9198' }}>
                  Tracking ID
                </Text>
                <Text className="text-white text-2xl font-bold mb-4">
                  #{ativa.order_id.slice(0, 8).toUpperCase()}
                </Text>

                <Text className="text-xs mb-1" style={{ color: '#8D9198' }}>
                  Current Location
                </Text>
                <Text className="text-sm mb-5" style={{ color: '#F1F2F4' }}>
                  {fase === 'ir_a_loja'
                    ? ativa.store_endereco ?? 'Endereco nao disponivel'
                    : ativa.consumer_endereco}
                </Text>

                <TrackingStep
                  ativo
                  titulo={fase === 'ir_a_loja' ? 'Indo ate a loja' : 'Pedido em deslocamento'}
                  descricao={
                    fase === 'ir_a_loja'
                      ? `Destino atual: ${ativa.store_nome}`
                      : `Entrega para ${ativa.consumer_nome}`
                  }
                />
                <TrackingStep
                  ativo={ativa.status === 'coletada'}
                  titulo="Coleta confirmada"
                  descricao="Atualize esta etapa assim que retirar o pedido."
                />
                <TrackingStep
                  ativo={false}
                  titulo="Entrega concluida"
                  descricao="Finalize com o codigo ou comprovante do pedido."
                  ultimo
                />
              </>
            ) : (
              <>
                <View className="flex-row gap-3 mb-4">
                  <MetricCard
                    icon="cash"
                    label="Valor"
                    value={formatarReais(ativa.valor_entrega)}
                  />
                  <MetricCard
                    icon="package"
                    label="Codigo"
                    value={ativa.codigo_confirmacao ?? 'Pendente'}
                  />
                </View>

                <View className="rounded-[24px] p-4 mb-4" style={{ backgroundColor: colors.surfaceDarkSoft }}>
                  <RouteLine
                    icon="store"
                    label="Coleta"
                    title={ativa.store_nome}
                    subtitle={ativa.store_endereco ?? 'Endereco nao disponivel'}
                  />
                  <View className="ml-5 my-3 w-px h-5" style={{ backgroundColor: colors.lineDark }} />
                  <RouteLine
                    icon="pin"
                    label="Entrega"
                    title={ativa.consumer_nome}
                    subtitle={ativa.consumer_endereco}
                  />
                </View>

                {ativa.store_telefone && (
                  <TouchableOpacity
                    onPress={() => {
                      const num = ativa.store_telefone!.replace(/\D/g, '')
                      Linking.openURL(`https://wa.me/55${num}`)
                    }}
                    className="rounded-full py-3 items-center flex-row justify-center gap-2 mb-4"
                    style={{ backgroundColor: colors.surfaceDarkSoft }}
                    activeOpacity={0.8}
                  >
                    <CourierIcon name="phone" color={colors.white} size={18} />
                    <Text className="text-sm font-semibold text-white">
                      Falar com a loja
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {destino.lat && destino.lng && (
              <TouchableOpacity
                onPress={() => abrirRota(destino.lat, destino.lng)}
                className="rounded-full py-3 items-center mb-3"
                style={{ backgroundColor: colors.surfaceDarkSoft }}
                activeOpacity={0.8}
              >
                <Text className="text-sm font-semibold text-white">
                  Abrir rota no Google Maps
                </Text>
              </TouchableOpacity>
            )}

            {fase === 'ir_a_loja' ? (
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Confirmar coleta',
                    `Voce coletou o pedido em ${ativa.store_nome}?`,
                    [
                      { text: 'Nao', style: 'cancel' },
                      { text: 'Sim, coletei', onPress: handleConfirmarColeta },
                    ]
                  )
                }}
                className="py-4 rounded-full items-center"
                style={{ backgroundColor: colors.accent }}
                activeOpacity={0.85}
              >
                <Text className="font-bold text-base" style={{ color: colors.ink }}>
                  Confirmar coleta na loja
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setModalConfirmacao(true)}
                className="py-4 rounded-full items-center"
                style={{ backgroundColor: colors.accent }}
                activeOpacity={0.85}
              >
                <Text className="font-bold text-base" style={{ color: colors.ink }}>
                  Confirmar entrega
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

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

function TrackingStep({
  titulo,
  descricao,
  ativo,
  ultimo,
}: {
  titulo: string
  descricao: string
  ativo: boolean
  ultimo?: boolean
}) {
  const { colors } = courierDesign

  return (
    <View className={`flex-row ${ultimo ? 'mb-5' : 'mb-4'}`}>
      <View className="items-center mr-3">
        <View
          className="w-3 h-3 rounded-full mt-1"
          style={{ backgroundColor: ativo ? colors.accent : '#5A5D64' }}
        />
        {!ultimo && <View className="w-px h-10 mt-1" style={{ backgroundColor: '#4F5258' }} />}
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-white">{titulo}</Text>
        <Text className="text-xs mt-1" style={{ color: '#A9ADB4' }}>
          {descricao}
        </Text>
      </View>
    </View>
  )
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: Parameters<typeof CourierIcon>[0]['name']
  label: string
  value: string
}) {
  const { colors } = courierDesign

  return (
    <View
      className="flex-1 rounded-[22px] p-4"
      style={{ backgroundColor: colors.surfaceDarkSoft }}
    >
      <View
        className="w-9 h-9 rounded-full items-center justify-center mb-3"
        style={{ backgroundColor: '#4B4D52' }}
      >
        <CourierIcon name={icon} color={colors.white} size={18} />
      </View>
      <Text className="text-xs mb-1" style={{ color: '#A9ADB4' }}>
        {label}
      </Text>
      <Text className="text-sm font-semibold text-white">{value}</Text>
    </View>
  )
}

function RouteLine({
  icon,
  label,
  title,
  subtitle,
}: {
  icon: Parameters<typeof CourierIcon>[0]['name']
  label: string
  title: string
  subtitle: string
}) {
  const { colors } = courierDesign

  return (
    <View className="flex-row items-start gap-3">
      <View
        className="w-10 h-10 rounded-full items-center justify-center mt-0.5"
        style={{ backgroundColor: '#4B4D52' }}
      >
        <CourierIcon name={icon} color={colors.white} size={18} />
      </View>
      <View className="flex-1">
        <Text className="text-xs font-semibold uppercase" style={{ color: '#A9ADB4' }}>
          {label}
        </Text>
        <Text className="text-sm font-semibold text-white mt-1">{title}</Text>
        <Text className="text-xs mt-1" style={{ color: '#D3D5D9' }}>
          {subtitle}
        </Text>
      </View>
    </View>
  )
}
