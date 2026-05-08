import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useOrderStore } from '@/store/useOrderStore'
import { useLocalizacaoCourier } from '@/hooks/useLocalizacaoCourier'
import { MapaEntregador } from '@/components/MapaEntregador'
import { HeaderTela } from '@/components/HeaderTela'
import { Card } from '@/components/ui/Card'
import { Botao } from '@/components/ui/Botao'
import { LoadingState } from '@/components/ui/LoadingState'
import { ConsumerIcon, ConsumerIconName } from '@/components/ConsumerIcon'
import { formatarReais } from '@mallora/lib'
import { consumerDesign, softColor } from '@/lib/consumer-design'
import { metaDoStatus, timelineDoStatus, ehAtivo } from '@/lib/status-pedido'

const { colors, radius } = consumerDesign

export default function TelaAcompanhamento() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { setStatusAtual } = useOrderStore()

  const [pedido, setPedido] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)

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
            id, status, courier_id,
            couriers (id, nome, telefone)
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
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <Stack.Screen options={{ headerShown: false }} />
        <LoadingState modo="tela" mensagem="Carregando pedido..." />
      </View>
    )
  }

  const statusAtual = pedido?.status ?? 'novo'
  const meta = metaDoStatus(statusAtual)
  const passos = timelineDoStatus(statusAtual)
  const courier = pedido?.delivery_assignments?.[0]?.couriers
  const enderecoEntrega = pedido?.endereco_entrega
  const exibirMapa =
    statusAtual === 'saiu_para_entrega' && localizacao && enderecoEntrega
  const isCancelado = statusAtual === 'cancelado'

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Stack.Screen options={{ headerShown: false }} />

      <HeaderTela variante="voltar" titulo="Acompanhamento" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Mapa do entregador */}
        {exibirMapa && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <Card preenchimento="sm" semBorda>
              <MapaEntregador
                localizacao={localizacao!}
                enderecoEntrega={enderecoEntrega}
              />
            </Card>
          </View>
        )}

        {/* Card de status atual em destaque */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Card variante="escuro" raio="lg" preenchimento="lg">
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: softColor(meta.cor),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ConsumerIcon name={meta.icone} size={26} color={meta.cor} />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: colors.inkSoft,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                  }}
                >
                  {isCancelado ? 'Pedido cancelado' : 'Status atual'}
                </Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '800',
                    color: colors.white,
                    marginTop: 4,
                    letterSpacing: -0.3,
                  }}
                >
                  {meta.rotuloLongo}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.inkSoft,
                    marginTop: 4,
                    lineHeight: 20,
                    fontWeight: '500',
                  }}
                >
                  {meta.descricao}
                </Text>
              </View>
            </View>

            {isCancelado && pedido?.motivo_cancelamento && (
              <View
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: radius.md,
                  backgroundColor: softColor(colors.danger),
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.danger,
                    fontWeight: '600',
                  }}
                >
                  Motivo: {pedido.motivo_cancelamento}
                </Text>
              </View>
            )}
          </Card>
        </View>

        {/* Entregador */}
        {statusAtual === 'saiu_para_entrega' && courier && (
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <Card preenchimento="md">
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
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
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '800',
                      color: colors.ink,
                    }}
                  >
                    {courier.nome?.charAt(0).toUpperCase() ?? '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: colors.inkSoft,
                      letterSpacing: 1.2,
                      textTransform: 'uppercase',
                    }}
                  >
                    Entregador
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: colors.ink,
                      marginTop: 2,
                    }}
                  >
                    {courier.nome}
                  </Text>
                </View>
                {courier.telefone && (
                  <BotaoIconeCircular
                    icone="phone"
                    aoTocar={() =>
                      Linking.openURL(`tel:${courier.telefone}`)
                    }
                  />
                )}
              </View>
            </Card>
          </View>
        )}

        {/* Timeline */}
        {!isCancelado && (
          <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: colors.inkMuted,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                marginBottom: 16,
              }}
            >
              Acompanhamento
            </Text>

            {passos.map((passo, i) => (
              <PassoTimeline
                key={passo.meta.status}
                passo={passo}
                ultimo={i === passos.length - 1}
              />
            ))}
          </View>
        )}

        {/* Itens */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: colors.inkMuted,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Itens do pedido
          </Text>

          <Card preenchimento="md">
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
                valoresVariant.length > 0
                  ? valoresVariant.join(' × ')
                  : null
              return (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 8,
                    gap: 12,
                    borderBottomWidth:
                      idx < (pedido.order_items.length - 1) ? 1 : 0,
                    borderBottomColor: colors.line,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.ink,
                        fontWeight: '500',
                      }}
                    >
                      {item.quantidade}× {item.nome}
                    </Text>
                    {rotuloVariant && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.inkMuted,
                          fontWeight: '600',
                          marginTop: 2,
                        }}
                      >
                        {rotuloVariant}
                      </Text>
                    )}
                    {modifiers.length > 0 && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.inkMuted,
                          fontWeight: '500',
                          marginTop: 2,
                        }}
                      >
                        {modifiers.map((m) => m.nome).join(', ')}
                      </Text>
                    )}
                    {item.observacoes && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.inkMuted,
                          fontStyle: 'italic',
                          marginTop: 2,
                        }}
                      >
                        &ldquo;{item.observacoes}&rdquo;
                      </Text>
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.inkMuted,
                      fontWeight: '600',
                    }}
                  >
                    {formatarReais(item.subtotal)}
                  </Text>
                </View>
              )
            })}

            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.line,
                marginTop: 8,
                paddingTop: 12,
                gap: 6,
              }}
            >
              <LinhaResumo
                rotulo="Subtotal"
                valor={formatarReais(pedido?.subtotal ?? 0)}
              />
              {(pedido?.taxa_entrega ?? 0) > 0 && (
                <LinhaResumo
                  rotulo="Taxa de entrega"
                  valor={formatarReais(pedido.taxa_entrega)}
                />
              )}
              <LinhaResumo
                rotulo="Total"
                valor={formatarReais(pedido?.total ?? 0)}
                destacado
              />
            </View>
          </Card>
        </View>

        {/* Agendamento (services) */}
        {pedido?.tipo === 'agendamento' && pedido?.agendamento_inicio_at && (
          <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: colors.inkMuted,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              Agendamento
            </Text>
            <Card preenchimento="md">
              <Text
                style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}
              >
                📅 {formatarAgendamentoBruto(
                  pedido.agendamento_inicio_at,
                  pedido.agendamento_fim_at,
                )}
              </Text>
              {pedido?.service_staff?.nome && (
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.inkMuted,
                    marginTop: 4,
                    fontWeight: '500',
                  }}
                >
                  👤 {pedido.service_staff.nome}
                </Text>
              )}
              {pedido?.stores?.nome && (
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.inkMuted,
                    marginTop: 6,
                    fontWeight: '500',
                  }}
                >
                  Local: {pedido.stores.nome}
                </Text>
              )}
            </Card>
          </View>
        )}

        {/* Endereço de entrega (apenas pedidos do tipo entrega) */}
        {pedido?.tipo !== 'agendamento' && (
          <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: colors.inkMuted,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              Endereço de entrega
            </Text>
            <Card preenchimento="md">
              <View
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ConsumerIcon name="pin" size={18} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: colors.ink,
                    }}
                  >
                    {enderecoEntrega?.rua}, {enderecoEntrega?.numero}
                    {enderecoEntrega?.complemento
                      ? ` — ${enderecoEntrega.complemento}`
                      : ''}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.inkMuted,
                      marginTop: 2,
                      fontWeight: '500',
                    }}
                  >
                    {enderecoEntrega?.bairro} — {enderecoEntrega?.cidade}
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Ações */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 24,
            gap: 12,
          }}
        >
          {pedido?.stores?.telefone && ehAtivo(statusAtual) && (
            <Botao
              label={`Falar com ${pedido.stores.nome}`}
              variante="secundario"
              tamanho="md"
              iconeEsquerda="comment"
              onPress={abrirWhatsApp}
            />
          )}

          {statusAtual === 'entregue' && (
            <Botao
              label="Voltar ao início"
              variante="primario"
              tamanho="lg"
              onPress={() => router.replace('/(tabs)')}
            />
          )}
        </View>
      </ScrollView>
    </View>
  )
}

function PassoTimeline({
  passo,
  ultimo,
}: {
  passo: ReturnType<typeof timelineDoStatus>[number]
  ultimo: boolean
}) {
  const { meta, estado } = passo

  const corCirculo =
    estado === 'concluido'
      ? colors.accent
      : estado === 'atual'
      ? meta.cor
      : colors.canvasAlt
  const corIcone =
    estado === 'concluido'
      ? colors.ink
      : estado === 'atual'
      ? colors.white
      : colors.inkSoft
  const corLinha =
    estado === 'concluido' ? colors.accent : colors.line
  const corTitulo =
    estado === 'pendente' ? colors.inkSoft : colors.ink
  const pesoTitulo: '500' | '700' | '800' =
    estado === 'atual' ? '800' : estado === 'concluido' ? '700' : '500'
  const iconeMostrar: ConsumerIconName =
    estado === 'concluido' ? 'check' : meta.icone

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
            transform: [{ scale: estado === 'atual' ? 1.05 : 1 }],
          }}
        >
          <ConsumerIcon name={iconeMostrar} size={16} color={corIcone} strokeWidth={2.2} />
        </View>
        {!ultimo && (
          <View
            style={{
              width: 2,
              flex: 1,
              minHeight: 24,
              marginTop: 4,
              backgroundColor: corLinha,
            }}
          />
        )}
      </View>

      <View style={{ flex: 1, paddingBottom: ultimo ? 0 : 18 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: pesoTitulo,
            color: corTitulo,
          }}
        >
          {meta.rotuloLongo}
        </Text>
        {estado === 'atual' && (
          <Text
            style={{
              fontSize: 12,
              color: colors.inkMuted,
              marginTop: 2,
              fontWeight: '500',
            }}
          >
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
        style={{
          fontSize: destacado ? 16 : 14,
          fontWeight: destacado ? '800' : '600',
          color: colors.ink,
        }}
      >
        {valor}
      </Text>
    </View>
  )
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

function BotaoIconeCircular({
  icone,
  aoTocar,
}: {
  icone: ConsumerIconName
  aoTocar: () => void
}) {
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ConsumerIcon name={icone} size={18} color={colors.accent} />
    </TouchableOpacity>
  )
}
