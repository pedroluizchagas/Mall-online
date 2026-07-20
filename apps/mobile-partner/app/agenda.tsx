import { useCallback, useMemo, useState } from 'react'
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useFocusEffect } from 'expo-router'
import { formatarReais } from '@mallevo/lib'
import { useAuthStore } from '@/store/useAuthStore'
import {
  excluirBloqueio,
  listarAgenda,
  type AgendaCarregada,
} from '@/lib/agenda'
import { CabecalhoTela, Cartao, Legenda } from '@/components/Basicos'
import { PartnerIcon } from '@/components/PartnerIcon'
import { partnerDesign, softColor } from '@/lib/partner-design'

// Agenda — espelho compacto da /agenda do Dashboard (semana): agendamentos
// (orders tipo=agendamento), bloqueios e staff. Criação de bloqueio com
// data/hora livre fica no Dashboard (CTA) — excluir funciona aqui.
// docs/partner-app/08 §5.

const DIA_MS = 24 * 60 * 60 * 1000

function inicioDaSemana(base: Date): Date {
  const d = new Date(base)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay()) // domingo
  return d
}

export default function TelaAgenda() {
  const { lojaAtivaId } = useAuthStore()
  const [semana, setSemana] = useState(() => inicioDaSemana(new Date()))
  const [dados, setDados] = useState<AgendaCarregada | null>(null)
  const [carregando, setCarregando] = useState(false)
  const { colors, radius, spacing, typography } = partnerDesign

  const carregar = useCallback(async () => {
    if (!lojaAtivaId) return
    setCarregando(true)
    setDados(await listarAgenda(lojaAtivaId, semana))
    setCarregando(false)
  }, [lojaAtivaId, semana])

  useFocusEffect(
    useCallback(() => {
      void carregar()
    }, [carregar])
  )

  const dias = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dia = new Date(semana.getTime() + i * DIA_MS)
      const doDia = (dados?.agendamentos ?? []).filter((a) => {
        const t = new Date(a.inicio_at)
        return t >= dia && t < new Date(dia.getTime() + DIA_MS)
      })
      const bloqueiosDoDia = (dados?.bloqueios ?? []).filter((b) => {
        const t = new Date(b.inicio_at)
        return t >= dia && t < new Date(dia.getTime() + DIA_MS)
      })
      return { dia, agendamentos: doDia, bloqueios: bloqueiosDoDia }
    })
  }, [semana, dados])

  const rotuloSemana = `${semana.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${new Date(
    semana.getTime() + 6 * DIA_MS
  ).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`

  function nomeStaff(staffId: string | null): string | null {
    if (!staffId) return null
    return dados?.staff.find((s) => s.id === staffId)?.nome ?? null
  }

  function handleExcluirBloqueio(id: string) {
    Alert.alert('Remover bloqueio', 'O horário volta a ficar disponível.', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          const r = await excluirBloqueio(id)
          if (r.erro) Alert.alert('Não foi possível remover', r.erro)
          void carregar()
        },
      },
    ])
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void carregar()} />}
        contentContainerStyle={{ paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: 64 }}
      >
        <CabecalhoTela titulo="Agenda" />

        {/* Navegação de semana */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            padding: spacing.sm,
            marginBottom: spacing.lg,
          }}
        >
          <TouchableOpacity
            onPress={() => setSemana(new Date(semana.getTime() - 7 * DIA_MS))}
            activeOpacity={0.7}
            style={{ padding: 10 }}
          >
            <PartnerIcon name="back" size={16} color={colors.ink} strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', color: colors.ink, fontWeight: '800' }}>
            {rotuloSemana}
          </Text>
          <TouchableOpacity
            onPress={() => setSemana(new Date(semana.getTime() + 7 * DIA_MS))}
            activeOpacity={0.7}
            style={{ padding: 10, transform: [{ scaleX: -1 }] }}
          >
            <PartnerIcon name="back" size={16} color={colors.ink} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {dados?.erro ? (
          <Text style={{ color: colors.danger, marginBottom: spacing.md }}>{dados.erro}</Text>
        ) : null}

        {dias.map(({ dia, agendamentos, bloqueios }) => {
          if (agendamentos.length === 0 && bloqueios.length === 0) return null
          return (
            <View key={dia.toISOString()}>
              <Legenda>
                {dia.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}
              </Legenda>
              <Cartao semPadding>
                {agendamentos.map((a, i) => (
                  <View
                    key={a.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      paddingHorizontal: spacing.lg,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: colors.line,
                      gap: spacing.md,
                    }}
                  >
                    <Text style={{ width: 46, color: colors.ink, fontWeight: '800' }}>
                      {new Date(a.inicio_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.ink, fontWeight: '600' }}>
                        {a.consumer_nome ?? 'Cliente'}
                      </Text>
                      <Text style={{ color: colors.inkSoft, fontSize: typography.bodySm.size }}>
                        {nomeStaff(a.staff_id) ?? 'Sem profissional'} · {a.status}
                      </Text>
                    </View>
                    <Text style={{ color: colors.ink, fontWeight: '700', fontSize: typography.bodySm.size }}>
                      {formatarReais(a.total)}
                    </Text>
                  </View>
                ))}
                {bloqueios.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    onLongPress={() => handleExcluirBloqueio(b.id)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      paddingHorizontal: spacing.lg,
                      borderTopWidth: 1,
                      borderTopColor: colors.line,
                      backgroundColor: softColor(colors.warning),
                      gap: spacing.md,
                    }}
                  >
                    <Text style={{ width: 46, color: colors.ink, fontWeight: '800' }}>
                      {new Date(b.inicio_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.ink, fontWeight: '600' }}>
                        Bloqueio{b.motivo ? ` — ${b.motivo}` : ''}
                      </Text>
                      <Text style={{ color: colors.inkMuted, fontSize: typography.micro.size }}>
                        até {new Date(b.fim_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · segure para remover
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </Cartao>
            </View>
          )
        })}

        {dias.every((d) => d.agendamentos.length === 0 && d.bloqueios.length === 0) && !carregando && (
          <Text style={{ color: colors.inkSoft, textAlign: 'center', marginTop: spacing['3xl'] }}>
            Nenhum agendamento nesta semana.
          </Text>
        )}
      </ScrollView>
    </View>
  )
}
