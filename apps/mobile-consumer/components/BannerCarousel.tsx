import { useEffect, useRef, useState } from 'react'
import { View, ScrollView, Dimensions, Text, TouchableOpacity } from 'react-native'
import { consumerDesign } from '@/lib/consumer-design'

/**
 * Carrossel auto-rotativo de banners no topo do home.
 *
 * Spec: docs/system-design/consumer/04-componentes-dominio.md §7
 */

const { colors, radius } = consumerDesign

const { width } = Dimensions.get('window')
const PAD_LATERAL = 20
const GAP = 12
const LARGURA_BANNER = width - PAD_LATERAL * 2

export type BannerTom = 'primario' | 'sucesso' | 'destaque'

export interface Banner {
  id: string
  tom: BannerTom
  tag: string
  titulo: string
  subtitulo: string
  aoTocar?: () => void
}

interface Props {
  banners: Banner[]
  /** ms entre slides automáticos. Default 4000. */
  intervalo?: number
}

const TOM_BG: Record<BannerTom, string> = {
  primario: colors.ink,
  sucesso: colors.success,
  destaque: colors.surfaceDark,
}

const TOM_TEXTO: Record<BannerTom, string> = {
  primario: colors.white,
  sucesso: colors.ink,
  destaque: colors.white,
}

const TOM_ACCENT: Record<BannerTom, string> = {
  primario: colors.accent,
  sucesso: colors.ink,
  destaque: colors.accent,
}

export function BannerCarousel({ banners, intervalo = 4000 }: Props) {
  const [indice, setIndice] = useState(0)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(() => {
      const proximo = (indice + 1) % banners.length
      scrollRef.current?.scrollTo({
        x: proximo * (LARGURA_BANNER + GAP),
        animated: true,
      })
      setIndice(proximo)
    }, intervalo)
    return () => clearInterval(timer)
  }, [indice, banners.length, intervalo])

  if (banners.length === 0) return null

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={LARGURA_BANNER + GAP}
        contentContainerStyle={{ paddingHorizontal: PAD_LATERAL, gap: GAP }}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / (LARGURA_BANNER + GAP))
          setIndice(i)
        }}
      >
        {banners.map((banner) => {
          const corFundo = TOM_BG[banner.tom]
          const corTexto = TOM_TEXTO[banner.tom]
          const corAccent = TOM_ACCENT[banner.tom]

          return (
            <TouchableOpacity
              key={banner.id}
              onPress={banner.aoTocar}
              disabled={!banner.aoTocar}
              activeOpacity={consumerDesign.opacity.pressed}
              style={{
                width: LARGURA_BANNER,
                backgroundColor: corFundo,
                borderRadius: radius.lg,
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
                  borderRadius: radius.pill,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text
                  style={{
                    color: corAccent,
                    fontSize: 11,
                    fontWeight: '700',
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
                    color: corTexto,
                    fontSize: 17,
                    fontWeight: '800',
                    lineHeight: 22,
                    letterSpacing: -0.2,
                  }}
                >
                  {banner.titulo}
                </Text>
                <Text
                  style={{
                    color: corTexto,
                    opacity: 0.65,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  {banner.subtitulo}
                </Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Indicadores */}
      {banners.length > 1 && (
        <View
          style={{
            position: 'absolute',
            bottom: 12,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
          }}
          pointerEvents="none"
        >
          {banners.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === indice ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  i === indice ? colors.accent : 'rgba(255, 255, 255, 0.35)',
              }}
            />
          ))}
        </View>
      )}
    </View>
  )
}
