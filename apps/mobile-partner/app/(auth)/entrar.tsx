import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { abrirNoDashboard } from '@/lib/links'
import { GlowNeon, useFontesMarquee, estiloMicroMudo } from '@/components/marquise/Marquise'
import { Input } from '@/components/ui/Input'
import { Botao } from '@/components/ui/Botao'
import { partnerDesign } from '@/lib/partner-design'

/**
 * Entrar — a fachada noturna inteira: `marquee` + GlowNeon, statement em
 * Plus Jakarta Sans com a linha acesa em itálico accent (o gesto do
 * "futuro" do login web), campos `Input fundoEscuro` (teclado escuro,
 * caret accent) e CTA accent. Mesmo lojista do Dashboard; sem cadastro no
 * app (onboarding é web). docs/partner-app/04-stage-2-auth-gate.md
 */
export default function TelaEntrar() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const insets = useSafeAreaInsets()
  const fontes = useFontesMarquee()
  const { colors } = partnerDesign

  async function handleEntrar() {
    if (!email.trim()) {
      setErro('Digite seu email.')
      return
    }
    if (!senha) {
      setErro('Digite sua senha.')
      return
    }

    setCarregando(true)
    setErro(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    })

    setCarregando(false)

    if (error) {
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        setErro('Email ou senha incorretos.')
      } else {
        setErro('Não foi possível entrar. Tente novamente.')
      }
    }
    // Sucesso: onAuthStateChange no _layout.tsx cuida da navegação
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.marquee }}>
      <StatusBar style="light" />
      <GlowNeon />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 32,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 28 }}>
            <Image
              source={require('../../assets/logoGreen.png')}
              resizeMode="contain"
              style={{ width: 176, height: 28, marginBottom: 32 }}
              accessibilityLabel="Mallevo"
            />

            <Text style={estiloMicroMudo}>App do lojista</Text>
            <Text
              style={[
                fontes.statement,
                {
                  fontSize: 34,
                  lineHeight: 39,
                  color: colors.white,
                  letterSpacing: -0.8,
                  marginTop: 8,
                },
              ]}
            >
              Sua loja,{'\n'}
              <Text style={[fontes.acento, { color: colors.accent }]}>na palma da mão.</Text>
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: colors.marqueeInkSoft,
                lineHeight: 21,
                marginTop: 10,
              }}
            >
              Use o mesmo email e senha do Dashboard.
            </Text>
          </View>

          <View style={{ gap: 14 }}>
            <Input
              rotulo="Email"
              valor={email}
              aoMudar={(t) => {
                setEmail(t)
                setErro(null)
              }}
              placeholder="seu@email.com"
              tipo="email"
              fundoEscuro
            />
            <Input
              rotulo="Senha"
              valor={senha}
              aoMudar={(t) => {
                setSenha(t)
                setErro(null)
              }}
              placeholder="Sua senha"
              tipo="senha"
              fundoEscuro
              erro={erro ?? undefined}
            />

            <View style={{ marginTop: 6 }}>
              <Botao label="Entrar" onPress={() => void handleEntrar()} carregando={carregando} />
            </View>

            <TouchableOpacity
              onPress={() => abrirNoDashboard('/onboarding')}
              activeOpacity={partnerDesign.opacity.pressedSoft}
              accessibilityRole="link"
              style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 14.5, color: colors.marqueeInkSoft, fontWeight: '500' }}>
                Não tem conta?{' '}
                <Text style={{ color: colors.accent, fontWeight: '700' }}>Cadastre sua loja</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
