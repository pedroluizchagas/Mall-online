import { useEffect, useRef, useState } from 'react'
import {
  View,
  ScrollView,
  Dimensions,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { consumerDesign } from '@/lib/consumer-design'

/**
 * Carrossel auto-rotativo de banners no topo do home.
 *
 * Uma linguagem formal única: toda peça leva FOTO de fundo com um véu de
 * cor entrando pela esquerda (onde o texto mora). O que muda é a voz:
 * - institucionais — avisos da casa, véu na paleta Mallevo (`tom`);
 * - anúncios (`anuncio`) — mídia de parceiro: o véu veste a cor de MARCA
 *   do anunciante, com o selo "Anúncio" discreto. O carrossel disciplina o
 *   formato (raio, altura 132, régua de texto) — mídia kit de shopping real.
 *
 * Spec: docs/system-design/consumer/04-componentes-dominio.md §7
 */

const { colors, radius } = consumerDesign

const { width } = Dimensions.get('window')
const PAD_LATERAL = 20
const GAP = 12
const LARGURA_BANNER = width - PAD_LATERAL * 2

export type BannerTom = 'primario' | 'sucesso' | 'destaque'

/** Mídia de parceiro: identidade do anunciante, disciplinada pelo formato. */
export interface AnuncioBanner {
  /** Cor-base da MARCA — fundo e véu de leitura sobre a foto. */
  cor: string
  /** Acento da marca (texto da tag). */
  accent: string
}

export interface Banner {
  id: string
  /** Paleta institucional Mallevo. Ignorado quando `anuncio` está presente. */
  tom?: BannerTom
  tag: string
  titulo: string
  subtitulo: string
  /**
   * Foto de fundo (Unsplash de ID fixo, padrão do dataset). O véu usa a cor
   * da voz — tom institucional ou marca. Sem foto = cartaz chapado.
   */
  foto?: string
  /** Presente = o banner é mídia de parceiro (paleta própria + selo "Anúncio"). */
  anuncio?: AnuncioBanner
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
          const anuncio = banner.anuncio
          const tom = banner.tom ?? 'primario'
          // Anúncio fala a paleta do anunciante; institucional, a do Mallevo.
          const corFundo = anuncio ? anuncio.cor : TOM_BG[tom]
          const corTexto = anuncio ? colors.white : TOM_TEXTO[tom]
          const corAccent = anuncio ? anuncio.accent : TOM_ACCENT[tom]

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
              {/* Foto + véu da voz (o texto mora na esquerda) */}
              {banner.foto && (
                <>
                  <Image
                    source={{ uri: banner.foto }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                  />
                  <VeuBanner cor={corFundo} />
                </>
              )}

              {/* Círculos decorativos — só em cartaz sem foto */}
              {!banner.foto && (
                <>
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
                </>
              )}

              {/* Topo: tag + selo de mídia */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View
                  style={{
                    // Sobre foto, a pílula precisa de peso próprio para a
                    // tag não se perder na área clara da imagem — escura
                    // para tag clara, clara quando a voz escreve em ink
                    // (tom sucesso).
                    backgroundColor: banner.foto
                      ? corTexto === colors.ink
                        ? 'rgba(255,255,255,0.6)'
                        : 'rgba(0,0,0,0.32)'
                      : 'rgba(255,255,255,0.15)',
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

                {/* Convenção de mídia: anúncio se declara, discreto. */}
                {anuncio && (
                  <Text
                    style={{
                      fontSize: 9.5,
                      fontWeight: '700',
                      color: 'rgba(255,255,255,0.55)',
                      letterSpacing: 1.1,
                      textTransform: 'uppercase',
                    }}
                  >
                    Anúncio
                  </Text>
                )}
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
                    // Sobre foto o subtítulo precisa de mais presença.
                    opacity: banner.foto ? 0.8 : 0.65,
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
      {indicadores(banners, indice)}
    </View>
  )
}

/**
 * Véu de leitura dos banners com foto: a cor da VOZ (tom Mallevo ou marca
 * do anunciante) entra quase sólida pela esquerda (onde mora o texto) e
 * libera a foto à direita. Mesma técnica SVG do GlowNeon da marquise —
 * nenhuma dependência nova. O id do gradiente deriva da cor: duas peças no
 * mesmo carrossel nunca colidem.
 */
function VeuBanner({ cor }: { cor: string }) {
  const id = `veu-${cor.replace('#', '')}`
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={cor} stopOpacity={0.95} />
          <Stop offset="0.52" stopColor={cor} stopOpacity={0.62} />
          <Stop offset="1" stopColor={cor} stopOpacity={0.08} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  )
}

function indicadores(banners: Banner[], indice: number) {
  if (banners.length <= 1) return null
  return (
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
  )
}
