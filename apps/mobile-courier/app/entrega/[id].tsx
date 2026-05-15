import { useEffect, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { formatarReais } from '@mallevo/lib'
import { supabase } from '@/lib/supabase'
import { CourierIcon } from '@/components/CourierIcon'
import { courierDesign, formatarMomentoCurto } from '@/lib/courier-design'

interface DetalheEntrega {
  id: string
  order_id: string
  valor_entrega: number
  status: string
  criado_em: string
  aceito_em: string | null
  coletado_em: string | null
  entregue_em: string | null
  store_nome: string
  store_endereco: string
  consumer_nome: string
  consumer_endereco: string
  codigo_confirmacao: string | null
}

const LABELS_STATUS: Record<string, string> = {
  pendente: 'Pendente',
  aceita: 'Aceita',
  coletada: 'Coletada',
  entregue: 'Entregue',
  cancelada: 'Cancelada',
}

const CORES_STATUS: Record<string, string> = {
  entregue: '#15803D',
  cancelada: '#DC2626',
  aceita: '#1D4ED8',
  coletada: '#7C3AED',
  pendente: '#6B7280',
}

export default function TelaDetalheEntrega() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [entrega, setEntrega] = useState<DetalheEntrega | null>(null)
  const [carregando, setCarregando] = useState(true)
  const { colors } = courierDesign

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from('delivery_assignments')
        .select(`
          id,
          order_id,
          valor_entrega,
          status,
          criado_em,
          aceito_em,
          coletado_em,
          entregue_em,
          codigo_confirmacao,
          orders!inner (
            endereco_entrega,
            consumers!inner (nome),
            stores!inner (nome, endereco)
          )
        `)
        .eq('id', id)
        .single()

      if (data) {
        const d = data as any
        setEntrega({
          id: d.id,
          order_id: d.order_id,
          valor_entrega: d.valor_entrega,
          status: d.status,
          criado_em: d.criado_em,
          aceito_em: d.aceito_em,
          coletado_em: d.coletado_em,
          entregue_em: d.entregue_em,
          codigo_confirmacao: d.codigo_confirmacao,
          store_nome: d.orders.stores.nome,
          store_endereco: formatarEnderecoObj(d.orders.stores.endereco),
          consumer_nome: d.orders.consumers.nome,
          consumer_endereco: formatarEnderecoObj(d.orders.endereco_entrega),
        })
      }

      setCarregando(false)
    }

    carregar()
  }, [id])

  if (carregando) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.canvas }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    )
  }

  if (!entrega) {
    return (
      <View className="flex-1 items-center justify-center px-5" style={{ backgroundColor: colors.canvas }}>
        <Text className="text-base" style={{ color: colors.inkMuted }}>
          Entrega nao encontrada.
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="font-semibold" style={{ color: colors.ink }}>
            Voltar
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  const cor = CORES_STATUS[entrega.status] ?? '#6B7280'

  return (
    <View className="flex-1" style={{ backgroundColor: colors.canvas }}>
      <Stack.Screen options={{ presentation: 'card', headerShown: false }} />

      <View className="px-5 pt-14 pb-12" style={{ backgroundColor: colors.surfaceDark }}>
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-11 h-11 rounded-full items-center justify-center mb-5"
          style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
          activeOpacity={0.8}
        >
          <CourierIcon name="back" color={colors.white} />
        </TouchableOpacity>

        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-sm mb-1" style={{ color: '#B6BAC1' }}>
              Shipping Cost
            </Text>
            <Text className="text-white text-3xl font-bold">
              {formatarReais(entrega.valor_entrega)}
            </Text>
          </View>
          <View
            className="px-3 py-2 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: cor === '#15803D' ? colors.accent : colors.white }}
            >
              {LABELS_STATUS[entrega.status] ?? entrega.status}
            </Text>
          </View>
        </View>

        <View
          className="rounded-[28px] px-4 py-4 mt-5"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
        >
          <Text className="text-xs uppercase font-semibold mb-2" style={{ color: '#AEB2B8' }}>
            Details
          </Text>
          <InfoRowDark
            label="From"
            value={`${entrega.store_nome}\n${entrega.store_endereco}`}
          />
          <View className="h-px my-3" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <InfoRowDark
            label="To"
            value={`${entrega.consumer_nome}\n${entrega.consumer_endereco}`}
          />
        </View>
      </View>

      <View
        className="flex-1 rounded-t-[34px] -mt-7"
        style={{ backgroundColor: colors.surface }}
      >
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View className="items-center mb-5">
            <View className="w-12 h-1.5 rounded-full" style={{ backgroundColor: colors.line }} />
          </View>

          <View className="flex-row gap-3 mb-4">
            <MetricCard
              icon="cash"
              label="Valor"
              value={formatarReais(entrega.valor_entrega)}
            />
            <MetricCard
              icon="shield"
              label="Codigo"
              value={entrega.codigo_confirmacao ?? 'Nao gerado'}
            />
          </View>

          <View className="flex-row gap-3 mb-4">
            <MetricCard
              icon="clock"
              label="Criado"
              value={formatarMomentoCurto(entrega.criado_em)}
            />
            <MetricCard
              icon="package"
              label="Pedido"
              value={`#${entrega.order_id.slice(0, 8).toUpperCase()}`}
            />
          </View>

          <View className="rounded-[28px] p-4 mb-4" style={{ backgroundColor: colors.canvas }}>
            <Text className="text-xs font-semibold uppercase mb-3" style={{ color: colors.inkSoft }}>
              Route
            </Text>
            <LinhaRota
              icone="store"
              label="Coleta"
              titulo={entrega.store_nome}
              descricao={entrega.store_endereco}
            />
            <View className="ml-5 my-3 w-px h-6" style={{ backgroundColor: colors.line }} />
            <LinhaRota
              icone="pin"
              label="Entrega"
              titulo={entrega.consumer_nome}
              descricao={entrega.consumer_endereco}
            />
          </View>

          <View className="rounded-[28px] p-4" style={{ backgroundColor: colors.canvas }}>
            <Text className="text-xs font-semibold uppercase mb-3" style={{ color: colors.inkSoft }}>
              Timeline
            </Text>
            <LinhaDoTempo label="Atribuido" valor={entrega.criado_em} />
            <LinhaDoTempo label="Aceito" valor={entrega.aceito_em} />
            <LinhaDoTempo label="Coletado" valor={entrega.coletado_em} />
            <LinhaDoTempo label="Entregue" valor={entrega.entregue_em} ultimo />
          </View>
        </ScrollView>
      </View>
    </View>
  )
}

function InfoRowDark({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-xs mb-1" style={{ color: '#AEB2B8' }}>
        {label}
      </Text>
      <Text className="text-sm text-white">{value}</Text>
    </View>
  )
}

function LinhaDoTempo({
  label,
  valor,
  ultimo,
}: {
  label: string
  valor: string | null
  ultimo?: boolean
}) {
  const { colors } = courierDesign

  return (
    <View className={`flex-row items-start gap-3 ${!ultimo ? 'mb-4' : ''}`}>
      <View className="items-center">
        <View
          className="w-2.5 h-2.5 rounded-full mt-1"
          style={{ backgroundColor: valor ? colors.accentStrong : '#D1D5DB' }}
        />
        {!ultimo && (
          <View
            className="w-px flex-1 mt-1"
            style={{ height: 24, backgroundColor: '#D7D9DE' }}
          />
        )}
      </View>
      <View>
        <Text className="text-xs font-semibold" style={{ color: colors.inkMuted }}>
          {label}
        </Text>
        <Text className="text-xs mt-0.5" style={{ color: colors.inkSoft }}>
          {valor ? formatarMomentoCurto(valor) : '-'}
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
    <View className="flex-1 rounded-[22px] p-4" style={{ backgroundColor: colors.canvas }}>
      <View
        className="w-9 h-9 rounded-full items-center justify-center mb-3"
        style={{ backgroundColor: colors.surface }}
      >
        <CourierIcon name={icon} size={18} color={colors.ink} />
      </View>
      <Text className="text-xs mb-1" style={{ color: colors.inkSoft }}>
        {label}
      </Text>
      <Text className="text-sm font-semibold" style={{ color: colors.ink }}>
        {value}
      </Text>
    </View>
  )
}

function LinhaRota({
  icone,
  label,
  titulo,
  descricao,
}: {
  icone: Parameters<typeof CourierIcon>[0]['name']
  label: string
  titulo: string
  descricao: string
}) {
  const { colors } = courierDesign

  return (
    <View className="flex-row items-start gap-3">
      <View
        className="w-10 h-10 rounded-full items-center justify-center mt-0.5"
        style={{ backgroundColor: colors.surface }}
      >
        <CourierIcon name={icone} size={18} color={colors.ink} />
      </View>
      <View className="flex-1">
        <Text className="text-xs font-semibold uppercase" style={{ color: colors.inkSoft }}>
          {label}
        </Text>
        <Text className="text-sm font-semibold mt-1" style={{ color: colors.ink }}>
          {titulo}
        </Text>
        <Text className="text-xs mt-1" style={{ color: colors.inkMuted }}>
          {descricao}
        </Text>
      </View>
    </View>
  )
}

function formatarEnderecoObj(end: any): string {
  if (!end) return 'Endereco nao disponivel'
  return `${end.rua ?? ''}, ${end.numero ?? ''} - ${end.bairro ?? ''}`
}
