import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { formatarReais } from '@mallora/lib'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign, softColor } from '@/lib/consumer-design'

const { colors, radius } = consumerDesign

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
    <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: colors.inkMuted,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        Parcelamento
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 260 }}>
        <View style={{ gap: 8 }}>
          {opcoes.map((op) => {
            const ativo = selecionado === op.n
            return (
              <TouchableOpacity
                key={op.n}
                onPress={() => onSelecionar(op.n)}
                activeOpacity={consumerDesign.opacity.pressedSoft}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  borderRadius: radius.md,
                  backgroundColor: ativo ? softColor(colors.accent) : colors.surface,
                  borderWidth: ativo ? 1.5 : 1,
                  borderColor: ativo ? colors.accent : colors.line,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: ativo ? colors.ink : colors.line,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: ativo ? colors.ink : 'transparent',
                  }}
                >
                  {ativo && (
                    <ConsumerIcon
                      name="check"
                      size={12}
                      color={colors.accent}
                      strokeWidth={2.5}
                    />
                  )}
                </View>

                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text
                    style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}
                  >
                    {op.n}× de {formatarReais(op.valorParcela)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: op.semJuros ? colors.success : colors.inkMuted,
                    }}
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

      <Text
        style={{
          fontSize: 12,
          color: colors.inkSoft,
          marginTop: 12,
          fontWeight: '500',
        }}
      >
        Valores indicativos. O valor final pode variar conforme o emissor do cartão.
      </Text>
    </View>
  )
}
