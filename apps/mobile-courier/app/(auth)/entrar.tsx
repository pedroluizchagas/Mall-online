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
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { CourierIcon } from '@/components/CourierIcon'
import { courierDesign } from '@/lib/courier-design'

export default function TelaEntrar() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [senhaVisivel, setSenhaVisivel] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [focadoEmail, setFocadoEmail] = useState(false)
  const [focadoSenha, setFocadoSenha] = useState(false)
  const { colors, radius } = courierDesign

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.surfaceDark }}
    >
      <StatusBar barStyle="light-content" />

      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 24 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.pill,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 32,
            }}
          >
            <CourierIcon name="package" size={24} color={colors.accent} />
          </View>

          <Text
            style={{
              fontSize: 30,
              fontWeight: '800',
              color: colors.white,
              marginBottom: 10,
              letterSpacing: -0.5,
            }}
          >
            Entrar como{'\n'}entregador
          </Text>
          <Text style={{ fontSize: 15, color: '#A4A7AD', lineHeight: 22 }}>
            Acesse sua conta com email e senha.
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
              <CourierIcon
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
            onPress={() => router.push('/(auth)/cadastro/credenciais')}
            activeOpacity={0.7}
            style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 15, color: '#A4A7AD' }}>
              Não tem conta?{' '}
              <Text style={{ color: colors.accent, fontWeight: '700' }}>
                Criar conta
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
