import { View, Text, TouchableOpacity } from 'react-native'
import { useCartStore } from '@/store/useCartStore'
import { formatarReais } from '@mallora/lib'
import type { ItemCarrinho } from '@mallora/types'

export function ItemCarrinhoCard({ item }: { item: ItemCarrinho }) {
  const { aumentarQuantidade, diminuirQuantidade, removerItem } = useCartStore()

  return (
    <View className="flex-row items-center gap-4 px-5 py-4 border-b border-gray-50">
      <View className="flex-1 min-w-0">
        <Text
          className="text-sm font-semibold text-gray-800"
          numberOfLines={1}
        >
          {item.nome}
        </Text>
        {item.observacoes && (
          <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
            {item.observacoes}
          </Text>
        )}
        <Text className="text-sm font-bold text-verde-profundo mt-1">
          {formatarReais(item.preco * item.quantidade)}
        </Text>
      </View>

      {/* Controle de quantidade */}
      <View className="flex-row items-center gap-3">
        <TouchableOpacity
          onPress={() =>
            item.quantidade === 1
              ? removerItem(item.product_id)
              : diminuirQuantidade(item.product_id)
          }
          className="w-8 h-8 rounded-full border border-gray-200 items-center justify-center"
          activeOpacity={0.7}
        >
          <Text className="text-lg text-gray-500 leading-none">
            {item.quantidade === 1 ? '×' : '−'}
          </Text>
        </TouchableOpacity>

        <Text className="text-sm font-bold text-gray-800 w-5 text-center">
          {item.quantidade}
        </Text>

        <TouchableOpacity
          onPress={() => aumentarQuantidade(item.product_id)}
          className="w-8 h-8 rounded-full bg-verde-profundo items-center justify-center"
          activeOpacity={0.7}
        >
          <Text className="text-lg text-white leading-none">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
