import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function TelaEntrar() {
  const [email, setEmail] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleEnviarLink() {
    if (!email.trim()) {
      setErro('Digite seu email para continuar.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setErro('Email inválido.')
      return
    }

    setCarregando(true)
    setErro(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: 'mallora-consumer://auth/callback',
        data: { role: 'consumer' },
      },
    })

    setCarregando(false)

    if (error) {
      setErro('Não foi possível enviar o link. Tente novamente.')
      return
    }

    router.push(`/(auth)/verificar?email=${encodeURIComponent(email)}`)
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-creme"
    >
      <View className="flex-1 px-6 pt-20 pb-10">
        <View className="mb-10">
          <Text className="text-3xl font-bold text-verde-profundo mb-2">
            Entrar
          </Text>
          <Text className="text-gray-500 leading-6">
            Digite seu email e enviaremos um link de acesso.
            Sem senha para lembrar.
          </Text>
        </View>

        <View className="space-y-4">
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1.5">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={(t) => {
                setEmail(t)
                setErro(null)
              }}
              placeholder="seu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              className="border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-800 bg-white"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {erro && <Text className="text-red-500 text-sm">{erro}</Text>}

          <TouchableOpacity
            onPress={handleEnviarLink}
            disabled={carregando}
            className="bg-verde-profundo py-4 rounded-2xl items-center mt-2"
            activeOpacity={0.85}
          >
            {carregando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Enviar link de acesso
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text className="text-xs text-gray-400 text-center mt-8 leading-5">
          Ao continuar, você concorda com os Termos de Uso e a
          Política de Privacidade da plataforma.
        </Text>
      </View>
    </KeyboardAvoidingView>
  )
}
