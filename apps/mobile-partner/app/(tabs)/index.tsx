import { useEffect, useMemo, useState } from 'react'
import { Alert, Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { formatarReais, assinaturaEmAtraso, tenantPodePublicar } from '@mallevo/lib'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { usePedidosStore, STATUS_ATIVOS } from '@/store/usePedidosStore'
import { atualizarStatusPedido } from '@/lib/pedidos'
import { PedidoCard } from '@/components/PedidoCard'
import { CartaoPedidoVivo, CartaoVivoApagado } from '@/components/pedidos/CartaoPedidoVivo'
import { SeletorLoja } from '@/components/SeletorLoja'
import { PartnerIcon, type PartnerIconName } from '@/components/PartnerIcon'
import { TelaMarquise } from '@/components/marquise/TelaMarquise'
import { CartaoVidro, PlacaVidro, Portaria, Statement } from '@/components/marquise/Marquise'
import { SecaoFolha, CartaoFolha } from '@/components/ui/SecaoFolha'
import { abrirNoDashboard } from '@/lib/links'
import { partnerDesign, saudacaoPorHorario, abreviarNome, softColor } from '@/lib/partner-design'

/**
 * Início — o balcão do lojista, na arquitetura marquise + folha do
 * consumer:
 *
 * - MARQUISE (o que está ao vivo): saudação + loja ativa, statement, os
 *   números do dia em placas de vidro (receita, pedidos, ticket) e a fila
 *   operacional (novos / preparo / entrega); logo abaixo, os pedidos que
 *   PEDEM AÇÃO agora, um cartão ao vivo cada, com "Confirmar" inline.
 * - FOLHA (o acervo): pendências da conta (assinatura, recebimentos), os
 *   pedidos em andamento como recibos claros e os atalhos da loja.
 *
 * KPIs espelham a home do Dashboard (apps/web/app/(dashboard)/page.tsx).
 * docs/partner-app/05-stage-3-pedidos.md · docs/system-design/partner/01-telas.md §1
 */

interface ResumoDia {
  receitaHoje: number
  pedidosHoje: number
  ticketMedio: number
}

const { colors, radius } = partnerDesign

export default function TelaInicio() {
  const { tenant, billingStatus } = useAuthStore()
  const { pedidos, carregando, carregarPedidos, aplicarPedido } = usePedidosStore()
  const [resumo, setResumo] = useState<ResumoDia | null>(null)
  const [confirmando, setConfirmando] = useState<string | null>(null)

  const ativos = useMemo(
    () => pedidos.filter((p) => STATUS_ATIVOS.includes(p.status)),
    [pedidos],
  )
  const novos = useMemo(() => ativos.filter((p) => p.status === 'novo'), [ativos])
  const emAndamento = useMemo(
    () => ativos.filter((p) => p.status !== 'novo').slice(0, 5),
    [ativos],
  )

  // Mesma consulta da home web (gte início do dia, por tenant via RLS);
  // refeita quando a lista realtime muda — mantém o número vivo.
  useEffect(() => {
    if (!tenant) return
    const inicioDia = new Date()
    inicioDia.setHours(0, 0, 0, 0)

    supabase
      .from('orders')
      .select('id, total')
      .gte('criado_em', inicioDia.toISOString())
      .then(({ data }) => {
        const lista = data ?? []
        const receitaHoje = lista.reduce((s, o) => s + Number(o.total ?? 0), 0)
        const pedidosHoje = lista.length
        setResumo({
          receitaHoje,
          pedidosHoje,
          ticketMedio: pedidosHoje ? Math.round(receitaHoje / pedidosHoje) : 0,
        })
      })
  }, [tenant?.id, pedidos.length])

  const preparo = ativos.filter(
    (p) => p.status === 'confirmado' || p.status === 'em_preparo' || p.status === 'aguardando_entregador',
  ).length
  const entrega = ativos.filter((p) => p.status === 'saiu_para_entrega').length

  /** Confirmar direto do cartão ao vivo — otimista, com rollback. */
  async function confirmar(pedidoId: string) {
    const pedido = pedidos.find((p) => p.id === pedidoId)
    if (!pedido || confirmando) return
    setConfirmando(pedidoId)
    aplicarPedido({ ...pedido, status: 'confirmado' })
    const r = await atualizarStatusPedido(pedidoId, 'confirmado')
    setConfirmando(null)
    if (r.erro) {
      aplicarPedido(pedido)
      Alert.alert('Não foi possível confirmar', r.erro)
    }
  }

  const resumoLinha = carregando
    ? 'Abrindo o balcão…'
    : ativos.length === 0
      ? 'Tudo tranquilo por aqui — nenhum pedido em aberto.'
      : [
          novos.length > 0 ? `${novos.length} ${novos.length === 1 ? 'novo' : 'novos'}` : null,
          preparo > 0 ? `${preparo} em preparo` : null,
          entrega > 0 ? `${entrega} em entrega` : null,
        ]
          .filter(Boolean)
          .join(' · ')

  const pendencias = [
    assinaturaEmAtraso(billingStatus)
      ? {
          chave: 'assinatura',
          icone: 'wallet' as PartnerIconName,
          cor: colors.warning,
          texto: 'Sua assinatura está com pagamento em atraso.',
          cta: 'Regularizar',
          aoTocar: () => abrirNoDashboard('/minha-conta?aba=assinatura'),
        }
      : null,
    tenant && !tenantPodePublicar(tenant)
      ? {
          chave: 'recebimentos',
          icone: 'camera' as PartnerIconName,
          cor: colors.info,
          texto: 'Recebimentos pendentes — publique no Explorar após ativar.',
          cta: 'Configurar',
          aoTocar: () => abrirNoDashboard('/configuracoes?aba=recebimentos'),
        }
      : null,
  ].filter((p): p is NonNullable<typeof p> => p !== null)

  return (
    <TelaMarquise
      refreshing={carregando}
      onRefresh={() => void carregarPedidos()}
      marquise={
        <>
          <Portaria esquerda={<SeletorLoja escuro />} />

          <Statement
            sobrelinha={`${saudacaoPorHorario()}, ${abreviarNome(tenant?.nome_responsavel)}`}
            linha="Sua loja,"
            acento="ao vivo no shopping."
            sublinha={resumoLinha}
          />

          {/* Números do dia */}
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 22 }}>
            <PlacaVidro
              icone="cash"
              valor={resumo ? formatarReais(resumo.receitaHoje) : '—'}
              rotulo="Receita hoje"
            />
            <PlacaVidro
              icone="orders"
              valor={resumo ? String(resumo.pedidosHoje) : '—'}
              rotulo={resumo?.pedidosHoje === 1 ? 'Pedido hoje' : 'Pedidos hoje'}
            />
            <PlacaVidro
              icone="trend"
              valor={resumo ? formatarReais(resumo.ticketMedio) : '—'}
              rotulo="Ticket médio"
            />
          </View>

          {/* Fila operacional */}
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10 }}>
            <PlacaVidro
              icone="bell"
              valor={String(novos.length)}
              rotulo="Novos"
              alerta={novos.length > 0}
              aoTocar={() => router.navigate('/(tabs)/pedidos')}
            />
            <PlacaVidro
              icone="chef"
              valor={String(preparo)}
              rotulo="Em preparo"
              aoTocar={() => router.navigate('/(tabs)/pedidos')}
            />
            <PlacaVidro
              icone="bike"
              valor={String(entrega)}
              rotulo="Em entrega"
              aoTocar={() => router.navigate('/(tabs)/pedidos')}
            />
          </View>

          {/* Pede ação agora */}
          <View style={{ paddingHorizontal: 16, paddingTop: 22, gap: 12 }}>
            {carregando && pedidos.length === 0 ? (
              <CartaoVivoApagado />
            ) : novos.length > 0 ? (
              novos.slice(0, 3).map((p) => (
                <CartaoPedidoVivo
                  key={p.id}
                  pedido={p}
                  aoTocar={() => router.push(`/pedido/${p.id}`)}
                  acao={{
                    rotulo: 'Confirmar pedido',
                    aoTocar: () => void confirmar(p.id),
                    carregando: confirmando === p.id,
                  }}
                />
              ))
            ) : (
              <SemAcaoPendente />
            )}
            {novos.length > 3 && (
              <TouchableOpacity
                onPress={() => router.navigate('/(tabs)/pedidos')}
                activeOpacity={partnerDesign.opacity.pressedSoft}
                accessibilityRole="button"
                style={{ alignItems: 'center', paddingVertical: 4 }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>
                  Mais {novos.length - 3} aguardando em Pedidos ›
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      }
    >
      {pendencias.length > 0 && (
        <SecaoFolha sobrelinha="Atenção" titulo="Pendências da conta">
          <View style={{ gap: 10 }}>
            {pendencias.map((p) => (
              <Pendencia key={p.chave} {...p} />
            ))}
          </View>
        </SecaoFolha>
      )}

      <SecaoFolha
        sobrelinha="Já confirmados"
        titulo="Em andamento"
        direita={
          emAndamento.length > 0 ? (
            <LinkFolha rotulo="Ver todos" aoTocar={() => router.navigate('/(tabs)/pedidos')} />
          ) : undefined
        }
      >
        {emAndamento.length === 0 ? (
          <CartaoFolha>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>
              Nada em preparo ou a caminho
            </Text>
            <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkMuted, marginTop: 3 }}>
              Os pedidos confirmados aparecem aqui até serem entregues.
            </Text>
          </CartaoFolha>
        ) : (
          <View style={{ gap: 12 }}>
            {emAndamento.map((p) => (
              <PedidoCard key={p.id} pedido={p} />
            ))}
          </View>
        )}
      </SecaoFolha>

      <SecaoFolha sobrelinha="Atalhos" titulo="Sua loja">
        <CartaoFolha padding={0}>
          <Atalho
            icone="camera"
            rotulo="Publicar no Explorar"
            descricao="Foto ou vídeo de um produto"
            aoTocar={() => router.navigate('/(tabs)/publicar')}
          />
          <Atalho
            icone="chart"
            rotulo="Relatórios"
            descricao="Vendas, itens e pagamentos"
            aoTocar={() => router.push('/relatorios')}
          />
          <Atalho
            icone="store"
            rotulo="Minha loja"
            descricao="Dados, horários e entrega"
            aoTocar={() => router.push('/minha-loja')}
            ultimo
          />
        </CartaoFolha>
      </SecaoFolha>
    </TelaMarquise>
  )
}

// ─────────────────────────────────────────────────────────
// Peças da marquise
// ─────────────────────────────────────────────────────────

/** Marquise sem pedido pedindo ação: uma linha de vidro dizendo isso. */
function SemAcaoPendente() {
  return (
    <CartaoVidro padding={16} raio="lg">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
          <PartnerIcon name="check-double" size={17} color={colors.marqueeInkSoft} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.white }}>
            Nenhum pedido esperando você
          </Text>
          <Text
            style={{ fontSize: 12.5, fontWeight: '500', color: colors.marqueeInkSoft, marginTop: 2 }}
          >
            Pedidos novos chegam aqui com som e aviso.
          </Text>
        </View>
      </View>
    </CartaoVidro>
  )
}

// ─────────────────────────────────────────────────────────
// Peças da folha
// ─────────────────────────────────────────────────────────

function LinkFolha({ rotulo, aoTocar }: { rotulo: string; aoTocar: () => void }) {
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={partnerDesign.opacity.pressedSoft}
      accessibilityRole="button"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
    >
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.inkMuted }}>{rotulo}</Text>
      <PartnerIcon name="chevron-right" size={14} color={colors.inkMuted} strokeWidth={2.2} />
    </TouchableOpacity>
  )
}

/** Aviso de conta — cartão claro com o fio da cor do momento. */
function Pendencia({
  icone,
  cor,
  texto,
  cta,
  aoTocar,
}: {
  icone: PartnerIconName
  cor: string
  texto: string
  cta: string
  aoTocar: () => void
}) {
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={partnerDesign.opacity.pressedSoft}
      accessibilityRole="button"
      accessibilityLabel={`${texto} ${cta}`}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: 14,
        },
        partnerDesign.shadow.soft,
      ]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.sm,
          backgroundColor: softColor(cor),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PartnerIcon name={icone} size={18} color={colors.ink} />
      </View>
      <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: colors.ink, lineHeight: 18 }}>
        {texto}
      </Text>
      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.ink }}>{cta} ›</Text>
    </TouchableOpacity>
  )
}

function Atalho({
  icone,
  rotulo,
  descricao,
  aoTocar,
  ultimo,
}: {
  icone: PartnerIconName
  rotulo: string
  descricao: string
  aoTocar: () => void
  ultimo?: boolean
}) {
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={partnerDesign.opacity.pressedSoft}
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderBottomWidth: ultimo ? 0 : 1,
        borderBottomColor: colors.line,
      }}
    >
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
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>{rotulo}</Text>
        <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkMuted, marginTop: 1 }}>
          {descricao}
        </Text>
      </View>
      <PartnerIcon name="chevron-right" size={16} color={colors.inkSoft} />
    </TouchableOpacity>
  )
}
