import { View, Text, TouchableOpacity } from 'react-native'
import { ConsumerIcon, ConsumerIconName } from '@/components/ConsumerIcon'
import { consumerDesign, softColor } from '@/lib/consumer-design'

const { colors, radius } = consumerDesign

type FormaPagamento =
  | 'online_cartao'
  | 'online_pix'
  | 'dinheiro'
  | 'cartao_maquininha'

interface Loja {
  aceita_dinheiro: boolean
  aceita_pix: boolean
  aceita_cartao_maquininha: boolean
  aceita_cartao_online: boolean
}

interface OpcaoPagamento {
  id: FormaPagamento
  label: string
  descricao: string
  icone: ConsumerIconName
  condicao: (loja: Loja) => boolean
}

const OPCOES: OpcaoPagamento[] = [
  {
    id: 'online_cartao',
    label: 'Cartão de crédito',
    descricao: 'Parcele em até 12x — pagamento seguro Pagar.me',
    icone: 'wallet',
    condicao: (l) => l.aceita_cartao_online,
  },
  {
    id: 'online_pix',
    label: 'Pix',
    descricao: 'Aprovação imediata via QR Code',
    icone: 'phone',
    condicao: (l) => l.aceita_pix,
  },
  {
    id: 'dinheiro',
    label: 'Dinheiro na entrega',
    descricao: 'Pague ao receber seu pedido',
    icone: 'cash',
    condicao: (l) => l.aceita_dinheiro,
  },
  {
    id: 'cartao_maquininha',
    label: 'Cartão na maquininha',
    descricao: 'Débito ou crédito na entrega',
    icone: 'wallet',
    condicao: (l) => l.aceita_cartao_maquininha,
  },
]

interface Props {
  loja: Loja
  selecionado: FormaPagamento
  onSelecionar: (forma: FormaPagamento) => void
}

export function SeletorPagamento({ loja, selecionado, onSelecionar }: Props) {
  const opcoesDisponiveis = OPCOES.filter((op) => op.condicao(loja))

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
        Pagamento
      </Text>

      <View style={{ gap: 8 }}>
        {opcoesDisponiveis.map((opcao) => {
          const ativo = selecionado === opcao.id
          return (
            <TouchableOpacity
              key={opcao.id}
              onPress={() => onSelecionar(opcao.id)}
              activeOpacity={consumerDesign.opacity.pressedSoft}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 16,
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

              <ConsumerIcon name={opcao.icone} size={20} color={colors.ink} />

              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}
                >
                  {opcao.label}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.inkMuted,
                    fontWeight: '500',
                  }}
                >
                  {opcao.descricao}
                </Text>
              </View>
            </TouchableOpacity>
          )
        })}

        {opcoesDisponiveis.length === 0 && (
          <Text
            style={{
              fontSize: 14,
              color: colors.inkMuted,
              textAlign: 'center',
              paddingVertical: 16,
              fontWeight: '500',
            }}
          >
            Nenhuma forma de pagamento disponível.
          </Text>
        )}
      </View>
    </View>
  )
}
