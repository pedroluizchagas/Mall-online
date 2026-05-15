# 22 — Entregador — Financeiro e Ganhos

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

O módulo financeiro do app do entregador exibe seus ganhos por
período, o histórico de entregas com valores correspondentes e o
saldo disponível no recipient Pagar.me.

A liquidação é gerenciada automaticamente pelo Pagar.me conforme
o cronograma configurado no recipient. O entregador autônomo recebe
via transfer da Mallevo após a alocação no pedido (estágio 2) e a
liquidação ocorre conforme o calendário da conta bancária cadastrada.

-----

## TELA DE GANHOS

### app/(tabs)/ganhos.tsx

```typescript
import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { formatarReais } from '@mallevo/lib'
import { Skeleton } from '@/components/Skeleton'

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
  payout_status?: string
}

interface SaldoPagarme {
  disponivel: number
  pendente: number
  transferido: number
}

export default function TelaGanhos() {
  const { courier } = useAuthStore()
  const [periodo, setPeriodo] = useState<Periodo>('semana')
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [historico, setHistorico] = useState<EntregaHistorico[]>([])
  const [saldoPagarme, setSaldoPagarme] = useState<SaldoPagarme | null>(null)
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

    const [resEntregas, resPayouts] = await Promise.all([
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
    setResumo({
      total_entregas: entregas.length,
      entregas_concluidas: concluidas.length,
      ganhos_brutos: ganhos,
      proximo_repasse: proximo?.valor_liquido ?? 0,
      data_proximo_repasse: proximo?.data_prevista ?? null,
    })

    setCarregando(false)
  }

  async function carregarSaldoPagarme() {
    if (!courier?.pagarme_onboarding_status || courier.pagarme_onboarding_status !== 'active') return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    try {
      const resposta = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/courier-pagarme-balance`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      if (resposta.ok) {
        const dados = await resposta.json()
        setSaldoPagarme(dados.saldo)
      }
    } catch {
      // Ignorar erros de conectividade — saldo não é crítico
    }
  }

  useEffect(() => {
    Promise.all([carregarDados(), carregarSaldoPagarme()])
  }, [periodo])

  const onRefresh = useCallback(async () => {
    setAtualizando(true)
    await Promise.all([carregarDados(), carregarSaldoPagarme()])
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

      {/* Saldo Pagar.me */}
      {courier?.pagarme_onboarding_status === 'active' && (
        <CardSaldoPagarme saldo={saldoPagarme} />
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
      <View className="flex-row mx-5 mb-4 bg-white rounded-2xl p-1
        border border-gray-100">
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
      <View className="mx-5">
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
    </ScrollView>
  )
}
```

-----

## COMPONENTE CARD SALDO PAGARME

### components/CardSaldoPagarme.tsx (apps/mobile-courier)

```typescript
import { View, Text, ActivityIndicator } from 'react-native'
import { formatarReais } from '@mallevo/lib'

interface Props {
  saldo: { disponivel: number; pendente: number; transferido: number } | null
}

export function CardSaldoPagarme({ saldo }: Props) {
  return (
    <View className="mx-5 mb-4 bg-white rounded-2xl border border-gray-100 p-5">
      <Text className="text-xs font-semibold text-gray-400 uppercase mb-3">
        Conta de recebimentos (Pagar.me)
      </Text>

      {saldo ? (
        <View className="gap-3">
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-xs text-gray-400 mb-0.5">
                Disponível
              </Text>
              <Text className="text-xl font-bold text-[#1A4D3A]">
                {formatarReais(saldo.disponivel)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-400 mb-0.5">
                A receber
              </Text>
              <Text className="text-xl font-bold text-gray-600">
                {formatarReais(saldo.pendente)}
              </Text>
            </View>
          </View>
          <Text className="text-xs text-gray-300 leading-4">
            Liquidação automática conforme cronograma da conta bancária cadastrada.
          </Text>
        </View>
      ) : (
        <View className="items-center py-3">
          <ActivityIndicator color="#4CAF82" />
          <Text className="text-gray-400 text-xs mt-2">
            Carregando saldo...
          </Text>
        </View>
      )}
    </View>
  )
}
```

-----

## COMPONENTE ENTREGA HISTORICO CARD

### components/EntregaHistoricoCard.tsx

```typescript
import { View, Text } from 'react-native'
import { formatarReais } from '@mallevo/lib'

const LABELS_STATUS: Record<string, string> = {
  pendente: 'Pendente',
  aceita: 'Aceita',
  coletada: 'Coletada',
  entregue: 'Entregue',
  cancelada: 'Cancelada',
}

const CORES_STATUS: Record<string, { bg: string; text: string }> = {
  entregue: { bg: '#DCFCE7', text: '#15803D' },
  cancelada: { bg: '#FEE2E2', text: '#DC2626' },
  aceita: { bg: '#DBEAFE', text: '#1D4ED8' },
  coletada: { bg: '#EDE9FE', text: '#7C3AED' },
  pendente: { bg: '#F3F4F6', text: '#6B7280' },
}

interface Entrega {
  id: string
  store_nome: string
  valor_entrega: number
  status: string
  entregue_em: string | null
  criado_em: string
}

export function EntregaHistoricoCard({ entrega }: { entrega: Entrega }) {
  const cor = CORES_STATUS[entrega.status] ?? CORES_STATUS.pendente
  const data = entrega.entregue_em ?? entrega.criado_em

  return (
    <View className="bg-white rounded-2xl px-4 py-3 flex-row
      items-center justify-between border border-gray-50">
      <View className="flex-1 mr-3">
        <Text
          className="text-sm font-semibold text-gray-800"
          numberOfLines={1}
        >
          {entrega.store_nome}
        </Text>
        <Text className="text-xs text-gray-400 mt-0.5">
          {new Date(data).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      <View className="items-end gap-1">
        <Text className="text-sm font-bold text-[#1A4D3A]">
          {formatarReais(entrega.valor_entrega)}
        </Text>
        <View
          className="px-2 py-0.5 rounded-full"
          style={{ backgroundColor: cor.bg }}
        >
          <Text
            className="text-xs font-semibold"
            style={{ color: cor.text }}
          >
            {LABELS_STATUS[entrega.status]}
          </Text>
        </View>
      </View>
    </View>
  )
}
```

-----

## EDGE FUNCTION — COURIER PAGARME INFO

A busca do saldo do recipient Pagar.me não pode ser feita diretamente do app
mobile (exige chave secreta). Uma Edge Function realiza a chamada à API do
Pagar.me e retorna apenas os dados necessários para o app exibir o saldo e
redirecionar ao painel de saques.

### supabase/functions/courier-pagarme-info/index.ts

```typescript
import { getSupabaseAdmin, getAuthenticatedUser, corsHeaders } from '../helpers/auth.ts'
import { pagarmeGet } from '../helpers/pagarme.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const user = await getAuthenticatedUser(req)
    const supabase = getSupabaseAdmin()

    const { data: courier } = await supabase
      .from('couriers')
      .select('id, pagarme_recipient_id, pagarme_onboarding_status')
      .eq('user_id', user.id)
      .single()

    if (!courier?.pagarme_recipient_id || courier.pagarme_onboarding_status !== 'active') {
      return new Response(
        JSON.stringify({ saldo: null }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      )
    }

    // Buscar saldo do recipient no Pagar.me
    const saldo = await pagarmeGet(`/recipients/${courier.pagarme_recipient_id}/balance`)

    return new Response(
      JSON.stringify({
        saldo: {
          disponivel: saldo.available_amount ?? 0,
          a_receber: saldo.waiting_funds_amount ?? 0,
          transferido: saldo.transferred_amount ?? 0,
        },
      }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ erro: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  }
})
```

-----

## TELA DE PERFIL DO ENTREGADOR

### app/(tabs)/perfil.tsx

```typescript
import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useEntregaStore } from '@/store/useEntregaStore'
import { useLocalizacaoStore } from '@/store/useLocalizacaoStore'

export default function TelaPerfil() {
  const { courier, user, limpar: limparAuth } = useAuthStore()
  const { setAtiva } = useEntregaStore()
  const { limpar: limparLoc } = useLocalizacaoStore()
  const [carregandoSaldo, setCarregandoSaldo] = useState(false)

  async function handleCarregarSaldo() {
    if (!courier?.pagarme_recipient_id) return

    setCarregandoSaldo(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setCarregandoSaldo(false); return }

    const resposta = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/courier-pagarme-info`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    )

    const dados = await resposta.json()
    setCarregandoSaldo(false)

    // Exibir saldo em modal ou atualizar estado local
    if (dados.saldo) {
      // setSaldo(dados.saldo) — implementar via useState conforme tela
    }
  }

  async function handleSair() {
    Alert.alert('Sair', 'Deseja realmente sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          // Garantir que está offline antes de sair
          if (courier?.id) {
            await supabase
              .from('couriers')
              .update({ online: false })
              .eq('id', courier.id)
          }

          await supabase.auth.signOut()
          limparAuth()
          setAtiva(null)
          limparLoc()
          router.replace('/(auth)/entrar')
        },
      },
    ])
  }

  const primeiraLetra = courier?.nome?.charAt(0).toUpperCase() ?? '?'

  return (
    <ScrollView
      className="flex-1 bg-[#FFF8ED]"
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View className="px-5 pt-14 pb-4">
        <Text className="text-2xl font-bold text-[#1A4D3A]">Perfil</Text>
      </View>

      {/* Avatar e dados */}
      <View className="bg-white px-5 py-5 flex-row items-center gap-4 mb-4">
        <View className="w-16 h-16 rounded-full bg-[#1A4D3A]
          items-center justify-center">
          <Text className="text-white text-2xl font-bold">{primeiraLetra}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-800">
            {courier?.nome ?? 'Entregador'}
          </Text>
          <Text className="text-sm text-gray-400 mt-0.5">
            {user?.email ?? ''}
          </Text>
          <View className="flex-row items-center gap-2 mt-1">
            <View
              className={`w-2 h-2 rounded-full ${
                courier?.online ? 'bg-[#4CAF82]' : 'bg-gray-300'
              }`}
            />
            <Text className="text-xs text-gray-400">
              {courier?.online ? 'Online' : 'Offline'}
            </Text>
            <Text className="text-xs text-gray-300">·</Text>
            <Text className="text-xs text-gray-400">
              {courier?.tipo === 'proprio' ? 'Entregador próprio' : 'Autônomo'}
            </Text>
          </View>
        </View>
      </View>

      {/* Status do KYC e conta Pagar.me */}
      <View className="bg-white mx-5 mb-4 rounded-2xl p-4 border border-gray-100">
        <Text className="text-sm font-semibold text-gray-700 mb-3">
          Conta de recebimentos
        </Text>

        <View className="flex-row items-center gap-3 mb-3">
          <View
            className={`w-3 h-3 rounded-full flex-shrink-0 ${
              courier?.pagarme_onboarding_status === 'active' ? 'bg-[#4CAF82]' : 'bg-amber-400'
            }`}
          />
          <Text className="text-sm text-gray-700">
            {courier?.pagarme_onboarding_status === 'active'
              ? 'Conta verificada e ativa'
              : 'Verificação pendente'}
          </Text>
        </View>

        {courier?.pagarme_onboarding_status === 'active' ? (
          <TouchableOpacity
            onPress={handleCarregarSaldo}
            disabled={carregandoSaldo}
            className="border border-[#4CAF82] py-2.5 rounded-xl
              items-center disabled:opacity-50"
            activeOpacity={0.75}
          >
            <Text className="text-[#4CAF82] text-sm font-semibold">
              {carregandoSaldo ? 'Carregando...' : 'Ver saldo disponível'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/kyc-onboarding')}
            className="bg-[#F5A623] py-2.5 rounded-xl items-center"
            activeOpacity={0.85}
          >
            <Text className="text-white text-sm font-semibold">
              Completar verificação
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Dados do veículo */}
      {courier?.veiculo_tipo && (
        <View className="bg-white mx-5 mb-4 rounded-2xl p-4 border border-gray-100">
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            Veículo
          </Text>
          <Text className="text-sm text-gray-600 capitalize">
            {courier.veiculo_tipo.replace('_', ' ')}
            {courier.veiculo_placa ? ` — ${courier.veiculo_placa}` : ''}
          </Text>
        </View>
      )}

      {/* Opções */}
      <View className="bg-white mx-5 mb-4 rounded-2xl border border-gray-100">
        <TouchableOpacity
          className="flex-row items-center justify-between px-4 py-4
            border-b border-gray-50"
          activeOpacity={0.75}
          onPress={() => {}}
        >
          <Text className="text-sm font-medium text-gray-700">
            Termos de uso
          </Text>
          <Text className="text-gray-300">›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center justify-between px-4 py-4"
          activeOpacity={0.75}
          onPress={() => {}}
        >
          <Text className="text-sm font-medium text-gray-700">
            Suporte
          </Text>
          <Text className="text-gray-300">›</Text>
        </TouchableOpacity>
      </View>

      {/* Sair */}
      <TouchableOpacity
        onPress={handleSair}
        className="mx-5 border border-red-200 py-4 rounded-2xl items-center"
        activeOpacity={0.75}
      >
        <Text className="text-red-500 font-semibold text-sm">
          Sair da conta
        </Text>
      </TouchableOpacity>

      <Text className="text-xs text-gray-300 text-center mt-4">
        Versão 1.0.0
      </Text>
    </ScrollView>
  )
}
```

-----

## HISTORICO DE REPASSES

Para o entregador ver os repasses já processados, uma seção
adicional na tela de ganhos:

```typescript
// Trecho adicional no final de TelaGanhos
// Busca os últimos 10 repasses do entregador

async function carregarRepasses() {
  if (!courier?.id) return []

  const { data } = await supabase
    .from('payouts')
    .select('id, valor_liquido, status, data_prevista, data_referencia, pagarme_transfer_id, total_pedidos')
    .eq('courier_id', courier.id)
    .order('criado_em', { ascending: false })
    .limit(10)

  return data ?? []
}
```

Componente de card de repasse:

```typescript
function RepasseCard({ repasse }: { repasse: any }) {
  const STATUS_CORES: Record<string, string> = {
    agendado: '#F59E0B',
    processando: '#3B82F6',
    concluido: '#10B981',
    falhou: '#EF4444',
  }

  const STATUS_LABELS: Record<string, string> = {
    agendado: 'Agendado',
    processando: 'Processando',
    concluido: 'Recebido',
    falhou: 'Falhou',
  }

  return (
    <View className="bg-white rounded-2xl px-4 py-3 mb-2
      flex-row items-center justify-between border border-gray-50">
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
            style={{ backgroundColor: STATUS_CORES[repasse.status] ?? '#6B7280' }}
          />
          <Text
            className="text-xs font-medium"
            style={{ color: STATUS_CORES[repasse.status] ?? '#6B7280' }}
          >
            {STATUS_LABELS[repasse.status] ?? repasse.status}
          </Text>
        </View>
      </View>
      <Text className="text-base font-bold text-[#1A4D3A]">
        {formatarReais(repasse.valor_liquido)}
      </Text>
    </View>
  )
}
```

-----

## NOTIFICACAO DE REPASSE PROCESSADO

Quando o cron `daily-payouts` processa um repasse, o entregador
deve receber uma push notification. Isso é configurado no arquivo 23
(Push Notifications). O evento disparador é um UPDATE na tabela
`payouts` com `status = 'concluido'`.

O entregador vê na tela de ganhos:

- Saldo do recipient atualizado no Pagar.me
- Repasse aparecendo como “Recebido” no histórico

-----

## CHECKLIST DO MODULO

- [ ] Edge Function `courier-pagarme-info` deployada e testada
- [ ] `GET /recipients/{id}/balance` no Pagar.me — requer recipient com `status = active`
- [ ] Tela de ganhos busca dados com `useEffect` no mount
- [ ] Saldo Pagar.me carregado via Edge Function — nunca expor `PAGARME_API_KEY` no app
- [ ] Logout garante que o entregador fica offline no banco antes de deslogar
- [ ] Histórico de entregas filtrado por período com query ao Supabase
- [ ] Card de entrega mostra status com cores distintas por estado
- [ ] Média por entrega calculada apenas quando `entregas_concluidas > 0`
- [ ] Repasses com `status = 'agendado'` mostram data prevista
- [ ] Push notification ao receber repasse (implementado no arquivo 23)
- [ ] Entregadores tipo `proprio` podem não ter recipient Pagar.me — seção de saldo
  condicionada a `courier.pagarme_onboarding_status === 'active'`

-----

*Arquivo 22 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 23 — Push Notifications*
