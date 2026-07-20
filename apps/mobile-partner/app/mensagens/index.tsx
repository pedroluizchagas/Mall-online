import { useCallback, useState } from 'react'
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { router, useFocusEffect } from 'expo-router'
import { listarThreads, type Thread } from '@/lib/operacao'
import { CabecalhoTela } from '@/components/Basicos'
import { partnerDesign, formatarMomentoCurto } from '@/lib/partner-design'

// Mensagens — threads de conversa com clientes (message_threads).
// docs/partner-app/08 §3.

export default function TelaMensagens() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [carregando, setCarregando] = useState(false)
  const { colors, radius, spacing, typography } = partnerDesign

  const carregar = useCallback(async () => {
    setCarregando(true)
    setThreads(await listarThreads())
    setCarregando(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      void carregar()
    }, [carregar])
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void carregar()} />}
        contentContainerStyle={{ paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: 64 }}
      >
        <CabecalhoTela titulo="Mensagens" />

        {threads.length === 0 && !carregando ? (
          <Text style={{ color: colors.inkSoft, textAlign: 'center', marginTop: spacing['3xl'] }}>
            Nenhuma conversa ainda. Quando um cliente enviar mensagem, ela aparece aqui.
          </Text>
        ) : (
          threads.map((t) => (
            <TouchableOpacity
              key={t.id}
              activeOpacity={0.7}
              onPress={() => router.push(`/mensagens/${t.id}`)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                padding: spacing.lg,
                marginBottom: spacing.sm,
                gap: spacing.md,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: radius.pill,
                  backgroundColor: colors.ink,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 16 }}>
                  {(t.consumers?.nome ?? 'C').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.ink, fontWeight: '700', fontSize: typography.bodyLg.size }}>
                  {t.consumers?.nome ?? 'Cliente'}
                </Text>
                <Text style={{ color: colors.inkSoft, fontSize: typography.bodySm.size }}>
                  {formatarMomentoCurto(t.ultima_em)}
                  {t.order_id ? ' · sobre um pedido' : ''}
                </Text>
              </View>
              {t.nao_lidas_lojista > 0 && (
                <View
                  style={{
                    minWidth: 22,
                    height: 22,
                    borderRadius: radius.pill,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 6,
                  }}
                >
                  <Text style={{ color: colors.ink, fontWeight: '800', fontSize: typography.bodySm.size }}>
                    {t.nao_lidas_lojista}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  )
}
