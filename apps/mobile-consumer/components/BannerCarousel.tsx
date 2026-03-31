import { useEffect, useRef, useState } from 'react'
import { View, ScrollView, Dimensions, Text } from 'react-native'

const { width } = Dimensions.get('window')
const LARGURA_BANNER = width - 40

const BANNERS = [
  {
    id: '1',
    cor: '#1A4D3A',
    tag: 'Novidade',
    titulo: 'Frete grátis no primeiro pedido',
    subtitulo: 'Use o código BEMVINDO',
  },
  {
    id: '2',
    cor: '#1E3A5F',
    tag: 'Novos',
    titulo: 'Novos restaurantes esta semana',
    subtitulo: 'Confira as novidades',
  },
  {
    id: '3',
    cor: '#7C3D0F',
    tag: 'Promoção',
    titulo: 'Pague com PIX e economize',
    subtitulo: 'Aceito em todas as lojas',
  },
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
              borderRadius: 20,
              padding: 20,
              height: 132,
              justifyContent: 'space-between',
              overflow: 'hidden',
            }}
          >
            {/* Círculos decorativos */}
            <View
              style={{
                position: 'absolute',
                right: -28,
                top: -28,
                width: 130,
                height: 130,
                borderRadius: 65,
                backgroundColor: 'rgba(255,255,255,0.07)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                right: 40,
                bottom: -44,
                width: 110,
                height: 110,
                borderRadius: 55,
                backgroundColor: 'rgba(255,255,255,0.04)',
              }}
            />

            {/* Tag */}
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text
                style={{
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: 11,
                  fontWeight: '600',
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                }}
              >
                {banner.tag}
              </Text>
            </View>

            {/* Conteúdo */}
            <View style={{ maxWidth: '78%' }}>
              <Text
                style={{
                  color: '#ffffff',
                  fontSize: 17,
                  fontWeight: '700',
                  lineHeight: 22,
                }}
              >
                {banner.titulo}
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                {banner.subtitulo}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Indicadores */}
      <View className="flex-row justify-center items-center gap-1.5 mt-3">
        {BANNERS.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === indice ? 20 : 6,
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
