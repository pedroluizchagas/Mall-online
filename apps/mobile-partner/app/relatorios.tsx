import { useCallback, useState } from 'react'
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useFocusEffect } from 'expo-router'
import {
  agregarItens,
  calcularResumo,
  distribuirPor,
  formatarReais,
  intervaloAnterior,
  intervaloPeriodo,
  PERIODOS_VALIDOS,
  ROTULOS_PAGAMENTO_RELATORIO,
  ROTULOS_PERIODO,
  ROTULOS_TIPO_RELATORIO,
  rotuloRelatorio,
  type ItemDistribuicao,
  type ItemLinhaRelatorio,
  type PedidoLinhaRelatorio,
  type Periodo,
  type ResumoMetricas,
} from '@mallevo/lib'
import { supabase } from '@/lib/supabase'
import { CabecalhoTela, Cartao, Chip, Legenda } from '@/components/Basicos'
import { abrirNoDashboard } from '@/lib/links'
import { partnerDesign } from '@/lib/partner-design'

// Relatórios — MESMOS agregados do Dashboard (fonte única em
// @mallevo/lib: calcularResumo/distribuirPor/agregarItens + períodos),
// em forma compacta. Exportação CSV e detalhamentos densos são web-only.
// docs/partner-app/07-stage-5-financeiro-relatorios.md

const COLUNAS_PEDIDO =
  'id, status, total, subtotal, taxa_entrega, platform_fee_amount, forma_pagamento, tipo, criado_em, cancelado_em, consumer_id, endereco_entrega'

export default function TelaRelatorios() {
  const [periodo, setPeriodo] = useState<Periodo>('30d')
  const [carregando, setCarregando] = useState(false)
  const [resumoAtual, setResumoAtual] = useState<ResumoMetricas | null>(null)
  const [resumoAnterior, setResumoAnterior] = useState<ResumoMetricas | null>(null)
  const [linhas, setLinhas] = useState<PedidoLinhaRelatorio[]>([])
  const [itens, setItens] = useState<ItemLinhaRelatorio[]>([])
  const { colors, spacing, typography } = partnerDesign

  const carregar = useCallback(async () => {
    setCarregando(true)
    const intervalo = intervaloPeriodo(periodo)
    const anterior = intervaloAnterior(intervalo)

    // Mesmas consultas da página web de relatórios (RLS filtra o tenant)
    const [atualRes, anteriorRes, itensRes] = await Promise.all([
      supabase
        .from('orders')
        .select(COLUNAS_PEDIDO)
        .gte('criado_em', intervalo.inicio.toISOString())
        .lte('criado_em', intervalo.fim.toISOString()),
      supabase
        .from('orders')
        .select(COLUNAS_PEDIDO)
        .gte('criado_em', anterior.inicio.toISOString())
        .lt('criado_em', anterior.fim.toISOString()),
      supabase
        .from('order_items')
        .select('product_id, nome, quantidade, subtotal, orders!inner(tenant_id, criado_em)')
        .gte('orders.criado_em', intervalo.inicio.toISOString())
        .lte('orders.criado_em', intervalo.fim.toISOString()),
    ])

    const linhasAtual = (atualRes.data ?? []) as unknown as PedidoLinhaRelatorio[]
    setLinhas(linhasAtual)
    setResumoAtual(calcularResumo(linhasAtual))
    setResumoAnterior(calcularResumo((anteriorRes.data ?? []) as unknown as PedidoLinhaRelatorio[]))
    setItens((itensRes.data ?? []) as unknown as ItemLinhaRelatorio[])
    setCarregando(false)
  }, [periodo])

  useFocusEffect(
    useCallback(() => {
      void carregar()
    }, [carregar])
  )

  const naoCancelados = linhas.filter((p) => p.status !== 'cancelado')
  const topProdutos = Array.from(agregarItens(itens).values())
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 10)

  const distPagamento = distribuirPor(
    naoCancelados,
    (p) => p.forma_pagamento ?? 'nao_informado',
    (k) => (k === 'nao_informado' ? 'Não informado' : rotuloRelatorio(ROTULOS_PAGAMENTO_RELATORIO, k)),
  )
  const distTipo = distribuirPor(
    naoCancelados,
    (p) => p.tipo ?? 'entrega',
    (k) => rotuloRelatorio(ROTULOS_TIPO_RELATORIO, k),
  )
  const distBairro = distribuirPor(
    naoCancelados.filter((p) => p.endereco_entrega?.bairro),
    (p) => p.endereco_entrega?.bairro ?? '—',
    (k) => k,
  )
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5)

  // Clientes: únicos e recorrentes DENTRO do período (derivado das linhas)
  const porConsumer = new Map<string, number>()
  for (const p of naoCancelados) {
    if (p.consumer_id) porConsumer.set(p.consumer_id, (porConsumer.get(p.consumer_id) ?? 0) + 1)
  }
  const clientesUnicos = porConsumer.size
  const clientesRecorrentes = [...porConsumer.values()].filter((n) => n > 1).length

  const semDados = !carregando && linhas.length === 0

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void carregar()} />}
        contentContainerStyle={{ paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: 64 }}
      >
        <CabecalhoTela titulo="Relatórios" />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md }}>
          {PERIODOS_VALIDOS.map((p) => (
            <Chip key={p} rotulo={ROTULOS_PERIODO[p]} ativo={periodo === p} onPress={() => setPeriodo(p)} />
          ))}
        </View>

        {semDados ? (
          <Text style={{ color: colors.inkSoft, textAlign: 'center', marginTop: spacing['4xl'] }}>
            Sem pedidos no período.
          </Text>
        ) : (
          <>
            {/* Métricas com comparação */}
            {resumoAtual && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl }}>
                <Metrica rotulo="Faturamento" valor={formatarReais(resumoAtual.faturamentoBruto)} delta={delta(resumoAtual.faturamentoBruto, resumoAnterior?.faturamentoBruto)} />
                <Metrica rotulo="Líquido" valor={formatarReais(resumoAtual.faturamentoLiquido)} delta={delta(resumoAtual.faturamentoLiquido, resumoAnterior?.faturamentoLiquido)} />
                <Metrica rotulo="Pedidos" valor={String(resumoAtual.pedidosConcluidos)} delta={delta(resumoAtual.pedidosConcluidos, resumoAnterior?.pedidosConcluidos)} />
                <Metrica rotulo="Ticket" valor={formatarReais(resumoAtual.ticketMedio)} delta={delta(resumoAtual.ticketMedio, resumoAnterior?.ticketMedio)} />
              </View>
            )}

            {/* Top produtos */}
            <Legenda>Top produtos (receita)</Legenda>
            <Cartao semPadding>
              {topProdutos.length === 0 ? (
                <Text style={{ color: colors.inkSoft, padding: spacing.lg }}>Sem itens no período.</Text>
              ) : (
                topProdutos.map((p, i) => (
                  <View
                    key={p.productId ?? p.nome}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 9,
                      paddingHorizontal: spacing.lg,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: colors.line,
                      gap: spacing.sm,
                    }}
                  >
                    <Text style={{ width: 22, color: colors.inkSoft, fontWeight: '800' }}>{i + 1}</Text>
                    <Text numberOfLines={1} style={{ flex: 1, color: colors.ink, fontWeight: '600' }}>
                      {p.nome}
                    </Text>
                    <Text style={{ color: colors.inkMuted, fontSize: typography.bodySm.size }}>
                      {p.quantidade}×
                    </Text>
                    <Text style={{ color: colors.ink, fontWeight: '700', fontSize: typography.bodySm.size }}>
                      {formatarReais(p.receita)}
                    </Text>
                  </View>
                ))
              )}
            </Cartao>

            {/* Distribuições */}
            <Legenda>Formas de pagamento</Legenda>
            <BarraDistribuicao itens={distPagamento} />
            <Legenda>Tipo de pedido</Legenda>
            <BarraDistribuicao itens={distTipo} />

            {/* Clientes */}
            <Legenda>Clientes no período</Legenda>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
              <Metrica rotulo="Únicos" valor={String(clientesUnicos)} />
              <Metrica rotulo="Voltaram a pedir" valor={String(clientesRecorrentes)} />
            </View>

            {/* Bairros */}
            {distBairro.length > 0 && (
              <>
                <Legenda>Bairros que mais pedem</Legenda>
                <BarraDistribuicao itens={distBairro} />
              </>
            )}

            <TouchableOpacity
              onPress={() => abrirNoDashboard('/relatorios')}
              activeOpacity={0.7}
              style={{ alignItems: 'center', paddingVertical: spacing.md }}
            >
              <Text style={{ color: colors.inkMuted, fontSize: typography.bodySm.size, textDecorationLine: 'underline' }}>
                Relatório completo e exportação CSV no Dashboard
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  )
}

function delta(atual: number, anterior?: number): number | null {
  if (!anterior) return null
  return Math.round(((atual - anterior) / anterior) * 100)
}

function Metrica({ rotulo, valor, delta: d }: { rotulo: string; valor: string; delta?: number | null }) {
  const { colors, radius, spacing, typography } = partnerDesign
  return (
    <View
      style={{
        flexGrow: 1,
        minWidth: '46%',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
      }}
    >
      <Text
        style={{
          color: colors.inkSoft,
          fontSize: typography.micro.size,
          fontWeight: typography.micro.weight,
          letterSpacing: typography.micro.tracking,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {rotulo}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <Text style={{ color: colors.ink, fontSize: typography.h3.size, fontWeight: '800' }}>{valor}</Text>
        {typeof d === 'number' && (
          <Text
            style={{
              color: d >= 0 ? colors.success : colors.danger,
              fontSize: typography.bodySm.size,
              fontWeight: '800',
              marginBottom: 2,
            }}
          >
            {d >= 0 ? '+' : ''}{d}%
          </Text>
        )}
      </View>
    </View>
  )
}

function BarraDistribuicao({ itens }: { itens: ItemDistribuicao[] }) {
  const { colors, radius, spacing, typography } = partnerDesign
  const total = Math.max(1, itens.reduce((s, i) => s + i.valor, 0))
  return (
    <Cartao>
      {itens.map((item) => (
        <View key={item.rotulo} style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', marginBottom: 3 }}>
            <Text style={{ flex: 1, color: colors.ink, fontSize: typography.bodySm.size, fontWeight: '600' }}>
              {item.rotulo}
            </Text>
            <Text style={{ color: colors.inkMuted, fontSize: typography.bodySm.size }}>
              {item.valor} ({Math.round((item.valor / total) * 100)}%)
            </Text>
          </View>
          <View style={{ height: 6, backgroundColor: colors.surfaceMuted, borderRadius: radius.pill }}>
            <View
              style={{
                width: `${(item.valor / total) * 100}%`,
                height: 6,
                borderRadius: radius.pill,
                backgroundColor: colors.accentStrong,
              }}
            />
          </View>
        </View>
      ))}
    </Cartao>
  )
}
