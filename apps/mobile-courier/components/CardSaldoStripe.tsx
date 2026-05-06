import { View, Text, TouchableOpacity, Linking, ActivityIndicator } from 'react-native'
import { formatarReais } from '@mallora/lib'
import { CourierIcon } from '@/components/CourierIcon'
import { courierDesign } from '@/lib/courier-design'

interface Props {
  saldo: { disponivel: number; pendente: number } | null
  linkExpress: string | null
}

export function CardSaldoStripe({ saldo, linkExpress }: Props) {
  const { colors, radius } = courierDesign

  return (
    <View style={{
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: colors.ink,
      borderRadius: radius.lg,
      padding: 20,
    }}>
      <Text style={{
        fontSize: 11,
        fontWeight: '700',
        color: colors.inkSoft,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 16,
      }}>
        Conta de recebimentos
      </Text>

      {saldo ? (
        <>
          <View style={{ flexDirection: 'row', gap: 20, marginBottom: 18 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 4 }}>
                Disponível para saque
              </Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.accent, letterSpacing: -0.4 }}>
                {formatarReais(saldo.disponivel)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 4 }}>
                A receber
              </Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.white, letterSpacing: -0.4 }}>
                {formatarReais(saldo.pendente)}
              </Text>
            </View>
          </View>

          {linkExpress && (
            <TouchableOpacity
              onPress={() => Linking.openURL(linkExpress)}
              activeOpacity={0.85}
              style={{
                height: 44,
                borderRadius: radius.pill,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <CourierIcon name="wallet" size={15} color={colors.ink} strokeWidth={2.1} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>
                Acessar conta e sacar
              </Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <ActivityIndicator color={colors.accent} />
          <Text style={{ fontSize: 12, color: colors.inkSoft, marginTop: 8 }}>
            Carregando saldo…
          </Text>
        </View>
      )}

      <Text style={{
        fontSize: 11,
        color: colors.lineDark,
        textAlign: 'center',
        marginTop: 14,
        lineHeight: 16,
      }}>
        Saques via Stripe · Dados gerenciados com segurança
      </Text>
    </View>
  )
}
