import {
  Image,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * Vocabulário gráfico compartilhado da vitrine feira (arquétipo `fresh`) —
 * usado por `LojaFeira.tsx` e `ProdutoFeira.tsx`.
 *
 * A referência é um app de hortifruti: página clara, HERO-CARTÃO verde-mata
 * com colagem de frescos, CHIPS CIRCULARES de foto para as categorias,
 * OFERTAS com cronômetro e preço POR UNIDADE. A cor de ação (o lima do tema)
 * aparece só como FUNDO — nunca como tinta de texto.
 */

/**
 * Verde-mata do hero-cartão e do fecho. Fixo (e não `colors.accent`) porque a
 * cor de ação muda com a paleta e o verde é a âncora da feira nas três peles.
 * 11,47:1 com o creme abaixo — espelhado em `__tests__` da lib.
 */
export const VERDE_MATA = '#22392B'

/** Tinta ÚNICA de tudo que é escrito sobre o verde-mata. */
export const CREME_FEIRA = '#F4F7EC'

/** rgba a partir de hex — véus e fios derivados da paleta. */
export function comAlfa(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, '')
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** `03:32:29` — o relógio do chip de ofertas. Negativo vira zero. */
export function formatarContagem(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

/**
 * Botão circular claro com fio e sombra — o chrome de TOPO desta vitrine
 * (voltar e sacola). Sem FAB: a sacola daqui é a porta do carrinho. O pé da
 * tela é da barra de menu, que a vitrine desenha por conta própria.
 */
export function BotaoFeira({
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
          borderColor: comAlfa(colors.ink, 0.1),
        },
        consumerDesign.shadow.soft,
      ]}
    >
      <ConsumerIcon name={icone} size={19} color={colors.ink} strokeWidth={1.9} />
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
            style={{ fontSize: 10, color: colors.accentInk, fontWeight: '700' }}
          >
            {contador}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

/**
 * Selo de oferta no canto do card. Ocupa o lugar do coração de favorito da
 * referência: o app não tem lista de desejos, e um coração que não guarda
 * nada mentiria para o cliente — aqui o canto carrega informação verdadeira.
 */
export function SeloOferta({
  texto = 'Oferta',
  style,
}: {
  texto?: string
  style?: StyleProp<ViewStyle>
}) {
  const design = useStoreDesign()
  const { colors } = design
  return (
    <View
      pointerEvents="none"
      style={[
        {
          paddingHorizontal: 9,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: colors.accent,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: 10,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: colors.accentInk,
          ...fontStyle(design.body, 700),
        }}
      >
        {texto}
      </Text>
    </View>
  )
}

/** Pill de contagem regressiva das ofertas — o relógio da referência. */
export function ChipCronometro({
  segundos,
  style,
}: {
  segundos: number
  style?: StyleProp<ViewStyle>
}) {
  const design = useStoreDesign()
  const { colors } = design
  return (
    <View
      style={[
        {
          paddingHorizontal: 11,
          paddingVertical: 5,
          borderRadius: 999,
          backgroundColor: colors.accent,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: 12,
          letterSpacing: 0.6,
          // Algarismos de largura fixa. O `padStart` do formatador fixa a
          // CONTAGEM de dígitos, não a largura: na Plus Jakarta Sans o '1'
          // ocupa 403/1000 em e o '0', 708 — sem isto a pill mudaria de
          // largura a cada segundo, e o relógio treme.
          fontVariant: ['tabular-nums'],
          color: colors.accentInk,
          ...fontStyle(design.body, 700),
        }}
      >
        {formatarContagem(segundos)}
      </Text>
    </View>
  )
}

/**
 * Chip circular de categoria — a assinatura da referência. Foto em disco com
 * o rótulo embaixo; sem foto, o disco leva a inicial da seção, e nunca fica
 * um buraco cinza na fileira.
 */
export function DiscoCategoria({
  uri,
  rotulo,
  aoTocar,
}: {
  uri: string | null
  rotulo: string
  aoTocar: () => void
}) {
  const design = useStoreDesign()
  const { colors } = design
  const lado = 64

  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={0.85}
      style={{ width: 78, alignItems: 'center' }}
    >
      <View
        style={{
          width: lado,
          height: lado,
          borderRadius: lado / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceMuted,
          overflow: 'hidden',
        }}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <Text
            style={{
              fontSize: 22,
              color: colors.ink,
              ...fontStyle(design.display, 700),
            }}
          >
            {rotulo.trim().charAt(0).toUpperCase()}
          </Text>
        )}
      </View>

      <Text
        numberOfLines={2}
        style={{
          marginTop: 8,
          textAlign: 'center',
          fontSize: 11.5,
          lineHeight: 15,
          color: colors.ink,
          ...fontStyle(design.body, 600),
        }}
      >
        {rotulo}
      </Text>
    </TouchableOpacity>
  )
}
