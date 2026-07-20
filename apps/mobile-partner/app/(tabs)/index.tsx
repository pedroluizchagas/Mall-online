import { useEffect, useMemo, useState } from 'react'
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { formatarReais, assinaturaEmAtraso, tenantPodePublicar } from '@mallevo/lib'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { usePedidosStore, STATUS_ATIVOS } from '@/store/usePedidosStore'
import { PedidoCard } from '@/components/PedidoCard'
import { SeletorLoja } from '@/components/SeletorLoja'
import { PartnerIcon } from '@/components/PartnerIcon'
import { abrirNoDashboard } from '@/lib/links'
import { partnerDesign, saudacaoPorHorario, abreviarNome, softColor } from '@/lib/partner-design'

// Aba Início — resumo do dia. KPIs espelham a home do Dashboard
// (apps/web/app/(dashboard)/page.tsx): pedidos de hoje por tenant →
// receita = soma(total em centavos), ticket médio = receita/quantidade.
// docs/partner-app/05-stage-3-pedidos.md

interface ResumoDia {
  receitaHoje: number
  pedidosHoje: number
  ticketMedio: number
}

export default function TelaInicio() {
  const { tenant, billingStatus } = useAuthStore()
  const { pedidos, carregando, carregarPedidos } = usePedidosStore()
  const [resumo, setResumo] = useState<ResumoDia | null>(null)
  const { colors, radius, spacing, typography } = partnerDesign

  const ativos = useMemo(
    () => pedidos.filter((p) => STATUS_ATIVOS.includes(p.status)),
    [pedidos]
  )
  const aguardandoAcao = useMemo(
    () => ativos.filter((p) => p.status === 'novo').slice(0, 3),
    [ativos]
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

  const novos = ativos.filter((p) => p.status === 'novo').length
  const preparo = ativos.filter((p) => p.status === 'em_preparo' || p.status === 'aguardando_entregador').length
  const entrega = ativos.filter((p) => p.status === 'saiu_para_entrega').length

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
        {/* Saudação + loja */}
        <Text style={{ color: colors.inkMuted, fontSize: typography.body.size, marginBottom: 2 }}>
          {saudacaoPorHorario()},
        </Text>
        <Text
          style={{
            color: colors.ink,
            fontSize: typography.h1.size,
            fontWeight: typography.h1.weight,
            letterSpacing: typography.h1.tracking,
            marginBottom: spacing.md,
          }}
        >
          {abreviarNome(tenant?.nome_responsavel)}
        </Text>
        <View style={{ marginBottom: spacing.xl }}>
          <SeletorLoja />
        </View>

        {/* Banners de gate (04-stage-2): em atraso opera com aviso */}
        {assinaturaEmAtraso(billingStatus) && (
          <Banner
            texto="Sua assinatura está com pagamento em atraso."
            cta="Regularizar"
            onPress={() => abrirNoDashboard('/minha-conta?aba=assinatura')}
            cor={colors.warning}
          />
        )}
        {tenant && !tenantPodePublicar(tenant) && (
          <Banner
            texto="Recebimentos pendentes — publique no Explorar após ativar."
            cta="Configurar"
            onPress={() => abrirNoDashboard('/configuracoes?aba=recebimentos')}
            cor={colors.info}
          />
        )}

        {/* KPIs do dia */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
          <CartaoKPI
            rotulo="Receita hoje"
            valor={resumo ? formatarReais(resumo.receitaHoje) : '—'}
            flex={1.4}
            destaque
          />
          <CartaoKPI rotulo="Pedidos" valor={resumo ? String(resumo.pedidosHoje) : '—'} flex={1} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
          <CartaoKPI
            rotulo="Ticket médio"
            valor={resumo ? formatarReais(resumo.ticketMedio) : '—'}
            flex={1.4}
          />
          <CartaoKPI rotulo="Ativos agora" valor={String(ativos.length)} flex={1} />
        </View>

        {/* Pipeline ativo */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.ink,
            borderRadius: radius.md,
            padding: spacing.lg,
            marginBottom: spacing.xl,
          }}
        >
          <Etapa titulo="Novos" valor={novos} alerta={novos > 0} />
          <Etapa titulo="Preparo" valor={preparo} />
          <Etapa titulo="Entrega" valor={entrega} ultimo />
        </View>

        {/* Aguardando ação */}
        {aguardandoAcao.length > 0 && (
          <>
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
              Aguardando sua ação
            </Text>
            {aguardandoAcao.map((p) => (
              <PedidoCard key={p.id} pedido={p} />
            ))}
            <View style={{ height: spacing.md }} />
          </>
        )}

        {/* Atalhos */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Atalho icone="camera" rotulo="Publicar" onPress={() => router.push('/(tabs)/publicar')} />
          <Atalho icone="chart" rotulo="Relatórios" onPress={() => router.push('/relatorios')} />
          <Atalho icone="store" rotulo="Minha loja" onPress={() => router.push('/minha-loja')} />
        </View>
      </ScrollView>
    </View>
  )
}

// ————— Primitivos locais —————

function CartaoKPI({ rotulo, valor, flex, destaque }: { rotulo: string; valor: string; flex: number; destaque?: boolean }) {
  const { colors, radius, spacing, typography } = partnerDesign
  return (
    <View
      style={{
        flex,
        backgroundColor: destaque ? colors.accent : colors.surface,
        borderRadius: radius.md,
        padding: spacing.lg,
      }}
    >
      <Text
        style={{
          color: destaque ? colors.ink : colors.inkSoft,
          fontSize: typography.micro.size,
          fontWeight: typography.micro.weight,
          letterSpacing: typography.micro.tracking,
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {rotulo}
      </Text>
      <Text style={{ color: colors.ink, fontSize: typography.h2.size, fontWeight: '800' }}>
        {valor}
      </Text>
    </View>
  )
}

function Etapa({ titulo, valor, alerta, ultimo }: { titulo: string; valor: number; alerta?: boolean; ultimo?: boolean }) {
  const { colors, typography } = partnerDesign
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        borderRightWidth: ultimo ? 0 : 1,
        borderRightColor: colors.lineDark,
      }}
    >
      <Text
        style={{
          color: alerta ? colors.accent : colors.white,
          fontSize: typography.h2.size,
          fontWeight: '800',
        }}
      >
        {valor}
      </Text>
      <Text style={{ color: '#8B8E94', fontSize: typography.micro.size, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
        {titulo}
      </Text>
    </View>
  )
}

function Atalho({ icone, rotulo, onPress }: { icone: 'camera' | 'chart' | 'store'; rotulo: string; onPress: () => void }) {
  const { colors, radius, spacing, typography } = partnerDesign
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        gap: 6,
      }}
    >
      <PartnerIcon name={icone} size={20} color={colors.ink} />
      <Text style={{ color: colors.ink, fontSize: typography.bodySm.size, fontWeight: '700' }}>
        {rotulo}
      </Text>
    </TouchableOpacity>
  )
}

function Banner({ texto, cta, onPress, cor }: { texto: string; cta: string; onPress: () => void; cor: string }) {
  const { colors, radius, spacing, typography } = partnerDesign
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: softColor(cor),
        borderRadius: radius.sm,
        padding: spacing.md,
        marginBottom: spacing.sm,
        gap: spacing.sm,
      }}
    >
      <Text style={{ flex: 1, color: colors.ink, fontSize: typography.bodySm.size, fontWeight: '600' }}>
        {texto}
      </Text>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Text style={{ color: colors.ink, fontSize: typography.bodySm.size, fontWeight: '800', textDecorationLine: 'underline' }}>
          {cta}
        </Text>
      </TouchableOpacity>
    </View>
  )
}
