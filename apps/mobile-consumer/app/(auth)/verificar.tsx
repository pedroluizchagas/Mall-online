import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function TelaVerificar() {
  const { email } = useLocalSearchParams<{ email: string }>()
  const [segundos, setSegundos] = useState(60)
  const [reenviando, setReenviando] = useState(false)

  // Countdown para reenvio
  useEffect(() => {
    const timer = setInterval(() => {
      setSegundos((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Escutar quando o usuário confirmar o Magic Link
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.replace('/(tabs)')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleReenviar() {
    if (segundos > 0 || !email) return

    setReenviando(true)
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'mallora-consumer://auth/callback' },
    })
    setReenviando(false)
    setSegundos(60)
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
          Enviamos um link de acesso para{'\n'}
          <Text className="font-medium text-gray-700">{email}</Text>
        </Text>
      </View>

      <View className="bg-white rounded-2xl p-5 mb-6">
        <Text className="text-sm text-gray-600 leading-6">
          1. Abra o email no seu celular{'\n'}
          2. Toque no botão "Entrar na Mallora"{'\n'}
          3. Você será redirecionado automaticamente
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleReenviar}
        disabled={segundos > 0 || reenviando}
        className="py-3 items-center"
        activeOpacity={0.7}
      >
        <Text
          className={`text-sm ${segundos > 0 ? 'text-gray-400' : 'text-verde-medio'}`}
        >
          {segundos > 0
            ? `Reenviar em ${segundos}s`
            : reenviando
              ? 'Reenviando...'
              : 'Reenviar link'}
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
