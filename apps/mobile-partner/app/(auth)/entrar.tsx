import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { abrirNoDashboard } from '@/lib/links'
import { PartnerIcon } from '@/components/PartnerIcon'
import { partnerDesign } from '@/lib/partner-design'

// Espelha apps/mobile-courier/app/(auth)/entrar.tsx — mesmo lojista do
// Dashboard; sem cadastro no app (onboarding é web).
// docs/partner-app/04-stage-2-auth-gate.md

export default function TelaEntrar() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [senhaVisivel, setSenhaVisivel] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [focadoEmail, setFocadoEmail] = useState(false)
  const [focadoSenha, setFocadoSenha] = useState(false)
  const { colors, radius } = partnerDesign

  async function handleEntrar() {
    if (!email.trim()) { setErro('Digite seu email.'); return }
    if (!senha) { setErro('Digite sua senha.'); return }

    setCarregando(true)
    setErro(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    })

    setCarregando(false)

    if (error) {
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        setErro('Email ou senha incorretos.')
      } else {
        setErro('Não foi possível entrar. Tente novamente.')
      }
    }
    // Sucesso: onAuthStateChange no _layout.tsx cuida da navegação
  }

  function inputStyle(focado: boolean) {
    return {
      height: 54,
      borderRadius: radius.md,
      paddingHorizontal: 18,
      fontSize: 16,
      color: colors.white,
      backgroundColor: colors.surfaceDarkSoft,
      borderWidth: 1.5,
      borderColor: focado ? colors.accent : colors.lineDark,
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceDark }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <StatusBar barStyle="light-content" />

        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 24 }}>
            <Image
              source={require('../../assets/logoGreen.png')}
              resizeMode="contain"
              style={{ width: 220, height: 35, marginBottom: 28 }}
            />

            <Text
              style={{
                fontSize: 30,
                fontWeight: '800',
                color: colors.white,
                marginBottom: 10,
                letterSpacing: -0.5,
              }}
            >
              Entrar como{'\n'}lojista
            </Text>
            <Text style={{ fontSize: 15, color: '#A4A7AD', lineHeight: 22 }}>
              Use o mesmo email e senha do Dashboard.
            </Text>
          </View>

          <View style={{ paddingBottom: 48 }}>
            <Text style={labelStyle}>Email</Text>
            <TextInput
              value={email}
              onChangeText={(t) => { setEmail(t); setErro(null) }}
              onFocus={() => setFocadoEmail(true)}
              onBlur={() => setFocadoEmail(false)}
              placeholder="seu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={colors.inkSoft}
              style={[inputStyle(focadoEmail), { marginBottom: 12 }]}
            />

            <Text style={labelStyle}>Senha</Text>
            <View style={{ position: 'relative', marginBottom: 12 }}>
              <TextInput
                value={senha}
                onChangeText={(t) => { setSenha(t); setErro(null) }}
                onFocus={() => setFocadoSenha(true)}
                onBlur={() => setFocadoSenha(false)}
                placeholder="Sua senha"
                secureTextEntry={!senhaVisivel}
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={colors.inkSoft}
                style={[inputStyle(focadoSenha), { paddingRight: 52 }]}
              />
              <TouchableOpacity
                onPress={() => setSenhaVisivel(!senhaVisivel)}
                style={{
                  position: 'absolute',
                  right: 16,
                  top: 0,
                  bottom: 0,
                  justifyContent: 'center',
                }}
                activeOpacity={0.7}
              >
                <PartnerIcon
                  name={senhaVisivel ? 'eye-off' : 'eye'}
                  size={20}
                  color={colors.inkSoft}
                />
              </TouchableOpacity>
            </View>

            {erro && (
              <Text
                style={{
                  color: colors.danger,
                  fontSize: 13,
                  marginBottom: 12,
                  marginTop: -4,
                }}
              >
                {erro}
              </Text>
            )}

            <TouchableOpacity
              onPress={handleEntrar}
              disabled={carregando}
              activeOpacity={0.85}
              style={{
                height: 56,
                borderRadius: radius.pill,
                backgroundColor: carregando ? colors.accentStrong : colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              {carregando ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <Text
                  style={{
                    color: colors.ink,
                    fontWeight: '800',
                    fontSize: 16,
                    letterSpacing: 0.2,
                  }}
                >
                  Entrar
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => abrirNoDashboard('/onboarding')}
              activeOpacity={0.7}
              style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 15, color: '#A4A7AD' }}>
                Não tem conta?{' '}
                <Text style={{ color: colors.accent, fontWeight: '700' }}>
                  Cadastre sua loja
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const labelStyle = {
  fontSize: 13,
  fontWeight: '600' as const,
  color: '#A4A7AD',
  marginBottom: 8,
  letterSpacing: 0.4,
  textTransform: 'uppercase' as const,
}
