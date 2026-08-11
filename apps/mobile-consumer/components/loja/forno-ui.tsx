import {
  Image,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'

/**
 * Vocabulário gráfico compartilhado da vitrine forno (arquétipo `slice`) —
 * usado por `LojaForno.tsx` e `ProdutoForno.tsx`.
 *
 * A referência (Restaurin / "Pizza Lounge") constrói tudo com quatro gestos: a
 * COROA real do logo, a pizza em RECORTE REDONDO sem moldura, os CÍRCULOS
 * CONCÊNTRICOS que viram alvo atrás dela e o line-art FANTASMA de cozinha nos
 * cartões claros. Ficam aqui porque o PDP repete os quatro.
 *
 * As cores NÃO moram aqui: quem chama passa a cor da paleta ativa (ou uma das
 * constantes de DNA da vitrine), como fazem as vitrines irmãs.
 */

/** rgba a partir de hex — véus, anéis e traços derivados da paleta. */
export function comAlfa(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, '')
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Botão circular creme com fio e sombra — o chrome INTEIRO desta vitrine. O
 * creme com contorno é o que o mantém legível sobre os três palcos por onde
 * ele passa (o preto do hero, o ouro do pôster e o creme da página) sem
 * precisar trocar de estado no scroll.
 */
export function BotaoForno({
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
          borderColor: comAlfa(colors.ink, 0.14),
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
 * A coroa do logo da referência — chapada, três pontas, sem contorno. Aparece
 * sozinha acima do wordmark, no fecho e dentro dos badges redondos.
 */
export function Coroa({
  tamanho,
  cor,
  style,
}: {
  tamanho: number
  cor: string
  style?: StyleProp<ViewStyle>
}) {
  // Proporção do desenho (100×86): a coroa é mais larga que alta.
  const altura = tamanho * 0.86
  return (
    <View pointerEvents="none" style={style}>
      <Svg width={tamanho} height={altura} viewBox="0 0 100 86">
        <Path
          d="M12 78 L12 20 L34 48 L50 12 L66 48 L88 20 L88 78 Z"
          fill={cor}
          // O traço da própria cor arredonda as pontas: o glifo da referência
          // é gordo e sem bico agulhado.
          stroke={cor}
          strokeWidth={7}
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  )
}

/** Fatia de pizza — o segundo ícone dos badges redondos do cartão da casa. */
export function Fatia({
  tamanho,
  cor,
  style,
}: {
  tamanho: number
  cor: string
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View pointerEvents="none" style={style}>
      <Svg width={tamanho} height={tamanho} viewBox="0 0 100 100">
        <Path
          d="M50 10 L88 84 Q50 96 12 84 Z"
          fill={cor}
          stroke={cor}
          strokeWidth={6}
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  )
}

/**
 * A pizza em RECORTE REDONDO — o gesto central da referência: a foto top-down
 * entra sem moldura, só o círculo. Serve do disco gigante do hero ao thumb do
 * cardápio. `anel` desenha o fio fino que a referência usa quando o disco cai
 * sobre um bloco de cor chapada.
 */
export function PizzaRedonda({
  uri,
  tamanho,
  anel,
  style,
}: {
  uri: string
  tamanho: number
  anel?: string
  style?: StyleProp<ImageStyle>
}) {
  return (
    <Image
      source={{ uri }}
      style={[
        {
          width: tamanho,
          height: tamanho,
          borderRadius: tamanho / 2,
          ...(anel ? { borderWidth: 1.5, borderColor: anel } : null),
        },
        style,
      ]}
      resizeMode="cover"
    />
  )
}

/**
 * Os anéis concêntricos que a referência coloca ATRÁS da pizza — o alvo. Só
 * traço, nunca preenchimento: quem carrega a cor cheia é o bloco por baixo.
 */
export function CirculosConcentricos({
  tamanho,
  cor,
  style,
}: {
  tamanho: number
  cor: string
  style?: StyleProp<ViewStyle>
}) {
  const centro = tamanho / 2
  return (
    <View pointerEvents="none" style={style}>
      <Svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`}>
        {[0.55, 0.7, 0.85, 1].map((f) => (
          <Circle
            key={f}
            cx={centro}
            cy={centro}
            // −1 para o anel externo não ser cortado pela borda do viewBox.
            r={centro * f - 1}
            stroke={cor}
            strokeWidth={1.5}
            fill="none"
          />
        ))}
      </Svg>
    </View>
  )
}

/** Folha em lente entre dois pontos — a pétala do raminho, só traço. */
function folha(x: number, y: number, dx: number, dy: number): string {
  const fx = x + dx
  const fy = y + dy
  return `M${x},${y} Q${x + dx * 0.1},${y + dy * 0.95} ${fx},${fy} Q${x + dx * 0.95},${y + dy * 0.1} ${x},${y}`
}

/**
 * Line-art fantasma de cozinha: o garfo e o raminho que a referência imprime
 * quase invisíveis no fundo dos cartões claros. Puramente decorativo — quem
 * chama passa uma cor já esmaecida.
 */
export function RabiscoCozinha({
  largura,
  cor,
  motivo,
  espessura = 2,
  style,
}: {
  largura: number
  cor: string
  motivo: 'garfo' | 'raminho'
  espessura?: number
  style?: StyleProp<ViewStyle>
}) {
  const traco = {
    stroke: cor,
    strokeWidth: espessura,
    strokeLinecap: 'round' as const,
    fill: 'none',
  }

  if (motivo === 'garfo') {
    // Garfo alto e estreito: dentes, concha e cabo num só gesto.
    const altura = largura * 2.5
    return (
      <View pointerEvents="none" style={style}>
        <Svg width={largura} height={altura} viewBox="0 0 40 100">
          <Path d="M8 8 L8 30 Q8 42 20 42 Q32 42 32 30 L32 8" {...traco} />
          <Path d="M20 8 L20 92" {...traco} />
        </Svg>
      </View>
    )
  }

  // Raminho: haste em curva com quatro folhas alternadas.
  return (
    <View pointerEvents="none" style={style}>
      <Svg width={largura} height={largura} viewBox="0 0 100 100">
        <Path d="M8 94 Q38 66 90 10" {...traco} />
        <Path d={folha(32, 72, 22, -16)} {...traco} />
        <Path d={folha(30, 74, -18, -14)} {...traco} />
        <Path d={folha(58, 46, 24, -14)} {...traco} />
        <Path d={folha(56, 48, -18, -12)} {...traco} />
      </Svg>
    </View>
  )
}
