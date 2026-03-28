import { useEffect, useRef, useState } from 'react'
import { View, ScrollView, Dimensions, Text } from 'react-native'

const { width } = Dimensions.get('window')
const LARGURA_BANNER = width - 40 // padding de 20 em cada lado

const BANNERS = [
  { id: '1', cor: '#1A4D3A', titulo: 'Frete grátis no primeiro pedido', subtitulo: 'Use o código BEMVINDO' },
  { id: '2', cor: '#4CAF82', titulo: 'Novos restaurantes esta semana', subtitulo: 'Confira as novidades' },
  { id: '3', cor: '#F5A623', titulo: 'Pague com PIX e economize', subtitulo: 'Aceito em todas as lojas' },
]

export function BannerCarousel() {
  const [indice, setIndice] = useState(0)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      const proximo = (indice + 1) % BANNERS.length
      scrollRef.current?.scrollTo({
        x: proximo * LARGURA_BANNER + proximo * 12,
        animated: true,
      })
      setIndice(proximo)
    }, 4000)
    return () => clearInterval(timer)
  }, [indice])

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled={false}
        decelerationRate="fast"
        snapToInterval={LARGURA_BANNER + 12}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(
            e.nativeEvent.contentOffset.x / (LARGURA_BANNER + 12)
          )
          setIndice(i)
        }}
      >
        {BANNERS.map((banner) => (
          <View
            key={banner.id}
            style={{
              width: LARGURA_BANNER,
              backgroundColor: banner.cor,
              borderRadius: 16,
              padding: 20,
              height: 110,
              justifyContent: 'flex-end',
            }}
          >
            <Text className="text-white font-bold text-base">
              {banner.titulo}
            </Text>
            <Text className="text-white/70 text-sm mt-0.5">
              {banner.subtitulo}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Indicadores */}
      <View className="flex-row justify-center gap-1.5 mt-3">
        {BANNERS.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === indice ? 16 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === indice ? '#1A4D3A' : '#D1D5DB',
            }}
          />
        ))}
      </View>
    </View>
  )
}
