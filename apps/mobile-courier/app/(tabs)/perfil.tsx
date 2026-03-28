import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useEntregaStore } from '@/store/useEntregaStore'
import { useLocalizacaoStore } from '@/store/useLocalizacaoStore'

export default function TelaPerfil() {
  const { courier, user, limpar: limparAuth } = useAuthStore()
  const { setAtiva } = useEntregaStore()
  const { limpar: limparLoc } = useLocalizacaoStore()
  const [abrindoStripe, setAbrindoStripe] = useState(false)

  async function handleAbrirStripe() {
    if (!courier?.stripe_account_id) return

    setAbrindoStripe(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setAbrindoStripe(false); return }

    const resposta = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/courier-stripe-info`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    )

    const dados = await resposta.json()
    setAbrindoStripe(false)

    if (dados.link_express) {
      Linking.openURL(dados.link_express)
    }
  }

  async function handleSair() {
    Alert.alert('Sair', 'Deseja realmente sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          // Garantir que está offline antes de sair
          if (courier?.id) {
            await supabase
              .from('couriers')
              .update({ online: false })
              .eq('id', courier.id)
          }

          await supabase.auth.signOut()
          limparAuth()
          setAtiva(null)
          limparLoc()
          router.replace('/(auth)/entrar')
        },
      },
    ])
  }

  const primeiraLetra = courier?.nome?.charAt(0).toUpperCase() ?? '?'

  return (
    <ScrollView
      className="flex-1 bg-[#FFF8ED]"
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View className="px-5 pt-14 pb-4">
        <Text className="text-2xl font-bold text-[#1A4D3A]">Perfil</Text>
      </View>

      {/* Avatar e dados */}
      <View className="bg-white px-5 py-5 flex-row items-center gap-4 mb-4">
        <View className="w-16 h-16 rounded-full bg-[#1A4D3A] items-center justify-center">
          <Text className="text-white text-2xl font-bold">{primeiraLetra}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-800">
            {courier?.nome ?? 'Entregador'}
          </Text>
          <Text className="text-sm text-gray-400 mt-0.5">
            {user?.email ?? ''}
          </Text>
          <View className="flex-row items-center gap-2 mt-1">
            <View
              className={`w-2 h-2 rounded-full ${
                courier?.online ? 'bg-[#4CAF82]' : 'bg-gray-300'
              }`}
            />
            <Text className="text-xs text-gray-400">
              {courier?.online ? 'Online' : 'Offline'}
            </Text>
            <Text className="text-xs text-gray-300">·</Text>
            <Text className="text-xs text-gray-400">
              {courier?.tipo === 'proprio' ? 'Entregador próprio' : 'Autônomo'}
            </Text>
          </View>
        </View>
      </View>

      {/* Status do KYC e conta Stripe */}
      <View className="bg-white mx-5 mb-4 rounded-2xl p-4 border border-gray-100">
        <Text className="text-sm font-semibold text-gray-700 mb-3">
          Conta de recebimentos
        </Text>

        <View className="flex-row items-center gap-3 mb-3">
          <View
            className={`w-3 h-3 rounded-full flex-shrink-0 ${
              courier?.stripe_onboarding_ok ? 'bg-[#4CAF82]' : 'bg-amber-400'
            }`}
          />
          <Text className="text-sm text-gray-700">
            {courier?.stripe_onboarding_ok
              ? 'Conta verificada e ativa'
              : 'Verificação pendente'}
          </Text>
        </View>

        {courier?.stripe_onboarding_ok ? (
          <TouchableOpacity
            onPress={handleAbrirStripe}
            disabled={abrindoStripe}
            className="border border-[#4CAF82] py-2.5 rounded-xl items-center disabled:opacity-50"
            activeOpacity={0.75}
          >
            <Text className="text-[#4CAF82] text-sm font-semibold">
              {abrindoStripe ? 'Abrindo...' : 'Acessar conta Stripe'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/stripe-onboarding')}
            className="bg-[#F5A623] py-2.5 rounded-xl items-center"
            activeOpacity={0.85}
          >
            <Text className="text-white text-sm font-semibold">
              Completar verificação
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Dados do veículo */}
      {courier?.veiculo_tipo && (
        <View className="bg-white mx-5 mb-4 rounded-2xl p-4 border border-gray-100">
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            Veículo
          </Text>
          <Text className="text-sm text-gray-600 capitalize">
            {courier.veiculo_tipo.replace('_', ' ')}
            {courier.veiculo_placa ? ` — ${courier.veiculo_placa}` : ''}
          </Text>
        </View>
      )}

      {/* Opções */}
      <View className="bg-white mx-5 mb-4 rounded-2xl border border-gray-100">
        <TouchableOpacity
          className="flex-row items-center justify-between px-4 py-4 border-b border-gray-50"
          activeOpacity={0.75}
          onPress={() => {}}
        >
          <Text className="text-sm font-medium text-gray-700">
            Termos de uso
          </Text>
          <Text className="text-gray-300">›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center justify-between px-4 py-4"
          activeOpacity={0.75}
          onPress={() => {}}
        >
          <Text className="text-sm font-medium text-gray-700">
            Suporte
          </Text>
          <Text className="text-gray-300">›</Text>
        </TouchableOpacity>
      </View>

      {/* Sair */}
      <TouchableOpacity
        onPress={handleSair}
        className="mx-5 border border-red-200 py-4 rounded-2xl items-center"
        activeOpacity={0.75}
      >
        <Text className="text-red-500 font-semibold text-sm">
          Sair da conta
        </Text>
      </TouchableOpacity>

      <Text className="text-xs text-gray-300 text-center mt-4">
        Versão 1.0.0
      </Text>
    </ScrollView>
  )
}
