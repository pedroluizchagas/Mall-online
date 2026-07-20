import { useCallback, useState } from 'react'
import { Alert, Modal, Pressable, RefreshControl, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useFocusEffect } from 'expo-router'
import { useAuthStore } from '@/store/useAuthStore'
import {
  criarConvite,
  linkConvite,
  listarConvites,
  listarEntregadoresProprios,
  revogarConvite,
  type Convite,
  type EntregadorProprio,
} from '@/lib/operacao'
import { BotaoPrimario, CabecalhoTela, CampoTexto, Cartao, Legenda } from '@/components/Basicos'
import { PartnerIcon } from '@/components/PartnerIcon'
import { partnerDesign, softColor, formatarMomentoCurto } from '@/lib/partner-design'

// Entregadores próprios + convites (courier_invites; link {web}/convite/
// {token}, compartilhado via Share). Aprovação de cadastro segue no Admin.
// docs/partner-app/08 §4.

const ROTULO_STATUS: Record<string, { rotulo: string; corKey: 'warning' | 'success' | 'danger' }> = {
  pendente: { rotulo: 'Pendente', corKey: 'warning' },
  aprovado: { rotulo: 'Aprovado', corKey: 'success' },
  reprovado: { rotulo: 'Reprovado', corKey: 'danger' },
  suspenso: { rotulo: 'Suspenso', corKey: 'danger' },
}

export default function TelaEntregadores() {
  const { tenant } = useAuthStore()
  const [entregadores, setEntregadores] = useState<EntregadorProprio[]>([])
  const [convites, setConvites] = useState<Convite[]>([])
  const [carregando, setCarregando] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const { colors, radius, spacing, typography } = partnerDesign

  const carregar = useCallback(async () => {
    if (!tenant) return
    setCarregando(true)
    const [e, c] = await Promise.all([listarEntregadoresProprios(tenant.id), listarConvites()])
    setEntregadores(e)
    setConvites(c)
    setCarregando(false)
  }, [tenant?.id])

  useFocusEffect(
    useCallback(() => {
      void carregar()
    }, [carregar])
  )

  async function compartilhar(token: string, nome: string) {
    await Share.share({
      message: `Olá, ${nome}! Complete seu cadastro de entregador da nossa loja na Mallevo: ${linkConvite(token)}`,
    }).catch(() => {})
  }

  function handleRevogar(token: string) {
    Alert.alert('Revogar convite', 'O link deixará de funcionar.', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Revogar',
        style: 'destructive',
        onPress: async () => {
          const r = await revogarConvite(token)
          if (r.erro) Alert.alert('Não foi possível revogar', r.erro)
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
        <CabecalhoTela titulo="Entregadores">
          <TouchableOpacity
            onPress={() => setModalAberto(true)}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.accent,
              borderRadius: radius.pill,
              paddingVertical: 10,
              paddingHorizontal: 14,
              gap: 6,
            }}
          >
            <PartnerIcon name="plus" size={16} color={colors.ink} strokeWidth={2.4} />
            <Text style={{ color: colors.ink, fontWeight: '800', fontSize: typography.bodySm.size }}>
              Convidar
            </Text>
          </TouchableOpacity>
        </CabecalhoTela>

        <Legenda>Seus entregadores</Legenda>
        <Cartao semPadding>
          {entregadores.length === 0 ? (
            <Text style={{ color: colors.inkSoft, padding: spacing.lg }}>
              Nenhum entregador próprio ainda — convide pelo botão acima.
            </Text>
          ) : (
            entregadores.map((e, i) => {
              const meta = ROTULO_STATUS[e.status] ?? { rotulo: e.status, corKey: 'warning' as const }
              return (
                <View
                  key={e.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 11,
                    paddingHorizontal: spacing.lg,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: colors.line,
                    gap: spacing.md,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: radius.pill,
                      backgroundColor: colors.surfaceMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PartnerIcon name="bike" size={18} color={colors.inkMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.ink, fontWeight: '700' }}>{e.nome}</Text>
                    <Text style={{ color: colors.inkSoft, fontSize: typography.bodySm.size }}>
                      {e.telefone ?? 'sem telefone'}
                      {e.online ? ' · online' : ''}
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

        {convites.length > 0 && (
          <>
            <Legenda>Convites pendentes</Legenda>
            <Cartao semPadding>
              {convites.map((c, i) => (
                <View
                  key={c.token}
                  style={{
                    paddingVertical: 11,
                    paddingHorizontal: spacing.lg,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: colors.line,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.ink, fontWeight: '700' }}>{c.nome}</Text>
                      <Text style={{ color: colors.inkSoft, fontSize: typography.bodySm.size }}>
                        expira {formatarMomentoCurto(c.expira_em)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => void compartilhar(c.token, c.nome)}
                      activeOpacity={0.7}
                      style={{
                        backgroundColor: colors.accentSoft,
                        borderRadius: radius.pill,
                        paddingVertical: 7,
                        paddingHorizontal: 12,
                        marginRight: 8,
                      }}
                    >
                      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: typography.bodySm.size }}>
                        Enviar link
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleRevogar(c.token)} activeOpacity={0.7}>
                      <Text style={{ color: colors.danger, fontWeight: '700', fontSize: typography.bodySm.size }}>
                        Revogar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </Cartao>
          </>
        )}
      </ScrollView>

      <ModalConvite
        visivel={modalAberto}
        fechar={() => setModalAberto(false)}
        criado={(token, nome) => {
          setModalAberto(false)
          void carregar()
          void compartilhar(token, nome)
        }}
      />
    </View>
  )
}

function ModalConvite({
  visivel,
  fechar,
  criado,
}: {
  visivel: boolean
  fechar: () => void
  criado: (token: string, nome: string) => void
}) {
  const { tenant } = useAuthStore()
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [salvando, setSalvando] = useState(false)
  const { colors, radius, spacing, typography, opacity } = partnerDesign

  async function handleCriar() {
    if (!tenant || salvando) return
    setSalvando(true)
    const r = await criarConvite(tenant.id, { nome, telefone, email: email || undefined })
    setSalvando(false)
    if (r.erro || !r.token) {
      Alert.alert('Não foi possível gerar', r.erro ?? 'Erro desconhecido')
      return
    }
    setNome('')
    setTelefone('')
    setEmail('')
    criado(r.token, nome)
  }

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
      <Pressable
        onPress={fechar}
        style={{ flex: 1, backgroundColor: `rgba(17, 18, 22, ${opacity.overlay})`, justifyContent: 'flex-end' }}
      >
        <Pressable
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            padding: spacing.lg,
            paddingBottom: spacing['4xl'],
          }}
        >
          <Text style={{ color: colors.ink, fontSize: typography.h3.size, fontWeight: '700', marginBottom: 4 }}>
            Convidar entregador
          </Text>
          <Text style={{ color: colors.inkMuted, fontSize: typography.bodySm.size, marginBottom: spacing.md }}>
            Geramos um link com token — envie ao entregador para ele completar o cadastro.
          </Text>
          <CampoTexto rotulo="Nome" valor={nome} aoMudar={setNome} />
          <CampoTexto rotulo="Telefone" valor={telefone} aoMudar={setTelefone} teclado="numeric" placeholder="37 9…" />
          <CampoTexto rotulo="Email (opcional)" valor={email} aoMudar={setEmail} placeholder="email@exemplo.com" />
          <BotaoPrimario rotulo="Gerar e enviar link" onPress={() => void handleCriar()} carregando={salvando} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}
