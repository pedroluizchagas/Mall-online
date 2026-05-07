import { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { HeaderTela } from '@/components/HeaderTela'
import { PedidoCard, type PedidoCardModel } from '@/components/PedidoCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { Chip } from '@/components/ui/Chip'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { consumerDesign } from '@/lib/consumer-design'
import { ehAtivo } from '@/lib/status-pedido'

const { colors, spacing, radius } = consumerDesign

type FiltroAtivo = 'todos' | 'ativos' | 'historico'

export default function TelaPedidos() {
  const [pedidos, setPedidos] = useState<PedidoCardModel[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [filtro, setFiltro] = useState<FiltroAtivo>('todos')

  async function carregarPedidos() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: consumer } = await supabase
      .from('consumers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!consumer) return

    const { data } = await supabase
      .from('orders')
      .select(
        `
        id, status, total, criado_em,
        stores (nome),
        order_items (nome, quantidade)
      `
      )
      .eq('consumer_id', consumer.id)
      .order('criado_em', { ascending: false })
      .limit(50)

    setPedidos((data as PedidoCardModel[]) ?? [])
    setCarregando(false)
  }

  useEffect(() => {
    carregarPedidos()
  }, [])

  const onRefresh = useCallback(async () => {
    setAtualizando(true)
    await carregarPedidos()
    setAtualizando(false)
  }, [])

  const pedidosAtivos = pedidos.filter((p) => ehAtivo(p.status))
  const historico = pedidos.filter((p) => !ehAtivo(p.status))

  const listagem =
    filtro === 'ativos'
      ? pedidosAtivos
      : filtro === 'historico'
      ? historico
      : pedidos

  const mostrarSeparadorHistorico =
    filtro === 'todos' && pedidosAtivos.length > 0 && historico.length > 0

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <HeaderTela
        variante="simples"
        titulo="Meus pedidos"
        acaoDireita={
          pedidosAtivos.length > 0 ? (
            <Badge
              rotulo={`${pedidosAtivos.length} ativo${
                pedidosAtivos.length !== 1 ? 's' : ''
              }`}
              cor={colors.accent}
              preenchido
              tamanho="md"
            />
          ) : undefined
        }
      />

      {/* Chips de filtro */}
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          paddingHorizontal: 24,
          paddingBottom: 12,
        }}
      >
        <Chip
          rotulo="Todos"
          ativo={filtro === 'todos'}
          aoTocar={() => setFiltro('todos')}
          tamanho="sm"
        />
        <Chip
          rotulo="Ativos"
          ativo={filtro === 'ativos'}
          aoTocar={() => setFiltro('ativos')}
          tamanho="sm"
        />
        <Chip
          rotulo="Histórico"
          ativo={filtro === 'historico'}
          aoTocar={() => setFiltro('historico')}
          tamanho="sm"
        />
      </View>

      {carregando ? (
        <View style={{ paddingHorizontal: 16, gap: 12, paddingTop: 12 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                padding: 16,
                gap: 10,
              }}
            >
              <Skeleton largura="60%" altura={16} />
              <Skeleton largura="80%" altura={13} />
              <Skeleton largura="40%" altura={13} />
            </View>
          ))}
        </View>
      ) : listagem.length === 0 ? (
        <EmptyState
          icone={filtro === 'historico' ? 'orders' : 'package'}
          titulo={
            filtro === 'ativos'
              ? 'Nenhum pedido ativo'
              : filtro === 'historico'
              ? 'Histórico vazio'
              : 'Nenhum pedido ainda'
          }
          descricao={
            filtro === 'todos'
              ? 'Faça seu primeiro pedido e ele aparecerá aqui.'
              : 'Sem pedidos nesta categoria.'
          }
          acao={
            filtro !== 'ativos'
              ? {
                  label: 'Explorar lojas',
                  aoTocar: () => router.replace('/(tabs)'),
                }
              : undefined
          }
        />
      ) : (
        <FlatList
          data={listagem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: spacing.tabBarHeight,
            paddingTop: 8,
          }}
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              onRefresh={onRefresh}
              tintColor={colors.ink}
            />
          }
          ListHeaderComponent={
            filtro === 'todos' && pedidosAtivos.length > 0 ? (
              <Text style={labelSecaoStyle}>Em andamento</Text>
            ) : null
          }
          renderItem={({ item, index }) => {
            const exibirSeparador =
              mostrarSeparadorHistorico && index === pedidosAtivos.length

            return (
              <>
                {exibirSeparador && (
                  <Text style={[labelSecaoStyle, { marginTop: 16 }]}>
                    Histórico
                  </Text>
                )}
                <PedidoCard pedido={item} />
              </>
            )
          }}
        />
      )}
    </View>
  )
}

const labelSecaoStyle = {
  fontSize: 12,
  fontWeight: '700' as const,
  color: colors.inkMuted,
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  paddingHorizontal: 8,
  marginBottom: 8,
}
