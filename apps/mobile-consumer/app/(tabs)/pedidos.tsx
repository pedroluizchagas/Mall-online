import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { GlowNeon, useFontesMarquee } from '@/components/home/Marquise'
import { VidroFosco } from '@/components/home/VidroFosco'
import { CartaoPedidoVivo } from '@/components/pedidos/CartaoPedidoVivo'
import { PedidoCard, type PedidoCardModel } from '@/components/PedidoCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { consumerDesign } from '@/lib/consumer-design'
import { useLuzDoDia } from '@/lib/luz-do-dia'
import { ehAtivo } from '@/lib/status-pedido'
import { usePreferencias } from '@/store/usePreferencias'

/**
 * Meus pedidos — a mesma arquitetura do Início: MARQUISE escura em cima e
 * FOLHA clara embaixo.
 *
 * - Na marquise vive o que está AO VIVO: os pedidos em andamento, um
 *   cartão de vidro cada (`CartaoPedidoVivo`), com ponto pulsando, status
 *   por extenso e barra de progresso — a mesma peça do cartão ativo da home,
 *   completa. Sem pedido a caminho, a marquise diz isso em uma linha e
 *   aponta para o Início.
 * - Na folha (vidro fosco + luz do dia, como na home) vive o HISTÓRICO:
 *   pedidos concluídos e cancelados, agrupados por mês, em recibos claros
 *   que carregam a pele da loja no tijolo do logo (`PedidoCard`).
 *
 * Os filtros "Todos / Ativos / Histórico" saíram: a divisão marquise/folha
 * já responde as três perguntas de uma vez, sem obrigar a escolher.
 *
 * Um toque no slot de Pedidos na barra alterna para Favoritos (coreografia
 * em `(tabs)/_layout.tsx`).
 *
 * Spec: docs/system-design/consumer/07-telas.md §6
 */

const { colors, radius, spacing } = consumerDesign

/** Loja com pele, para o tijolo do recibo — join por id, fora do embed. */
interface LojaSkin {
  id: string
  nome: string
  slug: string | null
  logo_url: string | null
  theme: unknown
}

export default function TelaPedidos() {
  const insets = useSafeAreaInsets()
  const fontes = useFontesMarquee()
  const [pedidos, setPedidos] = useState<PedidoCardModel[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)

  // A marquise é escura: status bar clara só enquanto a aba está em foco.
  const [focado, setFocado] = useState(false)
  useFocusEffect(
    useCallback(() => {
      setFocado(true)
      return () => setFocado(false)
    }, []),
  )

  // A folha recebe a luz do dia, como no Início.
  const luzAtiva = usePreferencias((s) => s.luzDoDia)
  const luz = useLuzDoDia(luzAtiva)

  const carregarPedidos = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setCarregando(false)
      return
    }
    const { data: consumer } = await supabase
      .from('consumers')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (!consumer) {
      setCarregando(false)
      return
    }

    const { data } = await supabase
      .from('orders')
      .select(
        `
        id, status, total, criado_em,
        stores (id, nome, slug),
        order_items (nome, quantidade)
      `,
      )
      .eq('consumer_id', consumer.id)
      .order('criado_em', { ascending: false })
      .limit(50)

    const lista = ((data ?? []) as unknown as PedidoCardModel[]).map((p) => ({
      ...p,
      stores: p.stores ?? null,
    }))

    // Pele das lojas (logo + tema) para o tijolo do recibo. Join à parte
    // porque o embed de `orders` não carrega tema — e o mock também não.
    const ids = Array.from(
      new Set(lista.map((p) => p.stores?.id).filter((id): id is string => !!id)),
    )
    if (ids.length > 0) {
      const { data: lojas } = await supabase
        .from('stores')
        .select('id, nome, slug, logo_url, theme')
        .in('id', ids)
      const porId = new Map(((lojas ?? []) as LojaSkin[]).map((l) => [l.id, l]))
      for (const p of lista) {
        const skin = p.stores?.id ? porId.get(p.stores.id) : undefined
        if (skin && p.stores) {
          p.stores = { ...p.stores, logo_url: skin.logo_url, theme: skin.theme }
        }
      }
    }

    setPedidos(lista)
    setCarregando(false)
  }, [])

  useEffect(() => {
    void carregarPedidos()
  }, [carregarPedidos])

  const onRefresh = useCallback(async () => {
    setAtualizando(true)
    await carregarPedidos()
    setAtualizando(false)
  }, [carregarPedidos])

  const ativos = useMemo(() => pedidos.filter((p) => ehAtivo(p.status)), [pedidos])
  const historico = useMemo(() => pedidos.filter((p) => !ehAtivo(p.status)), [pedidos])

  // Histórico agrupado por mês, na ordem em que os pedidos já vêm (desc).
  const meses = useMemo(() => {
    const grupos: { chave: string; rotulo: string; pedidos: PedidoCardModel[] }[] = []
    for (const p of historico) {
      const d = new Date(p.criado_em)
      const chave = `${d.getFullYear()}-${d.getMonth()}`
      let grupo = grupos[grupos.length - 1]
      if (!grupo || grupo.chave !== chave) {
        grupo = {
          chave,
          rotulo: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
          pedidos: [],
        }
        grupos.push(grupo)
      }
      grupo.pedidos.push(p)
    }
    return grupos
  }, [historico])

  const resumo = carregando
    ? 'Buscando seus pedidos…'
    : pedidos.length === 0
      ? 'Seu primeiro pedido ainda está por vir.'
      : [
          ativos.length > 0 ? `${ativos.length} em andamento` : 'Nada a caminho agora',
          historico.length > 0 ? `${historico.length} no histórico` : null,
        ]
          .filter(Boolean)
          .join(' · ')

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {focado && <StatusBar style="light" animated />}

      {/* Céu atrás do overscroll superior (iOS rubber-band). */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 420,
          backgroundColor: colors.marquee,
        }}
      />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={onRefresh}
            tintColor={colors.white}
          />
        }
      >
        {/* ── Marquise: o que está ao vivo ── */}
        <View
          style={{
            backgroundColor: colors.marquee,
            paddingTop: insets.top + 16,
            // 24 extras ficam escondidos atrás da folha que sobe por cima.
            paddingBottom: 48,
            overflow: 'hidden',
          }}
        >
          <GlowNeon />

          <View style={{ paddingHorizontal: 24 }}>
            <Text style={estilos.microMudo}>Meus pedidos</Text>
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
              Do balcão{'\n'}
              <Text style={[fontes.acento, { color: colors.accent }]}>até a sua porta.</Text>
            </Text>
            <Text
              style={{
                fontSize: 13.5,
                fontWeight: '500',
                color: colors.marqueeInkSoft,
                marginTop: 8,
              }}
            >
              {resumo}
            </Text>
          </View>

          <View style={{ paddingHorizontal: 16, paddingTop: 22, gap: 12 }}>
            {carregando ? (
              <CartaoApagado />
            ) : ativos.length > 0 ? (
              ativos.map((p) => (
                <CartaoPedidoVivo
                  key={p.id}
                  pedido={p}
                  aoTocar={() => router.push(`/pedido/${p.id}`)}
                />
              ))
            ) : (
              <SemPedidoVivo />
            )}
          </View>
        </View>

        {/* ── Folha: o histórico ── */}
        <View
          style={{
            flex: 1,
            marginTop: -24,
            backgroundColor: colors.canvas,
            borderTopLeftRadius: radius.md,
            borderTopRightRadius: radius.md,
            paddingTop: 30,
            paddingBottom: spacing.tabBarHeight,
            overflow: 'hidden',
          }}
        >
          <VidroFosco luz={luz} />

          {/* Letreiro do histórico — mesma voz dos corredores da home. */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              paddingHorizontal: 24,
              marginBottom: 16,
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 10.5,
                  fontWeight: '700',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: colors.inkSoft,
                  marginBottom: 3,
                }}
              >
                Pedidos anteriores
              </Text>
              <Text
                style={[fontes.letreiro, { fontSize: 21, color: colors.ink, letterSpacing: -0.4 }]}
              >
                Histórico
              </Text>
            </View>
            {!carregando && historico.length > 0 && (
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 0.8,
                  color: colors.inkSoft,
                  paddingBottom: 4,
                }}
              >
                {historico.length} {historico.length === 1 ? 'PEDIDO' : 'PEDIDOS'}
              </Text>
            )}
          </View>

          {carregando ? (
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: radius.md,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <Skeleton largura={46} altura={46} raio={radius.sm} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <Skeleton largura="55%" altura={14} raio={5} />
                    <Skeleton largura="80%" altura={11} raio={4} />
                  </View>
                  <Skeleton largura={56} altura={14} raio={5} />
                </View>
              ))}
            </View>
          ) : historico.length === 0 ? (
            <EmptyState
              icone="orders"
              titulo={pedidos.length === 0 ? 'Nenhum pedido ainda' : 'Histórico vazio'}
              descricao={
                pedidos.length === 0
                  ? 'Faça seu primeiro pedido e ele aparece aqui, do preparo à entrega.'
                  : 'Quando um pedido for concluído, ele fica guardado aqui.'
              }
              acao={
                pedidos.length === 0
                  ? { label: 'Explorar o shopping', aoTocar: () => router.navigate('/(tabs)') }
                  : undefined
              }
            />
          ) : (
            <View style={{ gap: 22 }}>
              {meses.map((mes) => (
                <View key={mes.chave} style={{ gap: 12 }}>
                  <Text
                    style={{
                      fontSize: 10.5,
                      fontWeight: '700',
                      letterSpacing: 1.2,
                      textTransform: 'uppercase',
                      color: colors.inkSoft,
                      paddingHorizontal: 24,
                    }}
                  >
                    {mes.rotulo}
                  </Text>
                  <View style={{ paddingHorizontal: 16, gap: 12 }}>
                    {mes.pedidos.map((p) => (
                      <PedidoCard key={p.id} pedido={p} />
                    ))}
                  </View>
                </View>
              ))}
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

/** Marquise sem pedido a caminho: diz isso em uma linha e aponta o Início. */
function SemPedidoVivo() {
  return (
    <TouchableOpacity
      onPress={() => router.navigate('/(tabs)')}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      accessibilityRole="button"
      accessibilityLabel="Nada a caminho agora. Ir para o Início"
      style={{
        backgroundColor: colors.marqueeGlass,
        borderWidth: 1,
        borderColor: colors.marqueeLine,
        borderRadius: radius.lg,
        paddingHorizontal: 18,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.marqueeGlassStrong,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ConsumerIcon name="package" size={17} color={colors.marqueeInkSoft} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.white }}>
          Nada a caminho agora
        </Text>
        <Text
          style={{ fontSize: 12.5, fontWeight: '500', color: colors.marqueeInkSoft, marginTop: 2 }}
        >
          As novidades do shopping estão no Início.
        </Text>
      </View>
      <ConsumerIcon name="chevron-right" size={16} color={colors.accent} strokeWidth={2.2} />
    </TouchableOpacity>
  )
}

/** Cartão ao vivo apagado, enquanto os pedidos carregam. */
function CartaoApagado() {
  return (
    <View
      style={{
        backgroundColor: colors.marqueeGlass,
        borderWidth: 1,
        borderColor: colors.marqueeLine,
        borderRadius: radius.lg,
        padding: 18,
        gap: 12,
      }}
    >
      <Skeleton largura="40%" altura={9} raio={4} />
      <Skeleton largura="70%" altura={18} raio={6} />
      <Skeleton largura="100%" altura={4} raio={2} />
      <Skeleton largura="55%" altura={11} raio={4} />
    </View>
  )
}

const estilos = {
  microMudo: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.marqueeInkMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
}
