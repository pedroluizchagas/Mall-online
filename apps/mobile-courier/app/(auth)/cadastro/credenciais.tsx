import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { CourierIcon } from '@/components/CourierIcon'
import { courierDesign } from '@/lib/courier-design'

export default function EtapaCredenciais() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [senhaVisivel, setSenhaVisivel] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [focados, setFocados] = useState({ email: false, senha: false, confirmar: false })
  const { colors, radius } = courierDesign

  function focar(campo: keyof typeof focados, valor: boolean) {
    setFocados((f) => ({ ...f, [campo]: valor }))
  }

  async function handleAvancar() {
    if (!email.trim()) { setErro('Email obrigatório.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErro('Informe um email válido.'); return
    }
    if (senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return }

    setCarregando(true)
    setErro(null)

    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: senha,
      options: { data: { role: 'courier' } },
    })

    setCarregando(false)

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        setErro('Este email já possui conta. Faça login na tela anterior.')
      } else {
        setErro('Não foi possível criar a conta. Tente novamente.')
      }
      return
    }

    router.replace('/(auth)/cadastro/')
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

        <EtapaBar atual={1} total={4} />

        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.white, letterSpacing: -0.4, marginBottom: 8 }}>
          Criar conta
        </Text>
        <Text style={{ fontSize: 15, color: '#A4A7AD', lineHeight: 22, marginBottom: 32 }}>
          Defina o email e a senha para acessar o app.
        </Text>

        {erro && <ErroBanner mensagem={erro} />}

        <Text style={labelStyle}>Email</Text>
        <TextInput
          value={email}
          onChangeText={(t) => { setEmail(t); setErro(null) }}
          onFocus={() => focar('email', true)}
          onBlur={() => focar('email', false)}
          placeholder="seu@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={colors.inkSoft}
          style={estiloInput(focados.email)}
        />

        <Text style={labelStyle}>Senha</Text>
        <View style={{ position: 'relative', marginBottom: 16 }}>
          <TextInput
            value={senha}
            onChangeText={(t) => { setSenha(t); setErro(null) }}
            onFocus={() => focar('senha', true)}
            onBlur={() => focar('senha', false)}
            placeholder="Mínimo 6 caracteres"
            secureTextEntry={!senhaVisivel}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={colors.inkSoft}
            style={[estiloInput(focados.senha), { marginBottom: 0, paddingRight: 52 }]}
          />
          <TouchableOpacity
            onPress={() => setSenhaVisivel(!senhaVisivel)}
            style={{ position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' }}
            activeOpacity={0.7}
          >
            <CourierIcon name={senhaVisivel ? 'eye-off' : 'eye'} size={20} color={colors.inkSoft} />
          </TouchableOpacity>
        </View>

        <Text style={labelStyle}>Confirmar senha</Text>
        <TextInput
          value={confirmar}
          onChangeText={(t) => { setConfirmar(t); setErro(null) }}
          onFocus={() => focar('confirmar', true)}
          onBlur={() => focar('confirmar', false)}
          placeholder="Repita a senha"
          secureTextEntry={!senhaVisivel}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={colors.inkSoft}
          style={estiloInput(focados.confirmar)}
        />

        <TouchableOpacity
          onPress={handleAvancar}
          disabled={carregando}
          activeOpacity={0.85}
          style={{
            height: 56,
            borderRadius: radius.pill,
            backgroundColor: carregando ? colors.accentStrong : colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 8,
          }}
        >
          {carregando
            ? <ActivityIndicator color={colors.ink} />
            : <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 16 }}>Próximo</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

export function EtapaBar({ atual, total }: { atual: number; total: number }) {
  const { colors } = courierDesign
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 99,
            backgroundColor: i < atual ? colors.accent : colors.lineDark,
          }}
        />
      ))}
    </View>
  )
}

export function ErroBanner({ mensagem }: { mensagem: string }) {
  const { colors, radius } = courierDesign
  return (
    <View style={{
      backgroundColor: 'rgba(255,109,94,0.12)',
      borderRadius: radius.sm,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 16,
    }}>
      <Text style={{ color: colors.danger, fontSize: 13 }}>{mensagem}</Text>
    </View>
  )
}

export const labelStyle = {
  fontSize: 13,
  fontWeight: '600' as const,
  color: '#A4A7AD',
  marginBottom: 8,
  letterSpacing: 0.4,
  textTransform: 'uppercase' as const,
}
