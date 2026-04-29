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
import { courierDesign } from '@/lib/courier-design'

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

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: 'hoje',   label: 'Hoje'   },
  { key: 'semana', label: '7 dias' },
  { key: 'mes',    label: 'Mês'    },
]

const STATUS_CORES: Record<string, string> = {
  agendado:    courierDesign.colors.warning,
  processando: courierDesign.colors.accent,
  concluido:   courierDesign.colors.success,
  falhou:      courierDesign.colors.danger,
}

const STATUS_LABELS: Record<string, string> = {
  agendado:    'Agendado',
  processando: 'Processando',
  concluido:   'Recebido',
  falhou:      'Falhou',
}

export default function TelaGanhos() {
  const { courier } = useAuthStore()
  const { colors, radius } = courierDesign

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
          id, order_id, valor_entrega, status, entregue_em, criado_em,
          orders!inner ( stores!inner (nome) )
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

    const entregas: EntregaHistorico[] = (resEntregas.data ?? []).map((a: any) => ({
      id: a.id,
      order_id: a.order_id,
      valor_entrega: a.valor_entrega,
      status: a.status,
      entregue_em: a.entregue_em,
      criado_em: a.criado_em,
      store_nome: a.orders.stores.nome,
    }))

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
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )
      if (resposta.ok) {
        const dados = await resposta.json()
        setSaldoStripe(dados.saldo)
        setLinkExpress(dados.link_express)
      }
    } catch {
      // saldo não é crítico — ignora erros de conectividade
    }
  }

  useEffect(() => {
    setCarregando(true)
    Promise.all([carregarDados(), carregarSaldoStripe()])
  }, [periodo])

  const onRefresh = useCallback(async () => {
    setAtualizando(true)
    await Promise.all([carregarDados(), carregarSaldoStripe()])
    setAtualizando(false)
  }, [periodo])

  // ── Estado de carregamento ──────────────────────────────────────────────────
  if (carregando) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 60 }}>
        <Skeleton largura="38%" altura={28} />
        <View style={{ marginTop: 20, gap: 10 }}>
          <Skeleton largura="100%" altura={100} />
          <Skeleton largura="100%" altura={60} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Skeleton largura="48%" altura={76} />
            <Skeleton largura="48%" altura={76} />
          </View>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} largura="100%" altura={64} />
          ))}
        </View>
      </View>
    )
  }

  const mediaEntrega = resumo && resumo.entregas_concluidas > 0
    ? Math.round(resumo.ganhos_brutos / resumo.entregas_concluidas)
    : null

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={onRefresh}
          tintColor={colors.inkMuted}
        />
      }
    >
      {/* Cabeçalho */}
      <View style={{ paddingHorizontal: 16, paddingTop: 60, paddingBottom: 20 }}>
        <Text style={{
          fontSize: 28,
          fontWeight: '800',
          color: colors.ink,
          letterSpacing: -0.5,
        }}>
          Ganhos
        </Text>
      </View>

      {/* Card saldo Stripe */}
      {courier?.stripe_onboarding_ok && (
        <CardSaldoStripe saldo={saldoStripe} linkExpress={linkExpress} />
      )}

      {/* Card próximo repasse */}
      {resumo && resumo.proximo_repasse > 0 && (
        <View style={{
          marginHorizontal: 16,
          marginBottom: 12,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <View>
            <Text style={{
              fontSize: 11,
              fontWeight: '700',
              color: colors.inkSoft,
              letterSpacing: 0.7,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}>
              Próximo repasse
            </Text>
            <Text style={{
              fontSize: 22,
              fontWeight: '800',
              color: colors.ink,
              letterSpacing: -0.4,
            }}>
              {formatarReais(resumo.proximo_repasse)}
            </Text>
          </View>
          {resumo.data_proximo_repasse && (
            <View style={{
              backgroundColor: colors.canvasAlt,
              borderRadius: radius.md,
              paddingHorizontal: 12,
              paddingVertical: 8,
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 11, color: colors.inkSoft, marginBottom: 1 }}>
                Previsto em
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
                {new Date(resumo.data_proximo_repasse + 'T00:00:00')
                  .toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Seletor de período */}
      <View style={{
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 4,
        flexDirection: 'row',
        gap: 2,
      }}>
        {PERIODOS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setPeriodo(key)}
            activeOpacity={0.75}
            style={{
              flex: 1,
              height: 38,
              borderRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: periodo === key ? colors.ink : 'transparent',
            }}
          >
            <Text style={{
              fontSize: 13,
              fontWeight: '700',
              color: periodo === key ? colors.accent : colors.inkSoft,
            }}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* KPIs */}
      {resumo && (
        <View style={{
          flexDirection: 'row',
          marginHorizontal: 16,
          marginBottom: 12,
          gap: 8,
        }}>
          <View style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: 16,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Ganhos
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 }}>
              {formatarReais(resumo.ganhos_brutos)}
            </Text>
          </View>

          <View style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: 16,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Entregas
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 }}>
                {resumo.entregas_concluidas}
              </Text>
              <Text style={{ fontSize: 13, color: colors.inkSoft }}>
                /{resumo.total_entregas}
              </Text>
            </View>
          </View>

          {mediaEntrega !== null && (
            <View style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: 16,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                Média
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.success, letterSpacing: -0.4 }}>
                {formatarReais(mediaEntrega)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Histórico de entregas */}
      <View style={{ marginHorizontal: 16, marginBottom: 24 }}>
        <Text style={{
          fontSize: 11,
          fontWeight: '700',
          color: colors.inkSoft,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          marginBottom: 10,
        }}>
          Histórico
        </Text>

        {historico.length === 0 ? (
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            paddingVertical: 36,
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 14, color: colors.inkSoft }}>
              Nenhuma entrega neste período.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 6 }}>
            {historico.map((entrega) => (
              <EntregaHistoricoCard key={entrega.id} entrega={entrega} />
            ))}
          </View>
        )}
      </View>

      {/* Repasses */}
      {repasses.length > 0 && (
        <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <Text style={{
            fontSize: 11,
            fontWeight: '700',
            color: colors.inkSoft,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            Repasses
          </Text>
          <View style={{ gap: 6 }}>
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
  const { colors, radius } = courierDesign
  const cor = STATUS_CORES[repasse.status] ?? colors.inkSoft

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 13, color: colors.inkMuted }}>
          {new Date(repasse.data_referencia + 'T00:00:00')
            .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
          {'  ·  '}
          {repasse.total_pedidos} entrega{repasse.total_pedidos !== 1 ? 's' : ''}
        </Text>
        <View style={{
          alignSelf: 'flex-start',
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.pill,
          backgroundColor: `${cor}18`,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: cor }}>
            {STATUS_LABELS[repasse.status] ?? repasse.status}
          </Text>
        </View>
      </View>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 }}>
        {formatarReais(repasse.valor_liquido)}
      </Text>
    </View>
  )
}
