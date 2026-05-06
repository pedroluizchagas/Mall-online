import { View, Text, TouchableOpacity } from 'react-native'

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
  condicao: (loja: Loja) => boolean
}

const OPCOES: OpcaoPagamento[] = [
  {
    id: 'online_cartao',
    label: 'Cartão de crédito',
    descricao: 'Parcele em até 12x — pagamento seguro Pagar.me',
    condicao: (l) => l.aceita_cartao_online,
  },
  {
    id: 'online_pix',
    label: 'Pix',
    descricao: 'Aprovação imediata via QR Code',
    condicao: (l) => l.aceita_pix,
  },
  {
    id: 'dinheiro',
    label: 'Dinheiro na entrega',
    descricao: 'Pague ao receber seu pedido',
    condicao: (l) => l.aceita_dinheiro,
  },
  {
    id: 'cartao_maquininha',
    label: 'Cartão na maquininha',
    descricao: 'Débito ou crédito na entrega',
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
    <View className="bg-white border-t border-b border-gray-100 px-5 py-4 mt-4">
      <Text className="text-sm font-semibold text-gray-700 mb-3">
        Forma de pagamento
      </Text>

      <View className="gap-2">
        {opcoesDisponiveis.map((opcao) => (
          <TouchableOpacity
            key={opcao.id}
            onPress={() => onSelecionar(opcao.id)}
            className={`flex-row items-center gap-3 p-4 rounded-2xl border ${
              selecionado === opcao.id
                ? 'border-verde-medio bg-green-50'
                : 'border-gray-100'
            }`}
            activeOpacity={0.75}
          >
            {/* Radio visual */}
            <View
              className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                selecionado === opcao.id
                  ? 'border-verde-medio'
                  : 'border-gray-300'
              }`}
            >
              {selecionado === opcao.id && (
                <View className="w-2.5 h-2.5 rounded-full bg-verde-medio" />
              )}
            </View>

            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-800">
                {opcao.label}
              </Text>
              <Text className="text-xs text-gray-400 mt-0.5">
                {opcao.descricao}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {opcoesDisponiveis.length === 0 && (
          <Text className="text-sm text-gray-400 text-center py-3">
            Nenhuma forma de pagamento disponível.
          </Text>
        )}
      </View>
    </View>
  )
}
