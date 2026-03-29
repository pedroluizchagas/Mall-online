import { useEffect, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { formatarReais } from '@mallora/lib'

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
      <View className="flex-1 items-center justify-center bg-[#FFF8ED]">
        <ActivityIndicator color="#1A4D3A" />
      </View>
    )
  }

  if (!entrega) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF8ED] px-5">
        <Text className="text-gray-500 text-base">Entrega não encontrada.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-[#1A4D3A] font-semibold">Voltar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const cor = CORES_STATUS[entrega.status] ?? '#6B7280'

  return (
    <View className="flex-1 bg-[#FFF8ED]">
      {/* Header */}
      <View className="bg-[#1A4D3A] px-5 pt-14 pb-5">
        <TouchableOpacity onPress={() => router.back()} className="mb-3">
          <Text className="text-green-300 text-sm">← Voltar</Text>
        </TouchableOpacity>
        <View className="flex-row items-center justify-between">
          <Text className="text-white text-xl font-bold">Detalhes da entrega</Text>
          <View className="px-3 py-1 rounded-full bg-white/10">
            <Text className="text-xs font-semibold" style={{ color: cor === '#15803D' ? '#4CAF82' : '#FFFFFF' }}>
              {LABELS_STATUS[entrega.status] ?? entrega.status}
            </Text>
          </View>
        </View>
        <Text className="text-green-300 text-2xl font-bold mt-2">
          {formatarReais(entrega.valor_entrega)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Rota */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <Text className="text-xs font-semibold text-gray-400 uppercase mb-3">Rota</Text>

          <View className="flex-row items-start gap-3 mb-3">
            <View className="w-3 h-3 rounded-full bg-[#1A4D3A] mt-1 flex-shrink-0" />
            <View className="flex-1">
              <Text className="text-xs font-semibold text-gray-500 uppercase">Coleta</Text>
              <Text className="text-sm font-semibold text-gray-800 mt-0.5">{entrega.store_nome}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">{entrega.store_endereco}</Text>
            </View>
          </View>

          <View className="ml-1.5 w-px h-4 bg-gray-200 mb-3" />

          <View className="flex-row items-start gap-3">
            <View className="w-3 h-3 rounded-full bg-[#F5A623] mt-1 flex-shrink-0" />
            <View className="flex-1">
              <Text className="text-xs font-semibold text-gray-500 uppercase">Entrega</Text>
              <Text className="text-sm font-semibold text-gray-800 mt-0.5">{entrega.consumer_nome}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">{entrega.consumer_endereco}</Text>
            </View>
          </View>
        </View>

        {/* Linha do tempo */}
        <View className="bg-white rounded-2xl p-4 border border-gray-100">
          <Text className="text-xs font-semibold text-gray-400 uppercase mb-3">Linha do tempo</Text>
          <LinhaDoTempo label="Atribuído" valor={entrega.criado_em} />
          <LinhaDoTempo label="Aceito" valor={entrega.aceito_em} />
          <LinhaDoTempo label="Coletado" valor={entrega.coletado_em} />
          <LinhaDoTempo label="Entregue" valor={entrega.entregue_em} ultimo />
        </View>
      </ScrollView>
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
  return (
    <View className={`flex-row items-start gap-3 ${!ultimo ? 'mb-4' : ''}`}>
      <View className="items-center">
        <View
          className="w-2.5 h-2.5 rounded-full mt-1"
          style={{ backgroundColor: valor ? '#4CAF82' : '#D1D5DB' }}
        />
        {!ultimo && <View className="w-px flex-1 bg-gray-200 mt-1" style={{ height: 24 }} />}
      </View>
      <View>
        <Text className="text-xs font-semibold text-gray-500">{label}</Text>
        <Text className="text-xs text-gray-400 mt-0.5">
          {valor
            ? new Date(valor).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '—'}
        </Text>
      </View>
    </View>
  )
}

function formatarEnderecoObj(end: any): string {
  if (!end) return 'Endereço não disponível'
  return `${end.rua ?? ''}, ${end.numero ?? ''} — ${end.bairro ?? ''}`
}
