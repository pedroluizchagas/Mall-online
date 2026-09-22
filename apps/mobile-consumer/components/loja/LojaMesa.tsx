import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
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
import { formatarReais, statusAbertura } from '@mallevo/lib'
import { ConsumerIcon, type ConsumerIconName } from '@/components/ConsumerIcon'
import { useCartStore } from '@/store/useCartStore'
import { useTransicaoSaida } from '@/store/useTransicaoSaida'
import { GRADIENTE_HERO } from '@/components/loja/gradientes'
import { type ProdutoVitrine } from '@/components/loja/LojaEditorial'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * Vitrine mesa — layout PRÓPRIO do arquétipo `heritage` para restaurantes,
 * churrascarias e cafés com história (docs/store-theme/02 §A; refs Veloria,
 * Bistora, La Paloma). É o DEFAULT de `alimentos-bebidas`: a maior categoria
 * do shopping ganha aqui uma fachada de casa, não o layout genérico.
 *
 * DNA destilado das referências:
 * - HERO FULL-BLEED com a foto da casa, véu quente e o nome em SERIFA de
 *   display (Fraunces) em creme; SELO DE TRADIÇÃO circular no canto;
 *   CTA de contorno em pill;
 * - muito RESPIRO: statement da casa centrado em serifa leve, com ORNAMENTO
 *   (fio · losango · fio) separando os blocos;
 * - PRATOS DA CASA em trilho de fotos grandes 4:5 com legenda serifada;
 * - CARDÁPIO-LIVRO sobre o creme: seção com título serifado centrado, itens
 *   com foto pequena, nome em serifa, LINHA PONTILHADA até o preço — a
 *   gramática do cardápio impresso;
 * - neutros quentes da pele (creme, madeira): nada grita, tudo é fio e
 *   tipografia.
 *
 * Sacola única no header; barra de menu FIXA (molde A); saída via transição
 * radial no accent.
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const HERO_H = Math.round(SCREEN_H * 0.56)
const ALTURA_BARRA_MENU = 58
/** Largura do cartão do trilho de pratos (0,62 da tela: um por vez com espiada). */
const LARGURA_PRATO = Math.round(SCREEN_W * 0.62)
/** Quantos pratos entram no trilho. */
const MAX_PRATOS = 6
const CREME = '#FFF9F0'

interface SecaoLoja<T extends ProdutoVitrine> {
  titulo: string
  produtos: T[]
}

interface Props<T extends ProdutoVitrine> {
  loja: {
    nome: string
    descricao?: string | null
    banner_url?: string | null
    logo_url?: string | null
    tempo_entrega?: number | null
    taxa_entrega?: number | null
    horarios?: unknown
  }
  secoes: SecaoLoja<T>[]
  aoAbrirProduto: (produto: T) => void
  espacoFinal: number
}

function precoFinalDe(p: ProdutoVitrine): number {
  return p.preco_promocional ?? p.preco
}

function temPromo(p: ProdutoVitrine): boolean {
  return !!p.preco_promocional && p.preco_promocional < p.preco
}

export function LojaMesa<T extends ProdutoVitrine>({
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

  const scrollRef = useRef<ScrollView>(null)
  const scrollY = useRef(new Animated.Value(0)).current
  const [depoisDoHero, setDepoisDoHero] = useState(false)
  const posicaoCardapio = useRef(0)

  // Pratos da casa: os primeiros com foto, na ordem do cardápio.
  const pratos = useMemo(
    () => secoes.flatMap((s) => s.produtos).filter((p) => p.foto_url).slice(0, MAX_PRATOS),
    [secoes],
  )

  useEffect(() => {
    const limiar = HERO_H - 120
    const sub = scrollY.addListener(({ value }) => setDepoisDoHero(value > limiar))
    return () => scrollY.removeListener(sub)
  }, [scrollY])

  const sairPara = (acao: () => void) => (e: GestureResponderEvent) =>
    iniciarSaida({
      acao,
      cor: colors.accent,
      origem: { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY },
    })

  const headerBg = scrollY.interpolate({
    inputRange: [HERO_H - 180, HERO_H - 90],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })
  const headerBgInverso = scrollY.interpolate({
    inputRange: [HERO_H - 180, HERO_H - 90],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  const meta = [
    loja.tempo_entrega != null ? `${loja.tempo_entrega} min` : null,
    loja.taxa_entrega === 0
      ? 'Entrega grátis'
      : loja.taxa_entrega != null
        ? `Entrega ${formatarReais(loja.taxa_entrega)}`
        : null,
    statusAbertura(loja.horarios ?? null)?.texto ?? null,
  ].filter(Boolean) as string[]

  const inicial = loja.nome.trim().charAt(0).toUpperCase() || '·'
  const irParaCardapio = () =>
    scrollRef.current?.scrollTo({ y: Math.max(0, posicaoCardapio.current - 72), animated: true })

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style={depoisDoHero ? 'dark' : 'light'} />

      {/* Header fixo: nu sobre a foto → surface com fio depois do hero */}
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
        <AcaoMesa icone="back" progresso={{ claro: headerBgInverso, escuro: headerBg }} aoTocar={sairPara(() => router.back())} />
        <Animated.Text
          numberOfLines={1}
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 17,
            letterSpacing: 0.2,
            color: colors.ink,
            opacity: headerBg,
            ...fontStyle(design.display, 600),
          }}
        >
          {loja.nome}
        </Animated.Text>
        <AcaoMesa
          icone="bag"
          contador={totalItens}
          progresso={{ claro: headerBgInverso, escuro: headerBg }}
          aoTocar={() => totalItens > 0 && router.push('/checkout')}
        />
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: espacoFinal + ALTURA_BARRA_MENU + 12 }}
      >
        {/* ── Hero full-bleed: foto da casa, selo e nome em serifa ── */}
        <View style={{ height: HERO_H, backgroundColor: colors.surfaceDark }}>
          {loja.banner_url ? (
            <Image source={{ uri: loja.banner_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, backgroundColor: colors.accent }} />
          )}
          <Image
            source={{ uri: GRADIENTE_HERO }}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            resizeMode="stretch"
          />

          {/* Selo de tradição */}
          <View style={{ position: 'absolute', top: insets.top + 58, right: spacing.screenX }}>
            <SeloTradicao inicial={inicial} />
          </View>

          <View
            style={{
              position: 'absolute',
              left: spacing.screenX,
              right: spacing.screenX,
              bottom: 30,
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            <Text
              style={{
                fontSize: 11,
                letterSpacing: 2.4,
                textTransform: 'uppercase',
                color: 'rgba(255,249,240,0.85)',
                ...fontStyle(design.body, 600),
              }}
            >
              Cozinha de tradição
            </Text>
            <Text
              numberOfLines={3}
              style={{
                fontSize: Math.round(40 * typeFactor),
                lineHeight: Math.round(44 * typeFactor),
                letterSpacing: -0.4,
                color: CREME,
                ...fontStyle(design.display, 600),
              }}
            >
              {loja.nome}
            </Text>
            <TouchableOpacity
              activeOpacity={consumerDesign.opacity.pressed}
              onPress={irParaCardapio}
              style={{
                marginTop: 6,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 20,
                paddingVertical: 11,
                borderWidth: 1,
                borderColor: 'rgba(255,249,240,0.85)',
                borderRadius: 999,
              }}
            >
              <Text style={{ fontSize: 13.5, color: CREME, ...fontStyle(design.body, 600) }}>Ver o cardápio</Text>
              <ConsumerIcon name="chevron-down" size={14} color={CREME} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Meta da casa + ornamento ── */}
        <View style={{ alignItems: 'center', paddingTop: 22, paddingHorizontal: spacing.screenX }}>
          {meta.length > 0 && (
            <Text
              style={{
                fontSize: 11.5,
                letterSpacing: 1.6,
                textTransform: 'uppercase',
                textAlign: 'center',
                color: colors.inkMuted,
                ...fontStyle(design.body, 600),
              }}
            >
              {meta.join('   ·   ')}
            </Text>
          )}
        </View>

        {/* ── A casa: statement em serifa leve ── */}
        {loja.descricao && (
          <View style={{ alignItems: 'center', paddingTop: 30, paddingHorizontal: spacing.screenX + 8 }}>
            <Ornamento />
            <Text
              style={{
                marginTop: 18,
                fontSize: 11,
                letterSpacing: 2.2,
                textTransform: 'uppercase',
                color: colors.accent,
                ...fontStyle(design.body, 600),
              }}
            >
              A casa
            </Text>
            <Text
              style={{
                marginTop: 12,
                fontSize: Math.round(22 * typeFactor),
                lineHeight: Math.round(32 * typeFactor),
                textAlign: 'center',
                color: colors.ink,
                ...fontStyle(design.display, 400),
              }}
            >
              {loja.descricao}
            </Text>
          </View>
        )}

        {/* ── Pratos da casa: trilho de fotos grandes ── */}
        {pratos.length > 0 && (
          <View style={{ paddingTop: 34 }}>
            <Letreiro titulo="Pratos da casa" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={LARGURA_PRATO + 14}
              snapToAlignment="start"
              contentContainerStyle={{ paddingHorizontal: spacing.screenX, gap: 14 }}
            >
              {pratos.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  activeOpacity={consumerDesign.opacity.pressedSoft}
                  onPress={() => aoAbrirProduto(p)}
                  style={{ width: LARGURA_PRATO }}
                >
                  <Image
                    source={{ uri: p.foto_url ?? undefined }}
                    style={{
                      width: LARGURA_PRATO,
                      height: Math.round(LARGURA_PRATO * 1.25),
                      borderRadius: design.radius.lg,
                      backgroundColor: colors.surfaceMuted,
                    }}
                    resizeMode="cover"
                  />
                  <Text
                    numberOfLines={1}
                    style={{
                      marginTop: 12,
                      fontSize: Math.round(18 * typeFactor),
                      color: colors.ink,
                      ...fontStyle(design.display, 600),
                    }}
                  >
                    {p.nome}
                  </Text>
                  <Preco produto={p} tamanho={14} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Cardápio-livro ── */}
        <View onLayout={(e) => (posicaoCardapio.current = e.nativeEvent.layout.y)} style={{ paddingTop: 36 }}>
          <Letreiro titulo="Cardápio" />
          <View style={{ paddingHorizontal: spacing.screenX, gap: 30 }}>
            {secoes.map((secao) => (
              <View key={secao.titulo}>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: Math.round(24 * typeFactor),
                      color: colors.ink,
                      textAlign: 'center',
                      ...fontStyle(design.display, 600),
                    }}
                  >
                    {secao.titulo}
                  </Text>
                  <View style={{ marginTop: 10 }}>
                    <Ornamento compacto />
                  </View>
                </View>
                <View style={{ gap: 18 }}>
                  {secao.produtos.map((p) => (
                    <ItemDoCardapio key={p.id} produto={p} aoTocar={() => aoAbrirProduto(p)} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Fecho ── */}
        <View style={{ alignItems: 'center', paddingTop: 44, paddingHorizontal: spacing.screenX }}>
          <Ornamento />
          <Text
            style={{
              marginTop: 18,
              fontSize: Math.round(22 * typeFactor),
              color: colors.ink,
              textAlign: 'center',
              ...fontStyle(design.display, 600),
            }}
          >
            {loja.nome}
          </Text>
          {meta.length > 0 && (
            <Text
              style={{
                marginTop: 8,
                fontSize: 11.5,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                textAlign: 'center',
                color: colors.inkMuted,
                ...fontStyle(design.body, 600),
              }}
            >
              {meta.join('   ·   ')}
            </Text>
          )}
        </View>
      </Animated.ScrollView>

      <BarraMenuMesa sairPara={sairPara} />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Peças do cardápio-livro
// ─────────────────────────────────────────────────────────────

/** Item com foto pequena, nome em serifa, LINHA PONTILHADA até o preço. */
function ItemDoCardapio({ produto, aoTocar }: { produto: ProdutoVitrine; aoTocar: () => void }) {
  const design = useStoreDesign()
  const { colors } = design
  return (
    <TouchableOpacity onPress={aoTocar} activeOpacity={consumerDesign.opacity.pressedSoft}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
        {produto.foto_url ? (
          <Image
            source={{ uri: produto.foto_url }}
            style={{ width: 64, height: 64, borderRadius: design.radius.sm, backgroundColor: colors.surfaceMuted }}
            resizeMode="cover"
          />
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text
              numberOfLines={2}
              style={{
                flexShrink: 1,
                fontSize: 16,
                lineHeight: 21,
                color: colors.ink,
                ...fontStyle(design.display, 600),
              }}
            >
              {produto.nome}
            </Text>
            {/* A linha pontilhada do cardápio impresso */}
            <Text
              numberOfLines={1}
              ellipsizeMode="clip"
              style={{ flex: 1, minWidth: 18, marginHorizontal: 6, color: colors.line, letterSpacing: 2, fontSize: 13 }}
              aria-hidden
            >
              {'.'.repeat(80)}
            </Text>
            <Preco produto={produto} tamanho={15} alinhar="right" />
          </View>
          {produto.descricao && (
            <Text
              numberOfLines={2}
              style={{
                marginTop: 3,
                fontSize: 13,
                lineHeight: 18,
                color: colors.inkMuted,
                ...fontStyle(design.body, 400),
              }}
            >
              {produto.descricao}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

function Preco({ produto, tamanho, alinhar = 'left' }: { produto: ProdutoVitrine; tamanho: number; alinhar?: 'left' | 'right' }) {
  const design = useStoreDesign()
  const { colors } = design
  return (
    <View style={{ alignItems: alinhar === 'right' ? 'flex-end' : 'flex-start' }}>
      <Text style={{ fontSize: tamanho, color: colors.ink, ...fontStyle(design.display, 600) }}>
        {formatarReais(precoFinalDe(produto))}
      </Text>
      {temPromo(produto) && (
        <Text style={{ fontSize: tamanho - 3, color: colors.inkSoft, textDecorationLine: 'line-through', ...fontStyle(design.body, 400) }}>
          {formatarReais(produto.preco)}
        </Text>
      )}
    </View>
  )
}

/** Letreiro de bloco: sobrelinha em caps espaçadas, centrada. */
function Letreiro({ titulo }: { titulo: string }) {
  const design = useStoreDesign()
  const { colors } = design
  return (
    <Text
      style={{
        marginBottom: 16,
        fontSize: 11,
        letterSpacing: 2.2,
        textTransform: 'uppercase',
        textAlign: 'center',
        color: colors.accent,
        ...fontStyle(design.body, 600),
      }}
    >
      {titulo}
    </Text>
  )
}

/** Fio · losango · fio — o ornamento do cardápio impresso. */
function Ornamento({ compacto = false }: { compacto?: boolean }) {
  const { colors } = useStoreDesign()
  const largura = compacto ? 28 : 44
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} aria-hidden>
      <View style={{ width: largura, height: 1, backgroundColor: colors.line }} />
      <View style={{ width: 6, height: 6, backgroundColor: colors.accent, transform: [{ rotate: '45deg' }] }} />
      <View style={{ width: largura, height: 1, backgroundColor: colors.line }} />
    </View>
  )
}

/** Selo circular de tradição: inicial em serifa dentro de dois anéis creme. */
function SeloTradicao({ inicial }: { inicial: string }) {
  const design = useStoreDesign()
  return (
    <View
      style={{
        width: 74,
        height: 74,
        borderRadius: 37,
        borderWidth: 1,
        borderColor: 'rgba(255,249,240,0.85)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 62,
          height: 62,
          borderRadius: 31,
          borderWidth: 1,
          borderColor: 'rgba(255,249,240,0.45)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 26, lineHeight: 30, color: CREME, ...fontStyle(design.display, 600) }}>{inicial}</Text>
        <Text style={{ fontSize: 6.5, letterSpacing: 1.4, color: 'rgba(255,249,240,0.85)', ...fontStyle(design.body, 700) }}>
          TRADIÇÃO
        </Text>
      </View>
    </View>
  )
}

/** Ação do header: crossfade creme (sobre foto) → ink (header claro). */
function AcaoMesa({
  icone,
  aoTocar,
  progresso,
  contador = 0,
}: {
  icone: 'back' | 'bag'
  aoTocar: (e: GestureResponderEvent) => void
  progresso: { claro: Animated.AnimatedInterpolation<number>; escuro: Animated.AnimatedInterpolation<number> }
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
      <Animated.View style={{ position: 'absolute', opacity: progresso.claro }}>
        <ConsumerIcon name={icone} size={22} color={CREME} strokeWidth={2} />
      </Animated.View>
      <Animated.View style={{ opacity: progresso.escuro }}>
        <ConsumerIcon name={icone} size={22} color={colors.ink} strokeWidth={2} />
      </Animated.View>
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
          <Text style={{ fontSize: 10, color: colors.accentInk, fontWeight: '800' }}>{contador}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const ITENS_MENU: { rotulo: string; icone: ConsumerIconName; rota: string; ativo?: boolean }[] = [
  { rotulo: 'Início', icone: 'home', rota: '/', ativo: true },
  { rotulo: 'Explorar', icone: 'reels', rota: '/explorar' },
  { rotulo: 'Pedidos', icone: 'orders', rota: '/pedidos' },
  { rotulo: 'Perfil', icone: 'user', rota: '/perfil' },
]

/** Barra fixa sobre o creme — molde A, rótulos na serifa leve da casa. */
function BarraMenuMesa({ sairPara }: { sairPara: (acao: () => void) => (e: GestureResponderEvent) => void }) {
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
            <ConsumerIcon name={item.icone} size={21} color={cor} strokeWidth={item.ativo ? 2.1 : 1.7} />
            <Text style={{ fontSize: 10, color: cor, ...fontStyle(design.body, item.ativo ? 600 : 400) }}>{item.rotulo}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}
