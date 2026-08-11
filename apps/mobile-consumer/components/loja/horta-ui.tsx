import { type ReactNode } from 'react'
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'

/**
 * Vocabulário gráfico compartilhado da vitrine horta (arquétipo `garden`) —
 * usado por `LojaHorta.tsx` e `ProdutoHorta.tsx`.
 *
 * A referência (Sonder & Sprout) constrói tudo com três gestos manuais: o SELO
 * ESCALOPADO de feira, o RABISCO de arco a mão livre e a FOTO-ADESIVO com
 * contorno branco. Ficam aqui porque o PDP repete os três — duplicá-los nos
 * dois arquivos sairia mais caro que o módulo.
 *
 * As cores NÃO moram aqui: quem chama passa a cor da paleta ativa (ou uma das
 * constantes de DNA da vitrine), como fazem as vitrines irmãs.
 */

/** rgba a partir de hex — véus e contornos derivados da paleta. */
export function comAlfa(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, '')
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Botão circular creme com fio e sombra — o chrome INTEIRO desta vitrine (não
 * há pill nem barra de menu). O creme com contorno é o que o mantém legível
 * tanto sobre o verde do hero quanto sobre o creme da página, sem precisar de
 * dois estados. `contador` acende o disco de sacola.
 */
export function BotaoAdesivo({
  icone,
  contador = 0,
  aoTocar,
}: {
  icone: 'chevron-left' | 'bag' | 'close'
  contador?: number
  aoTocar: (e: GestureResponderEvent) => void
}) {
  const { colors } = useStoreDesign()
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={0.8}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[
        {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: comAlfa(colors.ink, 0.12),
        },
        consumerDesign.shadow.soft,
      ]}
    >
      <ConsumerIcon name={icone} size={19} color={colors.ink} strokeWidth={2.1} />
      {contador > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -3,
            right: -3,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
            backgroundColor: colors.accent,
            borderWidth: 1.5,
            borderColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{ fontSize: 10, color: colors.accentInk, fontWeight: '800' }}
          >
            {contador}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

/**
 * Contorno escalopado (flor) do selo, em coordenadas polares:
 * `r(θ) = R · (0,90 + 0,10 · cos(nθ))`. Amostrado a cada 3° e fechado com `Z` —
 * as pétalas nascem da própria função, sem path desenhado à mão.
 */
function pathEscalopado(raio: number, petalas: number): string {
  const passos = 120
  const pontos: string[] = []
  for (let i = 0; i < passos; i++) {
    const t = (i / passos) * Math.PI * 2
    const r = raio * (0.9 + 0.1 * Math.cos(petalas * t))
    const x = raio + r * Math.cos(t)
    const y = raio + r * Math.sin(t)
    pontos.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
  }
  return `${pontos.join(' ')} Z`
}

/**
 * Selo recortado de feira: o conector "&" do hero, o badge do produto e a
 * assinatura do fecho. Os filhos ficam centrados por cima do recorte.
 */
export function SeloRecortado({
  tamanho,
  cor,
  rotacao = 0,
  petalas = 12,
  style,
  children,
}: {
  tamanho: number
  cor: string
  /** Graus. O selo da referência nunca está a prumo. */
  rotacao?: number
  petalas?: number
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}) {
  const raio = tamanho / 2
  return (
    <View
      pointerEvents="none"
      style={[
        {
          width: tamanho,
          height: tamanho,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: `${rotacao}deg` }],
        },
        style,
      ]}
    >
      <Svg
        width={tamanho}
        height={tamanho}
        viewBox={`0 0 ${tamanho} ${tamanho}`}
        style={{ position: 'absolute' }}
      >
        <Path d={pathEscalopado(raio, petalas)} fill={cor} />
      </Svg>
      {children}
    </View>
  )
}

/**
 * Rabisco de arco a mão livre — dois traços concêntricos de ponta redonda, o
 * doodle que a referência espalha pelos cantos. Puramente decorativo.
 */
export function Rabisco({
  largura,
  cor,
  espessura = 2.5,
  style,
}: {
  largura: number
  cor: string
  espessura?: number
  style?: StyleProp<ViewStyle>
}) {
  const altura = largura * 0.92
  // Dois arcos abertos, o de dentro mais curto — a mão que desenha não fecha
  // o traço nem repete o mesmo raio.
  const externo = `M ${largura * 0.06} ${altura * 0.94} A ${largura * 0.52} ${altura * 0.58} 0 0 1 ${largura * 0.92} ${altura * 0.12}`
  const interno = `M ${largura * 0.3} ${altura * 0.95} A ${largura * 0.34} ${altura * 0.38} 0 0 1 ${largura * 0.9} ${altura * 0.42}`
  return (
    <View pointerEvents="none" style={style}>
      <Svg width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`}>
        <Path
          d={externo}
          stroke={cor}
          strokeWidth={espessura}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={interno}
          stroke={cor}
          strokeWidth={espessura}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </View>
  )
}

/**
 * Foto-adesivo: a moldura BRANCA de cantos assimétricos que a referência usa
 * para colar prato e ambiente na página.
 *
 * RN não recorta contorno irregular de PNG, então o adesivo aqui é a moldura:
 * raios diferentes em cada canto (nunca um retângulo a prumo) + rotação sutil.
 * A imagem interna repete os raios menos a borda, senão o canto vaza no papel.
 */
export function FotoAdesivo({
  uri,
  largura,
  altura,
  rotacao = 0,
  borda = 7,
  style,
}: {
  uri: string
  largura: number
  altura: number
  rotacao?: number
  borda?: number
  style?: StyleProp<ViewStyle>
}) {
  // Fração da menor dimensão: em tela grande a assimetria continua visível.
  const base = Math.min(largura, altura)
  const raios = {
    borderTopLeftRadius: base * 0.3,
    borderTopRightRadius: base * 0.42,
    borderBottomRightRadius: base * 0.26,
    borderBottomLeftRadius: base * 0.46,
  }
  return (
    <View
      style={[
        {
          width: largura,
          height: altura,
          padding: borda,
          backgroundColor: '#FFFFFF',
          transform: [{ rotate: `${rotacao}deg` }],
          ...raios,
        },
        style,
      ]}
    >
      <Image
        source={{ uri }}
        style={{
          width: '100%',
          height: '100%',
          borderTopLeftRadius: raios.borderTopLeftRadius - borda,
          borderTopRightRadius: raios.borderTopRightRadius - borda,
          borderBottomRightRadius: raios.borderBottomRightRadius - borda,
          borderBottomLeftRadius: raios.borderBottomLeftRadius - borda,
        }}
        resizeMode="cover"
      />
    </View>
  )
}
