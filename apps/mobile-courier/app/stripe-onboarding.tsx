import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'

export default function TelaStripeOnboarding() {
  const { courier, setCourier } = useAuthStore()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleIniciarOnboarding() {
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
      }
    )

    const resultado = await resposta.json()
    setCarregando(false)

    if (!resposta.ok) {
      setErro(resultado.error ?? 'Erro ao iniciar configuração.')
      return
    }

    await Linking.openURL(resultado.stripe_onboarding_url)
  }

  async function handleVerificarStatus() {
    if (!courier?.id) return

    setCarregando(true)

    const { data } = await supabase
      .from('couriers')
      .select('stripe_onboarding_ok')
      .eq('id', courier.id)
      .single()

    setCarregando(false)

    if (data?.stripe_onboarding_ok) {
      setCourier({ ...courier, stripe_onboarding_ok: true })
      router.replace('/(tabs)')
    } else {
      setErro('Configuração ainda não concluída. Verifique se completou todos os passos no Stripe.')
    }
  }

  return (
    <View className="flex-1 bg-[#FFF8ED] px-6 items-center justify-center">
      <View className="w-20 h-20 rounded-full bg-[#4CAF82]/20
        items-center justify-center mb-6">
        <Text className="text-4xl">💳</Text>
      </View>

      <Text className="text-2xl font-bold text-[#1A4D3A] text-center mb-3">
        Configure seus recebimentos
      </Text>

      <Text className="text-gray-500 text-center leading-6 mb-8">
        Para receber seus pagamentos, você precisa configurar sua conta
        bancária na Stripe. O processo é rápido e seguro.
      </Text>

      <View className="bg-white rounded-2xl p-5 w-full mb-6">
        <Text className="text-sm font-semibold text-gray-700 mb-3">
          O que você vai precisar
        </Text>
        <View className="gap-2">
          {[
            'CPF e dados pessoais',
            'Conta bancária (PIX ou conta corrente)',
            'Celular para verificação',
          ].map((item, i) => (
            <View key={i} className="flex-row items-center gap-2">
              <View className="w-1.5 h-1.5 rounded-full bg-[#4CAF82]" />
              <Text className="text-sm text-gray-600">{item}</Text>
            </View>
          ))}
        </View>
      </View>

      {erro && (
        <Text className="text-red-500 text-sm text-center mb-4">
          {erro}
        </Text>
      )}

      <TouchableOpacity
        onPress={handleIniciarOnboarding}
        disabled={carregando}
        className="w-full bg-[#1A4D3A] py-4 rounded-2xl items-center
          mb-3 disabled:opacity-50"
        activeOpacity={0.85}
      >
        {carregando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-base">
            Configurar conta de recebimentos
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleVerificarStatus}
        disabled={carregando}
        className="w-full border border-[#4CAF82] py-4 rounded-2xl items-center"
        activeOpacity={0.75}
      >
        <Text className="text-[#4CAF82] font-semibold text-sm">
          Já configurei — verificar status
        </Text>
      </TouchableOpacity>

      <Text className="text-xs text-gray-400 text-center mt-6 leading-5">
        Seus dados bancários são armazenados com segurança pela Stripe.
        A plataforma não tem acesso a essas informações.
      </Text>
    </View>
  )
}
