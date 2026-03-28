import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'

export function EditarPerfil({ onFechar }: { onFechar: () => void }) {
  const { consumer, setConsumer } = useAuthStore()
  const [nome, setNome] = useState(consumer?.nome ?? '')
  const [telefone, setTelefone] = useState(consumer?.telefone ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSalvar() {
    if (!nome.trim()) {
      setErro('O nome é obrigatório.')
      return
    }

    setSalvando(true)
    setErro(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('consumers')
      .update({ nome: nome.trim(), telefone: telefone.trim() || null })
      .eq('user_id', user.id)

    if (error) {
      setErro('Erro ao salvar. Tente novamente.')
      setSalvando(false)
      return
    }

    if (consumer) {
      setConsumer({
        ...consumer,
        nome: nome.trim(),
        telefone: telefone.trim() || undefined,
      })
    }

    setSalvando(false)
    onFechar()
  }

  return (
    <View className="bg-gray-50 px-5 py-4 border-b border-gray-100">
      {erro && <Text className="text-red-500 text-sm mb-3">{erro}</Text>}

      <View className="gap-3">
        <View>
          <Text className="text-xs font-medium text-gray-600 mb-1">Nome</Text>
          <TextInput
            value={nome}
            onChangeText={setNome}
            placeholder="Seu nome completo"
            placeholderTextColor="#9CA3AF"
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700"
          />
        </View>

        <View>
          <Text className="text-xs font-medium text-gray-600 mb-1">
            Telefone (opcional)
          </Text>
          <TextInput
            value={telefone}
            onChangeText={setTelefone}
            placeholder="(37) 99999-9999"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700"
          />
        </View>

        <View className="flex-row gap-2 mt-1">
          <TouchableOpacity
            onPress={onFechar}
            className="flex-1 border border-gray-200 py-3 rounded-xl items-center"
            activeOpacity={0.7}
          >
            <Text className="text-gray-500 text-sm font-medium">Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSalvar}
            disabled={salvando}
            className="flex-1 bg-verde-profundo py-3 rounded-xl items-center disabled:opacity-50"
            activeOpacity={0.85}
          >
            {salvando ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white text-sm font-semibold">Salvar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}
