import { useRef, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  Dimensions,
  StatusBar,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Botao } from '@/components/ui/Botao'
import { ConsumerIcon, ConsumerIconName } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'

const { colors, radius } = consumerDesign

const { width } = Dimensions.get('window')

interface Slide {
  id: string
  icone: ConsumerIconName
  titulo: string
  descricao: string
}

const SLIDES: Slide[] = [
  {
    id: '1',
    icone: 'bag',
    titulo: 'Seu bairro na palma da mão',
    descricao:
      'Peça de restaurantes, mercados e lojas locais sem sair de casa.',
  },
  {
    id: '2',
    icone: 'store',
    titulo: 'Apoie o comércio local',
    descricao:
      'Cada pedido fortalece um negócio da sua cidade.',
  },
  {
    id: '3',
    icone: 'spark',
    titulo: 'Rápido e seguro',
    descricao:
      'Pague com cartão ou Pix. Acompanhe sua entrega em tempo real.',
  },
]

export default function TelaBoasVindas() {
  const [indiceAtual, setIndiceAtual] = useState(0)
  const listRef = useRef<FlatList>(null)
  const insets = useSafeAreaInsets()

  function handleProximo() {
    if (indiceAtual < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: indiceAtual + 1 })
      setIndiceAtual((prev) => prev + 1)
    } else {
      router.replace('/(auth)/entrar')
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceDark }}>
      <StatusBar barStyle="light-content" />

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
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              width,
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 32,
            }}
          >
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: radius.pill,
                backgroundColor: colors.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 32,
              }}
            >
              <ConsumerIcon
                name={item.icone}
                size={44}
                color={colors.accent}
                strokeWidth={1.6}
              />
            </View>
            <Text
              style={{
                fontSize: 32,
                fontWeight: '800',
                color: colors.white,
                letterSpacing: -0.5,
                textAlign: 'center',
                marginBottom: 12,
              }}
            >
              {item.titulo}
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: colors.inkSoft,
                textAlign: 'center',
                lineHeight: 22,
                maxWidth: 320,
                fontWeight: '500',
              }}
            >
              {item.descricao}
            </Text>
          </View>
        )}
      />

      {/* Indicadores */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
          marginBottom: 24,
        }}
      >
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={{
              height: 8,
              borderRadius: 4,
              width: i === indiceAtual ? 20 : 8,
              backgroundColor:
                i === indiceAtual ? colors.accent : colors.lineDark,
            }}
          />
        ))}
      </View>

      {/* Ações */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 24,
          gap: 12,
        }}
      >
        <Botao
          label={indiceAtual < SLIDES.length - 1 ? 'Próximo' : 'Começar'}
          variante="primario"
          tamanho="lg"
          onPress={handleProximo}
        />
        {indiceAtual < SLIDES.length - 1 && (
          <Botao
            label="Pular"
            variante="ghost"
            tamanho="md"
            onPress={() => router.replace('/(auth)/entrar')}
          />
        )}
      </View>
    </View>
  )
}
