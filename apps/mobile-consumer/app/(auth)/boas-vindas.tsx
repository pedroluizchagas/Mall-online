import { useRef, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  Dimensions,
  TouchableOpacity,
} from 'react-native'
import { router } from 'expo-router'

const { width } = Dimensions.get('window')

const SLIDES = [
  {
    id: '1',
    titulo: 'Seu bairro na palma da mão',
    descricao:
      'Peça de restaurantes, mercados e lojas locais de Divinópolis sem sair de casa.',
    cor: '#1A4D3A',
  },
  {
    id: '2',
    titulo: 'Apoie o comércio local',
    descricao:
      'Cada pedido fortalece um negócio da sua cidade. Sem taxas absurdas para os lojistas.',
    cor: '#4CAF82',
  },
  {
    id: '3',
    titulo: 'Rápido e seguro',
    descricao:
      'Pague com cartão ou PIX. Acompanhe o entregador em tempo real até sua porta.',
    cor: '#F5A623',
  },
]

export default function TelaBoasVindas() {
  const [indiceAtual, setIndiceAtual] = useState(0)
  const listRef = useRef<FlatList>(null)

  function handleProximo() {
    if (indiceAtual < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: indiceAtual + 1 })
      setIndiceAtual((prev) => prev + 1)
    } else {
      router.replace('/(auth)/entrar')
    }
  }

  return (
    <View className="flex-1 bg-creme">
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width)
          setIndiceAtual(index)
        }}
        renderItem={({ item }) => (
          <View
            style={{ width }}
            className="flex-1 items-center justify-center px-8"
          >
            <View
              className="w-48 h-48 rounded-full mb-10 items-center justify-center"
              style={{ backgroundColor: item.cor + '20' }}
            >
              <View
                className="w-24 h-24 rounded-full"
                style={{ backgroundColor: item.cor }}
              />
            </View>

            <Text className="text-2xl font-bold text-verde-profundo text-center mb-3">
              {item.titulo}
            </Text>
            <Text className="text-gray-500 text-center leading-6">
              {item.descricao}
            </Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />

      {/* Indicadores de página */}
      <View className="flex-row justify-center gap-2 mb-6">
        {SLIDES.map((_, i) => (
          <View
            key={i}
            className="h-2 rounded-full"
            style={{
              width: i === indiceAtual ? 20 : 8,
              backgroundColor: i === indiceAtual ? '#1A4D3A' : '#D1D5DB',
            }}
          />
        ))}
      </View>

      {/* Botões */}
      <View className="px-6 pb-10 gap-3">
        <TouchableOpacity
          onPress={handleProximo}
          className="bg-verde-profundo py-4 rounded-2xl items-center"
          activeOpacity={0.85}
        >
          <Text className="text-white font-semibold text-base">
            {indiceAtual < SLIDES.length - 1 ? 'Próximo' : 'Começar'}
          </Text>
        </TouchableOpacity>

        {indiceAtual < SLIDES.length - 1 && (
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/entrar')}
            className="py-3 items-center"
            activeOpacity={0.7}
          >
            <Text className="text-gray-400 text-sm">Pular</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}
