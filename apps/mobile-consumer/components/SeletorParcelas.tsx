import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { formatarReais } from '@mallora/lib'

interface Props {
  total: number
  selecionado: number
  onSelecionar: (parcelas: number) => void
  maxParcelas?: number
  parcelasSemJuros?: number
}

const TAXA_JUROS_MENSAL = 0.025

function calcularValorParcela(total: number, parcelas: number, semJuros: number) {
  if (parcelas <= semJuros) {
    return Math.round(total / parcelas)
  }
  const i = TAXA_JUROS_MENSAL
  const fator = (i * Math.pow(1 + i, parcelas)) / (Math.pow(1 + i, parcelas) - 1)
  return Math.round(total * fator)
}

export function SeletorParcelas({
  total,
  selecionado,
  onSelecionar,
  maxParcelas = 12,
  parcelasSemJuros = 3,
}: Props) {
  const opcoes = Array.from({ length: maxParcelas }, (_, idx) => {
    const n = idx + 1
    const valorParcela = calcularValorParcela(total, n, parcelasSemJuros)
    const semJuros = n <= parcelasSemJuros
    return { n, valorParcela, semJuros }
  })

  return (
    <View className="bg-white border-t border-b border-gray-100 px-5 py-4 mt-4">
      <Text className="text-sm font-semibold text-gray-700 mb-3">
        Parcelamento
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 260 }}>
        <View className="gap-2">
          {opcoes.map((op) => {
            const ativo = selecionado === op.n
            return (
              <TouchableOpacity
                key={op.n}
                onPress={() => onSelecionar(op.n)}
                className={`flex-row items-center gap-3 p-3 rounded-2xl border ${
                  ativo
                    ? 'border-verde-medio bg-green-50'
                    : 'border-gray-100'
                }`}
                activeOpacity={0.75}
              >
                <View
                  className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                    ativo ? 'border-verde-medio' : 'border-gray-300'
                  }`}
                >
                  {ativo && (
                    <View className="w-2.5 h-2.5 rounded-full bg-verde-medio" />
                  )}
                </View>

                <View className="flex-1 flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-gray-800">
                    {op.n}x de {formatarReais(op.valorParcela)}
                  </Text>
                  <Text
                    className={`text-xs ${
                      op.semJuros ? 'text-verde-medio' : 'text-gray-400'
                    }`}
                  >
                    {op.semJuros
                      ? 'sem juros'
                      : `total ${formatarReais(op.valorParcela * op.n)}`}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>

      <Text className="text-xs text-gray-400 mt-3">
        Valores indicativos. O valor final pode variar conforme o emissor do
        cartão.
      </Text>
    </View>
  )
}
