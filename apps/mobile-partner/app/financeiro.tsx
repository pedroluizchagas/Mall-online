import { useCallback, useState } from 'react'
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useFocusEffect } from 'expo-router'
import { formatarReais, tenantPodePublicar } from '@mallevo/lib'
import { useAuthStore } from '@/store/useAuthStore'
import {
  getFaturamentoDiario,
  getKpisFinanceiros,
  getPedidosElegiveis,
  getRepasses,
  getSaldoRecipient,
  solicitarAntecipacao,
  type Elegibilidade,
  type FaturamentoDia,
  type KpisFinanceiros,
  type PeriodoFinanceiro,
  type Repasse,
  type SaldoRecipient,
} from '@/lib/financeiro'
import { BotaoPrimario, CabecalhoTela, Cartao, Chip, Legenda } from '@/components/Basicos'
import { partnerDesign, softColor, formatarMomentoCurto } from '@/lib/partner-design'

// Financeiro — KPIs, saldo Pagar.me, repasses e antecipação, com as
// mesmas contas/gates do Dashboard (lib/financeiro.ts é o espelho).
// docs/partner-app/07-stage-5-financeiro-relatorios.md

const ROTULO_STATUS_REPASSE: Record<string, { rotulo: string; corKey: 'warning' | 'success' | 'danger' | 'info' }> = {
  agendado: { rotulo: 'Agendado', corKey: 'info' },
  processando: { rotulo: 'Processando', corKey: 'warning' },
  concluido: { rotulo: 'Concluído', corKey: 'success' },
  falhou: { rotulo: 'Falhou', corKey: 'danger' },
}

export default function TelaFinanceiro() {
  const { tenant } = useAuthStore()
  const [periodo, setPeriodo] = useState<PeriodoFinanceiro>('hoje')
  const [kpis, setKpis] = useState<KpisFinanceiros | null>(null)
  const [dias, setDias] = useState<FaturamentoDia[]>([])
  const [repasses, setRepasses] = useState<Repasse[]>([])
  const [totais, setTotais] = useState({ pendente: 0, recebido: 0 })
  const [saldo, setSaldo] = useState<SaldoRecipient | null>(null)
  const [elegibilidade, setElegibilidade] = useState<Elegibilidade | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [antecipando, setAntecipando] = useState(false)
  const { colors, radius, spacing, typography } = partnerDesign

  const carregar = useCallback(async () => {
    if (!tenant) return
    setCarregando(true)
    const recebimentosOk = tenantPodePublicar(tenant)
    const [k, d, r, s, e] = await Promise.all([
      getKpisFinanceiros(periodo),
      getFaturamentoDiario(),
      getRepasses(),
      recebimentosOk ? getSaldoRecipient() : Promise.resolve(null),
      getPedidosElegiveis(tenant),
    ])
    setKpis(k)
    setDias(d)
    setRepasses(r.repasses.slice(0, 10))
    setTotais({ pendente: r.total_pendente, recebido: r.total_recebido })
    setSaldo(s)
    setElegibilidade(e)
    setCarregando(false)
  }, [tenant?.id, periodo])

  useFocusEffect(
    useCallback(() => {
      void carregar()
    }, [carregar])
  )

  function confirmarAntecipacao() {
    if (!elegibilidade?.elegivel) return
    Alert.alert(
      'Antecipar recebimento',
      `${elegibilidade.pedidos} pedidos · bruto ${formatarReais(elegibilidade.valor_bruto)}\n` +
        `Taxa: ${formatarReais(elegibilidade.taxa)}\n` +
        `Você recebe: ${formatarReais(elegibilidade.valor_liquido)}`,
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Confirmar antecipação',
          onPress: async () => {
            setAntecipando(true)
            const r = await solicitarAntecipacao()
            setAntecipando(false)
            if (r.erro) Alert.alert('Não foi possível antecipar', r.erro)
            else {
              Alert.alert('Antecipação solicitada', 'Acompanhe o status nos repasses.')
              void carregar()
            }
          },
        },
      ]
    )
  }

  const maiorDia = Math.max(1, ...dias.slice(-14).map((d) => d.bruto))

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void carregar()} />}
        contentContainerStyle={{ paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: 64 }}
      >
        <CabecalhoTela titulo="Financeiro" />

        {/* Período */}
        <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
          <Chip rotulo="Hoje" ativo={periodo === 'hoje'} onPress={() => setPeriodo('hoje')} />
          <Chip rotulo="7 dias" ativo={periodo === 'semana'} onPress={() => setPeriodo('semana')} />
          <Chip rotulo="Mês" ativo={periodo === 'mes'} onPress={() => setPeriodo('mes')} />
        </View>

        {/* KPIs */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
          <KPI rotulo="Bruto" valor={kpis ? formatarReais(kpis.faturamento_bruto) : '—'} destaque flex={1.3} />
          <KPI rotulo="Líquido" valor={kpis ? formatarReais(kpis.faturamento_liquido) : '—'} flex={1.3} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
          <KPI rotulo="Pedidos" valor={kpis ? String(kpis.total_pedidos) : '—'} flex={1} />
          <KPI rotulo="Ticket médio" valor={kpis ? formatarReais(kpis.ticket_medio) : '—'} flex={1.3} />
        </View>

        {/* Gráfico compacto — últimos 14 dias */}
        {dias.length > 0 && (
          <>
            <Legenda>Faturamento diário (14 dias)</Legenda>
            <Cartao>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 72, gap: 3 }}>
                {dias.slice(-14).map((d) => (
                  <View
                    key={d.data}
                    style={{
                      flex: 1,
                      height: Math.max(3, (d.bruto / maiorDia) * 72),
                      backgroundColor: colors.accentStrong,
                      borderRadius: 3,
                    }}
                  />
                ))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ color: colors.inkSoft, fontSize: typography.micro.size }}>
                  {dias.slice(-14)[0]?.data}
                </Text>
                <Text style={{ color: colors.inkSoft, fontSize: typography.micro.size }}>
                  {dias[dias.length - 1]?.data}
                </Text>
              </View>
            </Cartao>
          </>
        )}

        {/* Saldo Pagar.me */}
        {saldo && (
          <>
            <Legenda>Saldo de recebimentos</Legenda>
            <Cartao>
              <LinhaSaldo rotulo="Disponível" valor={saldo.available} destaque />
              <LinhaSaldo rotulo="A receber" valor={saldo.waiting_funds} />
              <LinhaSaldo rotulo="Já transferido" valor={saldo.transferred} />
            </Cartao>
          </>
        )}

        {/* Antecipação */}
        <Legenda>Antecipação</Legenda>
        <Cartao>
          {elegibilidade?.elegivel ? (
            <>
              <Text style={{ color: colors.ink, fontSize: typography.body.size, marginBottom: 4 }}>
                {elegibilidade.pedidos} pedidos elegíveis ·{' '}
                <Text style={{ fontWeight: '800' }}>{formatarReais(elegibilidade.valor_liquido)}</Text>{' '}
                líquidos após taxa de {formatarReais(elegibilidade.taxa)}
              </Text>
              <BotaoPrimario
                rotulo="Antecipar recebimento"
                onPress={confirmarAntecipacao}
                carregando={antecipando}
              />
            </>
          ) : (
            <Text style={{ color: colors.inkMuted, fontSize: typography.body.size }}>
              {elegibilidade?.motivo ?? 'Verificando elegibilidade…'}
            </Text>
          )}
        </Cartao>

        {/* Repasses */}
        <Legenda>Repasses</Legenda>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
          <KPI rotulo="A receber" valor={formatarReais(totais.pendente)} flex={1} />
          <KPI rotulo="Recebido" valor={formatarReais(totais.recebido)} flex={1} />
        </View>
        <Cartao semPadding>
          {repasses.length === 0 ? (
            <Text style={{ color: colors.inkSoft, padding: spacing.lg }}>
              Nenhum repasse registrado ainda.
            </Text>
          ) : (
            repasses.map((r, i) => {
              const meta = ROTULO_STATUS_REPASSE[r.status] ?? { rotulo: r.status, corKey: 'info' as const }
              return (
                <View
                  key={r.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 10,
                    paddingHorizontal: spacing.lg,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: colors.line,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.ink, fontWeight: '700' }}>
                      {formatarReais(r.valor_liquido)}
                      {r.antecipado ? '  ⚡' : ''}
                    </Text>
                    <Text style={{ color: colors.inkSoft, fontSize: typography.micro.size }}>
                      {formatarMomentoCurto(r.processado_em ?? r.criado_em)}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: softColor(colors[meta.corKey]),
                      borderRadius: radius.pill,
                      paddingVertical: 3,
                      paddingHorizontal: 10,
                    }}
                  >
                    <Text style={{ color: colors.ink, fontSize: typography.micro.size, fontWeight: '700' }}>
                      {meta.rotulo}
                    </Text>
                  </View>
                </View>
              )
            })
          )}
        </Cartao>
      </ScrollView>
    </View>
  )
}

function KPI({ rotulo, valor, flex, destaque }: { rotulo: string; valor: string; flex: number; destaque?: boolean }) {
  const { colors, radius, spacing, typography } = partnerDesign
  return (
    <View
      style={{
        flex,
        backgroundColor: destaque ? colors.accent : colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
      }}
    >
      <Text
        style={{
          color: destaque ? colors.ink : colors.inkSoft,
          fontSize: typography.micro.size,
          fontWeight: typography.micro.weight,
          letterSpacing: typography.micro.tracking,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {rotulo}
      </Text>
      <Text style={{ color: colors.ink, fontSize: typography.h3.size, fontWeight: '800' }}>
        {valor}
      </Text>
    </View>
  )
}

function LinhaSaldo({ rotulo, valor, destaque }: { rotulo: string; valor: number; destaque?: boolean }) {
  const { colors, typography } = partnerDesign
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 4 }}>
      <Text style={{ flex: 1, color: destaque ? colors.ink : colors.inkMuted, fontWeight: destaque ? '800' : '500' }}>
        {rotulo}
      </Text>
      <Text style={{ color: colors.ink, fontSize: typography.bodyLg.size, fontWeight: destaque ? '800' : '600' }}>
        {formatarReais(valor)}
      </Text>
    </View>
  )
}
