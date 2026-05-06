import { useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { CourierIcon } from '@/components/CourierIcon'
import { courierDesign } from '@/lib/courier-design'

const PASSOS = [
  { icon: 'shield'  as const, label: 'Documentação verificada pela nossa equipe' },
  { icon: 'spark'   as const, label: 'Notificação enviada por email ao aprovar' },
  { icon: 'wallet'  as const, label: 'Configure sua conta de recebimentos' },
  { icon: 'route'   as const, label: 'Pronto para receber entregas' },
]

export default function TelaAguardandoAprovacao() {
  const { courier, setCourier } = useAuthStore()
  const { colors, radius } = courierDesign

  // Pulso sutil no indicador de status
  const pulso = useRef(new Animated.Value(1)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [])

  // Polling de aprovação a cada 15 s
  useEffect(() => {
    if (!courier?.id) return

    const intervalo = setInterval(async () => {
      const { data } = await supabase
        .from('couriers')
        .select('status')
        .eq('id', courier.id)
        .single()

      if (data?.status === 'aprovado') {
        setCourier({ ...courier, status: 'aprovado' })
        clearInterval(intervalo)
        router.replace('/(tabs)')
      }
    }, 15000)

    return () => clearInterval(intervalo)
  }, [courier?.id])

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surfaceDark }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 72, paddingBottom: 52 }}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" />

      {/* Badge de status */}
      <View style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        backgroundColor: 'rgba(242,184,75,0.12)',
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: 'rgba(242,184,75,0.25)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginBottom: 36,
      }}>
        <Animated.View style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.warning,
          opacity: pulso,
        }} />
        <Text style={{
          fontSize: 11,
          fontWeight: '700',
          color: colors.warning,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}>
          Em análise
        </Text>
      </View>

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
        <CourierIcon name="shield" size={30} color={colors.warning} strokeWidth={1.6} />
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
        Cadastro{'\n'}em análise
      </Text>
      <Text style={{
        fontSize: 15,
        color: colors.inkSoft,
        lineHeight: 24,
        marginBottom: 36,
      }}>
        Recebemos seus dados e estamos verificando seu cadastro. Você receberá uma notificação assim que for aprovado.
      </Text>

      {/* Card de próximos passos */}
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
          marginBottom: 22,
        }}>
          Próximos passos
        </Text>

        {PASSOS.map(({ icon, label }, i) => {
          const isLast = i === PASSOS.length - 1
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 14 }}>
              {/* Coluna do ícone + conector */}
              <View style={{ alignItems: 'center', width: 34 }}>
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
                {!isLast && (
                  <View style={{
                    width: 1,
                    flex: 1,
                    minHeight: 18,
                    backgroundColor: colors.lineDark,
                    marginVertical: 4,
                  }} />
                )}
              </View>

              {/* Texto do passo */}
              <View style={{ flex: 1, paddingTop: 8, paddingBottom: isLast ? 0 : 18 }}>
                <Text style={{
                  fontSize: 14,
                  color: colors.inkMuted,
                  lineHeight: 21,
                }}>
                  {label}
                </Text>
              </View>
            </View>
          )
        })}
      </View>

      {/* Indicador de verificação automática */}
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
        marginBottom: 44,
      }}>
        <View style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: colors.accent,
          opacity: 0.7,
        }} />
        <Text style={{ fontSize: 13, color: colors.inkSoft, flex: 1 }}>
          Verificando status automaticamente…
        </Text>
      </View>

      {/* Sair da conta */}
      <TouchableOpacity
        onPress={async () => {
          await supabase.auth.signOut()
          router.replace('/(auth)/entrar')
        }}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <CourierIcon name="logout" size={15} color={colors.inkSoft} strokeWidth={1.8} />
        <Text style={{ fontSize: 14, color: colors.inkSoft }}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}
