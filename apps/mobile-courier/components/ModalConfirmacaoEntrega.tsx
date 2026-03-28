import { useState } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'

interface Props {
  codigoEsperado?: string | null
  onConfirmar: (comprovante_url?: string) => Promise<void>
  onFechar: () => void
}

export function ModalConfirmacaoEntrega({
  codigoEsperado,
  onConfirmar,
  onFechar,
}: Props) {
  const { courier } = useAuthStore()
  const [modo, setModo] = useState<'codigo' | 'foto'>('codigo')
  const [codigo, setCodigo] = useState('')
  const [fotoUri, setFotoUri] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function tirarFoto() {
    const permissao = await ImagePicker.requestCameraPermissionsAsync()
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Permita acesso à câmera.')
      return
    }

    const resultado = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.7,
    })

    if (!resultado.canceled && resultado.assets[0]) {
      setFotoUri(resultado.assets[0].uri)
    }
  }

  async function handleConfirmar() {
    setErro(null)

    if (modo === 'codigo') {
      if (!codigo.trim()) {
        setErro('Digite o código de confirmação.')
        return
      }
      if (codigoEsperado && codigo.trim() !== codigoEsperado) {
        setErro('Código incorreto. Verifique com o consumidor.')
        return
      }
    }

    if (modo === 'foto' && !fotoUri) {
      setErro('Tire uma foto como comprovante.')
      return
    }

    setConfirmando(true)

    let comprovante_url: string | undefined

    if (modo === 'foto' && fotoUri && courier?.id) {
      try {
        const resposta = await fetch(fotoUri)
        const blob = await resposta.blob()
        const buffer = await blob.arrayBuffer()
        const caminho = `${courier.id}/comprovante-${Date.now()}.jpg`

        const { error } = await supabase.storage
          .from('courier-docs')
          .upload(caminho, buffer, {
            contentType: 'image/jpeg',
            upsert: false,
          })

        if (!error) {
          const { data } = supabase.storage
            .from('courier-docs')
            .getPublicUrl(caminho)
          comprovante_url = data.publicUrl
        }
      } catch {
        // Continuar mesmo sem foto se upload falhar
      }
    }

    await onConfirmar(comprovante_url)
    setConfirmando(false)
  }

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onFechar}
    >
      <TouchableOpacity
        className="flex-1 bg-black/40"
        activeOpacity={1}
        onPress={onFechar}
      />

      <View className="bg-white rounded-t-3xl p-6">
        <Text className="text-xl font-bold text-[#1A4D3A] mb-1">
          Confirmar entrega
        </Text>
        <Text className="text-gray-500 text-sm mb-5">
          Confirme que o pedido foi entregue ao consumidor.
        </Text>

        {/* Seletor de modo */}
        <View className="flex-row gap-2 mb-5">
          {[
            { id: 'codigo', label: 'Código' },
            { id: 'foto', label: 'Foto' },
          ].map((op) => (
            <TouchableOpacity
              key={op.id}
              onPress={() => {
                setModo(op.id as 'codigo' | 'foto')
                setErro(null)
              }}
              className={`flex-1 py-2.5 rounded-xl items-center border ${
                modo === op.id
                  ? 'bg-[#1A4D3A] border-[#1A4D3A]'
                  : 'border-gray-200'
              }`}
              activeOpacity={0.75}
            >
              <Text
                className={`text-sm font-semibold ${
                  modo === op.id ? 'text-white' : 'text-gray-600'
                }`}
              >
                {op.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Modo código */}
        {modo === 'codigo' && (
          <View className="mb-4">
            <Text className="text-xs font-medium text-gray-600 mb-2">
              Peça ao consumidor o código de confirmação exibido no app dele
            </Text>
            <TextInput
              value={codigo}
              onChangeText={(t) => { setCodigo(t.toUpperCase()); setErro(null) }}
              placeholder="Ex: A7B3"
              autoCapitalize="characters"
              maxLength={6}
              placeholderTextColor="#9CA3AF"
              className="border border-gray-200 rounded-xl px-4 py-3
                text-xl font-bold text-gray-800 text-center tracking-widest"
            />
          </View>
        )}

        {/* Modo foto */}
        {modo === 'foto' && (
          <View className="mb-4">
            <Text className="text-xs font-medium text-gray-600 mb-2">
              Tire uma foto do local de entrega como comprovante
            </Text>
            <TouchableOpacity
              onPress={tirarFoto}
              className={`h-28 border-2 border-dashed rounded-2xl items-center justify-center ${
                fotoUri ? 'border-[#4CAF82] bg-green-50' : 'border-gray-300'
              }`}
              activeOpacity={0.75}
            >
              <Text
                className={`text-sm font-medium ${
                  fotoUri ? 'text-[#4CAF82]' : 'text-gray-400'
                }`}
              >
                {fotoUri ? 'Foto tirada — toque para refazer' : 'Toque para abrir a câmera'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {erro && (
          <Text className="text-red-500 text-sm mb-3">{erro}</Text>
        )}

        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={onFechar}
            disabled={confirmando}
            className="flex-1 border border-gray-200 py-3.5 rounded-2xl items-center"
            activeOpacity={0.7}
          >
            <Text className="text-gray-500 font-medium text-sm">Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleConfirmar}
            disabled={confirmando}
            className="flex-2 bg-[#4CAF82] py-3.5 rounded-2xl items-center disabled:opacity-50"
            style={{ flex: 2 }}
            activeOpacity={0.85}
          >
            {confirmando ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-bold text-sm">Confirmar entrega</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
