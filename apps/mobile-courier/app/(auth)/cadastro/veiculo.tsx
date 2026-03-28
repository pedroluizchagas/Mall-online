import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native'
import { router } from 'expo-router'
import { useCadastroStore } from '@/store/useCadastroStore'

const TIPOS_VEICULO = [
  { id: 'moto', label: 'Moto' },
  { id: 'bicicleta', label: 'Bicicleta' },
  { id: 'carro', label: 'Carro' },
  { id: 'a_pe', label: 'A pé' },
]

export default function EtapaVeiculo() {
  const { dados, setDados } = useCadastroStore()
  const [tipo, setTipo] = useState(dados.veiculo_tipo ?? '')
  const [placa, setPlaca] = useState(dados.veiculo_placa ?? '')
  const [erro, setErro] = useState<string | null>(null)

  function handleAvancar() {
    if (!tipo) { setErro('Selecione o tipo de veículo.'); return }
    if (['moto', 'carro'].includes(tipo) && !placa.trim()) {
      setErro('Informe a placa do veículo.')
      return
    }
    setDados({ veiculo_tipo: tipo, veiculo_placa: placa.trim() || undefined })
    router.push('/(auth)/cadastro/documentos')
  }

  return (
    <ScrollView
      className="flex-1 bg-[#FFF8ED]"
      contentContainerStyle={{ padding: 24, paddingTop: 60 }}
    >
      <Text className="text-sm text-gray-400 mb-1">Etapa 2 de 3</Text>
      <Text className="text-2xl font-bold text-[#1A4D3A] mb-1">
        Seu veículo
      </Text>
      <Text className="text-gray-500 text-sm mb-8">
        Informe como você fará as entregas.
      </Text>

      {erro && (
        <Text className="text-red-500 text-sm mb-4 bg-red-50
          px-3 py-2 rounded-xl">
          {erro}
        </Text>
      )}

      <Text className="text-xs font-medium text-gray-600 mb-2">
        Tipo de veículo
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-6">
        {TIPOS_VEICULO.map((v) => (
          <TouchableOpacity
            key={v.id}
            onPress={() => setTipo(v.id)}
            className={`px-5 py-3 rounded-xl border ${
              tipo === v.id
                ? 'bg-[#1A4D3A] border-[#1A4D3A]'
                : 'bg-white border-gray-200'
            }`}
            activeOpacity={0.75}
          >
            <Text
              className={`text-sm font-medium ${
                tipo === v.id ? 'text-white' : 'text-gray-700'
              }`}
            >
              {v.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {['moto', 'carro'].includes(tipo) && (
        <View className="mb-6">
          <Text className="text-xs font-medium text-gray-600 mb-1">Placa</Text>
          <TextInput
            value={placa}
            onChangeText={setPlaca}
            placeholder="ABC-1234"
            autoCapitalize="characters"
            placeholderTextColor="#9CA3AF"
            className="border border-gray-200 rounded-xl px-4 py-3
              text-sm text-gray-800 bg-white"
          />
        </View>
      )}

      <View className="flex-row gap-3 mt-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-1 border border-gray-200 py-4 rounded-2xl items-center"
          activeOpacity={0.7}
        >
          <Text className="text-gray-500 font-medium">Voltar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleAvancar}
          className="flex-1 bg-[#1A4D3A] py-4 rounded-2xl items-center"
          activeOpacity={0.85}
        >
          <Text className="text-white font-bold">Próximo</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
