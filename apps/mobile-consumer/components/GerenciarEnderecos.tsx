import { useState } from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { supabase } from '@/lib/supabase'
import type { Endereco } from '@mallora/types'

interface Props {
  enderecos: Endereco[]
  onAtualizar: (novos: Endereco[]) => void
}

export function GerenciarEnderecos({ enderecos, onAtualizar }: Props) {
  const [removendo, setRemovendo] = useState<number | null>(null)

  async function handleRemover(indice: number) {
    Alert.alert('Remover endereço', 'Deseja remover este endereço?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          setRemovendo(indice)

          const novos = enderecos.filter((_, i) => i !== indice)
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (user) {
            await supabase
              .from('consumers')
              .update({ enderecos: novos })
              .eq('user_id', user.id)
          }

          onAtualizar(novos)
          setRemovendo(null)
        },
      },
    ])
  }

  if (enderecos.length === 0) {
    return (
      <View className="bg-gray-50 px-5 py-4 border-b border-gray-100">
        <Text className="text-sm text-gray-400 text-center py-3">
          Nenhum endereço salvo ainda.
        </Text>
        <Text className="text-xs text-gray-300 text-center">
          Adicione um endereço ao fazer seu próximo pedido.
        </Text>
      </View>
    )
  }

  return (
    <View className="bg-gray-50 border-b border-gray-100">
      {enderecos.map((end, i) => (
        <View
          key={i}
          className="flex-row items-start justify-between px-5 py-4 border-b border-gray-100"
        >
          <View className="flex-1 mr-3">
            <Text className="text-sm font-semibold text-gray-800">
              {end.apelido ?? end.rua}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              {end.rua}, {end.numero}
              {end.complemento ? ` — ${end.complemento}` : ''}
            </Text>
            <Text className="text-xs text-gray-400">
              {end.bairro} — {end.cidade}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => handleRemover(i)}
            disabled={removendo === i}
            className="py-1"
            activeOpacity={0.7}
          >
            <Text className="text-red-400 text-xs font-medium">
              {removendo === i ? '...' : 'Remover'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  )
}
