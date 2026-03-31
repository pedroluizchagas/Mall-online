import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { formatarReais } from '@mallora/lib'
import { Skeleton } from '@/components/Skeleton'
import {
  Clock,
  ChefHat,
  Bike,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  ChevronRight,
  PackageSearch,
} from 'lucide-react-native'

// ─── Mapeamentos de status ─────────────────────────────────────────────────

const LABELS_STATUS: Record<string, string> = {
  novo: 'Aguardando confirmação',
  confirmado: 'Confirmado',
  em_preparo: 'Em preparo',
  aguardando_entregador: 'Aguardando entregador',
  saiu_para_entrega: 'Saindo para entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

const CORES_STATUS: Record<string, string> = {
  novo: '#D4A04A',
  confirmado: '#5B8DEF',
  em_preparo: '#9B6BDF',
  aguardando_entregador: '#F97316',
  saiu_para_entrega: '#0BA5C3',
  entregue: '#287D5C',
  cancelado: '#C75B3A',
}

const PROGRESSO_STATUS: Record<string, number> = {
  novo: 0.1,
  confirmado: 0.28,
  em_preparo: 0.52,
  aguardando_entregador: 0.72,
  saiu_para_entrega: 0.88,
  entregue: 1,
  cancelado: 0,
}

// ─── Tipos ─────────────────────────────────────────────────────────────────

interface Pedido {
  id: string
  status: string
  total: number
  criado_em: string
  stores: { nome: string } | null
  order_items: { nome: string; quantidade: number }[]
}

type FiltroAtivo = 'todos' | 'ativos' | 'historico'

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatarData(iso: string) {
  const d = new Date(iso)
  const hoje = new Date()
  const ontem = new Date()
  ontem.setDate(ontem.getDate() - 1)

  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (d.toDateString() === hoje.toDateString()) return `Hoje, ${hora}`
  if (d.toDateString() === ontem.toDateString()) return `Ontem, ${hora}`
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  }) + `, ${hora}`
}

function iconeStatus(status: string) {
  const cor = CORES_STATUS[status] ?? '#8A8A7E'
  const props = { size: 15, color: cor, strokeWidth: 2 }
  switch (status) {
    case 'novo':
    case 'confirmado': return <Clock {...props} />
    case 'em_preparo': return <ChefHat {...props} />
    case 'aguardando_entregador':
    case 'saiu_para_entrega': return <Bike {...props} />
    case 'entregue': return <CheckCircle2 {...props} />
    case 'cancelado': return <XCircle {...props} />
    default: return <ShoppingBag {...props} />
  }
}

// ─── Componente de card ────────────────────────────────────────────────────

function CardPedido({ item, ativo }: { item: Pedido; ativo: boolean }) {
  const cor = CORES_STATUS[item.status] ?? '#8A8A7E'
  const progresso = PROGRESSO_STATUS[item.status] ?? 0
  const isCancelado = item.status === 'cancelado'

  const itensTexto = item.order_items
    ?.map((i) => `${i.quantidade}× ${i.nome}`)
    .join(', ') ?? ''

  return (
    <TouchableOpacity
      onPress={() => router.push(`/pedido/${item.id}`)}
      activeOpacity={0.82}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: ativo ? `${cor}28` : 'rgba(26,26,23,0.06)',
        shadowColor: '#1C1C19',
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
      }}
    >
      {/* Linha lateral colorida (só em pedidos ativos) */}
      {ativo && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            backgroundColor: cor,
            borderTopLeftRadius: 20,
            borderBottomLeftRadius: 20,
          }}
        />
      )}

      <View style={{ padding: 16, paddingLeft: ativo ? 20 : 16 }}>
        {/* Topo: loja + status */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
          {/* Ícone da loja */}
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: ativo ? `${cor}14` : '#F4F0EB',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <ShoppingBag
              size={18}
              color={ativo ? cor : '#8A8A7E'}
              strokeWidth={1.8}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14.5,
                fontWeight: '700',
                color: '#1C1C19',
                letterSpacing: -0.2,
              }}
              numberOfLines={1}
            >
              {item.stores?.nome ?? 'Loja'}
            </Text>
            <Text
              style={{ fontSize: 12, color: '#8A8A7E', marginTop: 2 }}
              numberOfLines={1}
            >
              {itensTexto}
            </Text>
          </View>

          <ChevronRight size={15} color="#C8C8BE" strokeWidth={1.8} />
        </View>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: 'rgba(26,26,23,0.06)',
            marginBottom: 10,
          }}
        />

        {/* Rodapé: status + data + total */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Badge de status */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 100,
              backgroundColor: isCancelado
                ? 'rgba(199,91,58,0.08)'
                : `${cor}14`,
              marginRight: 8,
            }}
          >
            {iconeStatus(item.status)}
            <Text
              style={{
                fontSize: 11.5,
                fontWeight: '600',
                color: cor,
                letterSpacing: 0.1,
              }}
            >
              {LABELS_STATUS[item.status]}
            </Text>
          </View>

          <View style={{ flex: 1 }} />

          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: '#1A4D3A',
                letterSpacing: -0.3,
              }}
            >
              {formatarReais(item.total)}
            </Text>
            <Text style={{ fontSize: 11, color: '#A8A89E', marginTop: 1 }}>
              {formatarData(item.criado_em)}
            </Text>
          </View>
        </View>

        {/* Barra de progresso (só em pedidos ativos, não cancelados) */}
        {ativo && !isCancelado && (
          <View
            style={{
              height: 3,
              backgroundColor: `${cor}20`,
              borderRadius: 2,
              marginTop: 12,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${progresso * 100}%`,
                backgroundColor: cor,
                borderRadius: 2,
              }}
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

// ─── Tela principal ────────────────────────────────────────────────────────

export default function TelaPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [filtro, setFiltro] = useState<FiltroAtivo>('todos')
  const insets = useSafeAreaInsets()

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
      .select(`
        id, status, total, criado_em,
        stores (nome),
        order_items (nome, quantidade)
      `)
      .eq('consumer_id', consumer.id)
      .order('criado_em', { ascending: false })
      .limit(50)

    setPedidos((data as Pedido[]) ?? [])
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

  const pedidosAtivos = pedidos.filter(
    (p) => !['entregue', 'cancelado'].includes(p.status)
  )
  const historico = pedidos.filter((p) =>
    ['entregue', 'cancelado'].includes(p.status)
  )

  const listagem =
    filtro === 'ativos'
      ? pedidosAtivos
      : filtro === 'historico'
      ? historico
      : pedidos

  // ─── Loading ────────────────────────────────────────────────────────────

  if (carregando) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#F4F0EB',
          paddingTop: insets.top + 20,
          paddingHorizontal: 20,
        }}
      >
        <Skeleton largura="45%" altura={28} />
        <View style={{ marginTop: 24, gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
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
      </View>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F0EB' }}>
      <FlatList
        data={listagem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 100,
          paddingTop: 12,
        }}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={onRefresh}
            tintColor="#1A4D3A"
          />
        }
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + 12, marginBottom: 20 }}>
            {/* Título */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 18,
              }}
            >
              <Text
                style={{
                  fontSize: 26,
                  fontWeight: '800',
                  color: '#1A4D3A',
                  letterSpacing: -0.6,
                }}
              >
                Pedidos
              </Text>
              {pedidosAtivos.length > 0 && (
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 100,
                    backgroundColor: '#1A4D3A',
                  }}
                >
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {pedidosAtivos.length} ativo{pedidosAtivos.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>

            {/* Filtros */}
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
              }}
            >
              {(
                [
                  { key: 'todos', label: 'Todos' },
                  { key: 'ativos', label: 'Em andamento' },
                  { key: 'historico', label: 'Histórico' },
                ] as { key: FiltroAtivo; label: string }[]
              ).map((f) => (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFiltro(f.key)}
                  activeOpacity={0.75}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 100,
                    backgroundColor:
                      filtro === f.key ? '#1A4D3A' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor:
                      filtro === f.key
                        ? '#1A4D3A'
                        : 'rgba(26,26,23,0.1)',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: filtro === f.key ? '#FFFFFF' : '#6B6B60',
                      letterSpacing: 0.1,
                    }}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Label de seção */}
            {filtro === 'todos' && pedidosAtivos.length > 0 && (
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: '700',
                  color: '#8A8A7E',
                  letterSpacing: 0.9,
                  textTransform: 'uppercase',
                  marginTop: 22,
                  marginBottom: 2,
                }}
              >
                Em andamento
              </Text>
            )}
          </View>
        }
        renderItem={({ item, index }) => {
          const isAtivo = !['entregue', 'cancelado'].includes(item.status)

          // Separador "Histórico" na view "Todos"
          const mostrarSeparadorHistorico =
            filtro === 'todos' &&
            pedidosAtivos.length > 0 &&
            index === pedidosAtivos.length

          return (
            <>
              {mostrarSeparadorHistorico && (
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: '700',
                    color: '#8A8A7E',
                    letterSpacing: 0.9,
                    textTransform: 'uppercase',
                    marginBottom: 10,
                    marginTop: 6,
                  }}
                >
                  Histórico
                </Text>
              )}
              <CardPedido item={item} ativo={isAtivo} />
            </>
          )
        }}
        ListEmptyComponent={
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 24,
                backgroundColor: 'rgba(26,77,58,0.07)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <PackageSearch size={32} color="#1A4D3A" strokeWidth={1.5} />
            </View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: '#1C1C19',
                marginBottom: 6,
              }}
            >
              {filtro === 'ativos'
                ? 'Nenhum pedido ativo'
                : filtro === 'historico'
                ? 'Histórico vazio'
                : 'Nenhum pedido ainda'}
            </Text>
            <Text
              style={{
                fontSize: 13.5,
                color: '#8A8A7E',
                textAlign: 'center',
                lineHeight: 20,
                marginBottom: 20,
              }}
            >
              {filtro === 'todos'
                ? 'Faça seu primeiro pedido\ne ele aparecerá aqui.'
                : 'Sem pedidos nessa categoria.'}
            </Text>
            {filtro !== 'ativos' && (
              <TouchableOpacity
                onPress={() => router.replace('/(tabs)')}
                activeOpacity={0.75}
                style={{
                  paddingHorizontal: 22,
                  paddingVertical: 11,
                  borderRadius: 100,
                  backgroundColor: '#1A4D3A',
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 13.5,
                    fontWeight: '600',
                  }}
                >
                  Explorar lojas
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  )
}
