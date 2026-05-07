import { useState } from 'react'
import { View, Text, StatusBar } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/components/ui/Botao'
import { Input } from '@/components/ui/Input'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'

const { colors, radius } = consumerDesign

export default function TelaVerificar() {
  const { email } = useLocalSearchParams<{ email: string }>()
  const insets = useSafeAreaInsets()
  const [codigo, setCodigo] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const [erro, setErro] = useState<string | undefined>(undefined)

  async function handleVerificar() {
    if (codigo.length !== 6) {
      setErro('Digite os 6 dígitos do código.')
      return
    }

    setCarregando(true)
    setErro(undefined)

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: codigo,
      type: 'email',
    })

    setCarregando(false)

    if (error) {
      setErro('Código inválido ou expirado. Tente novamente.')
      return
    }

    router.replace('/(tabs)')
  }

  async function handleReenviar() {
    if (!email) return
    setReenviando(true)
    setErro(undefined)
    await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setReenviando(false)
    setCodigo('')
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surfaceDark,
        paddingHorizontal: 24,
        paddingTop: insets.top + 64,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <StatusBar barStyle="light-content" />

      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: radius.pill,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <ConsumerIcon
            name="check-circle"
            size={36}
            color={colors.accent}
            strokeWidth={1.8}
          />
        </View>

        <Text
          style={{
            fontSize: 26,
            fontWeight: '800',
            color: colors.white,
            letterSpacing: -0.5,
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          Verifique seu email
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: colors.inkSoft,
            textAlign: 'center',
            lineHeight: 22,
            fontWeight: '500',
          }}
        >
          Enviamos um código de 6 dígitos para{'\n'}
          <Text style={{ fontWeight: '700', color: colors.white }}>
            {email}
          </Text>
        </Text>
      </View>

      <Input
        rotulo="Código de verificação"
        valor={codigo}
        aoMudar={(t) => {
          setCodigo(t.replace(/\D/g, '').slice(0, 6))
          setErro(undefined)
        }}
        placeholder="000000"
        tipo="numero"
        maxLength={6}
        fundoEscuro
        erro={erro}
      />

      <View style={{ flex: 1 }} />

      <View style={{ gap: 8 }}>
        <Botao
          label="Confirmar"
          variante="primario"
          tamanho="lg"
          carregando={carregando}
          desabilitado={codigo.length !== 6}
          onPress={handleVerificar}
        />
        <Botao
          label={reenviando ? 'Reenviando...' : 'Reenviar código'}
          variante="ghost"
          tamanho="md"
          desabilitado={reenviando}
          onPress={handleReenviar}
        />
        <Botao
          label="Voltar e trocar email"
          variante="ghost"
          tamanho="md"
          onPress={() => router.back()}
        />
      </View>
    </View>
  )
}
