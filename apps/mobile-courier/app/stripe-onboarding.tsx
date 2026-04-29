import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { CourierIcon } from '@/components/CourierIcon'
import { courierDesign } from '@/lib/courier-design'

const REQUISITOS = [
  { icon: 'user'  as const, label: 'CPF e dados pessoais' },
  { icon: 'cash'  as const, label: 'Conta bancária ou chave PIX' },
  { icon: 'phone' as const, label: 'Celular para verificação' },
]

export default function TelaStripeOnboarding() {
  const { courier, setCourier } = useAuthStore()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const { colors, radius } = courierDesign

  async function handleIniciarOnboarding() {
    setCarregando(true)
    setErro(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setErro('Sessão expirada. Faça login novamente.')
      setCarregando(false)
      return
    }

    const resposta = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/onboard-courier`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    )

    const resultado = await resposta.json()
    setCarregando(false)

    if (!resposta.ok) {
      setErro(resultado.error ?? 'Erro ao iniciar configuração.')
      return
    }

    await Linking.openURL(resultado.stripe_onboarding_url)
  }

  async function handleVerificarStatus() {
    if (!courier?.id) return
    setCarregando(true)

    const { data } = await supabase
      .from('couriers')
      .select('stripe_onboarding_ok')
      .eq('id', courier.id)
      .single()

    setCarregando(false)

    if (data?.stripe_onboarding_ok) {
      setCourier({ ...courier, stripe_onboarding_ok: true })
      router.back()
    } else {
      setErro('Configuração ainda não concluída. Verifique se completou todos os passos no Stripe.')
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surfaceDark }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 52 }}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" />

      {/* Botão de voltar */}
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.7}
        style={{ marginBottom: 36 }}
      >
        <CourierIcon name="back" size={24} color={colors.white} />
      </TouchableOpacity>

      {/* Ícone principal */}
      <View style={{
        width: 68,
        height: 68,
        borderRadius: radius.lg,
        backgroundColor: colors.surfaceDarkSoft,
        borderWidth: 1,
        borderColor: colors.lineDark,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
      }}>
        <CourierIcon name="wallet" size={30} color={colors.accent} strokeWidth={1.6} />
      </View>

      {/* Título e descrição */}
      <Text style={{
        fontSize: 30,
        fontWeight: '800',
        color: colors.white,
        letterSpacing: -0.6,
        lineHeight: 36,
        marginBottom: 12,
      }}>
        Configure seus{'\n'}recebimentos
      </Text>
      <Text style={{
        fontSize: 15,
        color: colors.inkSoft,
        lineHeight: 24,
        marginBottom: 36,
      }}>
        Para receber seus pagamentos, configure sua conta bancária via Stripe. O processo é rápido e seguro.
      </Text>

      {/* Card de requisitos */}
      <View style={{
        backgroundColor: colors.surfaceDarkSoft,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.lineDark,
        padding: 20,
        marginBottom: 12,
      }}>
        <Text style={{
          fontSize: 11,
          fontWeight: '700',
          color: colors.inkSoft,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          marginBottom: 6,
        }}>
          O que você vai precisar
        </Text>

        {REQUISITOS.map(({ icon, label }, i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingVertical: 12,
              borderTopWidth: i > 0 ? 1 : 0,
              borderTopColor: colors.lineDark,
              marginTop: i === 0 ? 12 : 0,
            }}
          >
            <View style={{
              width: 34,
              height: 34,
              borderRadius: radius.sm,
              backgroundColor: colors.surfaceDark,
              borderWidth: 1,
              borderColor: colors.lineDark,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CourierIcon name={icon} size={16} color={colors.inkSoft} strokeWidth={1.8} />
            </View>
            <Text style={{ fontSize: 14, color: colors.inkMuted, flex: 1 }}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* Nota de segurança */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.surfaceDarkSoft,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.lineDark,
        paddingHorizontal: 16,
        paddingVertical: 13,
        marginBottom: 32,
      }}>
        <CourierIcon name="shield" size={15} color={colors.inkSoft} strokeWidth={1.8} />
        <Text style={{ fontSize: 13, color: colors.inkSoft, flex: 1, lineHeight: 19 }}>
          Seus dados bancários são armazenados com segurança pela Stripe. A plataforma não tem acesso.
        </Text>
      </View>

      {/* Banner de erro */}
      {erro && (
        <View style={{
          backgroundColor: 'rgba(255,109,94,0.10)',
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: 'rgba(255,109,94,0.2)',
          paddingHorizontal: 14,
          paddingVertical: 11,
          marginBottom: 16,
        }}>
          <Text style={{ color: colors.danger, fontSize: 13, lineHeight: 19 }}>{erro}</Text>
        </View>
      )}

      {/* CTA primário */}
      <TouchableOpacity
        onPress={handleIniciarOnboarding}
        disabled={carregando}
        activeOpacity={0.85}
        style={{
          height: 56,
          borderRadius: radius.pill,
          backgroundColor: carregando ? colors.accentStrong : colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
          opacity: carregando ? 0.8 : 1,
        }}
      >
        {carregando ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>
            Configurar conta de recebimentos
          </Text>
        )}
      </TouchableOpacity>

      {/* CTA secundário */}
      <TouchableOpacity
        onPress={handleVerificarStatus}
        disabled={carregando}
        activeOpacity={0.75}
        style={{
          height: 56,
          borderRadius: radius.pill,
          borderWidth: 1.5,
          borderColor: colors.lineDark,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.inkSoft }}>
          Já configurei — verificar status
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}
