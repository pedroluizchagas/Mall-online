import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
} from 'react-native'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { formatarReais } from '@mallevo/lib'
import { ConsumerIcon, type ConsumerIconName } from '@/components/ConsumerIcon'
import { useCartStore } from '@/store/useCartStore'
import { useTransicaoSaida } from '@/store/useTransicaoSaida'
import { type ProdutoVitrine } from '@/components/loja/LojaEditorial'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * Vitrine torra — layout PRÓPRIO do arquétipo `roast` para cafeterias e
 * confeitarias boutique (docs/store-theme/02; referência: Kafoska).
 *
 * DNA destilado da referência:
 * - PÔSTER de abertura: a palavra da casa repetida em degradê âmbar, com o
 *   produto flutuando por cima num cartão que TROCA POR CROSSFADE (o ritmo
 *   morno do café coando);
 * - "MENU" GIGANTE NA VERTICAL acompanhando a coluna de cartões;
 * - cardápio em CARTÕES ÂMBAR chapados com a marca d'água do título repetida
 *   ao fundo, itens em caps escuras com preço forte;
 * - verde-floresta profundo + âmbar vibrante, cantos bem redondos.
 *
 * Sacola única no header; saída via transição radial âmbar.
 */

const { width: SCREEN_W } = Dimensions.get('window')
const ALTURA_BARRA_MENU = 58
const LARGURA_RAIL = 72

/**
 * Degradê do pôster derivado do ACCENT da paleta (escada de opacidades, do
 * suave ao cheio) — assim a vitrine serve qualquer pele do arquétipo:
 * âmbar no café, orquídea no açaí, terracota no barro...
 */
const ESCADA_POSTER = [0.5, 0.66, 0.82, 1]

interface SecaoLoja<T extends ProdutoVitrine> {
  titulo: string
  produtos: T[]
}

interface Props<T extends ProdutoVitrine> {
  loja: {
    nome: string
    descricao?: string | null
    banner_url?: string | null
    tempo_entrega?: number | null
    taxa_entrega?: number | null
  }
  secoes: SecaoLoja<T>[]
  aoAbrirProduto: (produto: T) => void
  espacoFinal: number
}

function precoFinalDe(p: ProdutoVitrine): number {
  return p.preco_promocional ?? p.preco
}

export function LojaTorra<T extends ProdutoVitrine>({
  loja,
  secoes,
  aoAbrirProduto,
  espacoFinal,
}: Props<T>) {
  const design = useStoreDesign()
  const { colors, spacing, typeFactor } = design
  const insets = useSafeAreaInsets()
  const totalItens = useCartStore((s) => s.totalItens())
  const iniciarSaida = useTransicaoSaida((s) => s.iniciar)

  const scrollY = useRef(new Animated.Value(0)).current
  const [depoisDoPoster, setDepoisDoPoster] = useState(false)
  const [reduzirMovimento, setReduzirMovimento] = useState(false)

  // Cartão flutuante do pôster: destaque troca por crossfade morno.
  const destaques = useMemo(
    () => (secoes[0]?.produtos ?? []).filter((p) => p.foto_url).slice(0, 4),
    [secoes],
  )
  const [indiceCard, setIndiceCard] = useState(0)
  const [proximoCard, setProximoCard] = useState<number | null>(null)
  const fadeCard = useRef(new Animated.Value(0)).current

  const palavraPoster = (loja.nome.split(' ')[0] || 'CAFÉ').toUpperCase()

  useEffect(() => {
    const sub = scrollY.addListener(({ value }) => {
      setDepoisDoPoster(value > 360)
    })
    return () => scrollY.removeListener(sub)
  }, [scrollY])

  useEffect(() => {
    let ativo = true
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (ativo) setReduzirMovimento(v)
    })
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduzirMovimento,
    )
    return () => {
      ativo = false
      sub.remove()
    }
  }, [])

  // Crossfade do cartão: 700ms de fusão, no ritmo do café coando.
  useEffect(() => {
    if (
      destaques.length <= 1 ||
      proximoCard != null ||
      depoisDoPoster ||
      reduzirMovimento
    )
      return
    const t = setTimeout(() => {
      const prox = (indiceCard + 1) % destaques.length
      setProximoCard(prox)
      fadeCard.setValue(0)
      Animated.timing(fadeCard, {
        toValue: 1,
        duration: 700,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return
        setIndiceCard(prox)
        setProximoCard(null)
      })
    }, 4500)
    return () => clearTimeout(t)
  }, [indiceCard, proximoCard, destaques.length, depoisDoPoster, reduzirMovimento, fadeCard])

  const sairPara = (acao: () => void) => (e: GestureResponderEvent) =>
    iniciarSaida({
      acao,
      cor: colors.accent,
      origem: { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY },
    })

  const headerBg = scrollY.interpolate({
    inputRange: [280, 380],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  const produtoCard = destaques[indiceCard]
  // Recorte transparente (metadata.recorte) → efeito verdadeiro do pôster:
  // o produto solto sobre as palavras. Sem recorte, a foto ganha MÁSCARA DE
  // CÁPSULA (arco vertical) — lê como objeto, não como retângulo.
  const recorteCard = (produtoCard as any)?.metadata?.recorte as
    | string
    | undefined
  const larguraCard = Math.round(SCREEN_W * 0.46)
  const alturaCard = Math.round(larguraCard * 1.5)

  const meta = [
    loja.tempo_entrega != null ? `${loja.tempo_entrega} min` : null,
    loja.taxa_entrega === 0
      ? 'Entrega grátis'
      : loja.taxa_entrega != null
        ? `Entrega ${formatarReais(loja.taxa_entrega)}`
        : null,
    'Aberto',
  ]
    .filter(Boolean)
    .join('  ·  ')

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="light" />

      {/* Header: transparente → verde com fio */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: insets.top + 6,
          paddingBottom: 12,
          backgroundColor: colors.surface,
          opacity: headerBg,
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: insets.top + 6,
          left: spacing.screenX - 8,
          right: spacing.screenX - 8,
          zIndex: 11,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <AcaoTorra icone="back" aoTocar={sairPara(() => router.back())} />
        <Animated.Text
          numberOfLines={1}
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 15,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: colors.ink,
            opacity: headerBg,
            ...fontStyle(design.display, 800),
          }}
        >
          {loja.nome}
        </Animated.Text>
        <AcaoTorra
          icone="bag"
          contador={totalItens}
          aoTocar={() => totalItens > 0 && router.push('/checkout')}
        />
      </View>

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: espacoFinal + ALTURA_BARRA_MENU + 12,
        }}
      >
        {/* ── Pôster: palavra repetida em degradê + produto flutuante ── */}
        <View
          style={{
            paddingTop: insets.top + 76,
            paddingBottom: 26,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 11,
              letterSpacing: 2.6,
              textTransform: 'uppercase',
              color: colors.accent,
              marginBottom: 22,
              ...fontStyle(design.body, 600),
            }}
          >
            Torra fresca todo dia
          </Text>

          <View style={{ alignSelf: 'stretch' }}>
            {/* As quatro linhas da palavra, do suave ao accent cheio */}
            <View>
              {ESCADA_POSTER.map((grau, i) => (
                <Text
                  key={i}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{
                    fontSize: Math.round(76 * typeFactor),
                    lineHeight: Math.round(72 * typeFactor),
                    letterSpacing: 2,
                    textAlign: 'center',
                    color: colors.accent,
                    opacity: grau,
                    ...fontStyle(design.display, 800),
                  }}
                >
                  {palavraPoster}
                </Text>
              ))}
            </View>

            {/* Produto flutuante com crossfade — tocar abre o item */}
            {produtoCard && (
              <View
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  marginLeft: -larguraCard / 2,
                  marginTop: -alturaCard / 2,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => aoAbrirProduto(produtoCard)}
                >
                  {recorteCard ? (
                    /* PNG transparente do lojista: o efeito verdadeiro */
                    <Image
                      source={{ uri: recorteCard }}
                      style={{ width: larguraCard, height: alturaCard }}
                      resizeMode="contain"
                    />
                  ) : (
                    <View
                      style={[
                        {
                          width: larguraCard,
                          height: alturaCard,
                          // Cápsula: arco no topo e na base — silhueta de copo
                          borderRadius: larguraCard / 2,
                          overflow: 'hidden',
                          backgroundColor: colors.surfaceMuted,
                        },
                        consumerDesign.shadow.floating,
                      ]}
                    >
                      <Image
                        source={{ uri: produtoCard.foto_url ?? undefined }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                      {proximoCard != null && destaques[proximoCard]?.foto_url && (
                        <Animated.Image
                          source={{ uri: destaques[proximoCard].foto_url ?? undefined }}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            opacity: fadeCard,
                          }}
                          resizeMode="cover"
                        />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Nome + preço do item em cena */}
          {produtoCard && (
            <View style={{ alignItems: 'center', marginTop: 22, gap: 4 }}>
              <Text
                style={{
                  fontSize: 19,
                  letterSpacing: 0.2,
                  color: colors.ink,
                  ...fontStyle(design.display, 700),
                }}
              >
                {produtoCard.nome}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: colors.accent,
                  ...fontStyle(design.display, 700),
                }}
              >
                {formatarReais(precoFinalDe(produtoCard))}
              </Text>
            </View>
          )}

          {destaques.length > 1 && (
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
              {destaques.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: i === indiceCard ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor:
                      i === indiceCard ? colors.accent : colors.line,
                  }}
                />
              ))}
            </View>
          )}

          {loja.descricao && (
            <Text
              numberOfLines={2}
              style={{
                marginTop: 26,
                marginHorizontal: spacing.screenX + 8,
                textAlign: 'center',
                fontSize: 15,
                lineHeight: 22,
                color: colors.accent,
                ...fontStyle(design.body, 500),
              }}
            >
              {loja.descricao}
            </Text>
          )}
          <Text
            style={{
              marginTop: 10,
              fontSize: 12.5,
              color: colors.inkMuted,
              ...fontStyle(design.body, 500),
            }}
          >
            {meta}
          </Text>
        </View>

        {/* ── MENU vertical + cartões âmbar ── */}
        <View
          style={{
            flexDirection: 'row',
            paddingRight: spacing.screenX,
            marginTop: 8,
          }}
        >
          {/* Rail com MENU em letras empilhadas de pé, como na referência */}
          <View style={{ width: LARGURA_RAIL, alignItems: 'center', paddingTop: 4 }}>
            {'MENU'.split('').map((letra, i) => (
              <Text
                key={i}
                style={{
                  fontSize: 56,
                  lineHeight: 54,
                  color: colors.accent,
                  ...fontStyle(design.display, 800),
                }}
              >
                {letra}
              </Text>
            ))}
          </View>

          {/* Cartões de seção */}
          <View style={{ flex: 1, gap: 16 }}>
            {secoes.map((secao) => (
              <CartaoSecao
                key={secao.titulo}
                secao={secao}
                aoAbrirProduto={aoAbrirProduto}
              />
            ))}
          </View>
        </View>
      </Animated.ScrollView>

      <BarraMenuTorra sairPara={sairPara} />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Cartão âmbar de seção — marca d'água repetida + itens em caps escuras
// ─────────────────────────────────────────────────────────────

function CartaoSecao<T extends ProdutoVitrine>({
  secao,
  aoAbrirProduto,
}: {
  secao: SecaoLoja<T>
  aoAbrirProduto: (p: T) => void
}) {
  const design = useStoreDesign()
  const { colors } = design
  const marca = secao.titulo.toUpperCase()

  return (
    <View
      style={{
        backgroundColor: colors.accent,
        borderRadius: design.radius.xl,
        padding: 20,
        overflow: 'hidden',
      }}
    >
      {/* Marca d'água: o título repetido ao fundo */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: -4, left: 0, right: 0, bottom: 0 }}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <Text
            key={i}
            numberOfLines={1}
            style={{
              fontSize: 42,
              lineHeight: 47,
              letterSpacing: 1,
              color: 'rgba(255, 255, 255, 0.16)',
              paddingLeft: i % 2 === 0 ? 16 : 52,
              ...fontStyle(design.display, 800),
            }}
          >
            {marca}
          </Text>
        ))}
      </View>

      <Text
        style={{
          fontSize: 26,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: '#FFFFFF',
          marginBottom: 14,
          ...fontStyle(design.display, 800),
        }}
      >
        {secao.titulo}
      </Text>

      <View style={{ gap: 16 }}>
        {secao.produtos.map((p) => {
          const temPromo =
            !!p.preco_promocional && p.preco_promocional < p.preco
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => aoAbrirProduto(p)}
              activeOpacity={0.75}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <Text
                  numberOfLines={2}
                  style={{
                    flex: 1,
                    fontSize: 15.5,
                    lineHeight: 20,
                    letterSpacing: 0.3,
                    textTransform: 'uppercase',
                    color: colors.accentInk,
                    ...fontStyle(design.display, 800),
                  }}
                >
                  {p.nome}
                </Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={{
                      fontSize: 15.5,
                      color: colors.accentInk,
                      ...fontStyle(design.display, 800),
                    }}
                  >
                    {formatarReais(precoFinalDe(p))}
                  </Text>
                  {temPromo && (
                    <Text
                      style={{
                        fontSize: 11,
                        color: 'rgba(34, 21, 3, 0.55)',
                        textDecorationLine: 'line-through',
                        ...fontStyle(design.body, 500),
                      }}
                    >
                      {formatarReais(p.preco)}
                    </Text>
                  )}
                </View>
              </View>
              {p.descricao && (
                <Text
                  numberOfLines={2}
                  style={{
                    marginTop: 4,
                    fontSize: 12.5,
                    lineHeight: 17,
                    maxWidth: '86%',
                    color: 'rgba(34, 21, 3, 0.78)',
                    ...fontStyle(design.body, 500),
                  }}
                >
                  {p.descricao}
                </Text>
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Apoio
// ─────────────────────────────────────────────────────────────

/** Ação do topo: ícone creme sobre o verde (tema dark). */
function AcaoTorra({
  icone,
  aoTocar,
  contador = 0,
}: {
  icone: 'back' | 'bag'
  aoTocar: (e: GestureResponderEvent) => void
  contador?: number
}) {
  const { colors } = useStoreDesign()
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={0.7}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
    >
      <ConsumerIcon name={icone} size={22} color={colors.ink} strokeWidth={2} />
      {contador > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 3,
            right: 0,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
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

const ITENS_MENU: {
  rotulo: string
  icone: ConsumerIconName
  rota: string
  ativo?: boolean
}[] = [
  { rotulo: 'Início', icone: 'home', rota: '/', ativo: true },
  { rotulo: 'Explorar', icone: 'reels', rota: '/explorar' },
  { rotulo: 'Pedidos', icone: 'orders', rota: '/pedidos' },
  { rotulo: 'Perfil', icone: 'user', rota: '/perfil' },
]

function BarraMenuTorra({
  sairPara,
}: {
  sairPara: (acao: () => void) => (e: GestureResponderEvent) => void
}) {
  const design = useStoreDesign()
  const { colors } = design
  const insets = useSafeAreaInsets()
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 12,
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.line,
        paddingTop: 10,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      {ITENS_MENU.map((item) => {
        const cor = item.ativo ? colors.accent : colors.inkMuted
        return (
          <TouchableOpacity
            key={item.rota}
            onPress={sairPara(() => router.navigate(item.rota as never))}
            activeOpacity={0.7}
            style={{ flex: 1, alignItems: 'center', gap: 4 }}
          >
            <ConsumerIcon
              name={item.icone}
              size={21}
              color={cor}
              strokeWidth={item.ativo ? 2.1 : 1.7}
            />
            <Text
              style={{
                fontSize: 10,
                color: cor,
                ...fontStyle(design.body, item.ativo ? 700 : 500),
              }}
            >
              {item.rotulo}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}
