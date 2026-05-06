import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { CourierIcon } from '@/components/CourierIcon'
import { courierDesign } from '@/lib/courier-design'

type MetodoRecebimento = 'pix' | 'conta'
type TipoChavePix = 'cpf' | 'email' | 'telefone' | 'evp'
type TipoConta = 'checking' | 'savings'

const REQUISITOS = [
  { icon: 'user'  as const, label: 'CPF e dados pessoais' },
  { icon: 'cash'  as const, label: 'Conta bancária ou chave PIX' },
  { icon: 'phone' as const, label: 'Documento com foto para validação (KYC)' },
]

export default function TelaPagarmeOnboarding() {
  const { courier, setCourier } = useAuthStore()
  const [metodo, setMetodo] = useState<MetodoRecebimento>('pix')

  const [tipoChave, setTipoChave] = useState<TipoChavePix>('cpf')
  const [chavePix, setChavePix] = useState('')

  const [banco, setBanco] = useState('')
  const [agencia, setAgencia] = useState('')
  const [conta, setConta] = useState('')
  const [digito, setDigito] = useState('')
  const [tipoConta, setTipoConta] = useState<TipoConta>('checking')

  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const { colors, radius } = courierDesign

  function montarDadosBancarios() {
    if (metodo === 'pix') {
      return {
        tipo: 'pix' as const,
        tipo_chave: tipoChave,
        chave_pix: chavePix.trim(),
      }
    }
    return {
      tipo: 'conta' as const,
      banco: banco.trim(),
      agencia: agencia.trim(),
      conta: conta.trim(),
      digito: digito.trim(),
      tipo_conta: tipoConta,
    }
  }

  function validar(): string | null {
    if (metodo === 'pix') {
      if (!chavePix.trim()) return 'Informe a chave PIX.'
      return null
    }
    if (!banco.trim()) return 'Informe o código do banco.'
    if (!agencia.trim()) return 'Informe a agência.'
    if (!conta.trim()) return 'Informe o número da conta.'
    if (!digito.trim()) return 'Informe o dígito da conta.'
    return null
  }

  async function pollStatus(): Promise<boolean> {
    if (!courier?.id) return false

    for (let i = 0; i < 3; i++) {
      const { data } = await supabase
        .from('couriers')
        .select('pagarme_recipient_id, pagarme_onboarding_status')
        .eq('id', courier.id)
        .single()

      if (data) {
        setCourier({
          ...courier,
          pagarme_recipient_id: data.pagarme_recipient_id,
          pagarme_onboarding_status: data.pagarme_onboarding_status,
        })
        if (data.pagarme_onboarding_status === 'active') return true
      }

      if (i < 2) await new Promise((r) => setTimeout(r, 1500))
    }
    return false
  }

  async function handleIniciarOnboarding() {
    const erroValidacao = validar()
    if (erroValidacao) { setErro(erroValidacao); return }

    setCarregando(true)
    setErro(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setErro('Sessão expirada. Faça login novamente.')
      setCarregando(false)
      return
    }

    const resposta = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/onboard-courier`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ dados_bancarios: montarDadosBancarios() }),
      }
    )

    const resultado = await resposta.json()

    if (!resposta.ok) {
      setCarregando(false)
      setErro(resultado.error ?? resultado.erro ?? 'Erro ao iniciar configuração.')
      return
    }

    if (!resultado.kyc_link) {
      setCarregando(false)
      setErro('Link de verificação não disponível. Tente novamente em instantes.')
      return
    }

    await WebBrowser.openAuthSessionAsync(resultado.kyc_link)

    const ativou = await pollStatus()
    setCarregando(false)

    if (ativou) {
      router.back()
    } else {
      setErro(
        'Recebemos seus dados. A validação de identidade pode levar alguns minutos — '
        + 'avisaremos assim que sua conta estiver ativa.'
      )
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.surfaceDark }}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 52 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <StatusBar barStyle="light-content" />

        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{ marginBottom: 36 }}
        >
          <CourierIcon name="back" size={24} color={colors.white} />
        </TouchableOpacity>

        <View style={{
          width: 68,
          height: 68,
          borderRadius: radius.lg,
          backgroundColor: colors.surfaceDarkSoft,
          borderWidth: 1,
          borderColor: colors.lineDark,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}>
          <CourierIcon name="wallet" size={30} color={colors.accent} strokeWidth={1.6} />
        </View>

        <Text style={{
          fontSize: 30,
          fontWeight: '800',
          color: colors.white,
          letterSpacing: -0.6,
          lineHeight: 36,
          marginBottom: 12,
        }}>
          Configure seus{'\n'}recebimentos
        </Text>
        <Text style={{
          fontSize: 15,
          color: colors.inkSoft,
          lineHeight: 24,
          marginBottom: 28,
        }}>
          Para receber seus pagamentos, configure sua conta bancária via Pagar.me. O processo é rápido e seguro.
        </Text>

        <View style={{
          backgroundColor: colors.surfaceDarkSoft,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.lineDark,
          padding: 20,
          marginBottom: 24,
        }}>
          <Text style={{
            fontSize: 11,
            fontWeight: '700',
            color: colors.inkSoft,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            O que você vai precisar
          </Text>

          {REQUISITOS.map(({ icon, label }, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingVertical: 12,
                borderTopWidth: i > 0 ? 1 : 0,
                borderTopColor: colors.lineDark,
                marginTop: i === 0 ? 12 : 0,
              }}
            >
              <View style={{
                width: 34,
                height: 34,
                borderRadius: radius.sm,
                backgroundColor: colors.surfaceDark,
                borderWidth: 1,
                borderColor: colors.lineDark,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <CourierIcon name={icon} size={16} color={colors.inkSoft} strokeWidth={1.8} />
              </View>
              <Text style={{ fontSize: 14, color: colors.inkMuted, flex: 1 }}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        <Text style={labelStyle(colors)}>Forma de recebimento</Text>
        <View style={{
          flexDirection: 'row',
          gap: 8,
          marginBottom: 18,
        }}>
          <SegmentBotao
            ativo={metodo === 'pix'}
            label="PIX"
            onPress={() => setMetodo('pix')}
          />
          <SegmentBotao
            ativo={metodo === 'conta'}
            label="Conta bancária"
            onPress={() => setMetodo('conta')}
          />
        </View>

        {metodo === 'pix' ? (
          <>
            <Text style={labelStyle(colors)}>Tipo da chave</Text>
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 16,
            }}>
              {(['cpf', 'email', 'telefone', 'evp'] as TipoChavePix[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTipoChave(t)}
                  activeOpacity={0.8}
                  style={{
                    paddingHorizontal: 14,
                    height: 38,
                    borderRadius: radius.pill,
                    borderWidth: 1.5,
                    borderColor: tipoChave === t ? colors.accent : colors.lineDark,
                    backgroundColor: tipoChave === t ? colors.accent : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: tipoChave === t ? colors.ink : colors.inkSoft,
                    textTransform: 'uppercase',
                  }}>
                    {t === 'evp' ? 'Aleatória' : t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={labelStyle(colors)}>Chave PIX</Text>
            <CampoTexto
              valor={chavePix}
              onChange={(v) => { setChavePix(v); setErro(null) }}
              placeholder={
                tipoChave === 'cpf'      ? '000.000.000-00'
                : tipoChave === 'email'  ? 'seu@email.com'
                : tipoChave === 'telefone' ? '(00) 00000-0000'
                                          : 'Chave aleatória'
              }
              keyboardType={tipoChave === 'email' ? 'email-address' : 'default'}
              autoCapitalize={tipoChave === 'email' ? 'none' : 'sentences'}
            />
          </>
        ) : (
          <>
            <Text style={labelStyle(colors)}>Banco (código)</Text>
            <CampoTexto
              valor={banco}
              onChange={(v) => { setBanco(v); setErro(null) }}
              placeholder="Ex.: 341"
              keyboardType="numeric"
              maxLength={4}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1.2 }}>
                <Text style={labelStyle(colors)}>Agência</Text>
                <CampoTexto
                  valor={agencia}
                  onChange={(v) => { setAgencia(v); setErro(null) }}
                  placeholder="0000"
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              <View style={{ flex: 2 }}>
                <Text style={labelStyle(colors)}>Conta</Text>
                <CampoTexto
                  valor={conta}
                  onChange={(v) => { setConta(v); setErro(null) }}
                  placeholder="00000000"
                  keyboardType="numeric"
                  maxLength={12}
                />
              </View>
              <View style={{ flex: 0.7 }}>
                <Text style={labelStyle(colors)}>Dígito</Text>
                <CampoTexto
                  valor={digito}
                  onChange={(v) => { setDigito(v); setErro(null) }}
                  placeholder="0"
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
            </View>

            <Text style={labelStyle(colors)}>Tipo de conta</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
              <SegmentBotao
                ativo={tipoConta === 'checking'}
                label="Corrente"
                onPress={() => setTipoConta('checking')}
              />
              <SegmentBotao
                ativo={tipoConta === 'savings'}
                label="Poupança"
                onPress={() => setTipoConta('savings')}
              />
            </View>
          </>
        )}

        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: colors.surfaceDarkSoft,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.lineDark,
          paddingHorizontal: 16,
          paddingVertical: 13,
          marginBottom: 24,
        }}>
          <CourierIcon name="shield" size={15} color={colors.inkSoft} strokeWidth={1.8} />
          <Text style={{ fontSize: 13, color: colors.inkSoft, flex: 1, lineHeight: 19 }}>
            Seus dados bancários são armazenados com segurança pela Pagar.me. A plataforma não tem acesso.
          </Text>
        </View>

        {erro && (
          <View style={{
            backgroundColor: 'rgba(255,109,94,0.10)',
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: 'rgba(255,109,94,0.2)',
            paddingHorizontal: 14,
            paddingVertical: 11,
            marginBottom: 16,
          }}>
            <Text style={{ color: colors.danger, fontSize: 13, lineHeight: 19 }}>{erro}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleIniciarOnboarding}
          disabled={carregando}
          activeOpacity={0.85}
          style={{
            height: 56,
            borderRadius: radius.pill,
            backgroundColor: carregando ? colors.accentStrong : colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            opacity: carregando ? 0.8 : 1,
          }}
        >
          {carregando ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>
              Continuar para verificação
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function labelStyle(colors: typeof courierDesign.colors) {
  return {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.inkSoft,
    letterSpacing: 0.7,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  }
}

function SegmentBotao({
  ativo, label, onPress,
}: { ativo: boolean; label: string; onPress: () => void }) {
  const { colors, radius } = courierDesign
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        flex: 1,
        height: 46,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: ativo ? colors.accent : colors.lineDark,
        backgroundColor: ativo ? colors.accent : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{
        fontSize: 14,
        fontWeight: '700',
        color: ativo ? colors.ink : colors.inkSoft,
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

function CampoTexto({
  valor, onChange, placeholder, keyboardType = 'default', maxLength, autoCapitalize = 'sentences',
}: {
  valor: string
  onChange: (v: string) => void
  placeholder: string
  keyboardType?: 'default' | 'numeric' | 'email-address'
  maxLength?: number
  autoCapitalize?: 'none' | 'sentences'
}) {
  const { colors, radius } = courierDesign
  const [focado, setFocado] = useState(false)

  return (
    <TextInput
      value={valor}
      onChangeText={onChange}
      onFocus={() => setFocado(true)}
      onBlur={() => setFocado(false)}
      placeholder={placeholder}
      placeholderTextColor={colors.inkSoft}
      keyboardType={keyboardType}
      maxLength={maxLength}
      autoCapitalize={autoCapitalize}
      style={{
        height: 52,
        borderRadius: radius.md,
        paddingHorizontal: 16,
        fontSize: 15,
        color: colors.white,
        backgroundColor: colors.surfaceDarkSoft,
        borderWidth: 1.5,
        borderColor: focado ? colors.accent : colors.lineDark,
        marginBottom: 16,
      }}
    />
  )
}
