import { useMemo, useState } from 'react'
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import type { OrderStatus } from '@mallevo/types'
import { usePedidosStore, STATUS_ATIVOS, type Pedido } from '@/store/usePedidosStore'
import { PedidoCard } from '@/components/PedidoCard'
import { SeletorLoja } from '@/components/SeletorLoja'
import { partnerDesign } from '@/lib/partner-design'

// Aba Pedidos — lista em tempo real agrupada por estado operacional,
// com filtros por status e período (espelha os filtros do Dashboard).
// docs/partner-app/05-stage-3-pedidos.md

type FiltroStatus = 'todos' | OrderStatus
type FiltroPeriodo = 'hoje' | '7d' | 'mes'

const FILTROS_STATUS: { key: FiltroStatus; rotulo: string }[] = [
  { key: 'todos', rotulo: 'Todos' },
  { key: 'novo', rotulo: 'Novos' },
  { key: 'em_preparo', rotulo: 'Em preparo' },
  { key: 'saiu_para_entrega', rotulo: 'Em entrega' },
  { key: 'entregue', rotulo: 'Entregues' },
  { key: 'cancelado', rotulo: 'Cancelados' },
]

const FILTROS_PERIODO: { key: FiltroPeriodo; rotulo: string }[] = [
  { key: 'hoje', rotulo: 'Hoje' },
  { key: '7d', rotulo: '7 dias' },
  { key: 'mes', rotulo: 'Mês' },
]

function inicioDoPeriodo(periodo: FiltroPeriodo): Date {
  const d = new Date()
  if (periodo === 'hoje') d.setHours(0, 0, 0, 0)
  if (periodo === '7d') d.setDate(d.getDate() - 7)
  if (periodo === 'mes') d.setDate(d.getDate() - 30)
  return d
}

export default function TelaPedidos() {
  const { pedidos, carregando, erro, carregarPedidos } = usePedidosStore()
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>('hoje')
  const { colors, radius, spacing, typography } = partnerDesign

  const filtrados = useMemo(() => {
    const inicio = inicioDoPeriodo(filtroPeriodo).getTime()
    return pedidos.filter((p) => {
      if (filtroStatus !== 'todos' && p.status !== filtroStatus) return false
      // Ativos sempre aparecem, independente do período (não sumir pedido em andamento)
      const ativo = STATUS_ATIVOS.includes(p.status)
      return ativo || new Date(p.criado_em).getTime() >= inicio
    })
  }, [pedidos, filtroStatus, filtroPeriodo])

  const grupos = useMemo(() => {
    const novos: Pedido[] = []
    const andamento: Pedido[] = []
    const finalizados: Pedido[] = []
    for (const p of filtrados) {
      if (p.status === 'novo') novos.push(p)
      else if (STATUS_ATIVOS.includes(p.status)) andamento.push(p)
      else finalizados.push(p)
    }
    return { novos, andamento, finalizados }
  }, [filtrados])

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={carregando} onRefresh={() => void carregarPedidos()} />
        }
        contentContainerStyle={{
          paddingTop: 72,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.tabBarHeight + spacing.lg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <Text
            style={{
              flex: 1,
              color: colors.ink,
              fontSize: typography.h1.size,
              fontWeight: typography.h1.weight,
              letterSpacing: typography.h1.tracking,
            }}
          >
            Pedidos
          </Text>
          <SeletorLoja />
        </View>

        {/* Filtros por status */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
          {FILTROS_STATUS.map((f) => {
            const ativo = filtroStatus === f.key
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFiltroStatus(f.key)}
                activeOpacity={0.7}
                style={{
                  backgroundColor: ativo ? colors.ink : colors.surface,
                  borderRadius: radius.pill,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  marginRight: 8,
                }}
              >
                <Text
                  style={{
                    color: ativo ? colors.accent : colors.inkMuted,
                    fontSize: typography.bodySm.size,
                    fontWeight: '700',
                  }}
                >
                  {f.rotulo}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Filtro por período */}
        <View style={{ flexDirection: 'row', marginBottom: spacing.xl }}>
          {FILTROS_PERIODO.map((f) => {
            const ativo = filtroPeriodo === f.key
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFiltroPeriodo(f.key)}
                activeOpacity={0.7}
                style={{ marginRight: 16, paddingVertical: 4 }}
              >
                <Text
                  style={{
                    color: ativo ? colors.ink : colors.inkSoft,
                    fontSize: typography.bodySm.size,
                    fontWeight: ativo ? '800' : '500',
                    textDecorationLine: ativo ? 'underline' : 'none',
                  }}
                >
                  {f.rotulo}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {erro && (
          <Text style={{ color: colors.danger, marginBottom: spacing.md }}>
            {erro} — puxe para tentar de novo.
          </Text>
        )}

        <Grupo titulo={`Novos${grupos.novos.length ? ` (${grupos.novos.length})` : ''}`} pedidos={grupos.novos} vazio="Nenhum pedido novo." />
        <Grupo titulo="Em andamento" pedidos={grupos.andamento} vazio="Nada em andamento." />
        <Grupo titulo="Finalizados" pedidos={grupos.finalizados} vazio="Nenhum pedido finalizado no período." />
      </ScrollView>
    </View>
  )
}

function Grupo({ titulo, pedidos, vazio }: { titulo: string; pedidos: Pedido[]; vazio: string }) {
  const { colors, spacing, typography } = partnerDesign

  return (
    <View style={{ marginBottom: spacing['2xl'] }}>
      <Text
        style={{
          color: colors.inkSoft,
          fontSize: typography.micro.size,
          fontWeight: typography.micro.weight,
          letterSpacing: typography.micro.tracking,
          textTransform: 'uppercase',
          marginBottom: spacing.sm,
          marginLeft: spacing.xs,
        }}
      >
        {titulo}
      </Text>
      {pedidos.length === 0 ? (
        <Text style={{ color: colors.inkSoft, fontSize: typography.bodySm.size, marginLeft: spacing.xs }}>
          {vazio}
        </Text>
      ) : (
        pedidos.map((p) => <PedidoCard key={p.id} pedido={p} />)
      )}
    </View>
  )
}
