import { View, Text, ActivityIndicator } from 'react-native'
import { formatarReais } from '@mallevo/lib'
import { courierDesign } from '@/lib/courier-design'

interface Props {
  saldo: { disponivel: number; a_receber: number; transferido: number } | null
}

export function CardSaldoPagarme({ saldo }: Props) {
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
        Saldo Pagar.me
      </Text>

      {saldo ? (
        <>
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 6 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 4 }}>
                Disponível
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
                {formatarReais(saldo.a_receber)}
              </Text>
            </View>
          </View>

          <Text style={{
            fontSize: 12,
            color: colors.inkSoft,
            marginTop: 14,
          }}>
            Transferido até hoje:{' '}
            <Text style={{ color: colors.white, fontWeight: '700' }}>
              {formatarReais(saldo.transferido)}
            </Text>
          </Text>
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
        Repasses automáticos via Pagar.me · Dados gerenciados com segurança
      </Text>
    </View>
  )
}
