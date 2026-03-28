import { useEffect } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'

export default function TelaAguardandoAprovacao() {
  const { courier, setCourier } = useAuthStore()

  useEffect(() => {
    if (!courier?.id) return

    const intervalo = setInterval(async () => {
      const { data } = await supabase
        .from('couriers')
        .select('status, stripe_onboarding_ok')
        .eq('id', courier.id)
        .single()

      if (data?.status === 'aprovado') {
        setCourier({ ...courier, status: 'aprovado' })
        clearInterval(intervalo)

        if (!data.stripe_onboarding_ok && courier.tipo === 'autonomo') {
          router.replace('/stripe-onboarding')
        } else {
          router.replace('/(tabs)')
        }
      }
    }, 15000)

    return () => clearInterval(intervalo)
  }, [courier?.id])

  return (
    <View className="flex-1 bg-[#FFF8ED] px-6 items-center justify-center">
      <View className="w-20 h-20 rounded-full bg-[#4CAF82]/20
        items-center justify-center mb-6">
        <Text className="text-4xl">⏳</Text>
      </View>

      <Text className="text-2xl font-bold text-[#1A4D3A] text-center mb-3">
        Cadastro em análise
      </Text>

      <Text className="text-gray-500 text-center leading-6 mb-8">
        Recebemos seus dados e estamos analisando seu cadastro.
        Você será notificado assim que for aprovado.
      </Text>

      <View className="bg-white rounded-2xl p-5 w-full mb-6">
        <Text className="text-sm font-semibold text-gray-700 mb-3">
          O que acontece agora?
        </Text>
        <View className="gap-3">
          {[
            'Sua documentação será verificada pela equipe',
            'Você receberá uma notificação por email',
            'Após aprovação, configure sua conta de recebimentos',
            'Pronto para receber entregas!',
          ].map((passo, i) => (
            <View key={i} className="flex-row items-start gap-3">
              <View className="w-5 h-5 rounded-full bg-[#4CAF82]/20
                items-center justify-center flex-shrink-0 mt-0.5">
                <Text className="text-xs text-[#4CAF82] font-bold">
                  {i + 1}
                </Text>
              </View>
              <Text className="text-sm text-gray-600 flex-1">{passo}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        onPress={async () => {
          await supabase.auth.signOut()
          router.replace('/(auth)/entrar')
        }}
        className="py-3"
        activeOpacity={0.7}
      >
        <Text className="text-gray-400 text-sm">Sair da conta</Text>
      </TouchableOpacity>
    </View>
  )
}
