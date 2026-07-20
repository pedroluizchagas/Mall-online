import { useCallback, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useFocusEffect } from 'expo-router'
import { formatarReais, assinaturaEmAtraso } from '@mallevo/lib'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import {
  alterarSenha,
  atualizarDadosPessoais,
  getResumoAssinatura,
  type ResumoAssinatura,
} from '@/lib/operacao'
import { BotaoPrimario, CabecalhoTela, CampoTexto, Cartao, Legenda } from '@/components/Basicos'
import { SeletorLoja } from '@/components/SeletorLoja'
import { PartnerIcon } from '@/components/PartnerIcon'
import { abrirNoDashboard } from '@/lib/links'
import { partnerDesign, softColor } from '@/lib/partner-design'

// Minha conta — dados do responsável, senha, assinatura (gestão no
// Customer Portal via Dashboard — decisão Stage 5), loja ativa e sair.
// docs/partner-app/08 §7.

const ROTULO_BILLING: Record<string, string> = {
  trial: 'Período de teste',
  ativa: 'Ativa',
  em_atraso: 'Pagamento em atraso',
  cancelada: 'Cancelada',
}

export default function TelaMinhaConta() {
  const { tenant, user } = useAuthStore()
  const [nome, setNome] = useState(tenant?.nome_responsavel ?? '')
  const [telefone, setTelefone] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [assinatura, setAssinatura] = useState<ResumoAssinatura | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState<string | null>(null)
  const { colors, radius, spacing, typography } = partnerDesign

  const carregar = useCallback(async () => {
    setCarregando(true)
    const [{ data: t }, ass] = await Promise.all([
      supabase.from('tenants').select('nome_responsavel, telefone').single(),
      getResumoAssinatura(),
    ])
    if (t) {
      setNome(t.nome_responsavel)
      setTelefone(t.telefone ?? '')
    }
    setAssinatura(ass)
    setCarregando(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      void carregar()
    }, [carregar])
  )

  async function salvarDados() {
    if (!tenant || salvando) return
    setSalvando('dados')
    const r = await atualizarDadosPessoais(tenant.id, { nome, telefone })
    setSalvando(null)
    if (r.erro) Alert.alert('Não foi possível salvar', r.erro)
    else Alert.alert('Dados atualizados')
  }

  async function salvarSenha() {
    if (salvando) return
    setSalvando('senha')
    const r = await alterarSenha(novaSenha, confirmacao)
    setSalvando(null)
    if (r.erro) {
      Alert.alert('Não foi possível alterar', r.erro)
      return
    }
    setNovaSenha('')
    setConfirmacao('')
    Alert.alert('Senha alterada')
  }

  function handleSair() {
    Alert.alert('Sair da conta', 'Você precisará entrar de novo para usar o app.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void supabase.auth.signOut() },
    ])
  }

  const emAtraso = assinaturaEmAtraso(assinatura?.billing_status)

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void carregar()} />}
          contentContainerStyle={{ paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: 64 }}
        >
          <CabecalhoTela titulo="Minha conta" />

          {/* Loja ativa */}
          <Legenda>Loja ativa</Legenda>
          <View style={{ marginBottom: spacing.xl }}>
            <SeletorLoja />
          </View>

          {/* Assinatura */}
          <Legenda>Assinatura</Legenda>
          <Cartao>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.ink, fontWeight: '800', fontSize: typography.bodyLg.size }}>
                  {assinatura?.plano?.nome ?? 'Plano'}
                </Text>
                <Text style={{ color: colors.inkMuted, fontSize: typography.bodySm.size }}>
                  {assinatura?.plano ? `${formatarReais(assinatura.plano.preco_mensal)}/mês` : '—'}
                  {assinatura?.periodo_fim
                    ? ` · renova ${new Date(assinatura.periodo_fim).toLocaleDateString('pt-BR')}`
                    : ''}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: softColor(emAtraso ? colors.warning : colors.success),
                  borderRadius: radius.pill,
                  paddingVertical: 4,
                  paddingHorizontal: 12,
                }}
              >
                <Text style={{ color: colors.ink, fontSize: typography.micro.size, fontWeight: '800' }}>
                  {ROTULO_BILLING[assinatura?.billing_status ?? ''] ?? assinatura?.billing_status ?? '—'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => abrirNoDashboard('/minha-conta?aba=assinatura')}
              activeOpacity={0.7}
            >
              <Text style={{ color: colors.inkMuted, fontSize: typography.bodySm.size, textDecorationLine: 'underline' }}>
                Gerenciar assinatura, faturas e cartão no Dashboard
              </Text>
            </TouchableOpacity>
          </Cartao>

          {/* Dados pessoais */}
          <Legenda>Dados do responsável</Legenda>
          <Cartao>
            <CampoTexto rotulo="Nome" valor={nome} aoMudar={setNome} />
            <CampoTexto rotulo="Telefone" valor={telefone} aoMudar={setTelefone} teclado="numeric" />
            <Text style={{ color: colors.inkSoft, fontSize: typography.bodySm.size, marginBottom: spacing.md }}>
              Email de acesso: {user?.email ?? tenant?.email ?? '—'}
            </Text>
            <BotaoPrimario rotulo="Salvar dados" carregando={salvando === 'dados'} onPress={() => void salvarDados()} />
          </Cartao>

          {/* Senha */}
          <Legenda>Alterar senha</Legenda>
          <Cartao>
            <CampoTexto rotulo="Nova senha" valor={novaSenha} aoMudar={setNovaSenha} placeholder="Mínimo 8 caracteres" />
            <CampoTexto rotulo="Confirmar nova senha" valor={confirmacao} aoMudar={setConfirmacao} />
            <BotaoPrimario rotulo="Alterar senha" carregando={salvando === 'senha'} onPress={() => void salvarSenha()} />
          </Cartao>

          {/* Sair */}
          <TouchableOpacity
            onPress={handleSair}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              height: 52,
            }}
          >
            <PartnerIcon name="logout" size={18} color={colors.danger} />
            <Text style={{ color: colors.danger, fontWeight: '800', fontSize: typography.bodyLg.size }}>
              Sair da conta
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
