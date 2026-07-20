import { useCallback, useState } from 'react'
import { Alert, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useFocusEffect } from 'expo-router'
import { listarAvaliacoes, responderAvaliacao, type Avaliacao } from '@/lib/operacao'
import { CabecalhoTela, Chip } from '@/components/Basicos'
import { PartnerIcon } from '@/components/PartnerIcon'
import { partnerDesign, softColor, formatarMomentoCurto } from '@/lib/partner-design'

// Avaliações — listar e responder (mesma mutação do Dashboard: só uma
// resposta, gravada com respondida_em). docs/partner-app/08 §2.

type Filtro = 'todas' | 'sem_resposta'

export default function TelaAvaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [carregando, setCarregando] = useState(false)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [respondendo, setRespondendo] = useState<string | null>(null)
  const [resposta, setResposta] = useState('')
  const [salvando, setSalvando] = useState(false)
  const { colors, radius, spacing, typography } = partnerDesign

  const carregar = useCallback(async () => {
    setCarregando(true)
    setAvaliacoes(await listarAvaliacoes())
    setCarregando(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      void carregar()
    }, [carregar])
  )

  const filtradas =
    filtro === 'sem_resposta' ? avaliacoes.filter((a) => !a.respondida_em) : avaliacoes

  const media =
    avaliacoes.length > 0
      ? (avaliacoes.reduce((s, a) => s + a.estrelas_loja, 0) / avaliacoes.length).toFixed(1)
      : null

  async function handleResponder(id: string) {
    if (salvando) return
    setSalvando(true)
    const r = await responderAvaliacao(id, resposta)
    setSalvando(false)
    if (r.erro) {
      Alert.alert('Não foi possível responder', r.erro)
      return
    }
    setRespondendo(null)
    setResposta('')
    void carregar()
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void carregar()} />}
        contentContainerStyle={{ paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: 64 }}
      >
        <CabecalhoTela titulo="Avaliações">
          {media && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surface,
                borderRadius: radius.pill,
                paddingVertical: 8,
                paddingHorizontal: 12,
                gap: 4,
              }}
            >
              <PartnerIcon name="star" size={14} color={colors.warning} strokeWidth={2.2} />
              <Text style={{ color: colors.ink, fontWeight: '800' }}>{media}</Text>
            </View>
          )}
        </CabecalhoTela>

        <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
          <Chip rotulo="Todas" ativo={filtro === 'todas'} onPress={() => setFiltro('todas')} />
          <Chip rotulo="Sem resposta" ativo={filtro === 'sem_resposta'} onPress={() => setFiltro('sem_resposta')} />
        </View>

        {filtradas.length === 0 && !carregando ? (
          <Text style={{ color: colors.inkSoft, textAlign: 'center', marginTop: spacing['3xl'] }}>
            Nenhuma avaliação {filtro === 'sem_resposta' ? 'pendente' : 'ainda'}.
          </Text>
        ) : (
          filtradas.map((a) => (
            <View
              key={a.id}
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                padding: spacing.lg,
                marginBottom: spacing.sm,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ flex: 1, color: colors.ink, fontWeight: '700' }}>
                  {a.consumers?.nome ?? 'Cliente'}
                </Text>
                <Estrelas nota={a.estrelas_loja} />
              </View>
              {a.comentario ? (
                <Text style={{ color: colors.inkMuted, fontSize: typography.body.size, marginBottom: 8 }}>
                  {a.comentario}
                </Text>
              ) : null}
              <Text style={{ color: colors.inkSoft, fontSize: typography.micro.size, marginBottom: 8 }}>
                {formatarMomentoCurto(a.criada_em)}
                {a.estrelas_entrega ? ` · entrega ${a.estrelas_entrega}★` : ''}
              </Text>

              {a.resposta_lojista ? (
                <View
                  style={{
                    backgroundColor: colors.surfaceMuted,
                    borderRadius: radius.sm,
                    padding: spacing.md,
                  }}
                >
                  <Text style={{ color: colors.inkSoft, fontSize: typography.micro.size, fontWeight: '700', textTransform: 'uppercase', marginBottom: 3 }}>
                    Sua resposta
                  </Text>
                  <Text style={{ color: colors.ink, fontSize: typography.bodySm.size }}>
                    {a.resposta_lojista}
                  </Text>
                </View>
              ) : respondendo === a.id ? (
                <View>
                  <TextInput
                    value={resposta}
                    onChangeText={setResposta}
                    placeholder="Escreva sua resposta…"
                    placeholderTextColor={colors.inkSoft}
                    multiline
                    autoFocus
                    style={{
                      backgroundColor: colors.surfaceMuted,
                      borderRadius: radius.sm,
                      padding: spacing.md,
                      minHeight: 70,
                      textAlignVertical: 'top',
                      color: colors.ink,
                      fontSize: typography.body.size,
                      marginBottom: spacing.sm,
                    }}
                  />
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <TouchableOpacity
                      onPress={() => { setRespondendo(null); setResposta('') }}
                      activeOpacity={0.7}
                      style={{ flex: 1, height: 44, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ color: colors.inkMuted, fontWeight: '700' }}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => void handleResponder(a.id)}
                      disabled={salvando}
                      activeOpacity={0.85}
                      style={{ flex: 1, height: 44, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ color: colors.ink, fontWeight: '800' }}>Responder</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setRespondendo(a.id)}
                  activeOpacity={0.7}
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: softColor(colors.info),
                    borderRadius: radius.pill,
                    paddingVertical: 7,
                    paddingHorizontal: 14,
                  }}
                >
                  <Text style={{ color: colors.ink, fontWeight: '700', fontSize: typography.bodySm.size }}>
                    Responder
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}

function Estrelas({ nota }: { nota: number }) {
  const { colors } = partnerDesign
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <PartnerIcon
          key={n}
          name="star"
          size={14}
          color={n <= nota ? colors.warning : colors.line}
          strokeWidth={2.2}
        />
      ))}
    </View>
  )
}
