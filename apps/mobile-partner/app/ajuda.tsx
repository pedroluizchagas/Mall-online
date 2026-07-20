import { useCallback, useState } from 'react'
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useFocusEffect } from 'expo-router'
import { useAuthStore } from '@/store/useAuthStore'
import { abrirTicket, listarTickets, type Ticket } from '@/lib/operacao'
import { BotaoPrimario, CabecalhoTela, CampoTexto, Cartao, Legenda } from '@/components/Basicos'
import { partnerDesign, softColor, formatarMomentoCurto } from '@/lib/partner-design'

// Ajuda — abrir e acompanhar chamados (support_tickets), mesmo fluxo do
// Dashboard. docs/partner-app/08 §8.

const ROTULO_STATUS: Record<string, { rotulo: string; corKey: 'warning' | 'success' | 'info' }> = {
  aberta: { rotulo: 'Aberto', corKey: 'info' },
  aberto: { rotulo: 'Aberto', corKey: 'info' },
  em_andamento: { rotulo: 'Em andamento', corKey: 'warning' },
  resolvida: { rotulo: 'Resolvido', corKey: 'success' },
  resolvido: { rotulo: 'Resolvido', corKey: 'success' },
}

export default function TelaAjuda() {
  const { tenant } = useAuthStore()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [carregando, setCarregando] = useState(false)
  const [novoAberto, setNovoAberto] = useState(false)
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [salvando, setSalvando] = useState(false)
  const { colors, radius, spacing, typography } = partnerDesign

  const carregar = useCallback(async () => {
    setCarregando(true)
    setTickets(await listarTickets())
    setCarregando(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      void carregar()
    }, [carregar])
  )

  async function handleAbrir() {
    if (!tenant || salvando) return
    setSalvando(true)
    const r = await abrirTicket(tenant.id, { assunto, mensagem })
    setSalvando(false)
    if (r.erro) {
      Alert.alert('Não foi possível abrir o chamado', r.erro)
      return
    }
    setAssunto('')
    setMensagem('')
    setNovoAberto(false)
    void carregar()
    Alert.alert('Chamado aberto', 'Nossa equipe vai responder em breve.')
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void carregar()} />}
        contentContainerStyle={{ paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: 64 }}
      >
        <CabecalhoTela titulo="Ajuda" />

        {novoAberto ? (
          <>
            <Legenda>Novo chamado</Legenda>
            <Cartao>
              <CampoTexto rotulo="Assunto" valor={assunto} aoMudar={setAssunto} placeholder="Ex.: problema com repasse" />
              <CampoTexto rotulo="Descreva o problema" valor={mensagem} aoMudar={setMensagem} multiline placeholder="Quanto mais detalhes, mais rápido resolvemos." />
              <BotaoPrimario rotulo="Abrir chamado" onPress={() => void handleAbrir()} carregando={salvando} />
              <TouchableOpacity onPress={() => setNovoAberto(false)} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 8 }}>
                <Text style={{ color: colors.inkMuted, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
            </Cartao>
          </>
        ) : (
          <View style={{ marginBottom: spacing.lg }}>
            <BotaoPrimario rotulo="Abrir novo chamado" onPress={() => setNovoAberto(true)} />
          </View>
        )}

        <Legenda>Seus chamados</Legenda>
        {tickets.length === 0 && !carregando ? (
          <Text style={{ color: colors.inkSoft, textAlign: 'center', marginTop: spacing.xl }}>
            Nenhum chamado ainda.
          </Text>
        ) : (
          tickets.map((t) => {
            const meta = ROTULO_STATUS[t.status] ?? { rotulo: t.status, corKey: 'info' as const }
            return (
              <View
                key={t.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius.md,
                  padding: spacing.lg,
                  marginBottom: spacing.sm,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ flex: 1, color: colors.ink, fontWeight: '700' }}>{t.assunto}</Text>
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
                <Text numberOfLines={2} style={{ color: colors.inkMuted, fontSize: typography.bodySm.size, marginBottom: 4 }}>
                  {t.mensagem}
                </Text>
                <Text style={{ color: colors.inkSoft, fontSize: typography.micro.size }}>
                  {formatarMomentoCurto(t.atualizada_em)}
                </Text>
              </View>
            )
          })
        )}
      </ScrollView>
    </View>
  )
}
