import {
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
import { fontStyle } from '@/lib/store-fonts'

/**
 * Vocabulário gráfico compartilhado da vitrine passarela (arquétipo `mono`) —
 * usado por `LojaPassarela.tsx` e `ProdutoPassarela.tsx`.
 *
 * A referência (Homelander) é um mundo sem cor: branco, tinta quase-preta e
 * fotografia em preto e branco. Ela se sustenta em três peças — o MONOGRAMA
 * COROADO (único ornamento), o CHIP de escassez (única cor do sistema) e a
 * PILL DE ADIÇÃO RÁPIDA que flutua sobre a foto e faz a compra acontecer na
 * própria grade, sem abrir o produto.
 *
 * Fora o laranja do chip, as cores NÃO moram aqui: quem chama passa a cor da
 * paleta ativa, como fazem as vitrines irmãs.
 */

/**
 * A ÚNICA cor do arquétipo: o chip de escassez. Aprofundado vs. o laranja da
 * referência (~#F97316, que dava 2,8:1 e reprovaria em texto pequeno) para
 * sustentar branco com 5,18:1. Fixo — as paletas do mono trocam a temperatura
 * do branco, nunca a cor de urgência. Espelhado em `__tests__` da lib.
 */
export const LARANJA_ESTOQUE = '#C2410C'

/** Tinta do chip: branco fixo, porque o fundo dele também é fixo. */
const TINTA_CHIP = '#FFFFFF'

/** rgba a partir de hex — véus e fios derivados da paleta. */
export function comAlfa(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, '')
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Botão circular claro com fio e sombra — o chrome INTEIRO desta vitrine. O
 * badge do contador usa a TINTA (e não o accent) porque no mono o accent já é
 * a própria tinta: um badge "de destaque" seria invisível como diferença.
 */
export function BotaoPassarela({
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
      <ConsumerIcon name={icone} size={19} color={colors.ink} strokeWidth={1.8} />
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
            backgroundColor: colors.ink,
            borderWidth: 1.5,
            borderColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 10, color: colors.canvas, fontWeight: '700' }}>
            {contador}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

/**
 * O monograma coroado da referência — coroa de TRAÇO FINO (o oposto da coroa
 * chapada do forno: aqui o ornamento sussurra) sobre a inicial da casa. É o
 * único ornamento do arquétipo inteiro.
 */
export function MonogramaCoroado({
  inicial,
  tamanho,
  cor,
  style,
}: {
  inicial: string
  tamanho: number
  cor: string
  style?: StyleProp<ViewStyle>
}) {
  const { display } = useStoreDesign()
  const larguraCoroa = Math.round(tamanho * 0.62)
  return (
    <View style={[{ alignItems: 'center' }, style]}>
      <Svg
        width={larguraCoroa}
        height={Math.round(larguraCoroa * 0.55)}
        viewBox="0 0 100 56"
      >
        <Path
          d="M10 50 L10 10 L32 32 L50 6 L68 32 L90 10 L90 50 Z"
          fill="none"
          stroke={cor}
          strokeWidth={5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
      <Text
        style={{
          marginTop: Math.round(tamanho * 0.1),
          fontSize: tamanho,
          lineHeight: Math.round(tamanho * 1.1),
          color: cor,
          ...fontStyle(display, 700),
        }}
      >
        {inicial}
      </Text>
    </View>
  )
}

/**
 * Chip de escassez — a única mancha de cor do design, e por isso reservada ao
 * que é de fato urgente (pouco estoque ou oferta). Fundo e tinta fixos: ele
 * flutua sobre FOTO, não sobre a página, então não pode depender da paleta.
 */
export function ChipEstoque({
  texto,
  style,
}: {
  texto: string
  style?: StyleProp<ViewStyle>
}) {
  const design = useStoreDesign()
  return (
    <View
      pointerEvents="none"
      style={[
        {
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 999,
          backgroundColor: LARANJA_ESTOQUE,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: 10.5,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: TINTA_CHIP,
          ...fontStyle(design.body, 700),
        }}
      >
        {texto}
      </Text>
    </View>
  )
}

/** Estado do botão de adição rápida, controlado pela vitrine. */
export type EstadoRapido = 'pronta' | 'checando' | 'adicionado'

/**
 * A PILL DE ADIÇÃO RÁPIDA ("QUICK ADD") — o gesto que define o arquétipo: a
 * compra acontece na grade, sem abrir o produto. Branca fixa porque flutua
 * sobre a foto; ao confirmar, inverte para a tinta do tema com "NA SACOLA ✓".
 */
export function PillRapida({
  estado,
  compacta = false,
  aoTocar,
  style,
}: {
  estado: EstadoRapido
  compacta?: boolean
  aoTocar: (e: GestureResponderEvent) => void
  style?: StyleProp<ViewStyle>
}) {
  const design = useStoreDesign()
  const { colors } = design
  const feito = estado === 'adicionado'
  const tinta = feito ? colors.canvas : '#111111'

  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={0.85}
      disabled={estado === 'checando'}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          paddingVertical: compacta ? 10 : 13,
          borderRadius: 999,
          backgroundColor: feito ? colors.ink : '#FFFFFF',
          opacity: estado === 'checando' ? 0.6 : 1,
        },
        consumerDesign.shadow.soft,
        style,
      ]}
    >
      {!feito && (
        <ConsumerIcon name="bag" size={compacta ? 13 : 15} color={tinta} strokeWidth={1.8} />
      )}
      <Text
        style={{
          fontSize: compacta ? 11 : 12,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: tinta,
          ...fontStyle(design.body, 600),
        }}
      >
        {feito ? 'Na sacola  ✓' : 'Adicionar'}
      </Text>
    </TouchableOpacity>
  )
}
