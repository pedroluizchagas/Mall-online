import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { router, useLocalSearchParams } from 'expo-router'
import { formatarReais, TRANSICOES_PEDIDO_LOJISTA, ROTULO_TRANSICAO } from '@mallevo/lib'
import type { OrderStatus } from '@mallevo/types'
import { useAuthStore } from '@/store/useAuthStore'
import { usePedidosStore, type Pedido, type ItemPedido } from '@/store/usePedidosStore'
import {
  atualizarStatusPedido,
  atribuirEntregador,
  listarEntregadoresDisponiveis,
  type EntregadorDisponivel,
} from '@/lib/pedidos'
import { META_STATUS_LOJISTA, rotuloFormaPagamento } from '@/lib/status-pedido'
import { PartnerIcon } from '@/components/PartnerIcon'
import { partnerDesign, softColor, formatarMomentoCurto } from '@/lib/partner-design'

// Detalhe do pedido — mesmas transições e efeitos do Dashboard
// (fonte: @mallevo/lib TRANSICOES_PEDIDO_LOJISTA + lib/pedidos.ts).
// docs/partner-app/05-stage-3-pedidos.md

/** Nomes de variação do item (ex.: "Tamanho: G"), no shape do select do web. */
function variacoesDoItem(item: ItemPedido): string[] {
  const opcoes = item.product_variants?.product_variant_options ?? []
  return opcoes
    .map((o) => {
      const grupo = o.product_options?.product_option_groups?.nome
      const valor = o.product_options?.valor
      return grupo && valor ? `${grupo}: ${valor}` : valor ?? null
    })
    .filter((s): s is string => !!s)
}

export default function TelaPedido() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { tenant } = useAuthStore()
  const { pedidos, aplicarPedido, carregarPedidos } = usePedidosStore()
  const [salvando, setSalvando] = useState(false)
  const [sheetEntregador, setSheetEntregador] = useState(false)
  const { colors, radius, spacing, typography } = partnerDesign

  const pedido = useMemo(() => pedidos.find((p) => p.id === id) ?? null, [pedidos, id])

  useEffect(() => {
    // Deep link/push pode abrir antes da lista carregar
    if (!pedido) void carregarPedidos()
  }, [])

  if (!pedido) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    )
  }

  const meta = META_STATUS_LOJISTA[pedido.status]
  const transicoes = TRANSICOES_PEDIDO_LOJISTA[pedido.status] ?? []
  const entrega = pedido.delivery_assignments?.[0] ?? null
  const endereco = pedido.endereco_entrega

  async function executarTransicao(novoStatus: OrderStatus) {
    if (!pedido || salvando) return

    // Update otimista + rollback (docs/partner-app/05 §detalhe)
    const anterior = pedido
    aplicarPedido({ ...pedido, status: novoStatus })
    setSalvando(true)

    const motivo = novoStatus === 'cancelado' ? 'Cancelado pelo lojista' : undefined
    const resultado = await atualizarStatusPedido(pedido.id, novoStatus, motivo)
    setSalvando(false)

    if (resultado.erro) {
      aplicarPedido(anterior)
      Alert.alert('Não foi possível atualizar', resultado.erro)
    }
  }

  function confirmarTransicao(novoStatus: OrderStatus) {
    if (novoStatus === 'cancelado') {
      Alert.alert('Cancelar pedido', 'O cliente será notificado. Essa ação não pode ser desfeita.', [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Cancelar pedido', style: 'destructive', onPress: () => void executarTransicao('cancelado') },
      ])
      return
    }

    if (novoStatus === 'aguardando_entregador') {
      // Fluxo do Dashboard: atribuir entregador move o pedido junto
      setSheetEntregador(true)
      return
    }

    void executarTransicao(novoStatus)
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: 140 }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/pedidos'))}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.pill,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: spacing.md,
            }}
          >
            <PartnerIcon name="back" size={18} color={colors.ink} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.ink, fontSize: typography.h2.size, fontWeight: typography.h2.weight }}>
              Pedido
            </Text>
            <Text style={{ color: colors.inkSoft, fontSize: typography.bodySm.size }}>
              {formatarMomentoCurto(pedido.criado_em)}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: softColor(meta.cor),
              borderRadius: radius.pill,
              paddingVertical: 5,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ color: colors.ink, fontSize: typography.bodySm.size, fontWeight: '800' }}>
              {meta.rotulo}
            </Text>
          </View>
        </View>

        {pedido.status === 'cancelado' && pedido.motivo_cancelamento && (
          <Cartao>
            <Text style={{ color: colors.danger, fontSize: typography.body.size, fontWeight: '600' }}>
              {pedido.motivo_cancelamento}
            </Text>
          </Cartao>
        )}

        {/* Itens */}
        <Legenda>Itens</Legenda>
        <Cartao>
          {(pedido.order_items ?? []).map((item, idx) => {
            const variacoes = variacoesDoItem(item)
            const mods = item.modifiers ?? []
            return (
              <View
                key={item.id}
                style={{
                  paddingVertical: 10,
                  borderTopWidth: idx === 0 ? 0 : 1,
                  borderTopColor: colors.line,
                }}
              >
                <View style={{ flexDirection: 'row' }}>
                  <Text style={{ color: colors.ink, fontWeight: '800', width: 34 }}>
                    {item.quantidade}×
                  </Text>
                  <Text style={{ flex: 1, color: colors.ink, fontWeight: '600' }}>{item.nome}</Text>
                  <Text style={{ color: colors.ink, fontWeight: '700' }}>
                    {formatarReais(item.subtotal)}
                  </Text>
                </View>
                {variacoes.map((v) => (
                  <Text key={v} style={{ color: colors.inkMuted, fontSize: typography.bodySm.size, marginLeft: 34 }}>
                    {v}
                  </Text>
                ))}
                {mods.map((m) => (
                  <Text key={m.modifier_id} style={{ color: colors.inkMuted, fontSize: typography.bodySm.size, marginLeft: 34 }}>
                    + {m.nome}{m.preco_extra ? ` (${formatarReais(m.preco_extra)})` : ''}
                  </Text>
                ))}
                {item.observacoes ? (
                  <Text style={{ color: colors.warning, fontSize: typography.bodySm.size, marginLeft: 34 }}>
                    Obs: {item.observacoes}
                  </Text>
                ) : null}
              </View>
            )
          })}

          <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, gap: 4 }}>
            <LinhaValor rotulo="Subtotal" valor={formatarReais(pedido.subtotal)} />
            <LinhaValor rotulo="Entrega" valor={formatarReais(pedido.taxa_entrega)} />
            <LinhaValor rotulo="Total" valor={formatarReais(pedido.total)} destaque />
          </View>
        </Cartao>

        {/* Cliente + endereço */}
        <Legenda>Cliente</Legenda>
        <Cartao>
          <Text style={{ color: colors.ink, fontSize: typography.bodyLg.size, fontWeight: '700' }}>
            {pedido.consumers?.nome ?? 'Cliente'}
          </Text>
          {pedido.consumers?.telefone ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${pedido.consumers?.telefone}`)}
              activeOpacity={0.7}
              style={{ marginTop: 4 }}
            >
              <Text style={{ color: colors.inkMuted, fontSize: typography.body.size }}>
                {pedido.consumers.telefone} — tocar para ligar
              </Text>
            </TouchableOpacity>
          ) : null}
          {endereco ? (
            <Text style={{ color: colors.inkMuted, fontSize: typography.body.size, marginTop: 8 }}>
              {[endereco.rua, endereco.numero].filter(Boolean).join(', ')}
              {endereco.complemento ? ` — ${endereco.complemento}` : ''}
              {'\n'}
              {[endereco.bairro, endereco.cidade].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
        </Cartao>

        {/* Pagamento + observações */}
        <Legenda>Pagamento</Legenda>
        <Cartao>
          <LinhaValor rotulo={rotuloFormaPagamento(pedido.forma_pagamento)} valor={pedido.payment_status === 'pago' ? 'Pago' : 'Pendente'} />
        </Cartao>

        {pedido.observacoes ? (
          <>
            <Legenda>Observações do pedido</Legenda>
            <Cartao>
              <Text style={{ color: colors.ink, fontSize: typography.body.size }}>{pedido.observacoes}</Text>
            </Cartao>
          </>
        ) : null}

        {/* Entregador */}
        {entrega?.couriers ? (
          <>
            <Legenda>Entregador</Legenda>
            <Cartao>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.ink, fontSize: typography.bodyLg.size, fontWeight: '700' }}>
                    {entrega.couriers.nome}
                  </Text>
                  <Text style={{ color: colors.inkMuted, fontSize: typography.bodySm.size }}>
                    Entrega: {formatarReais(entrega.valor_entrega)} · {entrega.status}
                  </Text>
                </View>
                {entrega.couriers.telefone ? (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${entrega.couriers?.telefone}`)}
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: colors.surfaceMuted,
                      borderRadius: radius.pill,
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                    }}
                  >
                    <Text style={{ color: colors.ink, fontWeight: '700', fontSize: typography.bodySm.size }}>
                      Ligar
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </Cartao>
          </>
        ) : null}
      </ScrollView>

      {/* Ações fixas no rodapé — mesmas transições do Dashboard */}
      {transicoes.length > 0 && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: spacing.lg,
            paddingBottom: spacing['3xl'],
            backgroundColor: colors.canvas,
            borderTopWidth: 1,
            borderTopColor: colors.line,
            gap: spacing.sm,
          }}
        >
          {transicoes.map((destino) => {
            const cancelamento = destino === 'cancelado'
            return (
              <TouchableOpacity
                key={destino}
                onPress={() => confirmarTransicao(destino)}
                disabled={salvando}
                activeOpacity={0.85}
                style={{
                  height: 54,
                  borderRadius: radius.pill,
                  backgroundColor: cancelamento ? colors.surface : colors.accent,
                  borderWidth: cancelamento ? 1.5 : 0,
                  borderColor: colors.danger,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {salvando ? (
                  <ActivityIndicator color={cancelamento ? colors.danger : colors.ink} />
                ) : (
                  <Text
                    style={{
                      color: cancelamento ? colors.danger : colors.ink,
                      fontWeight: '800',
                      fontSize: 15,
                    }}
                  >
                    {ROTULO_TRANSICAO[destino] ?? destino}
                  </Text>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      <SheetEntregador
        visivel={sheetEntregador}
        fechar={() => setSheetEntregador(false)}
        pedido={pedido}
        tenantId={tenant?.id ?? null}
      />
    </View>
  )
}

// ————— Bottom sheet de atribuição (espelha modal-atribuir-entregador.tsx) —————

function SheetEntregador({
  visivel,
  fechar,
  pedido,
  tenantId,
}: {
  visivel: boolean
  fechar: () => void
  pedido: Pedido
  tenantId: string | null
}) {
  const [entregadores, setEntregadores] = useState<EntregadorDisponivel[]>([])
  const [carregando, setCarregando] = useState(false)
  const [atribuindo, setAtribuindo] = useState(false)
  const { carregarPedidos } = usePedidosStore()
  const { colors, radius, spacing, typography, opacity } = partnerDesign

  useEffect(() => {
    if (!visivel || !tenantId) return
    setCarregando(true)
    listarEntregadoresDisponiveis(tenantId)
      .then(setEntregadores)
      .finally(() => setCarregando(false))
  }, [visivel, tenantId])

  async function handleAtribuir(courierId: string) {
    if (!tenantId || atribuindo) return
    setAtribuindo(true)
    // valor_entrega = taxa de entrega do pedido (mesmo do Dashboard)
    const resultado = await atribuirEntregador(pedido.id, courierId, tenantId, pedido.taxa_entrega)
    setAtribuindo(false)

    if (resultado.erro) {
      Alert.alert('Não foi possível atribuir', resultado.erro)
      return
    }
    await carregarPedidos()
    fechar()
  }

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
      <Pressable
        onPress={fechar}
        style={{ flex: 1, backgroundColor: `rgba(17, 18, 22, ${opacity.overlay})`, justifyContent: 'flex-end' }}
      >
        <Pressable
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            paddingTop: spacing.lg,
            paddingBottom: spacing['4xl'],
            paddingHorizontal: spacing.lg,
            maxHeight: '70%',
          }}
        >
          <Text style={{ color: colors.ink, fontSize: typography.h3.size, fontWeight: '700', marginBottom: 2 }}>
            Selecionar entregador
          </Text>
          <Text style={{ color: colors.inkMuted, fontSize: typography.bodySm.size, marginBottom: spacing.md }}>
            Valor da entrega: {formatarReais(pedido.taxa_entrega)}
          </Text>

          {carregando ? (
            <ActivityIndicator color={colors.ink} style={{ marginVertical: spacing['2xl'] }} />
          ) : entregadores.length === 0 ? (
            <Text style={{ color: colors.inkSoft, fontSize: typography.body.size, marginVertical: spacing.lg }}>
              Nenhum entregador disponível agora. Cadastre entregadores próprios em
              Menu → Entregadores ou aguarde um autônomo ficar online.
            </Text>
          ) : (
            <FlatList
              data={entregadores}
              keyExtractor={(e) => e.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => void handleAtribuir(item.id)}
                  disabled={atribuindo}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: colors.line,
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: radius.pill,
                      backgroundColor: colors.surfaceMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PartnerIcon name="bike" size={18} color={colors.inkMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.ink, fontWeight: '700' }}>{item.nome}</Text>
                    <Text style={{ color: colors.inkSoft, fontSize: typography.bodySm.size }}>
                      {item.tipo === 'proprio' ? 'Entregador próprio' : 'Autônomo'}
                      {item.online ? ' · online' : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ————— Primitivos locais —————

function Cartao({ children }: { children: React.ReactNode }) {
  const { colors, radius, spacing } = partnerDesign
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.lg,
        marginBottom: spacing.lg,
      }}
    >
      {children}
    </View>
  )
}

function Legenda({ children }: { children: string }) {
  const { colors, spacing, typography } = partnerDesign
  return (
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
      {children}
    </Text>
  )
}

function LinhaValor({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  const { colors, typography } = partnerDesign
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text
        style={{
          flex: 1,
          color: destaque ? colors.ink : colors.inkMuted,
          fontSize: typography.body.size,
          fontWeight: destaque ? '800' : '500',
        }}
      >
        {rotulo}
      </Text>
      <Text
        style={{
          color: colors.ink,
          fontSize: destaque ? typography.bodyLg.size : typography.body.size,
          fontWeight: destaque ? '800' : '600',
        }}
      >
        {valor}
      </Text>
    </View>
  )
}
