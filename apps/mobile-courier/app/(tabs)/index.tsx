import { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  Image,
  Switch,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { formatarReais } from '@mallora/lib'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useEntregaStore } from '@/store/useEntregaStore'
import { EntregaDisponivelCard } from '@/components/EntregaDisponivelCard'
import { HistoricoEntregasDia } from '@/components/HistoricoEntregasDia'
import { CourierIcon } from '@/components/CourierIcon'
import { RotaIlustrada } from '@/components/RotaIlustrada'
import {
  abreviarNome,
  courierDesign,
} from '@/lib/courier-design'

export default function TelaEntregas() {
  const { courier, setOnline } = useAuthStore()
  const { disponiveis, setDisponiveis, ativa } = useEntregaStore()
  const [toggleCarregando, setToggleCarregando] = useState(false)
  const [atualizando, setAtualizando] = useState(false)
  const [avatarErro, setAvatarErro] = useState(false)
  const recusasRef = useRef<Record<string, number>>({})
  const { colors } = courierDesign
  const insets = useSafeAreaInsets()

  useEffect(() => { setAvatarErro(false) }, [courier?.foto_url])

  useEffect(() => {
    if (!courier?.id) return

    if (!courier.online) {
      setDisponiveis([])
      return
    }

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

    return () => {
      supabase.removeChannel(canal)
    }
  }, [courier?.id, courier?.online, setDisponiveis])

  const onRefresh = useCallback(async () => {
    setAtualizando(true)
    await carregarEntregasDisponiveis()
    setAtualizando(false)
  }, [courier?.id, courier?.online])

  async function carregarEntregasDisponiveis() {
    if (!courier?.id || !courier.online) {
      setDisponiveis([])
      return
    }

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
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ paddingBottom: 116 }}
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={onRefresh}
          tintColor={colors.ink}
        />
      }
    >
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 20, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          {/* Avatar + saudação */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {courier?.foto_url && !avatarErro ? (
              <Image
                source={{ uri: courier.foto_url }}
                style={{ width: 54, height: 54, borderRadius: 27 }}
                onError={() => setAvatarErro(true)}
              />
            ) : (
              <View style={{
                width: 54, height: 54, borderRadius: 27,
                backgroundColor: colors.accent,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>
                  {(courier?.nome?.charAt(0) ?? 'E').toUpperCase()}
                </Text>
              </View>
            )}

            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 17, letterSpacing: -0.3 }}>
                <Text style={{ fontWeight: '400', color: colors.inkSoft }}>Olá, </Text>
                <Text style={{ fontWeight: '700', color: colors.ink }}>{abreviarNome(courier?.nome)}</Text>
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <View style={{
                  width: 6, height: 6, borderRadius: 3,
                  backgroundColor: courier?.online ? colors.success : colors.line,
                }} />
                <Text style={{ fontSize: 11, color: courier?.online ? colors.inkMuted : colors.inkSoft }}>
                  {courier?.online ? 'Disponível para novas rotas' : 'Modo offline'}
                </Text>
              </View>
            </View>
          </View>

          {/* Ícone de status */}
          <View style={{
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: colors.surface,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <CourierIcon
              name={courier?.online ? 'spark' : 'power'}
              color={courier?.online ? colors.ink : colors.inkSoft}
            />
          </View>
        </View>

        <View
          className="rounded-full px-4 py-3 flex-row items-center justify-between mb-5"
          style={{ backgroundColor: colors.surfaceMuted }}
        >
          <View className="flex-row items-center gap-3 flex-1">
            <CourierIcon name="search" color={colors.inkSoft} size={18} />
            <Text style={{ color: colors.inkSoft }}>
              {ativa ? 'Acompanhar entrega atual' : 'Buscar ID da entrega'}
            </Text>
          </View>
          <View
            className="w-9 h-9 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.accent }}
          >
            <CourierIcon name="package" color={colors.ink} size={18} />
          </View>
        </View>

        <View
          className="rounded-[30px] p-5"
          style={{ backgroundColor: colors.surfaceDark }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xs uppercase font-semibold mb-1" style={{ color: '#A4A7AD' }}>
                Current Tracking
              </Text>
              <Text className="text-white text-xl font-bold">
                {ativa ? `#${ativa.order_id.slice(0, 8).toUpperCase()}` : 'Sem rota ativa'}
              </Text>
              <Text className="text-sm mt-2" style={{ color: '#C9CCD1' }}>
                {ativa
                  ? `${ativa.status === 'aceita' ? 'Coleta em' : 'Entrega para'} ${
                      ativa.status === 'aceita' ? ativa.store_nome : ativa.consumer_nome
                    }`
                  : courier?.online
                    ? 'Voce esta pronto para receber uma nova coleta.'
                    : 'Ative o modo online para voltar a operar.'}
              </Text>
            </View>

            <View className="items-end">
              {toggleCarregando ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Switch
                  value={courier?.online ?? false}
                  onValueChange={handleToggleOnline}
                  trackColor={{ false: '#4C4F55', true: colors.accentStrong }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#4C4F55"
                />
              )}
              <Text className="text-xs mt-2 font-semibold" style={{ color: colors.accent }}>
                {courier?.online ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>
          </View>

          <View
            className="mt-5 rounded-[24px] px-4 py-4"
            style={{ backgroundColor: colors.surfaceDarkSoft }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.accent }} />
                <Text className="text-sm font-semibold text-white">
                  {ativa ? 'Em andamento' : 'Operacao'}
                </Text>
              </View>
              <Text className="text-xs" style={{ color: '#A9ADB4' }}>
                {ativa ? formatarReais(ativa.valor_entrega) : `${disponiveis.length} disponiveis`}
              </Text>
            </View>
            <Text className="text-sm" style={{ color: '#D5D7DB' }}>
              {ativa
                ? `${ativa.store_nome} -> ${ativa.consumer_nome}`
                : courier?.online
                  ? 'Assim que um pedido for atribuido ele aparece aqui com acesso rapido para a rota.'
                  : 'Seu painel acompanha online/offline, entregas disponiveis e historico do turno.'}
            </Text>

            <TouchableOpacity
              onPress={() => router.push(ativa ? '/(tabs)/ativa' : '/(tabs)/ganhos')}
              className="mt-4 rounded-full py-3 items-center"
              style={{ backgroundColor: colors.accent }}
              activeOpacity={0.85}
            >
              <Text className="font-bold" style={{ color: colors.ink }}>
                {ativa ? 'Abrir Tracking Detail' : 'Ver desempenho do dia'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View className="px-5">
        <Text className="text-base font-semibold mb-4" style={{ color: colors.ink }}>
          Feature
        </Text>
        <View className="flex-row justify-between mb-6">
          <QuickAction
            icon="power"
            label="Operacao"
            value={courier?.online ? 'Online' : 'Offline'}
            onPress={() => handleToggleOnline(!(courier?.online ?? false))}
          />
          <QuickAction
            icon="route"
            label="Rota"
            value={ativa ? 'Ativa' : 'Livre'}
            onPress={() => router.push('/(tabs)/ativa')}
          />
          <QuickAction
            icon="wallet"
            label="Ganhos"
            value="Painel"
            onPress={() => router.push('/(tabs)/ganhos')}
          />
          <QuickAction
            icon="user"
            label="Perfil"
            value="Conta"
            onPress={() => router.push('/(tabs)/perfil')}
          />
        </View>

        <HistoricoEntregasDia />

        <View className="flex-row items-center justify-between mb-4 mt-1">
          <Text className="text-base font-semibold" style={{ color: colors.ink }}>
            Entregas Disponiveis
          </Text>
          <Text className="text-sm" style={{ color: colors.inkSoft }}>
            {courier?.online ? `${disponiveis.length} no radar` : 'Modo pausado'}
          </Text>
        </View>

        {disponiveis.length === 0 ? (
          <View
            style={{
              borderRadius: 32,
              overflow: 'hidden',
              backgroundColor: colors.surfaceDark,
              marginBottom: 12,
              minHeight: 196,
              position: 'relative',
            }}
          >
            {/* Camada do mapa (~55% à direita) */}
            <View
              pointerEvents="none"
              style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '55%' }}
            >
              <RotaIlustrada mostrarRadar={courier?.online ?? false} />
            </View>

            {/* Pill flutuante "Aguardando rota" */}
            <View
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
                backgroundColor: courier?.online ? 'rgba(142,209,79,0.15)' : 'rgba(255,255,255,0.06)',
                zIndex: 10,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: courier?.online ? colors.success : '#6B6E75' }}>
                {courier?.online ? 'Aguardando rota' : 'Modo pausado'}
              </Text>
            </View>

            {/* Camada de informação (esquerda) */}
            <View style={{ padding: 24, paddingRight: 130, gap: 24 }}>
              {/* Indicador de status */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: courier?.online ? colors.success : '#4C4F55',
                  }}
                />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    letterSpacing: 1.2,
                    color: '#A4A7AD',
                    textTransform: 'uppercase',
                  }}
                >
                  {courier?.online ? 'Em espera' : 'Offline'}
                </Text>
              </View>

              {/* Título principal */}
              <View style={{ gap: 4 }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '600',
                    color: '#6B6E75',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                  }}
                >
                  Próxima entrega
                </Text>
                <Text
                  style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 }}
                >
                  {courier?.online ? 'Buscando...' : 'Sem rota'}
                </Text>
              </View>

              {/* Lista de detalhes */}
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <CourierIcon name="pin" size={13} color="#6B6E75" />
                  <Text style={{ fontSize: 12, color: '#A4A7AD', flex: 1 }} numberOfLines={1}>
                    {courier?.online
                      ? 'Monitorando pedidos na sua área'
                      : 'Ative o modo online para operar'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <CourierIcon name="clock" size={13} color="#6B6E75" />
                  <Text style={{ fontSize: 12, color: '#A4A7AD', flex: 1 }} numberOfLines={1}>
                    {courier?.online
                      ? 'Atribuições chegam em tempo real'
                      : 'Seu histórico do turno está salvo'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          disponiveis.map((item) => (
            <EntregaDisponivelCard
              key={item.id}
              entrega={item}
              onAceitar={() => handleAceitar(item)}
              onRecusar={() => handleRecusar(item)}
            />
          ))
        )}
      </View>
    </ScrollView>
  )
}

function QuickAction({
  icon,
  label,
  value,
  onPress,
}: {
  icon: Parameters<typeof CourierIcon>[0]['name']
  label: string
  value: string
  onPress: () => void
}) {
  const { colors } = courierDesign

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="items-center"
      style={{ width: '23%' }}
    >
      <View
        className="w-14 h-14 rounded-full items-center justify-center mb-2"
        style={{ backgroundColor: colors.surface }}
      >
        <CourierIcon name={icon} size={18} color={colors.ink} />
      </View>
      <Text className="text-xs font-semibold" style={{ color: colors.ink }}>
        {label}
      </Text>
      <Text className="text-[11px]" style={{ color: colors.inkSoft }}>
        {value}
      </Text>
    </TouchableOpacity>
  )
}

function formatarEndereco(end: any): string {
  if (!end) return 'Endereco nao disponivel'
  return `${end.rua ?? ''}, ${end.numero ?? ''} - ${end.bairro ?? ''}`
}
