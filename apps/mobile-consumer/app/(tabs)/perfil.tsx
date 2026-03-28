import { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useCartStore } from '@/store/useCartStore'
import { useOrderStore } from '@/store/useOrderStore'
import { GerenciarEnderecos } from '@/components/GerenciarEnderecos'
import { EditarPerfil } from '@/components/EditarPerfil'

type SecaoAtiva = null | 'enderecos' | 'editar'

export default function TelaPerfil() {
  const { consumer, user, limpar: limparAuth } = useAuthStore()
  const { limparCarrinho } = useCartStore()
  const { limpar: limparOrder } = useOrderStore()
  const [secaoAtiva, setSecaoAtiva] = useState<SecaoAtiva>(null)
  const [atualizando, setAtualizando] = useState(false)

  const onRefresh = useCallback(async () => {
    setAtualizando(true)
    const {
      data: { user: u },
    } = await supabase.auth.getUser()
    if (u) {
      const { data } = await supabase
        .from('consumers')
        .select('id, nome, telefone, foto_url, enderecos')
        .eq('user_id', u.id)
        .single()
      if (data) {
        useAuthStore.getState().setConsumer(data)
      }
    }
    setAtualizando(false)
  }, [])

  async function handleSair() {
    Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          limparAuth()
          limparCarrinho()
          limparOrder()
          router.replace('/(auth)/entrar')
        },
      },
    ])
  }

  const primeiraLetra = consumer?.nome?.charAt(0).toUpperCase() ?? '?'

  return (
    <ScrollView
      className="flex-1 bg-creme"
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={onRefresh}
          tintColor="#1A4D3A"
        />
      }
    >
      <View className="px-5 pt-14 pb-6">
        <Text className="text-2xl font-bold text-verde-profundo">Perfil</Text>
      </View>

      {/* Avatar e dados básicos */}
      <View className="bg-white px-5 py-5 flex-row items-center gap-4">
        <View className="w-16 h-16 rounded-full bg-verde-profundo items-center justify-center">
          <Text className="text-white text-2xl font-bold">{primeiraLetra}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-800">
            {consumer?.nome ?? 'Usuário'}
          </Text>
          <Text className="text-sm text-gray-400 mt-0.5">
            {user?.email ?? ''}
          </Text>
          {consumer?.telefone && (
            <Text className="text-sm text-gray-400">{consumer.telefone}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() =>
            setSecaoAtiva(secaoAtiva === 'editar' ? null : 'editar')
          }
          className="py-1.5 px-3 border border-gray-200 rounded-xl"
          activeOpacity={0.75}
        >
          <Text className="text-xs text-gray-600 font-medium">Editar</Text>
        </TouchableOpacity>
      </View>

      {/* Seção de edição do perfil */}
      {secaoAtiva === 'editar' && (
        <EditarPerfil onFechar={() => setSecaoAtiva(null)} />
      )}

      {/* Menu de opções */}
      <View className="bg-white mt-4">
        <MenuItem
          label="Meus endereços"
          descricao={`${consumer?.enderecos?.length ?? 0} endereço(s) salvo(s)`}
          onPress={() =>
            setSecaoAtiva(secaoAtiva === 'enderecos' ? null : 'enderecos')
          }
          expandido={secaoAtiva === 'enderecos'}
        />

        {secaoAtiva === 'enderecos' && (
          <GerenciarEnderecos
            enderecos={consumer?.enderecos ?? []}
            onAtualizar={(novos) => {
              const c = useAuthStore.getState().consumer
              if (c) useAuthStore.getState().setConsumer({ ...c, enderecos: novos })
            }}
          />
        )}

        <MenuItem
          label="Histórico de pedidos"
          onPress={() => router.push('/(tabs)/pedidos')}
        />

        <MenuItem label="Termos de uso" onPress={() => {}} />

        <MenuItem label="Política de privacidade" onPress={() => {}} />
      </View>

      {/* Sair */}
      <TouchableOpacity
        onPress={handleSair}
        className="mx-5 mt-6 border border-red-200 py-4 rounded-2xl items-center"
        activeOpacity={0.75}
      >
        <Text className="text-red-500 font-semibold text-sm">Sair da conta</Text>
      </TouchableOpacity>

      <Text className="text-xs text-gray-300 text-center mt-6">
        Versão 1.0.0
      </Text>
    </ScrollView>
  )
}

function MenuItem({
  label,
  descricao,
  onPress,
  expandido,
}: {
  label: string
  descricao?: string
  onPress: () => void
  expandido?: boolean
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between px-5 py-4 border-b border-gray-50"
      activeOpacity={0.75}
    >
      <View>
        <Text className="text-sm font-medium text-gray-800">{label}</Text>
        {descricao && (
          <Text className="text-xs text-gray-400 mt-0.5">{descricao}</Text>
        )}
      </View>
      <Text className="text-gray-300 text-lg">{expandido ? '∧' : '›'}</Text>
    </TouchableOpacity>
  )
}
