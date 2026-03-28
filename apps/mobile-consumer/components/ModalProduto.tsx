import { useState } from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native'
import { useCartStore } from '@/store/useCartStore'
import { formatarReais } from '@mallora/lib'

const { height } = Dimensions.get('window')

interface Produto {
  id: string
  nome: string
  descricao: string | null
  preco: number
  preco_promocional: number | null
  foto_url: string | null
}

interface Loja {
  id: string
  nome: string
  slug: string
  taxa_entrega: number
}

interface Props {
  produto: Produto
  loja: Loja
  onFechar: () => void
}

export function ModalProduto({ produto, loja, onFechar }: Props) {
  const [quantidade, setQuantidade] = useState(1)
  const [observacoes, setObservacoes] = useState('')
  const [trocandoLoja, setTrocandoLoja] = useState(false)
  const adicionarItem = useCartStore((s) => s.adicionarItem)
  const storeAtual = useCartStore((s) => s.store_id)

  const preco = produto.preco_promocional ?? produto.preco
  const totalItem = preco * quantidade

  function handleAdicionar() {
    // Se tem itens de outra loja, confirmar antes de trocar
    if (storeAtual && storeAtual !== loja.id) {
      setTrocandoLoja(true)
      return
    }

    confirmarAdicao()
  }

  function confirmarAdicao() {
    adicionarItem(
      {
        product_id: produto.id,
        nome: produto.nome,
        preco,
        quantidade,
        foto_url: produto.foto_url ?? undefined,
        observacoes: observacoes.trim() || undefined,
      },
      loja.id,
      loja.nome,
      loja.taxa_entrega
    )
    setTrocandoLoja(false)
    onFechar()
  }

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onFechar}
    >
      <TouchableOpacity
        className="flex-1 bg-black/40"
        activeOpacity={1}
        onPress={onFechar}
      />

      <View
        className="bg-white rounded-t-3xl overflow-hidden"
        style={{ maxHeight: height * 0.85 }}
      >
        <ScrollView bounces={false}>
          {/* Foto */}
          {produto.foto_url && (
            <Image
              source={{ uri: produto.foto_url }}
              className="w-full h-52"
              resizeMode="cover"
            />
          )}

          <View className="p-5">
            <Text className="text-xl font-bold text-gray-800">
              {produto.nome}
            </Text>

            {produto.descricao && (
              <Text className="text-gray-500 mt-2 leading-6">
                {produto.descricao}
              </Text>
            )}

            <View className="flex-row items-center gap-2 mt-3">
              <Text className="text-xl font-bold text-verde-profundo">
                {formatarReais(preco)}
              </Text>
              {produto.preco_promocional && (
                <Text className="text-base text-gray-300 line-through">
                  {formatarReais(produto.preco)}
                </Text>
              )}
            </View>

            {/* Observações */}
            <View className="mt-5">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Observações (opcional)
              </Text>
              <TextInput
                value={observacoes}
                onChangeText={setObservacoes}
                placeholder="Ex: sem cebola, ponto da carne..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={2}
                className="border border-gray-200 rounded-xl px-4 py-3
                  text-sm text-gray-700"
                style={{ textAlignVertical: 'top' }}
              />
            </View>

            {/* Quantidade */}
            <View className="flex-row items-center justify-between mt-5">
              <Text className="text-sm font-medium text-gray-700">
                Quantidade
              </Text>
              <View className="flex-row items-center gap-4">
                <TouchableOpacity
                  onPress={() => setQuantidade((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-full border border-gray-200
                    items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-xl text-gray-600 leading-none">−</Text>
                </TouchableOpacity>

                <Text className="text-lg font-bold text-gray-800 w-6 text-center">
                  {quantidade}
                </Text>

                <TouchableOpacity
                  onPress={() => setQuantidade((q) => q + 1)}
                  className="w-9 h-9 rounded-full bg-verde-profundo
                    items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-xl text-white leading-none">+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Botão adicionar */}
        <View className="px-5 pb-8 pt-3 border-t border-gray-50">
          <TouchableOpacity
            onPress={handleAdicionar}
            className="bg-verde-profundo py-4 rounded-2xl flex-row
              items-center justify-between px-5"
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-base">
              Adicionar ao carrinho
            </Text>
            <Text className="text-verde-medio/80 font-semibold">
              {formatarReais(totalItem)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Diálogo de confirmação de troca de loja */}
      {trocandoLoja && (
        <Modal visible transparent animationType="fade">
          <View className="flex-1 bg-black/50 items-center justify-center px-6">
            <View className="bg-white rounded-2xl p-6 w-full">
              <Text className="text-base font-bold text-gray-800 mb-2">
                Trocar de loja?
              </Text>
              <Text className="text-sm text-gray-500 mb-5">
                Seu carrinho atual será esvaziado para adicionar itens
                de {loja.nome}.
              </Text>
              <View className="gap-2">
                <TouchableOpacity
                  onPress={confirmarAdicao}
                  className="bg-verde-profundo py-3 rounded-xl items-center"
                  activeOpacity={0.85}
                >
                  <Text className="text-white font-semibold">
                    Esvaziar e trocar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTrocandoLoja(false)}
                  className="py-3 rounded-xl items-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-gray-500">Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  )
}
