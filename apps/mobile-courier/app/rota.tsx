import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Linking,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { formatarReais } from '@mallevo/lib'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useRotaStore, proximaParada, type ParadaRota } from '@/store/useRotaStore'
import { useLocalizacaoEntrega } from '@/hooks/useLocalizacaoEntrega'
import { ModalConfirmacaoEntrega } from '@/components/ModalConfirmacaoEntrega'
import { CourierIcon } from '@/components/CourierIcon'
import { courierDesign } from '@/lib/courier-design'
import {
  carregarRotaAtiva,
  confirmarColetaRota,
  confirmarEntregaDrop,
  concluirRota,
  formatarDistancia,
} from '@/lib/rota'

/**
 * Execução de rota multi-parada (docs/31-logistica-de-entrega.md §5).
 *
 * A tela legada (tabs)/ativa.tsx continua atendendo o fluxo de 1 entrega
 * atribuída manualmente pelo lojista. Esta atende rotas do despacho
 * automático — que no caso de 1 drop é a mesma coisa com 2 paradas.
 */
export default function TelaRota() {
  const { courier } = useAuthStore()
  const { rota, setRota, concluirParada } = useRotaStore()
  const [carregando, setCarregando] = useState(true)
  const [modalEntrega, setModalEntrega] = useState<ParadaRota | null>(null)
  const [processando, setProcessando] = useState(false)
  const { colors, radius } = courierDesign

  const parada = proximaParada(rota)
  const concluidas = rota?.paradas.filter((p) => p.status === 'concluida').length ?? 0
  const total = rota?.paradas.length ?? 0

  // Rastreamento em tempo real: vinculado ao assignment do drop atual, que é
  // o que a RLS do consumidor usa para liberar courier_locations (docs/21).
  useLocalizacaoEntrega({
    courierId: courier?.id ?? '',
    assignmentId: parada?.assignment_id ?? '',
    ativo: !!rota && !!courier?.id && !!parada?.assignment_id,
  })

  const recarregar = useCallback(async () => {
    if (!courier?.id) return
    const r = await carregarRotaAtiva(courier.id)
    setRota(r)
    setCarregando(false)
    if (!r) router.replace('/(tabs)')
  }, [courier?.id, setRota])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  // Realtime: o lojista pode cancelar um pedido da rota enquanto ela roda
  useEffect(() => {
    if (!rota?.route_id) return

    const canal = supabase
      .channel(`rota-${rota.route_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_routes',
          filter: `id=eq.${rota.route_id}`,
        },
        (payload) => {
          if (payload.new.status === 'cancelada') {
            Alert.alert('Rota cancelada', 'Esta rota foi cancelada.')
            setRota(null)
            router.replace('/(tabs)')
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [rota?.route_id, setRota])

  async function handleColeta(p: ParadaRota) {
    if (!rota) return
    const volumes = rota.paradas
      .filter((x) => x.tipo === 'entrega')
      .reduce((acc, x) => acc + (x.volumes ?? 1), 0)

    Alert.alert(
      'Confirmar coleta',
      `Confira ${volumes} volume${volumes > 1 ? 's' : ''} antes de sair de ${p.titulo}.`,
      [
        { text: 'Ainda não', style: 'cancel' },
        {
          text: 'Coletei tudo',
          onPress: async () => {
            setProcessando(true)
            await confirmarColetaRota(rota.route_id, p.id)
            concluirParada(p.id)
            setProcessando(false)
          },
        },
      ],
    )
  }

  async function handleEntregaConfirmada(comprovanteUrl?: string) {
    if (!rota || !modalEntrega) return

    setProcessando(true)
    await confirmarEntregaDrop(modalEntrega, comprovanteUrl)
    concluirParada(modalEntrega.id)

    const restantes = rota.paradas.filter(
      (p) => p.id !== modalEntrega.id && p.status !== 'concluida',
    )

    setModalEntrega(null)
    setProcessando(false)

    if (restantes.length === 0) {
      await concluirRota(rota.route_id)
      setRota(null)
      Alert.alert('Rota concluída', `Você ganhou ${formatarReais(rota.ganho_total)}.`)
      router.replace('/(tabs)')
    }
  }

  function abrirNavegacao() {
    if (!rota) return
    // Waypoints: leva o entregador pela rota inteira, não parada a parada
    const pendentes = rota.paradas
      .filter((p) => p.status !== 'concluida' && p.lat && p.lng)
      .sort((a, b) => a.ordem - b.ordem)

    if (pendentes.length === 0) return

    const destino = pendentes[pendentes.length - 1]
    const intermediarias = pendentes.slice(0, -1)
    const waypoints = intermediarias.map((p) => `${p.lat},${p.lng}`).join('|')

    const url =
      `https://www.google.com/maps/dir/?api=1&destination=${destino.lat},${destino.lng}` +
      (waypoints ? `&waypoints=${waypoints}` : '') +
      '&travelmode=driving'

    Linking.openURL(url)
  }

  if (carregando) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.ink} />
      </SafeAreaView>
    )
  }

  if (!rota || !parada) return null

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      {/* Cabeçalho: progresso da rota */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>
              {rota.drops > 1 ? `Rota com ${rota.drops} entregas` : 'Entrega em andamento'}
            </Text>
            <Text style={{ fontSize: 13, color: colors.inkSoft, marginTop: 2 }}>
              {concluidas} de {total} paradas · {formatarDistancia(rota.distancia_total_m)}
            </Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>
            {formatarReais(rota.ganho_total)}
          </Text>
        </View>

        {/* Barra de progresso */}
        <View
          style={{
            height: 6,
            backgroundColor: colors.surfaceMuted,
            borderRadius: 3,
            marginTop: 14,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${total ? (concluidas / total) * 100 : 0}%`,
              height: '100%',
              backgroundColor: colors.accentStrong,
            }}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        {/* Parada atual em destaque */}
        <View
          style={{
            backgroundColor: colors.surfaceDark,
            borderRadius: radius.md,
            padding: 18,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accent, textTransform: 'uppercase' }}>
            {parada.tipo === 'coleta' ? 'Coletar agora' : `Entrega ${parada.ordem} de ${rota.drops}`}
          </Text>
          <Text style={{ fontSize: 19, fontWeight: '800', color: colors.white, marginTop: 6 }}>
            {parada.titulo}
          </Text>
          <Text style={{ fontSize: 13, color: colors.inkSoft, marginTop: 3 }}>
            {parada.endereco ?? 'Endereço não informado'}
          </Text>

          {parada.tipo === 'entrega' && (parada.volumes ?? 1) > 1 && (
            <Text style={{ fontSize: 12, color: colors.warning, marginTop: 8 }}>
              {parada.volumes} volumes
            </Text>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              onPress={abrirNavegacao}
              activeOpacity={0.8}
              style={{
                flex: 1,
                flexDirection: 'row',
                gap: 8,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.lineDark,
                paddingVertical: 12,
                borderRadius: radius.sm,
              }}
            >
              <CourierIcon name="route" size={16} color={colors.white} />
              <Text style={{ color: colors.white, fontWeight: '600', fontSize: 13 }}>Navegar</Text>
            </TouchableOpacity>

            {parada.telefone ? (
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(`https://wa.me/55${parada.telefone!.replace(/\D/g, '')}`)
                }
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.lineDark,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: radius.sm,
                }}
              >
                <CourierIcon name="phone" size={16} color={colors.white} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={() =>
              parada.tipo === 'coleta' ? handleColeta(parada) : setModalEntrega(parada)
            }
            disabled={processando}
            activeOpacity={0.85}
            style={{
              backgroundColor: colors.accent,
              paddingVertical: 15,
              borderRadius: radius.sm,
              alignItems: 'center',
              marginTop: 10,
              opacity: processando ? 0.6 : 1,
            }}
          >
            {processando ? (
              <ActivityIndicator size="small" color={colors.ink} />
            ) : (
              <Text style={{ color: colors.ink, fontWeight: '800' }}>
                {parada.tipo === 'coleta' ? 'Confirmar coleta' : 'Confirmar entrega'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Demais paradas da rota */}
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: colors.inkSoft,
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          Sequência da rota
        </Text>

        {rota.paradas.map((p) => {
          const feita = p.status === 'concluida'
          const atual = p.id === parada.id
          return (
            <View
              key={p.id}
              style={{
                flexDirection: 'row',
                gap: 12,
                alignItems: 'center',
                backgroundColor: atual ? colors.surface : 'transparent',
                borderRadius: radius.sm,
                padding: 12,
                marginBottom: 4,
                opacity: feita ? 0.45 : 1,
              }}
            >
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: feita ? colors.success : atual ? colors.ink : colors.surfaceMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {feita ? (
                  <CourierIcon name="check" size={14} color={colors.white} />
                ) : (
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: atual ? colors.white : colors.inkSoft,
                    }}
                  >
                    {p.ordem + 1}
                  </Text>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: colors.ink,
                    textDecorationLine: feita ? 'line-through' : 'none',
                  }}
                  numberOfLines={1}
                >
                  {p.titulo}
                </Text>
                <Text style={{ fontSize: 11, color: colors.inkSoft }} numberOfLines={1}>
                  {p.tipo === 'coleta' ? 'Coleta' : 'Entrega'} · {p.endereco ?? '—'}
                </Text>
              </View>
            </View>
          )
        })}
      </ScrollView>

      {modalEntrega && (
        <ModalConfirmacaoEntrega
          codigoEsperado={modalEntrega.codigo_confirmacao}
          onConfirmar={handleEntregaConfirmada}
          onFechar={() => setModalEntrega(null)}
        />
      )}
    </SafeAreaView>
  )
}
