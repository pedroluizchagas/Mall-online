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

    setCarregando(true)
    setErro(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: 'mallora-courier://auth/callback',
        data: { role: 'courier' },
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
      className="flex-1 bg-[#1A4D3A]"
    >
      <View className="flex-1 px-6 pt-20 pb-10">
        <View className="mb-10">
          <Text className="text-3xl font-bold text-white mb-2">
            Entrar como entregador
          </Text>
          <Text className="text-green-200 leading-6">
            Digite seu email e enviaremos um link de acesso.
          </Text>
        </View>

        <View>
          <Text className="text-sm font-medium text-green-100 mb-1.5">
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={(t) => { setEmail(t); setErro(null) }}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#4CAF82"
            className="border border-green-700 rounded-xl px-4 py-3.5
              text-base text-white bg-green-900/40"
          />

          {erro && (
            <Text className="text-red-300 text-sm mt-2">{erro}</Text>
          )}

          <TouchableOpacity
            onPress={handleEnviarLink}
            disabled={carregando}
            className="bg-[#4CAF82] py-4 rounded-2xl items-center mt-4"
            activeOpacity={0.85}
          >
            {carregando ? (
              <ActivityIndicator color="#1A4D3A" />
            ) : (
              <Text className="text-[#1A4D3A] font-bold text-base">
                Enviar link de acesso
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
