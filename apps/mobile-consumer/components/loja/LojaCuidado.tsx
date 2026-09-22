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
import { formatarReais, horarioDeHoje, statusAbertura } from '@mallevo/lib'
import { ConsumerIcon, type ConsumerIconName } from '@/components/ConsumerIcon'
import { useCartStore } from '@/store/useCartStore'
import { useTransicaoSaida } from '@/store/useTransicaoSaida'
import { type ProdutoVitrine } from '@/components/loja/LojaEditorial'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * Vitrine cuidado — layout PRÓPRIO do arquétipo `soft` para salões &
 * estética (default), pet shop (default) e veterinária (docs/store-theme/02
 * §E; refs Groomerly, PetPals). O soft é SERVIÇO ACOLHEDOR: quem chega quer
 * confiança e clareza de pacote, não vitrine de moda.
 *
 * DNA destilado das referências:
 * - CARTÃO DE BOAS-VINDAS de cantos bem redondos dentro do gutter (a foto da
 *   casa emoldurada, nunca full-bleed), nome em sans amigável (Nunito 800),
 *   descrição e CTA em pill quente;
 * - STATS em três moedas arredondadas com fatos da casa (serviços, tempo,
 *   horário de hoje) — só dado real, nada de nota inventada;
 * - PACOTES: a primeira seção em CARTÕES-TIER na cor quente-suave, com preço
 *   grande e CHECKLIST tirado da ficha técnica (`metadata.especificacoes`,
 *   que salões e pet preenchem: duração, inclui, durabilidade);
 * - demais seções em LISTA ARREDONDADA (moeda com a inicial, nome,
 *   descrição, preço, seta) — leitura de cardápio de serviços;
 * - fecho acolhedor com o horário de hoje.
 *
 * Sacola única no header; barra de menu FIXA (molde A).
 */

const { width: SCREEN_W } = Dimensions.get('window')
const ALTURA_BARRA_MENU = 58
const LARGURA_PACOTE = Math.round(SCREEN_W * 0.72)
/** Pacotes: quantos da primeira seção viram tier. */
const MAX_PACOTES = 6

interface ProdutoCuidadoItem extends ProdutoVitrine {
  metadata?: Record<string, unknown> | null
}

interface SecaoLoja<T extends ProdutoCuidadoItem> {
  titulo: string
  produtos: T[]
}

interface Props<T extends ProdutoCuidadoItem> {
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

/** Ficha técnica publicada pelo lojista: pares rótulo/valor → linhas do checklist. */
function fichaDe(p: ProdutoCuidadoItem): string[] {
  const esp = p.metadata?.especificacoes
  if (!Array.isArray(esp)) return []
  return esp
    .filter((par): par is [string, string] => Array.isArray(par) && typeof par[0] === 'string' && typeof par[1] === 'string')
    .map(([rotulo, valor]) => `${rotulo}: ${valor}`)
    .slice(0, 4)
}

export function LojaCuidado<T extends ProdutoCuidadoItem>({
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
  const [depoisDoCartao, setDepoisDoCartao] = useState(false)
  const posicaoServicos = useRef(0)

  useEffect(() => {
    const sub = scrollY.addListener(({ value }) => setDepoisDoCartao(value > 260))
    return () => scrollY.removeListener(sub)
  }, [scrollY])

  const sairPara = (acao: () => void) => (e: GestureResponderEvent) =>
    iniciarSaida({
      acao,
      cor: colors.accent,
      origem: { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY },
    })

  const headerBg = scrollY.interpolate({ inputRange: [180, 260], outputRange: [0, 1], extrapolate: 'clamp' })

  const todos = useMemo(() => secoes.flatMap((s) => s.produtos), [secoes])
  const pacotes = useMemo(() => (secoes[0]?.produtos ?? []).slice(0, MAX_PACOTES), [secoes])
  const status = statusAbertura(loja.horarios ?? null)
  const hoje = horarioDeHoje(loja.horarios ?? null)

  // Stats: só fatos da casa. Sem nota, sem "clientes felizes".
  const stats = [
    { rotulo: todos.length === 1 ? 'serviço' : 'serviços', valor: String(todos.length) },
    loja.tempo_entrega != null ? { rotulo: 'min', valor: String(loja.tempo_entrega) } : null,
    hoje ? { rotulo: 'hoje até', valor: hoje.fecha } : null,
  ].filter((s): s is { rotulo: string; valor: string } => !!s)

  const iniciais = loja.nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />

      {/* Header: transparente sobre o canvas → surface com fio ao passar do cartão */}
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
        <AcaoCuidado icone="back" aoTocar={sairPara(() => router.back())} />
        <Animated.Text
          numberOfLines={1}
          style={{ flex: 1, textAlign: 'center', fontSize: 16, color: colors.ink, opacity: headerBg, ...fontStyle(design.display, 800) }}
        >
          {loja.nome}
        </Animated.Text>
        <AcaoCuidado icone="bag" contador={totalItens} aoTocar={() => totalItens > 0 && router.push('/checkout')} />
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: espacoFinal + ALTURA_BARRA_MENU + 12 }}
      >
        {/* ── Cartão de boas-vindas ── */}
        <View
          style={[
            { marginHorizontal: spacing.screenX, borderRadius: design.radius.xl, backgroundColor: colors.surface, overflow: 'hidden' },
            consumerDesign.shadow.soft,
          ]}
        >
          <View style={{ height: 190, backgroundColor: colors.accentSoft }}>
            {loja.banner_url ? (
              <Image source={{ uri: loja.banner_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ConsumerIcon name="heart" size={36} color={colors.accent} strokeWidth={1.8} />
              </View>
            )}
          </View>
          <View style={{ padding: 18, paddingTop: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: -26 }}>
              <View
                style={[
                  {
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    overflow: 'hidden',
                    backgroundColor: loja.logo_url ? colors.surface : colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 3,
                    borderColor: colors.surface,
                  },
                  consumerDesign.shadow.soft,
                ]}
              >
                {loja.logo_url ? (
                  <Image source={{ uri: loja.logo_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <Text style={{ fontSize: 18, color: colors.accentInk, ...fontStyle(design.display, 800) }}>{iniciais}</Text>
                )}
              </View>
              {status && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: status.aberta ? colors.success : colors.danger }} />
                  <Text style={{ fontSize: 12, color: colors.inkMuted, ...fontStyle(design.body, 700) }}>{status.texto}</Text>
                </View>
              )}
            </View>
            <Text
              style={{
                marginTop: 12,
                fontSize: Math.round(26 * typeFactor),
                lineHeight: Math.round(31 * typeFactor),
                color: colors.ink,
                ...fontStyle(design.display, 800),
              }}
            >
              {loja.nome}
            </Text>
            {loja.descricao && (
              <Text numberOfLines={3} style={{ marginTop: 6, fontSize: 14, lineHeight: 21, color: colors.inkMuted, ...fontStyle(design.body, 500) }}>
                {loja.descricao}
              </Text>
            )}

            {/* Stats: moedas arredondadas */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              {stats.map((s) => (
                <View key={s.rotulo} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: design.radius.lg, backgroundColor: colors.accentSoft }}>
                  <Text style={{ fontSize: 18, color: colors.ink, ...fontStyle(design.display, 800) }}>{s.valor}</Text>
                  <Text style={{ fontSize: 10.5, color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.6, ...fontStyle(design.body, 700) }}>{s.rotulo}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => scrollRef.current?.scrollTo({ y: Math.max(0, posicaoServicos.current - 70), animated: true })}
              activeOpacity={consumerDesign.opacity.pressed}
              style={{ marginTop: 16, height: 48, borderRadius: 999, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
            >
              <Text style={{ fontSize: 14.5, color: colors.accentInk, ...fontStyle(design.body, 800) }}>Ver serviços</Text>
              <ConsumerIcon name="chevron-down" size={16} color={colors.accentInk} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Pacotes: cartões-tier com checklist ── */}
        {pacotes.length > 0 && (
          <View onLayout={(e) => (posicaoServicos.current = e.nativeEvent.layout.y)} style={{ paddingTop: 28 }}>
            <Letreiro titulo={secoes[0].titulo} sub="Escolha o pacote e a gente cuida do resto" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={LARGURA_PACOTE + 12}
              contentContainerStyle={{ paddingHorizontal: spacing.screenX, gap: 12 }}
            >
              {pacotes.map((p, i) => (
                <CartaoPacote key={p.id} produto={p} destaque={i === 0} largura={LARGURA_PACOTE} aoTocar={() => aoAbrirProduto(p)} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Demais seções: lista arredondada ── */}
        {secoes.slice(1).map((secao) => (
          <View key={secao.titulo} style={{ paddingTop: 28 }}>
            <Letreiro titulo={secao.titulo} />
            <View style={{ marginHorizontal: spacing.screenX, borderRadius: design.radius.xl, backgroundColor: colors.surface, overflow: 'hidden' }}>
              {secao.produtos.map((p, i) => (
                <LinhaServico key={p.id} produto={p} primeira={i === 0} aoTocar={() => aoAbrirProduto(p)} />
              ))}
            </View>
          </View>
        ))}

        {/* ── Fecho acolhedor ── */}
        <View style={{ alignItems: 'center', paddingTop: 36, paddingHorizontal: spacing.screenX }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <ConsumerIcon name="heart" size={20} color={colors.accent} strokeWidth={2} />
          </View>
          <Text style={{ marginTop: 12, fontSize: 18, color: colors.ink, ...fontStyle(design.display, 800) }}>{loja.nome}</Text>
          {hoje && (
            <Text style={{ marginTop: 4, fontSize: 13, color: colors.inkMuted, ...fontStyle(design.body, 600) }}>
              Hoje das {hoje.abre} às {hoje.fecha}
            </Text>
          )}
        </View>
      </Animated.ScrollView>

      <BarraMenuCuidado sairPara={sairPara} />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Peças
// ─────────────────────────────────────────────────────────────

function Letreiro({ titulo, sub }: { titulo: string; sub?: string }) {
  const design = useStoreDesign()
  const { colors, spacing } = design
  return (
    <View style={{ paddingHorizontal: spacing.screenX, marginBottom: 12 }}>
      <Text style={{ fontSize: Math.round(20 * design.typeFactor), color: colors.ink, ...fontStyle(design.display, 800) }}>{titulo}</Text>
      {sub && <Text style={{ marginTop: 2, fontSize: 13, color: colors.inkMuted, ...fontStyle(design.body, 500) }}>{sub}</Text>}
    </View>
  )
}

/** Tier: cartão quente-suave (o primeiro em accent cheio), preço grande e checklist da ficha. */
function CartaoPacote({ produto, destaque, largura, aoTocar }: { produto: ProdutoCuidadoItem; destaque: boolean; largura: number; aoTocar: () => void }) {
  const design = useStoreDesign()
  const { colors } = design
  const ficha = fichaDe(produto)
  const linhas = ficha.length > 0 ? ficha : produto.descricao ? [produto.descricao] : []
  const tinta = destaque ? colors.accentInk : colors.ink
  const tintaSuave = destaque ? colors.accentInk : colors.inkMuted
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      style={[{ width: largura, padding: 18, borderRadius: design.radius.xl, backgroundColor: destaque ? colors.accent : colors.accentSoft }, destaque ? consumerDesign.shadow.medium : null]}
    >
      {produto.foto_url && (
        <Image source={{ uri: produto.foto_url }} style={{ width: '100%', height: 120, borderRadius: design.radius.lg, marginBottom: 14, backgroundColor: colors.surfaceMuted }} resizeMode="cover" />
      )}
      <Text numberOfLines={2} style={{ fontSize: 18, lineHeight: 23, color: tinta, ...fontStyle(design.display, 800) }}>{produto.nome}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
        <Text style={{ fontSize: 26, color: tinta, ...fontStyle(design.display, 800) }}>{formatarReais(precoFinalDe(produto))}</Text>
        {!!produto.preco_promocional && produto.preco_promocional < produto.preco && (
          <Text style={{ fontSize: 12, color: tintaSuave, textDecorationLine: 'line-through', opacity: 0.8, ...fontStyle(design.body, 500) }}>{formatarReais(produto.preco)}</Text>
        )}
      </View>
      <View style={{ marginTop: 12, gap: 7 }}>
        {linhas.map((linha) => (
          <View key={linha} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: destaque ? 'rgba(255,255,255,0.28)' : colors.surface, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
              <ConsumerIcon name="check" size={11} color={destaque ? colors.accentInk : colors.accent} strokeWidth={3} />
            </View>
            <Text numberOfLines={2} style={{ flex: 1, fontSize: 13, lineHeight: 18, color: tintaSuave, ...fontStyle(design.body, 600) }}>{linha}</Text>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 16, height: 42, borderRadius: 999, backgroundColor: destaque ? colors.surface : colors.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 13.5, color: destaque ? colors.accent : colors.accentInk, ...fontStyle(design.body, 800) }}>Escolher</Text>
      </View>
    </TouchableOpacity>
  )
}

/** Linha de serviço: moeda com inicial (ou foto), nome, descrição, preço e seta. */
function LinhaServico({ produto, primeira, aoTocar }: { produto: ProdutoCuidadoItem; primeira: boolean; aoTocar: () => void }) {
  const design = useStoreDesign()
  const { colors } = design
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: primeira ? 0 : 1, borderTopColor: colors.line }}
    >
      <View style={{ width: 46, height: 46, borderRadius: 23, overflow: 'hidden', backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        {produto.foto_url ? (
          <Image source={{ uri: produto.foto_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: 16, color: colors.accent, ...fontStyle(design.display, 800) }}>{produto.nome.charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontSize: 15, color: colors.ink, ...fontStyle(design.display, 700) }}>{produto.nome}</Text>
        {produto.descricao && (
          <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 12.5, color: colors.inkMuted, ...fontStyle(design.body, 500) }}>{produto.descricao}</Text>
        )}
      </View>
      <Text style={{ fontSize: 15, color: colors.ink, ...fontStyle(design.display, 800) }}>{formatarReais(precoFinalDe(produto))}</Text>
      <ConsumerIcon name="chevron-right" size={16} color={colors.inkSoft} strokeWidth={2.2} />
    </TouchableOpacity>
  )
}

function AcaoCuidado({ icone, aoTocar, contador = 0 }: { icone: 'back' | 'bag'; aoTocar: (e: GestureResponderEvent) => void; contador?: number }) {
  const { colors } = useStoreDesign()
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={0.7}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      style={[{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, consumerDesign.shadow.soft]}
    >
      <ConsumerIcon name={icone} size={20} color={colors.ink} strokeWidth={2.1} />
      {contador > 0 && (
        <View
          style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}
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

/** Barra fixa — molde A, acento quente no ativo. */
function BarraMenuCuidado({ sairPara }: { sairPara: (acao: () => void) => (e: GestureResponderEvent) => void }) {
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
          <TouchableOpacity key={item.rota} onPress={sairPara(() => router.navigate(item.rota as never))} activeOpacity={0.7} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <ConsumerIcon name={item.icone} size={21} color={cor} strokeWidth={item.ativo ? 2.2 : 1.7} />
            <Text style={{ fontSize: 10, color: cor, ...fontStyle(design.body, item.ativo ? 800 : 600) }}>{item.rotulo}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}
