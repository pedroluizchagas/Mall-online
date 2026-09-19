import { useEffect, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { formatarReais } from '@mallevo/lib'
import { supabase } from '@/lib/supabase'
import { useOrderStore } from '@/store/useOrderStore'
import { useLocalizacaoCourier } from '@/hooks/useLocalizacaoCourier'
import { MapaEntregador } from '@/components/MapaEntregador'
import { GlowNeon, useFontesMarquee } from '@/components/home/Marquise'
import { VidroFosco } from '@/components/home/VidroFosco'
import { ConsumerIcon, type ConsumerIconName } from '@/components/ConsumerIcon'
import { TijoloLoja } from '@/components/TijoloLoja'
import { Botao } from '@/components/ui/Botao'
import { SecaoFolha, CartaoFolha } from '@/components/ui/SecaoFolha'
import { Skeleton } from '@/components/ui/Skeleton'
import { consumerDesign, softColor } from '@/lib/consumer-design'
import { useLuzDoDia } from '@/lib/luz-do-dia'
import { metaDoStatus, timelineDoStatus, ehAtivo } from '@/lib/status-pedido'
import { faixaDeEta, estimarFaixaPelaRota, rotuloPosicaoNaRota } from '@/lib/eta'
import { formatarData } from '@/components/PedidoCard'
import { usePreferencias } from '@/store/usePreferencias'

/**
 * Acompanhamento do pedido — a mesma arquitetura do Início e da tela de
 * pedidos: MARQUISE escura com o que está ao vivo, FOLHA clara com o
 * que é registro.
 *
 * Marquise: ponto pulsando + "AO VIVO · LOJA", o status por extenso na
 * fonte-statement, a previsão de chegada acesa em accent (ou a descrição
 * do passo), a barra de progresso; e, quando o pedido saiu, o entregador
 * em vidro e o mapa emoldurado. Cancelado: sem pulso, motivo em danger.
 *
 * Folha (vidro fosco + luz do dia): a linha do tempo, o recibo com a pele
 * da loja no tijolo, agendamento (serviços), endereço e ações.
 *
 * Dados, realtime e ETA não mudaram: ETA é da PRÓPRIA parada (docs/31 §5),
 * mapa só com localização do entregador em "saiu para entrega".
 *
 * Spec: docs/system-design/consumer/07-telas.md §10
 */

const { colors, radius, motion } = consumerDesign

/** Pele da loja para o tijolo do recibo (join à parte — o embed não traz). */
interface LojaSkin {
  logo_url: string | null
  theme: unknown
}

export default function TelaAcompanhamento() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { setStatusAtual } = useOrderStore()
  const insets = useSafeAreaInsets()
  const fontes = useFontesMarquee()

  const [pedido, setPedido] = useState<any>(null)
  const [skin, setSkin] = useState<LojaSkin | null>(null)
  const [carregando, setCarregando] = useState(true)

  const luzAtiva = usePreferencias((s) => s.luzDoDia)
  const luz = useLuzDoDia(luzAtiva)

  const courierId = pedido?.delivery_assignments?.[0]?.courier_id ?? null
  const localizacao = useLocalizacaoCourier(courierId)

  useEffect(() => {
    async function carregarPedido() {
      // Cast: novas colunas de agendamento ainda não estão nos types
      // gerados do Supabase (migration 020).
      const { data } = await (supabase as any)
        .from('orders')
        .select(
          `
          id, status, payment_status, forma_pagamento,
          subtotal, taxa_entrega, total, criado_em,
          endereco_entrega, observacoes, motivo_cancelamento,
          tipo, agendamento_inicio_at, agendamento_fim_at, staff_id,
          service_staff:service_staff!staff_id (id, nome, cor),
          order_items (
            id, nome, quantidade, preco_unit, subtotal, observacoes, modifiers,
            variant_id,
            product_variants (
              product_variant_options (
                product_options ( valor, product_option_groups ( nome ) )
              )
            )
          ),
          delivery_assignments (
            id, status, courier_id, route_id,
            couriers (id, nome, telefone)
          ),
          route_stops (
            id, ordem, tipo, status, eta,
            delivery_routes ( id, status, drops, duracao_estimada_s )
          ),
          stores (id, nome, telefone, slug)
        `
        )
        .eq('id', id)
        .single()

      if (!data) {
        router.back()
        return
      }

      setPedido(data)
      setStatusAtual(data.status)
      setCarregando(false)

      // Pele da loja (logo + tema) para o tijolo do recibo.
      if (data.stores?.id) {
        const { data: loja } = await supabase
          .from('stores')
          .select('logo_url, theme')
          .eq('id', data.stores.id)
          .single()
        if (loja) setSkin(loja as LojaSkin)
      }
    }

    carregarPedido()
  }, [id])

  // Realtime
  useEffect(() => {
    if (!id) return

    const canal = supabase
      .channel(`pedido-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setPedido((prev: any) =>
            prev ? { ...prev, ...payload.new } : prev
          )
          setStatusAtual(payload.new.status)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [id])

  function abrirWhatsApp() {
    const telefone = pedido?.stores?.telefone?.replace(/\D/g, '')
    if (!telefone) return
    const numero = telefone.startsWith('55') ? telefone : `55${telefone}`
    Linking.openURL(
      `https://wa.me/${numero}?text=Olá, tenho uma dúvida sobre meu pedido`
    )
  }

  if (carregando) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.marquee }}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="light" animated />
        <GlowNeon />
        <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 24 }}>
          <BotaoVoltar />
          <View style={{ marginTop: 26, gap: 12 }}>
            <Skeleton largura="40%" altura={9} raio={4} />
            <Skeleton largura="75%" altura={28} raio={8} />
            <Skeleton largura="55%" altura={14} raio={5} />
            <Skeleton largura="100%" altura={4} raio={2} />
          </View>
        </View>
      </View>
    )
  }

  const statusAtual: string = pedido?.status ?? 'novo'
  const meta = metaDoStatus(statusAtual)
  const passos = timelineDoStatus(statusAtual)
  const courier = pedido?.delivery_assignments?.[0]?.couriers
  const enderecoEntrega = pedido?.endereco_entrega
  const ativo = ehAtivo(statusAtual)
  const isCancelado = statusAtual === 'cancelado'
  const isEntregue = statusAtual === 'entregue'
  const nomeLoja: string = pedido?.stores?.nome ?? 'Loja'

  // ETA da PRÓPRIA parada (docs/31 §5). Em rota agrupada o consumidor vê o
  // seu drop, nunca a rota inteira — agrupar não pode piorar o que ele vê.
  const paradaDoPedido = (pedido?.route_stops ?? []).find(
    (s: any) => s.tipo === 'entrega',
  )
  const rotaDoPedido = paradaDoPedido?.delivery_routes
  const faixaEta =
    statusAtual === 'saiu_para_entrega' || statusAtual === 'aguardando_entregador'
      ? (faixaDeEta(paradaDoPedido?.eta) ??
        estimarFaixaPelaRota({
          duracaoEstimadaS: rotaDoPedido?.duracao_estimada_s,
          ordemDoDrop: paradaDoPedido?.ordem,
        }))
      : null
  const posicaoNaRota = rotuloPosicaoNaRota(
    paradaDoPedido?.ordem,
    rotaDoPedido?.drops,
  )
  const exibirMapa =
    statusAtual === 'saiu_para_entrega' && localizacao && enderecoEntrega

  const sobrelinha = isCancelado
    ? `Pedido cancelado · ${nomeLoja}`
    : isEntregue
      ? `Pedido entregue · ${nomeLoja}`
      : `Ao vivo · ${nomeLoja}`

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" animated />

      {/* Céu atrás do overscroll superior (iOS rubber-band). */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 480,
          backgroundColor: colors.marquee,
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* ── Marquise: o pedido ao vivo ── */}
        <View
          style={{
            backgroundColor: colors.marquee,
            paddingTop: insets.top + 10,
            // 24 extras ficam escondidos atrás da folha que sobe por cima.
            paddingBottom: 48,
            overflow: 'hidden',
          }}
        >
          <GlowNeon />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 24,
            }}
          >
            <BotaoVoltar />
            {pedido?.stores?.telefone && ativo && (
              <MoedaVidro
                icone="comment"
                rotulo={`Falar com ${nomeLoja}`}
                aoTocar={abrirWhatsApp}
              />
            )}
          </View>

          <View style={{ paddingHorizontal: 24, paddingTop: 26 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {ativo && <PontoAoVivo />}
              <Text style={estilos.microMudo} numberOfLines={1}>
                {sobrelinha}
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
              {faixaEta ? (
                <Text style={[fontes.acento, { color: colors.accent }]}>
                  {'\n'}entre {faixaEta.texto}
                </Text>
              ) : null}
            </Text>

            <Text
              style={{
                fontSize: 13.5,
                fontWeight: '500',
                color: colors.marqueeInkSoft,
                marginTop: 8,
                lineHeight: 19,
              }}
            >
              {faixaEta ? meta.descricao : isCancelado ? 'Sentimos muito.' : meta.descricao}
              {posicaoNaRota && !isCancelado ? ` ${posicaoNaRota}` : ''}
            </Text>

            {/* Barra de progresso — a mesma dos cartões ao vivo. */}
            {!isCancelado && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 18,
                }}
              >
                <BarraProgresso valor={meta.progresso} cor={isEntregue ? colors.success : colors.accent} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: isEntregue ? colors.success : colors.accent,
                  }}
                >
                  {Math.round(meta.progresso * 100)}%
                </Text>
              </View>
            )}

            {isCancelado && pedido?.motivo_cancelamento ? (
              <View
                style={{
                  marginTop: 16,
                  padding: 14,
                  borderRadius: radius.md,
                  backgroundColor: softColor(colors.danger),
                  borderWidth: 1,
                  borderColor: softColor(colors.danger),
                }}
              >
                <Text style={{ fontSize: 12.5, color: colors.danger, fontWeight: '700' }}>
                  Motivo: {pedido.motivo_cancelamento}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Entregador — só quando o pedido saiu. */}
          {statusAtual === 'saiu_para_entrega' && courier && (
            <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
              <View
                style={{
                  backgroundColor: colors.marqueeGlass,
                  borderWidth: 1,
                  borderColor: colors.marqueeLine,
                  borderRadius: radius.lg,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>
                    {courier.nome?.charAt(0).toUpperCase() ?? '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.microMudo}>Entregador</Text>
                  <Text
                    style={{ fontSize: 16, fontWeight: '700', color: colors.white, marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {courier.nome}
                  </Text>
                </View>
                {courier.telefone && (
                  <MoedaVidro
                    icone="phone"
                    rotulo={`Ligar para ${courier.nome}`}
                    aoTocar={() => Linking.openURL(`tel:${courier.telefone}`)}
                    accent
                  />
                )}
              </View>
            </View>
          )}

          {/* Mapa emoldurado, na marquise — o entregador a caminho. */}
          {exibirMapa && (
            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
              <View
                style={{
                  borderRadius: radius.lg,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: colors.marqueeLine,
                }}
              >
                <MapaEntregador
                  localizacao={localizacao!}
                  enderecoEntrega={enderecoEntrega}
                  escuro
                />
              </View>
            </View>
          )}
        </View>

        {/* ── Folha: registro ── */}
        <View
          style={{
            flex: 1,
            marginTop: -24,
            backgroundColor: colors.canvas,
            borderTopLeftRadius: radius.md,
            borderTopRightRadius: radius.md,
            paddingTop: 30,
            paddingBottom: 40 + insets.bottom,
            overflow: 'hidden',
            gap: 28,
          }}
        >
          <VidroFosco luz={luz} />

          {/* Linha do tempo */}
          {!isCancelado && (
            <SecaoFolha sobrelinha="Passo a passo" titulo="Acompanhamento">
              <CartaoFolha>
                {passos.map((passo, i) => (
                  <PassoTimeline
                    key={passo.meta.status}
                    passo={passo}
                    ultimo={i === passos.length - 1}
                  />
                ))}
              </CartaoFolha>
            </SecaoFolha>
          )}

          {/* Recibo */}
          <SecaoFolha
            sobrelinha={`Pedido · ${formatarData(pedido?.criado_em ?? new Date().toISOString())}`}
            titulo="Recibo"
          >
            <CartaoFolha>
              {/* Cabeçalho: a loja, com a própria pele */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <TijoloLoja nome={nomeLoja} logoUrl={skin?.logo_url} theme={skin?.theme} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontSize: 15, fontWeight: '700', color: colors.ink, letterSpacing: -0.2 }}
                    numberOfLines={1}
                  >
                    {nomeLoja}
                  </Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkMuted, marginTop: 2 }}>
                    {pedido?.order_items?.length ?? 0}{' '}
                    {(pedido?.order_items?.length ?? 0) === 1 ? 'item' : 'itens'}
                    {pedido?.forma_pagamento ? ` · ${rotuloPagamento(pedido.forma_pagamento)}` : ''}
                  </Text>
                </View>
                {pedido?.stores?.slug && (
                  <TouchableOpacity
                    onPress={() => router.push(`/loja/${pedido.stores.slug}`)}
                    activeOpacity={consumerDesign.opacity.pressedSoft}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir a loja ${nomeLoja}`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>
                      Ver loja
                    </Text>
                    <ConsumerIcon name="chevron-right" size={13} color={colors.ink} strokeWidth={2.2} />
                  </TouchableOpacity>
                )}
              </View>

              {pedido?.order_items?.map((item: any, idx: number) => {
                const modifiers = (item.modifiers ?? []) as Array<{
                  modifier_id: string
                  nome: string
                  preco_extra: number
                }>
                const refsVariant =
                  item?.product_variants?.product_variant_options ?? []
                const valoresVariant = (refsVariant as any[])
                  .map((vo: any) => vo?.product_options?.valor)
                  .filter(
                    (v: unknown): v is string =>
                      typeof v === 'string' && v.length > 0
                  )
                const rotuloVariant =
                  valoresVariant.length > 0 ? valoresVariant.join(' × ') : null
                return (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                      gap: 12,
                      borderTopWidth: 1,
                      borderTopColor: colors.line,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, color: colors.ink, fontWeight: '600' }}>
                        {item.quantidade}× {item.nome}
                      </Text>
                      {rotuloVariant && (
                        <Text style={{ fontSize: 12, color: colors.inkMuted, fontWeight: '600', marginTop: 2 }}>
                          {rotuloVariant}
                        </Text>
                      )}
                      {modifiers.length > 0 && (
                        <Text style={{ fontSize: 12, color: colors.inkMuted, fontWeight: '500', marginTop: 2 }}>
                          {modifiers.map((m) => m.nome).join(', ')}
                        </Text>
                      )}
                      {item.observacoes && (
                        <Text style={{ fontSize: 12, color: colors.inkMuted, fontStyle: 'italic', marginTop: 2 }}>
                          &ldquo;{item.observacoes}&rdquo;
                        </Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 14, color: colors.inkMuted, fontWeight: '600' }}>
                      {formatarReais(item.subtotal)}
                    </Text>
                  </View>
                )
              })}

              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: colors.line,
                  paddingTop: 12,
                  gap: 6,
                }}
              >
                <LinhaResumo rotulo="Subtotal" valor={formatarReais(pedido?.subtotal ?? 0)} />
                {(pedido?.taxa_entrega ?? 0) > 0 && (
                  <LinhaResumo rotulo="Taxa de entrega" valor={formatarReais(pedido.taxa_entrega)} />
                )}
                <LinhaResumo rotulo="Total" valor={formatarReais(pedido?.total ?? 0)} destacado />
              </View>
            </CartaoFolha>
          </SecaoFolha>

          {/* Agendamento (services) */}
          {pedido?.tipo === 'agendamento' && pedido?.agendamento_inicio_at && (
            <SecaoFolha sobrelinha="Serviço" titulo="Agendamento">
              <CartaoFolha>
                <LinhaIcone
                  icone="clock"
                  texto={formatarAgendamentoBruto(
                    pedido.agendamento_inicio_at,
                    pedido.agendamento_fim_at,
                  )}
                  forte
                />
                {pedido?.service_staff?.nome && (
                  <LinhaIcone icone="user" texto={pedido.service_staff.nome} />
                )}
                <LinhaIcone icone="store" texto={nomeLoja} />
              </CartaoFolha>
            </SecaoFolha>
          )}

          {/* Endereço de entrega (apenas pedidos do tipo entrega) */}
          {pedido?.tipo !== 'agendamento' && enderecoEntrega && (
            <SecaoFolha sobrelinha="Onde chega" titulo="Endereço de entrega">
              <CartaoFolha>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radius.sm,
                      backgroundColor: colors.ink,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ConsumerIcon name="pin" size={18} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '700', color: colors.ink }}>
                      {enderecoEntrega?.rua}, {enderecoEntrega?.numero}
                      {enderecoEntrega?.complemento ? ` — ${enderecoEntrega.complemento}` : ''}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.inkMuted, marginTop: 2, fontWeight: '500' }}>
                      {enderecoEntrega?.bairro} — {enderecoEntrega?.cidade}
                    </Text>
                  </View>
                </View>
              </CartaoFolha>
            </SecaoFolha>
          )}

          {/* Ações */}
          {(isEntregue || (pedido?.stores?.telefone && ativo)) && (
            <View style={{ paddingHorizontal: 24, gap: 12 }}>
              {pedido?.stores?.telefone && ativo && (
                <Botao
                  label={`Falar com ${nomeLoja}`}
                  variante="secundario"
                  tamanho="md"
                  iconeEsquerda="comment"
                  onPress={abrirWhatsApp}
                />
              )}
              {isEntregue && (
                <Botao
                  label="Voltar ao início"
                  variante="primario"
                  tamanho="lg"
                  onPress={() => router.replace('/(tabs)')}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

// ─────────────────────────────────────────────────────────
// Peças da marquise
// ─────────────────────────────────────────────────────────

function BotaoVoltar() {
  return (
    <TouchableOpacity
      onPress={() => (router.canGoBack() ? router.back() : router.navigate('/(tabs)/pedidos'))}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.marqueeGlass,
        borderWidth: 1,
        borderColor: colors.marqueeLine,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ConsumerIcon name="chevron-left" size={18} color={colors.white} strokeWidth={2.2} />
    </TouchableOpacity>
  )
}

/** Moeda de vidro com ícone — ação secundária sobre a marquise. */
function MoedaVidro({
  icone,
  rotulo,
  aoTocar,
  accent = false,
}: {
  icone: ConsumerIconName
  rotulo: string
  aoTocar: () => void
  accent?: boolean
}) {
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: accent ? colors.accent : colors.marqueeGlass,
        borderWidth: accent ? 0 : 1,
        borderColor: colors.marqueeLine,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ConsumerIcon
        name={icone}
        size={18}
        color={accent ? colors.ink : colors.white}
        strokeWidth={2}
      />
    </TouchableOpacity>
  )
}

/** Ponto accent respirando — respeita o reduce motion do aparelho. */
function PontoAoVivo() {
  const pulso = useRef(new Animated.Value(1)).current
  useEffect(() => {
    let ciclo: Animated.CompositeAnimation | undefined
    let vivo = true
    AccessibilityInfo.isReduceMotionEnabled().then((reduzido) => {
      if (!vivo || reduzido) return
      ciclo = Animated.loop(
        Animated.sequence([
          Animated.timing(pulso, {
            toValue: 0.3,
            duration: motion.pulse / 2,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulso, {
            toValue: 1,
            duration: motion.pulse / 2,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      )
      ciclo.start()
    })
    return () => {
      vivo = false
      ciclo?.stop()
    }
  }, [])
  return (
    <Animated.View
      style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent, opacity: pulso }}
    />
  )
}

/** Barra de progresso animada — mesma dos cartões ao vivo. */
function BarraProgresso({ valor, cor }: { valor: number; cor: string }) {
  const progresso = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(progresso, {
      toValue: valor,
      duration: motion.slow * 2,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // anima width (layout)
    }).start()
  }, [valor])
  return (
    <View
      style={{
        flex: 1,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.marqueeGlassStrong,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          height: '100%',
          borderRadius: 2,
          backgroundColor: cor,
          width: progresso.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  )
}

// ─────────────────────────────────────────────────────────
// Peças da folha
// ─────────────────────────────────────────────────────────

function PassoTimeline({
  passo,
  ultimo,
}: {
  passo: ReturnType<typeof timelineDoStatus>[number]
  ultimo: boolean
}) {
  const { meta, estado } = passo

  const corCirculo =
    estado === 'concluido' ? colors.accent : estado === 'atual' ? meta.cor : colors.canvasAlt
  const corIcone =
    estado === 'concluido' ? colors.ink : estado === 'atual' ? colors.white : colors.inkSoft
  const corLinha = estado === 'concluido' ? colors.accent : colors.line
  const corTitulo = estado === 'pendente' ? colors.inkSoft : colors.ink
  const pesoTitulo: '500' | '700' | '800' =
    estado === 'atual' ? '800' : estado === 'concluido' ? '700' : '500'
  const iconeMostrar: ConsumerIconName = estado === 'concluido' ? 'check' : meta.icone

  return (
    <View style={{ flexDirection: 'row', gap: 14 }}>
      <View style={{ alignItems: 'center', width: 32 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: corCirculo,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ConsumerIcon name={iconeMostrar} size={16} color={corIcone} strokeWidth={2.2} />
        </View>
        {!ultimo && (
          <View
            style={{ width: 2, flex: 1, minHeight: 22, marginTop: 4, backgroundColor: corLinha }}
          />
        )}
      </View>

      <View style={{ flex: 1, paddingBottom: ultimo ? 0 : 16, paddingTop: 6 }}>
        <Text style={{ fontSize: 14, fontWeight: pesoTitulo, color: corTitulo }}>
          {meta.rotuloLongo}
        </Text>
        {estado === 'atual' && (
          <Text style={{ fontSize: 12, color: colors.inkMuted, marginTop: 2, fontWeight: '500' }}>
            {meta.descricao}
          </Text>
        )}
      </View>
    </View>
  )
}

function LinhaResumo({
  rotulo,
  valor,
  destacado,
}: {
  rotulo: string
  valor: string
  destacado?: boolean
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text
        style={{
          fontSize: destacado ? 16 : 14,
          fontWeight: destacado ? '800' : '500',
          color: destacado ? colors.ink : colors.inkMuted,
        }}
      >
        {rotulo}
      </Text>
      <Text
        style={{ fontSize: destacado ? 16 : 14, fontWeight: destacado ? '800' : '600', color: colors.ink }}
      >
        {valor}
      </Text>
    </View>
  )
}

function LinhaIcone({
  icone,
  texto,
  forte = false,
}: {
  icone: ConsumerIconName
  texto: string
  forte?: boolean
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
      <ConsumerIcon name={icone} size={16} color={forte ? colors.ink : colors.inkMuted} strokeWidth={2} />
      <Text
        style={{
          fontSize: forte ? 14.5 : 13.5,
          fontWeight: forte ? '700' : '500',
          color: forte ? colors.ink : colors.inkMuted,
        }}
      >
        {texto}
      </Text>
    </View>
  )
}

/** "pix" → "Pix", "cartao_online" → "Cartão online", etc. */
function rotuloPagamento(forma: string): string {
  const mapa: Record<string, string> = {
    pix: 'Pix',
    dinheiro: 'Dinheiro',
    cartao_maquininha: 'Cartão na entrega',
    cartao_online: 'Cartão online',
    cartao: 'Cartão',
  }
  return mapa[forma] ?? forma.replace(/_/g, ' ')
}

const DIAS_CURTOS_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
function formatarAgendamentoBruto(
  inicioIso: string,
  fimIso: string | null,
): string {
  const ini = new Date(inicioIso)
  const dia = String(ini.getDate()).padStart(2, '0')
  const mes = String(ini.getMonth() + 1).padStart(2, '0')
  const sem = DIAS_CURTOS_PT[ini.getDay()]
  const horaIni = `${String(ini.getHours()).padStart(2, '0')}:${String(ini.getMinutes()).padStart(2, '0')}`
  if (!fimIso) return `${sem} ${dia}/${mes} às ${horaIni}`
  const fim = new Date(fimIso)
  const horaFim = `${String(fim.getHours()).padStart(2, '0')}:${String(fim.getMinutes()).padStart(2, '0')}`
  return `${sem} ${dia}/${mes} às ${horaIni} — ${horaFim}`
}

const estilos = {
  microMudo: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.marqueeInkMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    flexShrink: 1,
  },
}
