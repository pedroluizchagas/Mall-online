import { View, Text, TouchableOpacity, Linking, ActivityIndicator } from 'react-native'
import { formatarReais } from '@mallora/lib'

interface Props {
  saldo: { disponivel: number; pendente: number } | null
  linkExpress: string | null
}

export function CardSaldoStripe({ saldo, linkExpress }: Props) {
  return (
    <View className="mx-5 mb-4 bg-white rounded-2xl border border-gray-100 p-5">
      <Text className="text-xs font-semibold text-gray-400 uppercase mb-3">
        Conta de recebimentos
      </Text>

      {saldo ? (
        <>
          <View className="flex-row gap-4 mb-4">
            <View className="flex-1">
              <Text className="text-xs text-gray-400 mb-0.5">
                Disponível para saque
              </Text>
              <Text className="text-xl font-bold text-[#1A4D3A]">
                {formatarReais(saldo.disponivel)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-400 mb-0.5">
                A receber
              </Text>
              <Text className="text-xl font-bold text-gray-600">
                {formatarReais(saldo.pendente)}
              </Text>
            </View>
          </View>

          {linkExpress && (
            <TouchableOpacity
              onPress={() => Linking.openURL(linkExpress)}
              className="bg-[#1A4D3A] py-3 rounded-xl items-center"
              activeOpacity={0.85}
            >
              <Text className="text-white font-semibold text-sm">
                Acessar conta e sacar
              </Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <View className="items-center py-3">
          <ActivityIndicator color="#4CAF82" />
          <Text className="text-gray-400 text-xs mt-2">
            Carregando saldo...
          </Text>
        </View>
      )}

      <Text className="text-xs text-gray-300 text-center mt-3 leading-4">
        Saques via Stripe. Dados bancários gerenciados com segurança.
      </Text>
    </View>
  )
}
