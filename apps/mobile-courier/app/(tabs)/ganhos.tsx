import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { formatarReais } from '@mallora/lib'
import { Skeleton } from '@/components/Skeleton'
import { CardSaldoStripe } from '@/components/CardSaldoStripe'
import { EntregaHistoricoCard } from '@/components/EntregaHistoricoCard'

type Periodo = 'hoje' | 'semana' | 'mes'

interface Resumo {
  total_entregas: number
  entregas_concluidas: number
  ganhos_brutos: number
  proximo_repasse: number
  data_proximo_repasse: string | null
}

interface EntregaHistorico {
  id: string
  order_id: string
  valor_entrega: number
  status: string
  entregue_em: string | null
  criado_em: string
  store_nome: string
}

interface SaldoStripe {
  disponivel: number
  pendente: number
}

interface Repasse {
  id: string
  valor_liquido: number
  status: string
  data_prevista: string | null
  data_referencia: string
  stripe_transfer_id: string | null
  total_pedidos: number
}

const STATUS_REPASSE_CORES: Record<string, string> = {
  agendado: '#F59E0B',
  processando: '#3B82F6',
  concluido: '#10B981',
  falhou: '#EF4444',
}

const STATUS_REPASSE_LABELS: Record<string, string> = {
  agendado: 'Agendado',
  processando: 'Processando',
  concluido: 'Recebido',
  falhou: 'Falhou',
}

export default function TelaGanhos() {
  const { courier } = useAuthStore()
  const [periodo, setPeriodo] = useState<Periodo>('semana')
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [historico, setHistorico] = useState<EntregaHistorico[]>([])
  const [repasses, setRepasses] = useState<Repasse[]>([])
  const [saldoStripe, setSaldoStripe] = useState<SaldoStripe | null>(null)
  const [linkExpress, setLinkExpress] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)

  async function carregarDados() {
    if (!courier?.id) return

    const agora = new Date()
    let dataInicio: Date

    if (periodo === 'hoje') {
      dataInicio = new Date(agora)
      dataInicio.setHours(0, 0, 0, 0)
    } else if (periodo === 'semana') {
      dataInicio = new Date(agora)
      dataInicio.setDate(agora.getDate() - 7)
    } else {
      dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1)
    }

    const [resEntregas, resPayouts, resRepasses] = await Promise.all([
      supabase
        .from('delivery_assignments')
        .select(`
          id,
          order_id,
          valor_entrega,
          status,
          entregue_em,
          criado_em,
          orders!inner (
            stores!inner (nome)
          )
        `)
        .eq('courier_id', courier.id)
        .gte('criado_em', dataInicio.toISOString())
        .order('criado_em', { ascending: false }),

      supabase
        .from('payouts')
        .select('valor_liquido, status, data_prevista, total_pedidos')
        .eq('courier_id', courier.id)
        .in('status', ['agendado', 'processando'])
        .order('data_prevista')
        .limit(1),

      supabase
        .from('payouts')
        .select('id, valor_liquido, status, data_prevista, data_referencia, stripe_transfer_id, total_pedidos')
        .eq('courier_id', courier.id)
        .order('criado_em', { ascending: false })
        .limit(10),
    ])

    const entregas: EntregaHistorico[] = (resEntregas.data ?? []).map(
      (a: any) => ({
        id: a.id,
        order_id: a.order_id,
        valor_entrega: a.valor_entrega,
        status: a.status,
        entregue_em: a.entregue_em,
        criado_em: a.criado_em,
        store_nome: a.orders.stores.nome,
      })
    )

    const concluidas = entregas.filter((e) => e.status === 'entregue')
    const ganhos = concluidas.reduce((acc, e) => acc + e.valor_entrega, 0)
    const proximo = resPayouts.data?.[0]

    setHistorico(entregas)
    setRepasses(resRepasses.data ?? [])
    setResumo({
      total_entregas: entregas.length,
      entregas_concluidas: concluidas.length,
      ganhos_brutos: ganhos,
      proximo_repasse: proximo?.valor_liquido ?? 0,
      data_proximo_repasse: proximo?.data_prevista ?? null,
    })

    setCarregando(false)
  }

  async function carregarSaldoStripe() {
    if (!courier?.stripe_account_id || !courier?.stripe_onboarding_ok) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    try {
      const resposta = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/courier-stripe-info`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      if (resposta.ok) {
        const dados = await resposta.json()
        setSaldoStripe(dados.saldo)
        setLinkExpress(dados.link_express)
      }
    } catch {
      // Ignorar erros de conectividade — saldo não é crítico
    }
  }

  useEffect(() => {
    Promise.all([carregarDados(), carregarSaldoStripe()])
  }, [periodo])

  const onRefresh = useCallback(async () => {
    setAtualizando(true)
    await Promise.all([carregarDados(), carregarSaldoStripe()])
    setAtualizando(false)
  }, [periodo])

  if (carregando) {
    return (
      <View className="flex-1 bg-[#FFF8ED] px-5 pt-14">
        <Skeleton largura="40%" altura={28} />
        <View className="mt-5 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} largura="100%" altura={80} />
          ))}
        </View>
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1 bg-[#FFF8ED]"
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={onRefresh}
          tintColor="#1A4D3A"
        />
      }
    >
      {/* Header */}
      <View className="px-5 pt-14 pb-4">
        <Text className="text-2xl font-bold text-[#1A4D3A]">Ganhos</Text>
      </View>

      {/* Saldo Stripe */}
      {courier?.stripe_onboarding_ok && (
        <CardSaldoStripe
          saldo={saldoStripe}
          linkExpress={linkExpress}
        />
      )}

      {/* Próximo repasse */}
      {resumo && resumo.proximo_repasse > 0 && (
        <View className="mx-5 mb-4 bg-[#1A4D3A] rounded-2xl p-4">
          <Text className="text-green-200 text-xs font-semibold uppercase mb-1">
            Próximo repasse
          </Text>
          <Text className="text-white text-2xl font-bold">
            {formatarReais(resumo.proximo_repasse)}
          </Text>
          {resumo.data_proximo_repasse && (
            <Text className="text-green-300 text-sm mt-1">
              Previsto para{' '}
              {new Date(resumo.data_proximo_repasse + 'T00:00:00')
                .toLocaleDateString('pt-BR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                })}
            </Text>
          )}
        </View>
      )}

      {/* Seletor de período */}
      <View className="flex-row mx-5 mb-4 bg-white rounded-2xl p-1 border border-gray-100">
        {(['hoje', 'semana', 'mes'] as Periodo[]).map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setPeriodo(p)}
            className={`flex-1 py-2 rounded-xl items-center ${
              periodo === p ? 'bg-[#1A4D3A]' : ''
            }`}
            activeOpacity={0.75}
          >
            <Text
              className={`text-sm font-medium ${
                periodo === p ? 'text-white' : 'text-gray-500'
              }`}
            >
              {p === 'hoje' ? 'Hoje' : p === 'semana' ? '7 dias' : 'Mês'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* KPIs do período */}
      {resumo && (
        <View className="flex-row mx-5 mb-4 gap-3">
          <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100">
            <Text className="text-xs text-gray-400 mb-1">Ganhos</Text>
            <Text className="text-xl font-bold text-[#1A4D3A]">
              {formatarReais(resumo.ganhos_brutos)}
            </Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100">
            <Text className="text-xs text-gray-400 mb-1">Entregas</Text>
            <Text className="text-xl font-bold text-[#1A4D3A]">
              {resumo.entregas_concluidas}
              <Text className="text-sm text-gray-400">
                /{resumo.total_entregas}
              </Text>
            </Text>
          </View>
          {resumo.entregas_concluidas > 0 && (
            <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100">
              <Text className="text-xs text-gray-400 mb-1">Média</Text>
              <Text className="text-xl font-bold text-[#4CAF82]">
                {formatarReais(
                  Math.round(resumo.ganhos_brutos / resumo.entregas_concluidas)
                )}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Histórico de entregas */}
      <View className="mx-5 mb-6">
        <Text className="text-sm font-semibold text-gray-500 uppercase mb-3">
          Histórico
        </Text>

        {historico.length === 0 ? (
          <View className="py-10 items-center">
            <Text className="text-gray-400 text-sm">
              Nenhuma entrega neste período.
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {historico.map((entrega) => (
              <EntregaHistoricoCard key={entrega.id} entrega={entrega} />
            ))}
          </View>
        )}
      </View>

      {/* Histórico de repasses */}
      {repasses.length > 0 && (
        <View className="mx-5">
          <Text className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Repasses
          </Text>
          <View className="gap-2">
            {repasses.map((repasse) => (
              <RepasseCard key={repasse.id} repasse={repasse} />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  )
}

function RepasseCard({ repasse }: { repasse: Repasse }) {
  return (
    <View className="bg-white rounded-2xl px-4 py-3 mb-2 flex-row items-center justify-between border border-gray-50">
      <View>
        <Text className="text-xs text-gray-400">
          {new Date(repasse.data_referencia + 'T00:00:00')
            .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
          {' · '}
          {repasse.total_pedidos} entrega{repasse.total_pedidos !== 1 ? 's' : ''}
        </Text>
        <View className="flex-row items-center gap-1.5 mt-1">
          <View
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: STATUS_REPASSE_CORES[repasse.status] ?? '#6B7280' }}
          />
          <Text
            className="text-xs font-medium"
            style={{ color: STATUS_REPASSE_CORES[repasse.status] ?? '#6B7280' }}
          >
            {STATUS_REPASSE_LABELS[repasse.status] ?? repasse.status}
          </Text>
        </View>
      </View>
      <Text className="text-base font-bold text-[#1A4D3A]">
        {formatarReais(repasse.valor_liquido)}
      </Text>
    </View>
  )
}
