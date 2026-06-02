import { useState } from 'react'
import {
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native'
import { router } from 'expo-router'
import { useCadastroStore } from '@/store/useCadastroStore'
import { CourierIcon } from '@/components/CourierIcon'
import { courierDesign } from '@/lib/courier-design'
import { EtapaBar, ErroBanner, labelStyle } from './credenciais'

export default function EtapaDadosPessoais() {
  const { dados, setDados } = useCadastroStore()
  const [nome, setNome] = useState(dados.nome ?? '')
  const [cpf, setCpf] = useState(dados.cpf ?? '')
  const [telefone, setTelefone] = useState(dados.telefone ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [focados, setFocados] = useState({ nome: false, cpf: false, telefone: false })
  const { colors, radius } = courierDesign

  function focar(campo: keyof typeof focados, valor: boolean) {
    setFocados((f) => ({ ...f, [campo]: valor }))
  }

  function handleAvancar() {
    if (!nome.trim()) { setErro('Nome obrigatório.'); return }
    if (cpf.replace(/\D/g, '').length !== 11) { setErro('CPF inválido.'); return }
    if (telefone.replace(/\D/g, '').length < 10) { setErro('Telefone inválido.'); return }
    setDados({ nome: nome.trim(), cpf, telefone })
    router.push('/(auth)/cadastro/veiculo')
  }

  function estiloInput(focado: boolean) {
    return {
      height: 54,
      borderRadius: radius.md,
      paddingHorizontal: 18,
      fontSize: 16,
      color: colors.white,
      backgroundColor: colors.surfaceDarkSoft,
      borderWidth: 1.5,
      borderColor: focado ? colors.accent : colors.lineDark,
      marginBottom: 16,
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.surfaceDark }}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/entrar')} activeOpacity={0.7} style={{ marginBottom: 32 }}>
          <CourierIcon name="back" size={24} color={colors.white} />
        </TouchableOpacity>

        <EtapaBar atual={2} total={4} />

        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.white, letterSpacing: -0.4, marginBottom: 8 }}>
          Dados pessoais
        </Text>
        <Text style={{ fontSize: 15, color: '#A4A7AD', lineHeight: 22, marginBottom: 32 }}>
          Suas informações serão usadas para verificar sua identidade.
        </Text>

        {erro && <ErroBanner mensagem={erro} />}

        <Text style={labelStyle}>Nome completo</Text>
        <TextInput
          value={nome}
          onChangeText={(t) => { setNome(t); setErro(null) }}
          onFocus={() => focar('nome', true)}
          onBlur={() => focar('nome', false)}
          placeholder="Seu nome completo"
          autoCapitalize="words"
          placeholderTextColor={colors.inkSoft}
          style={estiloInput(focados.nome)}
        />

        <Text style={labelStyle}>CPF</Text>
        <TextInput
          value={cpf}
          onChangeText={(t) => { setCpf(t); setErro(null) }}
          onFocus={() => focar('cpf', true)}
          onBlur={() => focar('cpf', false)}
          placeholder="000.000.000-00"
          keyboardType="numeric"
          maxLength={14}
          placeholderTextColor={colors.inkSoft}
          style={estiloInput(focados.cpf)}
        />

        <Text style={labelStyle}>Telefone (WhatsApp)</Text>
        <TextInput
          value={telefone}
          onChangeText={(t) => { setTelefone(t); setErro(null) }}
          onFocus={() => focar('telefone', true)}
          onBlur={() => focar('telefone', false)}
          placeholder="(37) 99999-9999"
          keyboardType="phone-pad"
          placeholderTextColor={colors.inkSoft}
          style={estiloInput(focados.telefone)}
        />

        <TouchableOpacity
          onPress={handleAvancar}
          activeOpacity={0.85}
          style={{
            height: 56,
            borderRadius: radius.pill,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 8,
          }}
        >
          <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 16 }}>Próximo</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
