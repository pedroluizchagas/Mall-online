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
  StatusBar,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useCadastroStore } from '@/store/useCadastroStore'
import { CourierIcon } from '@/components/CourierIcon'
import { courierDesign } from '@/lib/courier-design'
import { EtapaBar, ErroBanner, labelStyle } from './credenciais'

export default function EtapaDocumentos() {
  const { dados, limpar } = useCadastroStore()
  const { setCourier } = useAuthStore()
  const [cnh, setCnh] = useState('')
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null)
  const [fotoCnh, setFotoCnh] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [focadoCnh, setFocadoCnh] = useState(false)
  const { colors, radius } = courierDesign

  async function escolherImagem(
    setter: (uri: string) => void,
    aspecto: [number, number] = [1, 1],
  ) {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Permita acesso à galeria para continuar.')
      return
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: aspecto,
      quality: 0.8,
    })
    if (!resultado.canceled && resultado.assets[0]) {
      setter(resultado.assets[0].uri)
    }
  }

  async function uploadImagem(uri: string, caminho: string): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return null

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

      // React Native não suporta blob via XHR para URIs locais — usa FormData com fetch nativo
      const formData = new FormData()
      formData.append('file', {
        uri,
        name: caminho.split('/').pop() ?? 'image.jpg',
        type: 'image/jpeg',
      } as any)

      const res = await fetch(
        `${supabaseUrl}/storage/v1/object/courier-docs/${caminho}`,
        {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${session.access_token}`,
            'x-upsert': 'true',
          },
          body: formData,
        }
      )

      if (!res.ok) return null

      const { data } = supabase.storage.from('courier-docs').getPublicUrl(caminho)
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
    if (fotoCnh) fotoCnhUrl = await uploadImagem(fotoCnh, `${user.id}/cnh.jpg`)

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
      style={{ flex: 1, backgroundColor: colors.surfaceDark }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" />

      <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ marginBottom: 32 }}>
        <CourierIcon name="back" size={24} color={colors.white} />
      </TouchableOpacity>

      <EtapaBar atual={4} total={4} />

      <Text style={{ fontSize: 26, fontWeight: '800', color: colors.white, letterSpacing: -0.4, marginBottom: 8 }}>
        Documentos e foto
      </Text>
      <Text style={{ fontSize: 15, color: '#A4A7AD', lineHeight: 22, marginBottom: 32 }}>
        Necessários para verificar sua identidade e aprovar seu cadastro.
      </Text>

      {erro && <ErroBanner mensagem={erro} />}

      {/* Foto de perfil */}
      <Text style={labelStyle}>Foto de perfil</Text>
      <TouchableOpacity
        onPress={() => escolherImagem(setFotoPerfil)}
        activeOpacity={0.75}
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: fotoPerfil ? colors.accent : colors.lineDark,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          marginBottom: 28,
        }}
      >
        {fotoPerfil ? (
          <Image source={{ uri: fotoPerfil }} style={{ width: 88, height: 88, borderRadius: 44 }} />
        ) : (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <CourierIcon name="user" size={22} color={colors.inkSoft} />
            <Text style={{ color: colors.inkSoft, fontSize: 10, textAlign: 'center' }}>
              Adicionar
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Número da CNH */}
      <Text style={labelStyle}>Número da CNH</Text>
      <TextInput
        value={cnh}
        onChangeText={(t) => { setCnh(t); setErro(null) }}
        onFocus={() => setFocadoCnh(true)}
        onBlur={() => setFocadoCnh(false)}
        placeholder="00000000000"
        keyboardType="numeric"
        maxLength={11}
        placeholderTextColor={colors.inkSoft}
        style={{
          height: 54,
          borderRadius: radius.md,
          paddingHorizontal: 18,
          fontSize: 16,
          color: colors.white,
          backgroundColor: colors.surfaceDarkSoft,
          borderWidth: 1.5,
          borderColor: focadoCnh ? colors.accent : colors.lineDark,
          marginBottom: 16,
        }}
      />

      {/* Foto da CNH */}
      <Text style={[labelStyle, { marginBottom: 4 }]}>
        Foto da CNH
        <Text style={{ color: colors.inkSoft, fontSize: 11, fontWeight: '400', letterSpacing: 0, textTransform: 'none' }}>
          {'  '}opcional
        </Text>
      </Text>
      <TouchableOpacity
        onPress={() => escolherImagem(setFotoCnh, [16, 10])}
        activeOpacity={0.75}
        style={{
          height: 52,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: fotoCnh ? colors.accent : colors.lineDark,
          backgroundColor: fotoCnh ? colors.accentSoft : colors.surfaceDarkSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 36,
          marginTop: 8,
        }}
      >
        <Text style={{ color: fotoCnh ? colors.accent : colors.inkSoft, fontSize: 14, fontWeight: '600' }}>
          {fotoCnh ? 'Foto adicionada ✓' : 'Toque para adicionar'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleConcluir}
        disabled={salvando}
        activeOpacity={0.85}
        style={{
          height: 56,
          borderRadius: radius.pill,
          backgroundColor: salvando ? colors.accentStrong : colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: salvando ? 0.8 : 1,
        }}
      >
        {salvando
          ? <ActivityIndicator color={colors.ink} />
          : <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 16 }}>Enviar cadastro</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  )
}
