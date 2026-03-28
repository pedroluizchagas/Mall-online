import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useCadastroStore } from '@/store/useCadastroStore'

export default function EtapaDocumentos() {
  const { dados, limpar } = useCadastroStore()
  const { setCourier } = useAuthStore()
  const [cnh, setCnh] = useState('')
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null)
  const [fotoCnh, setFotoCnh] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function escolherImagem(setter: (uri: string) => void) {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Permita acesso à galeria para continuar.')
      return
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!resultado.canceled && resultado.assets[0]) {
      setter(resultado.assets[0].uri)
    }
  }

  async function uploadImagem(uri: string, caminho: string): Promise<string | null> {
    try {
      const resposta = await fetch(uri)
      const blob = await resposta.blob()
      const arrayBuffer = await blob.arrayBuffer()

      const { error } = await supabase.storage
        .from('courier-docs')
        .upload(caminho, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (error) return null

      const { data } = supabase.storage
        .from('courier-docs')
        .getPublicUrl(caminho)

      return data.publicUrl
    } catch {
      return null
    }
  }

  async function handleConcluir() {
    if (!cnh.trim()) { setErro('Número da CNH obrigatório.'); return }
    if (!fotoPerfil) { setErro('Adicione uma foto de perfil.'); return }

    setSalvando(true)
    setErro(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setErro('Sessão expirada. Faça login novamente.')
      setSalvando(false)
      return
    }

    const fotoPerfilUrl = await uploadImagem(fotoPerfil, `${user.id}/perfil.jpg`)

    let fotoCnhUrl: string | null = null
    if (fotoCnh) {
      fotoCnhUrl = await uploadImagem(fotoCnh, `${user.id}/cnh.jpg`)
    }

    if (!fotoPerfilUrl) {
      setErro('Erro ao fazer upload da foto. Tente novamente.')
      setSalvando(false)
      return
    }

    const { data: courier, error: courierError } = await supabase
      .from('couriers')
      .insert({
        user_id: user.id,
        nome: dados.nome!,
        cpf: dados.cpf,
        telefone: dados.telefone,
        veiculo_tipo: dados.veiculo_tipo,
        veiculo_placa: dados.veiculo_placa,
        cnh_numero: cnh.trim(),
        cnh_foto_url: fotoCnhUrl,
        foto_url: fotoPerfilUrl,
        tipo: 'autonomo',
        status: 'pendente',
        online: false,
        stripe_onboarding_ok: false,
      })
      .select()
      .single()

    if (courierError) {
      setErro('Erro ao criar cadastro. Tente novamente.')
      setSalvando(false)
      return
    }

    setCourier(courier)
    limpar()
    setSalvando(false)
    router.replace('/aguardando-aprovacao')
  }

  return (
    <ScrollView
      className="flex-1 bg-[#FFF8ED]"
      contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 40 }}
    >
      <Text className="text-sm text-gray-400 mb-1">Etapa 3 de 3</Text>
      <Text className="text-2xl font-bold text-[#1A4D3A] mb-1">
        Documentos e foto
      </Text>
      <Text className="text-gray-500 text-sm mb-8">
        Necessários para verificar sua identidade e aprovar seu cadastro.
      </Text>

      {erro && (
        <Text className="text-red-500 text-sm mb-4 bg-red-50
          px-3 py-2 rounded-xl">
          {erro}
        </Text>
      )}

      {/* Foto de perfil */}
      <View className="mb-5">
        <Text className="text-xs font-medium text-gray-600 mb-2">
          Foto de perfil
        </Text>
        <TouchableOpacity
          onPress={() => escolherImagem(setFotoPerfil)}
          className={`h-24 w-24 rounded-full border-2 border-dashed
            items-center justify-center overflow-hidden ${
            fotoPerfil ? 'border-[#4CAF82]' : 'border-gray-300'
          }`}
          activeOpacity={0.75}
        >
          {fotoPerfil ? (
            <Image
              source={{ uri: fotoPerfil }}
              className="h-24 w-24 rounded-full"
            />
          ) : (
            <Text className="text-gray-400 text-xs text-center px-2">
              Toque para adicionar
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Número da CNH */}
      <View className="mb-5">
        <Text className="text-xs font-medium text-gray-600 mb-1">
          Número da CNH
        </Text>
        <TextInput
          value={cnh}
          onChangeText={setCnh}
          placeholder="00000000000"
          keyboardType="numeric"
          maxLength={11}
          placeholderTextColor="#9CA3AF"
          className="border border-gray-200 rounded-xl px-4 py-3
            text-sm text-gray-800 bg-white"
        />
      </View>

      {/* Foto da CNH (opcional) */}
      <View className="mb-8">
        <Text className="text-xs font-medium text-gray-600 mb-1">
          Foto da CNH (opcional, mas recomendado)
        </Text>
        <TouchableOpacity
          onPress={() => escolherImagem(setFotoCnh)}
          className={`h-12 border border-dashed rounded-xl items-center
            justify-center ${
            fotoCnh ? 'border-[#4CAF82] bg-green-50' : 'border-gray-300'
          }`}
          activeOpacity={0.75}
        >
          <Text
            className={`text-sm ${
              fotoCnh ? 'text-[#4CAF82]' : 'text-gray-400'
            }`}
          >
            {fotoCnh ? 'Foto da CNH adicionada' : 'Toque para adicionar foto da CNH'}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          disabled={salvando}
          className="flex-1 border border-gray-200 py-4 rounded-2xl items-center"
          activeOpacity={0.7}
        >
          <Text className="text-gray-500 font-medium">Voltar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleConcluir}
          disabled={salvando}
          className="flex-1 bg-[#1A4D3A] py-4 rounded-2xl items-center
            disabled:opacity-50"
          activeOpacity={0.85}
        >
          {salvando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold">Enviar cadastro</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
