import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { useCadastroStore } from '@/store/useCadastroStore'

export default function EtapaDadosPessoais() {
  const { dados, setDados } = useCadastroStore()
  const [nome, setNome] = useState(dados.nome ?? '')
  const [cpf, setCpf] = useState(dados.cpf ?? '')
  const [telefone, setTelefone] = useState(dados.telefone ?? '')
  const [erro, setErro] = useState<string | null>(null)

  function handleAvancar() {
    if (!nome.trim()) { setErro('Nome obrigatório.'); return }
    if (cpf.replace(/\D/g, '').length !== 11) {
      setErro('CPF inválido.')
      return
    }
    if (telefone.replace(/\D/g, '').length < 10) {
      setErro('Telefone inválido.')
      return
    }
    setDados({ nome: nome.trim(), cpf, telefone })
    router.push('/(auth)/cadastro/veiculo')
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#FFF8ED]"
    >
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingTop: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-sm text-gray-400 mb-1">Etapa 1 de 3</Text>
        <Text className="text-2xl font-bold text-[#1A4D3A] mb-1">
          Dados pessoais
        </Text>
        <Text className="text-gray-500 text-sm mb-8">
          Suas informações serão usadas para criar sua conta de entregador.
        </Text>

        {erro && (
          <Text className="text-red-500 text-sm mb-4 bg-red-50
            px-3 py-2 rounded-xl">
            {erro}
          </Text>
        )}

        <View className="gap-4">
          <Campo
            label="Nome completo"
            value={nome}
            onChangeText={setNome}
            placeholder="Seu nome completo"
            autoCapitalize="words"
          />
          <Campo
            label="CPF"
            value={cpf}
            onChangeText={setCpf}
            placeholder="000.000.000-00"
            keyboardType="numeric"
            maxLength={14}
          />
          <Campo
            label="Telefone (WhatsApp)"
            value={telefone}
            onChangeText={setTelefone}
            placeholder="(37) 99999-9999"
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          onPress={handleAvancar}
          className="bg-[#1A4D3A] py-4 rounded-2xl items-center mt-8"
          activeOpacity={0.85}
        >
          <Text className="text-white font-bold text-base">Próximo</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Campo({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View>
      <Text className="text-xs font-medium text-gray-600 mb-1">{label}</Text>
      <TextInput
        placeholderTextColor="#9CA3AF"
        className="border border-gray-200 rounded-xl px-4 py-3 text-sm
          text-gray-800 bg-white"
        {...props}
      />
    </View>
  )
}
