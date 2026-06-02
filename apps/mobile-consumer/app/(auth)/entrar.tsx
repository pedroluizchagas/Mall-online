import { useState } from 'react'
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/components/ui/Botao'
import { Input } from '@/components/ui/Input'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'

const { colors, radius } = consumerDesign

type Modo = 'entrar' | 'cadastrar' | 'confirmar'

export default function TelaEntrar() {
  const insets = useSafeAreaInsets()
  const [modo, setModo] = useState<Modo>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function validar() {
    if (!email.trim()) return 'Digite seu email.'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return 'Email inválido.'
    if (!senha) return 'Digite sua senha.'
    if (modo === 'cadastrar' && senha.length < 6)
      return 'A senha deve ter pelo menos 6 caracteres.'
    return null
  }

  async function handleSubmit() {
    const erroValidacao = validar()
    if (erroValidacao) {
      setErro(erroValidacao)
      return
    }

    setCarregando(true)
    setErro(null)

    if (modo === 'cadastrar') {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: senha,
        options: { data: { role: 'consumer' } },
      })
      setCarregando(false)
      if (error) {
        setErro(
          error.message === 'User already registered'
            ? 'Este email já está cadastrado.'
            : 'Não foi possível criar a conta. Tente novamente.'
        )
        return
      }
      if (!data.session) {
        setErro(null)
        setModo('confirmar')
        return
      }
      router.replace('/(tabs)')
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      })
      setCarregando(false)
      if (error) {
        setErro('Email ou senha incorretos.')
        return
      }
      router.replace('/(tabs)')
    }
  }

  if (modo === 'confirmar') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.surfaceDark,
          paddingHorizontal: 24,
          paddingTop: insets.top + 64,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <StatusBar barStyle="light-content" />

        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: radius.pill,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <ConsumerIcon
              name="check-circle"
              size={36}
              color={colors.accent}
              strokeWidth={1.8}
            />
          </View>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '800',
              color: colors.white,
              textAlign: 'center',
              letterSpacing: -0.5,
              marginBottom: 12,
            }}
          >
            Confirme seu email
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: colors.inkSoft,
              textAlign: 'center',
              lineHeight: 22,
              fontWeight: '500',
            }}
          >
            Enviamos um link de confirmação para{'\n'}
            <Text style={{ fontWeight: '700', color: colors.white }}>
              {email}
            </Text>
            {'\n\n'}Após confirmar, volte aqui e faça login.
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        <Botao
          label="Ir para o login"
          variante="primario"
          tamanho="lg"
          onPress={() => {
            setModo('entrar')
            setSenha('')
          }}
        />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.surfaceDark }}
    >
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: 24,
            paddingTop: insets.top + 56,
            paddingBottom: insets.bottom + 24,
          }}
        >
          {/* Hero logo */}
          <Image
            source={require('../../assets/logoGreen.png')}
            resizeMode="contain"
            style={{
              width: 180,
              height: 44,
              marginBottom: 32,
            }}
          />

          {/* Título */}
          <Text
            style={{
              fontSize: 30,
              fontWeight: '800',
              color: colors.white,
              letterSpacing: -0.5,
              marginBottom: 10,
            }}
          >
            {modo === 'entrar' ? 'Bem-vindo\nde volta' : 'Criar\nconta'}
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: colors.inkSoft,
              lineHeight: 22,
              marginBottom: 36,
              fontWeight: '500',
            }}
          >
            {modo === 'entrar'
              ? 'Acesse sua conta com email e senha.'
              : 'Preencha seus dados para começar.'}
          </Text>

          {/* Form */}
          <View style={{ gap: 14 }}>
            <Input
              rotulo="Email"
              valor={email}
              aoMudar={(t) => {
                setEmail(t)
                setErro(null)
              }}
              placeholder="seu@email.com"
              tipo="email"
              fundoEscuro
            />

            <Input
              rotulo="Senha"
              valor={senha}
              aoMudar={(t) => {
                setSenha(t)
                setErro(null)
              }}
              placeholder={modo === 'cadastrar' ? 'Mínimo 6 caracteres' : '••••••••'}
              tipo="senha"
              fundoEscuro
            />

            {erro && (
              <Text
                style={{ color: colors.danger, fontSize: 13, marginTop: -4 }}
              >
                {erro}
              </Text>
            )}

            <View style={{ marginTop: 8 }}>
              <Botao
                label={modo === 'entrar' ? 'Entrar' : 'Criar conta'}
                variante="primario"
                tamanho="lg"
                carregando={carregando}
                onPress={handleSubmit}
              />
            </View>

            <View style={{ marginTop: 4 }}>
              <Botao
                label={
                  modo === 'entrar'
                    ? 'Não tem conta? Criar conta'
                    : 'Já tem conta? Entrar'
                }
                variante="ghost"
                tamanho="md"
                onPress={() => {
                  setModo(modo === 'entrar' ? 'cadastrar' : 'entrar')
                  setErro(null)
                }}
              />
            </View>
          </View>

          <View style={{ flex: 1 }} />

          <Text
            style={{
              fontSize: 12,
              color: colors.inkSoft,
              textAlign: 'center',
              lineHeight: 18,
              marginTop: 32,
              fontWeight: '500',
            }}
          >
            Ao continuar, você concorda com os Termos de Uso e a{'\n'}
            Política de Privacidade da plataforma.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
