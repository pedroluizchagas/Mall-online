import { useEffect, useMemo, useState } from 'react'
import { Alert, Linking, Text, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
import { metaDoStatus, ehAtivo, rotuloFormaPagamento } from '@/lib/status-pedido'
import { PartnerIcon, type PartnerIconName } from '@/components/PartnerIcon'
import { CardSeparacao } from '@/components/CardSeparacao'
import { TelaMarquise } from '@/components/marquise/TelaMarquise'
import {
  BarraProgresso,
  CartaoVidro,
  MoedaVidro,
  PontoAoVivo,
  Portaria,
  estiloMicroMudo,
  useFontesMarquee,
} from '@/components/marquise/Marquise'
import { SecaoFolha, CartaoFolha } from '@/components/ui/SecaoFolha'
import { FolhaModal } from '@/components/ui/FolhaModal'
import { Botao } from '@/components/ui/Botao'
import { LoadingState } from '@/components/ui/LoadingState'
import { partnerDesign, formatarMomentoCurto, softColor, tempoRelativo } from '@/lib/partner-design'

/**
 * Detalhe do pedido — a arquitetura do tracking do consumer (07-telas §10)
 * na visão de quem opera: MARQUISE com o que está ao vivo (status por
 * extenso, o que fazer agora, barra de progresso, cliente e telefone em
 * moeda de vidro); FOLHA com o registro (separação de carga, itens,
 * cliente e endereço, pagamento, observações, entregador). As transições
 * de status ficam numa barra fixa no pé — mesmas regras do Dashboard
 * (@mallevo/lib TRANSICOES_PEDIDO_LOJISTA + lib/pedidos.ts).
 * docs/partner-app/05-stage-3-pedidos.md
 */

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

const { colors, radius, shadow } = partnerDesign

export default function TelaPedido() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { tenant } = useAuthStore()
  const { pedidos, aplicarPedido, carregarPedidos } = usePedidosStore()
  const [salvando, setSalvando] = useState(false)
  const [sheetEntregador, setSheetEntregador] = useState(false)
  const insets = useSafeAreaInsets()
  const fontes = useFontesMarquee()

  const pedido = useMemo(() => pedidos.find((p) => p.id === id) ?? null, [pedidos, id])

  useEffect(() => {
    // Deep link/push pode abrir antes da lista carregar
    if (!pedido) void carregarPedidos()
  }, [])

  if (!pedido) {
    return (
      <>
        <StatusBar style="light" />
        <LoadingState modo="tela" variante="escuro" mensagem="Abrindo o pedido…" />
      </>
    )
  }

  const meta = metaDoStatus(pedido.status)
  const ativo = ehAtivo(pedido.status)
  const transicoes = TRANSICOES_PEDIDO_LOJISTA[pedido.status] ?? []
  const entrega = pedido.delivery_assignments?.[0] ?? null
  const endereco = pedido.endereco_entrega
  const cliente = pedido.consumers?.nome ?? 'Cliente'
  const telefone = pedido.consumers?.telefone

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
        {
          text: 'Cancelar pedido',
          style: 'destructive',
          onPress: () => void executarTransicao('cancelado'),
        },
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

  const alturaCta = transicoes.length > 0 ? 16 + transicoes.length * 56 + 16 + insets.bottom : 0

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TelaMarquise
        stack
        paddingBottomFolha={Math.max(alturaCta + 16, 40 + insets.bottom)}
        marquise={
          <>
            <Portaria
              esquerda={
                <MoedaVidro
                  icone="back"
                  rotulo="Voltar"
                  aoTocar={() =>
                    router.canGoBack() ? router.back() : router.replace('/(tabs)/pedidos')
                  }
                />
              }
              direita={
                telefone ? (
                  <MoedaVidro
                    icone="phone"
                    rotulo={`Ligar para ${cliente}`}
                    accent={ativo}
                    aoTocar={() => void Linking.openURL(`tel:${telefone}`)}
                  />
                ) : undefined
              }
            />

            <View style={{ paddingHorizontal: 24, paddingTop: 22 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {ativo && <PontoAoVivo cor={meta.pedeAcao ? colors.accent : colors.marqueeInkSoft} />}
                <Text style={estiloMicroMudo} numberOfLines={1}>
                  {ativo ? `Ao vivo · ${cliente}` : `${cliente} · ${formatarMomentoCurto(pedido.criado_em)}`}
                </Text>
              </View>
              <Text
                style={[
                  fontes.statement,
                  {
                    fontSize: 30,
                    lineHeight: 35,
                    color: colors.white,
                    letterSpacing: -0.7,
                    marginTop: 8,
                  },
                ]}
              >
                {meta.rotuloLongo}
                {ativo ? (
                  <>
                    {'\n'}
                    <Text style={[fontes.acento, { color: colors.accent }]}>
                      {tempoRelativo(pedido.criado_em) === 'agora'
                        ? 'chegou agora.'
                        : `há ${tempoRelativo(pedido.criado_em)}.`}
                    </Text>
                  </>
                ) : null}
              </Text>
              <Text
                style={{ fontSize: 13.5, fontWeight: '500', color: colors.marqueeInkSoft, marginTop: 8 }}
              >
                {meta.descricao}
              </Text>

              {pedido.status !== 'cancelado' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 }}>
                  <BarraProgresso
                    valor={meta.progresso}
                    cor={pedido.status === 'entregue' ? colors.success : colors.accent}
                  />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.marqueeInkSoft }}>
                    {Math.round(meta.progresso * 100)}%
                  </Text>
                </View>
              )}
            </View>

            {pedido.status === 'cancelado' && pedido.motivo_cancelamento ? (
              <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
                <View
                  style={{
                    backgroundColor: softColor(colors.danger),
                    borderRadius: radius.md,
                    padding: 14,
                  }}
                >
                  <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.white }}>
                    {pedido.motivo_cancelamento}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Total e pagamento — o que o balcão quer ver primeiro */}
            <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
              <CartaoVidro padding={16}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={estiloMicroMudo}>Total do pedido</Text>
                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: '800',
                        color: colors.white,
                        letterSpacing: -0.6,
                        marginTop: 2,
                      }}
                    >
                      {formatarReais(pedido.total)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.white }}>
                      {rotuloFormaPagamento(pedido.forma_pagamento)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        color: pedido.payment_status === 'pago' ? colors.success : colors.warning,
                        marginTop: 3,
                      }}
                    >
                      {pedido.payment_status === 'pago' ? 'Pago' : 'Pendente'}
                    </Text>
                  </View>
                </View>
              </CartaoVidro>
            </View>
          </>
        }
      >
        {/* Separação de carga (docs/31 §1.4) — some em pedidos anteriores
            à logística, que não têm porte calculado */}
        {pedido.carga_porte && (
          <SecaoFolha sobrelinha="Para a coleta" titulo="Separação">
            <CardSeparacao
              pedidoId={pedido.id}
              porte={pedido.carga_porte}
              pesoG={pedido.carga_peso_g}
              refrigerada={pedido.carga_refrigerada}
              fragil={pedido.carga_fragil}
              altoValor={pedido.carga_alto_valor}
              volumes={pedido.volumes}
              editavel={['novo', 'confirmado', 'em_preparo'].includes(pedido.status)}
              onVolumesAtualizados={(v) => aplicarPedido({ ...pedido, volumes: v })}
            />
          </SecaoFolha>
        )}

        <SecaoFolha
          sobrelinha={`Pedido · ${formatarMomentoCurto(pedido.criado_em)}`}
          titulo="Itens"
          direita={<Contagem n={(pedido.order_items ?? []).length} unidade="item" plural="itens" />}
        >
          <CartaoFolha padding={0}>
            {(pedido.order_items ?? []).map((item, idx) => {
              const variacoes = variacoesDoItem(item)
              const mods = item.modifiers ?? []
              return (
                <View
                  key={item.id}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: colors.line,
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 14, width: 30 }}>
                      {item.quantidade}×
                    </Text>
                    <Text style={{ flex: 1, color: colors.ink, fontWeight: '600', fontSize: 14 }}>
                      {item.nome}
                    </Text>
                    <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 14 }}>
                      {formatarReais(item.subtotal)}
                    </Text>
                  </View>
                  {variacoes.map((v) => (
                    <Text key={v} style={{ color: colors.inkMuted, fontSize: 12.5, marginLeft: 38, marginTop: 2 }}>
                      {v}
                    </Text>
                  ))}
                  {mods.map((m) => (
                    <Text
                      key={m.modifier_id}
                      style={{ color: colors.inkMuted, fontSize: 12.5, marginLeft: 38, marginTop: 2 }}
                    >
                      + {m.nome}
                      {m.preco_extra ? ` (${formatarReais(m.preco_extra)})` : ''}
                    </Text>
                  ))}
                  {item.observacoes ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        marginLeft: 38,
                        marginTop: 6,
                      }}
                    >
                      <PartnerIcon name="info" size={13} color={colors.warning} strokeWidth={2.2} />
                      <Text style={{ color: colors.ink, fontSize: 12.5, fontWeight: '600', flex: 1 }}>
                        {item.observacoes}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )
            })}

            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.line,
                paddingVertical: 12,
                paddingHorizontal: 16,
                gap: 6,
              }}
            >
              <LinhaValor rotulo="Subtotal" valor={formatarReais(pedido.subtotal)} />
              <LinhaValor
                rotulo="Entrega"
                valor={pedido.taxa_entrega === 0 ? 'Grátis' : formatarReais(pedido.taxa_entrega)}
                cor={pedido.taxa_entrega === 0 ? colors.success : undefined}
              />
              <LinhaValor rotulo="Total" valor={formatarReais(pedido.total)} destaque />
            </View>
          </CartaoFolha>
        </SecaoFolha>

        <SecaoFolha sobrelinha="Quem pediu" titulo="Cliente">
          <CartaoFolha padding={0}>
            <LinhaInfo
              icone="user"
              titulo={cliente}
              descricao={telefone ? `${telefone} · tocar para ligar` : 'Sem telefone'}
              aoTocar={telefone ? () => void Linking.openURL(`tel:${telefone}`) : undefined}
              ultimo={!endereco}
            />
            {endereco ? (
              <LinhaInfo
                icone="pin"
                titulo={[endereco.rua, endereco.numero].filter(Boolean).join(', ') || 'Endereço'}
                descricao={[
                  endereco.complemento,
                  [endereco.bairro, endereco.cidade].filter(Boolean).join(' · '),
                ]
                  .filter(Boolean)
                  .join(' — ')}
                ultimo
              />
            ) : null}
          </CartaoFolha>
        </SecaoFolha>

        {pedido.observacoes ? (
          <SecaoFolha sobrelinha="Recado do cliente" titulo="Observações">
            <CartaoFolha>
              <Text style={{ color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '500' }}>
                {pedido.observacoes}
              </Text>
            </CartaoFolha>
          </SecaoFolha>
        ) : null}

        {entrega?.couriers ? (
          <SecaoFolha sobrelinha="Quem leva" titulo="Entregador">
            <CartaoFolha padding={0}>
              <LinhaInfo
                icone="bike"
                titulo={entrega.couriers.nome}
                descricao={`Entrega ${formatarReais(entrega.valor_entrega)} · ${entrega.status}`}
                acao={
                  entrega.couriers.telefone ? (
                    <TouchableOpacity
                      onPress={() => void Linking.openURL(`tel:${entrega.couriers?.telefone}`)}
                      activeOpacity={partnerDesign.opacity.pressedSoft}
                      accessibilityRole="button"
                      accessibilityLabel={`Ligar para ${entrega.couriers.nome}`}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: colors.ink,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <PartnerIcon name="phone" size={16} color={colors.accent} strokeWidth={2.1} />
                    </TouchableOpacity>
                  ) : undefined
                }
                ultimo
              />
            </CartaoFolha>
          </SecaoFolha>
        ) : null}
      </TelaMarquise>

      {/* Ações fixas no rodapé — mesmas transições do Dashboard */}
      {transicoes.length > 0 && (
        <View
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              padding: 16,
              paddingBottom: 16 + insets.bottom,
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.md,
              borderTopRightRadius: radius.md,
              gap: 8,
            },
            shadow.floating,
          ]}
        >
          {transicoes.map((destino) => {
            const cancelamento = destino === 'cancelado'
            return (
              <Botao
                key={destino}
                label={ROTULO_TRANSICAO[destino] ?? destino}
                onPress={() => confirmarTransicao(destino)}
                variante={cancelamento ? 'secundario' : 'primario'}
                tamanho="md"
                carregando={salvando && !cancelamento}
                desabilitado={salvando}
                iconeEsquerda={cancelamento ? 'close' : undefined}
              />
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

// ————— Folha de atribuição (espelha modal-atribuir-entregador.tsx) —————

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
    <FolhaModal
      visivel={visivel}
      sobrelinha={`Entrega de ${formatarReais(pedido.taxa_entrega)}`}
      titulo="Selecionar entregador"
      fundo="canvas"
      onFechar={fechar}
    >
      {carregando ? (
        <LoadingState altura={140} />
      ) : entregadores.length === 0 ? (
        <CartaoFolha>
          <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '600' }}>
            Nenhum entregador disponível agora
          </Text>
          <Text style={{ color: colors.inkMuted, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
            Cadastre entregadores próprios em Menu → Entregadores ou aguarde um autônomo ficar online.
          </Text>
        </CartaoFolha>
      ) : (
        <CartaoFolha padding={0}>
          {entregadores.map((item, i) => (
            <LinhaInfo
              key={item.id}
              icone="bike"
              titulo={item.nome}
              descricao={`${item.tipo === 'proprio' ? 'Entregador próprio' : 'Autônomo'}${item.online ? ' · online' : ''}`}
              aoTocar={() => void handleAtribuir(item.id)}
              desabilitado={atribuindo}
              ultimo={i === entregadores.length - 1}
            />
          ))}
        </CartaoFolha>
      )}
    </FolhaModal>
  )
}

// ————— Peças da folha —————

function Contagem({ n, unidade, plural }: { n: number; unidade: string; plural: string }) {
  if (n === 0) return null
  return (
    <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: colors.inkSoft }}>
      {n} {(n === 1 ? unidade : plural).toUpperCase()}
    </Text>
  )
}

function LinhaValor({
  rotulo,
  valor,
  destaque,
  cor,
}: {
  rotulo: string
  valor: string
  destaque?: boolean
  cor?: string
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text
        style={{
          flex: 1,
          color: destaque ? colors.ink : colors.inkMuted,
          fontSize: destaque ? 15 : 13.5,
          fontWeight: destaque ? '800' : '500',
        }}
      >
        {rotulo}
      </Text>
      <Text
        style={{
          color: cor ?? colors.ink,
          fontSize: destaque ? 16 : 13.5,
          fontWeight: destaque ? '800' : '600',
        }}
      >
        {valor}
      </Text>
    </View>
  )
}

/** Linha de cartão: moeda monocromática + título + descrição (+ ação/chevron). */
function LinhaInfo({
  icone,
  titulo,
  descricao,
  aoTocar,
  acao,
  desabilitado,
  ultimo,
}: {
  icone: PartnerIconName
  titulo: string
  descricao?: string
  aoTocar?: () => void
  acao?: React.ReactNode
  desabilitado?: boolean
  ultimo?: boolean
}) {
  const conteudo = (
    <>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.sm,
          backgroundColor: colors.canvasAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PartnerIcon name={icone} size={18} color={colors.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }} numberOfLines={2}>
          {titulo}
        </Text>
        {descricao ? (
          <Text
            style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkMuted, marginTop: 2 }}
            numberOfLines={2}
          >
            {descricao}
          </Text>
        ) : null}
      </View>
      {acao ?? (aoTocar ? <PartnerIcon name="chevron-right" size={16} color={colors.inkSoft} /> : null)}
    </>
  )
  const estilo = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: ultimo ? 0 : 1,
    borderBottomColor: colors.line,
    opacity: desabilitado ? partnerDesign.opacity.disabled : 1,
  }
  if (aoTocar) {
    return (
      <TouchableOpacity
        onPress={aoTocar}
        disabled={desabilitado}
        activeOpacity={partnerDesign.opacity.pressedSoft}
        accessibilityRole="button"
        style={estilo}
      >
        {conteudo}
      </TouchableOpacity>
    )
  }
  return <View style={estilo}>{conteudo}</View>
}
