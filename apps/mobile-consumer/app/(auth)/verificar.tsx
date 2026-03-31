import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function TelaVerificar() {
  const { email } = useLocalSearchParams<{ email: string }>()
  const [codigo, setCodigo] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleVerificar() {
    if (codigo.length !== 6) {
      setErro('Digite os 6 dígitos do código.')
      return
    }

    setCarregando(true)
    setErro(null)

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: codigo,
      type: 'email',
    })

    setCarregando(false)

    if (error) {
      setErro('Código inválido ou expirado. Tente novamente.')
      return
    }

    router.replace('/(tabs)')
  }

  async function handleReenviar() {
    if (!email) return
    setReenviando(true)
    setErro(null)
    await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setReenviando(false)
    setCodigo('')
  }

  return (
    <View className="flex-1 bg-creme px-6 pt-24 pb-10">
      <View className="items-center mb-10">
        <View className="w-20 h-20 bg-verde-medio/20 rounded-full items-center justify-center mb-6">
          <Text className="text-4xl">✉️</Text>
        </View>

        <Text className="text-2xl font-bold text-verde-profundo text-center mb-3">
          Verifique seu email
        </Text>
        <Text className="text-gray-500 text-center leading-6">
          Enviamos um código de 6 dígitos para{'\n'}
          <Text className="font-medium text-gray-700">{email}</Text>
        </Text>
      </View>

      <View className="mb-6">
        <Text className="text-sm font-medium text-gray-700 mb-1.5">
          Código de verificação
        </Text>
        <TextInput
          value={codigo}
          onChangeText={(t) => {
            setCodigo(t.replace(/\D/g, '').slice(0, 6))
            setErro(null)
          }}
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
          className="border border-gray-200 rounded-xl px-4 py-3.5 text-2xl text-center tracking-widest text-gray-800 bg-white"
          placeholderTextColor="#9CA3AF"
        />
        {erro && <Text className="text-red-500 text-sm mt-2">{erro}</Text>}
      </View>

      <TouchableOpacity
        onPress={handleVerificar}
        disabled={carregando || codigo.length !== 6}
        className="bg-verde-profundo py-4 rounded-2xl items-center mb-4"
        activeOpacity={0.85}
      >
        {carregando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold text-base">Confirmar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleReenviar}
        disabled={reenviando}
        className="py-3 items-center"
        activeOpacity={0.7}
      >
        <Text className="text-sm text-verde-medio">
          {reenviando ? 'Reenviando...' : 'Reenviar código'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.back()}
        className="py-3 items-center mt-2"
        activeOpacity={0.7}
      >
        <Text className="text-sm text-gray-400">Voltar e trocar email</Text>
      </TouchableOpacity>
    </View>
  )
}
