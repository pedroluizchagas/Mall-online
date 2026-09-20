import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { formatarReais, statusAbertura } from '@mallevo/lib'
import { ConsumerIcon, type ConsumerIconName } from '@/components/ConsumerIcon'
import { useCartStore } from '@/store/useCartStore'
import { useTransicaoSaida } from '@/store/useTransicaoSaida'
import { type ProdutoVitrine } from '@/components/loja/LojaEditorial'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * Vitrine gôndola — layout PRÓPRIO do arquétipo `market` para mercado &
 * conveniência (default), construção & ferramentas e oficinas
 * (docs/store-theme/02 §I). Compra de mercado é ESCANEÁVEL e por PREÇO:
 * grade densa, muitos itens, promoção em destaque — nenhum arquétipo
 * boutique serve.
 *
 * DNA destilado:
 * - CABEÇALHO CURTO e brilhante: logo + nome + meta na faixa verde-suave;
 *   nada de hero fotográfico — o produto é a foto;
 * - BUSCA e CHIPS DE CATEGORIA GRUDADOS no topo: a régua da gôndola, que
 *   rola a página até o corredor e acende conforme a leitura avança;
 * - OFERTAS DO DIA em trilho compacto com o preço na frente (% de desconto,
 *   preço antigo riscado);
 * - GRADE DENSA de 3 colunas por corredor: foto pequena, nome em duas
 *   linhas, PREÇO GRANDE (verde quando em oferta, com unidade "/kg") e
 *   ADIÇÃO RÁPIDA no cartão ("+" que vira contador);
 * - densidade compacta da pele (Inter 600–800, raios suaves).
 *
 * Sacola única no header; barra de menu FIXA (molde A).
 */

const ALTURA_BARRA_MENU = 58
const COLUNAS = 3
const GAP = 8
/** Ofertas: itens com desconto, os maiores descontos primeiro. */
const MAX_OFERTAS = 10

interface ProdutoGondolaItem extends ProdutoVitrine {
  metadata?: Record<string, unknown> | null
}

interface SecaoLoja<T extends ProdutoGondolaItem> {
  titulo: string
  produtos: T[]
}

interface Props<T extends ProdutoGondolaItem> {
  loja: {
    id: string
    nome: string
    descricao?: string | null
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

function descontoPct(p: ProdutoVitrine): number {
  if (!p.preco_promocional || p.preco_promocional >= p.preco) return 0
  return Math.round((1 - p.preco_promocional / p.preco) * 100)
}

/** "/kg", "/un" — a unidade de venda publicada pelo lojista (`metadata.unidade`). */
function sufixoUnidade(p: ProdutoGondolaItem): string {
  const u = p.metadata?.unidade
  return typeof u === 'string' && u.trim() ? `/${u.trim()}` : ''
}

export function LojaGondola<T extends ProdutoGondolaItem>({
  loja,
  secoes,
  aoAbrirProduto,
  espacoFinal,
}: Props<T>) {
  const design = useStoreDesign()
  const { colors, spacing, typeFactor } = design
  const insets = useSafeAreaInsets()
  const totalItens = useCartStore((s) => s.totalItens())
  const itensSacola = useCartStore((s) => s.itens)
  const adicionarItem = useCartStore((s) => s.adicionarItem)
  const storeAtual = useCartStore((s) => s.store_id)
  const iniciarSaida = useTransicaoSaida((s) => s.iniciar)

  const scrollRef = useRef<ScrollView>(null)
  const posicoes = useRef<Record<string, number>>({})
  const [secaoAtiva, setSecaoAtiva] = useState<string | null>(secoes[0]?.titulo ?? null)
  const [busca, setBusca] = useState('')
  const [flash, setFlash] = useState<Set<string>>(new Set())

  const todos = useMemo(() => secoes.flatMap((s) => s.produtos), [secoes])
  const ofertas = useMemo(
    () => todos.filter((p) => descontoPct(p) > 0).sort((a, b) => descontoPct(b) - descontoPct(a)).slice(0, MAX_OFERTAS),
    [todos],
  )

  const termo = busca.trim().toLowerCase()
  const resultado = useMemo(
    () => (termo ? todos.filter((p) => p.nome.toLowerCase().includes(termo) || (p.descricao ?? '').toLowerCase().includes(termo)) : []),
    [todos, termo],
  )

  // Quantidade na sacola por produto — o "+" vira contador.
  const naSacola = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of itensSacola) m.set(i.product_id, (m.get(i.product_id) ?? 0) + i.quantidade)
    return m
  }, [itensSacola])

  const sairPara = (acao: () => void) => (e: GestureResponderEvent) =>
    iniciarSaida({
      acao,
      cor: colors.accent,
      origem: { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY },
    })

  const irParaSecao = (titulo: string) => {
    const y = posicoes.current[titulo]
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 116), animated: true })
    setSecaoAtiva(titulo)
  }

  // O chip aceso segue a rolagem: a última seção cujo topo já passou a régua.
  const aoRolar = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y + 140
    let atual: string | null = null
    for (const s of secoes) {
      const pos = posicoes.current[s.titulo]
      if (pos != null && pos <= y) atual = s.titulo
    }
    if (atual && atual !== secaoAtiva) setSecaoAtiva(atual)
  }

  const adicionarRapido = (p: T) => {
    if (storeAtual && storeAtual !== loja.id) {
      aoAbrirProduto(p)
      return
    }
    adicionarItem(
      { product_id: p.id, nome: p.nome, preco: precoFinalDe(p), quantidade: 1, foto_url: p.foto_url ?? undefined },
      loja.id,
      loja.nome,
      (loja.taxa_entrega ?? 0) as number,
    )
    setFlash((atual) => new Set(atual).add(p.id))
    setTimeout(
      () =>
        setFlash((atual) => {
          const prox = new Set(atual)
          prox.delete(p.id)
          return prox
        }),
      900,
    )
  }

  const meta = [
    loja.tempo_entrega != null ? `Entrega em ${loja.tempo_entrega} min` : null,
    loja.taxa_entrega === 0 ? 'Frete grátis' : loja.taxa_entrega != null ? `Frete ${formatarReais(loja.taxa_entrega)}` : null,
    statusAbertura(loja.horarios ?? null)?.texto ?? null,
  ].filter(Boolean) as string[]

  const iniciais = loja.nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />

      {/* ── Bloco grudado: header claro + busca + chips ── */}
      <View
        style={[
          { zIndex: 10, backgroundColor: colors.surface, paddingTop: insets.top + 6, borderBottomWidth: 1, borderBottomColor: colors.line },
          consumerDesign.shadow.soft,
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.screenX - 8 }}>
          <AcaoGondola icone="back" aoTocar={sairPara(() => router.back())} />
          <Text
            numberOfLines={1}
            style={{ flex: 1, textAlign: 'center', fontSize: 16, color: colors.ink, ...fontStyle(design.display, 800) }}
          >
            {loja.nome}
          </Text>
          <AcaoGondola icone="bag" contador={totalItens} aoTocar={() => totalItens > 0 && router.push('/checkout')} />
        </View>

        {/* Busca — em mercado, a primeira coisa que se faz */}
        <View
          style={{
            marginTop: 8,
            marginHorizontal: spacing.screenX,
            height: 42,
            borderRadius: design.radius.md,
            backgroundColor: colors.surfaceMuted,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 12,
          }}
        >
          <ConsumerIcon name="search" size={17} color={colors.inkMuted} strokeWidth={2.2} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar na loja"
            placeholderTextColor={colors.inkSoft}
            returnKeyType="search"
            style={{ flex: 1, fontSize: 14.5, color: colors.ink, paddingVertical: 0 }}
          />
          {busca.length > 0 && (
            <TouchableOpacity onPress={() => setBusca('')} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
              <ConsumerIcon name="close-circle" size={17} color={colors.inkSoft} />
            </TouchableOpacity>
          )}
        </View>

        {/* Chips de categoria — a régua da gôndola */}
        {!termo && secoes.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.screenX, paddingVertical: 10, gap: 6 }}
          >
            {secoes.map((s) => {
              const ativa = s.titulo === secaoAtiva
              return (
                <TouchableOpacity
                  key={s.titulo}
                  onPress={() => irParaSecao(s.titulo)}
                  activeOpacity={0.8}
                  style={{
                    height: 32,
                    paddingHorizontal: 13,
                    borderRadius: 999,
                    justifyContent: 'center',
                    backgroundColor: ativa ? colors.accent : colors.surfaceMuted,
                  }}
                >
                  <Text style={{ fontSize: 12.5, color: ativa ? colors.accentInk : colors.ink, ...fontStyle(design.body, 700) }}>
                    {s.titulo}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        onScroll={aoRolar}
        scrollEventThrottle={48}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: espacoFinal + ALTURA_BARRA_MENU + 12 }}
      >
        {/* ── Cabeçalho curto da loja na faixa verde-suave ── */}
        <View
          style={{
            marginHorizontal: spacing.screenX,
            marginTop: 12,
            padding: 12,
            borderRadius: design.radius.md,
            backgroundColor: colors.accentSoft,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: design.radius.sm,
              overflow: 'hidden',
              backgroundColor: loja.logo_url ? colors.surface : colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {loja.logo_url ? (
              <Image source={{ uri: loja.logo_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Text style={{ fontSize: 15, color: colors.accentInk, ...fontStyle(design.display, 800) }}>{iniciais}</Text>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontSize: Math.round(17 * typeFactor), color: colors.ink, ...fontStyle(design.display, 800) }}>
              {loja.nome}
            </Text>
            {meta.length > 0 && (
              <Text numberOfLines={2} style={{ marginTop: 2, fontSize: 12, lineHeight: 16, color: colors.inkMuted, ...fontStyle(design.body, 600) }}>
                {meta.join(' · ')}
              </Text>
            )}
          </View>
        </View>

        {termo ? (
          /* ── Busca ativa: grade de resultados ── */
          <View style={{ paddingHorizontal: spacing.screenX, paddingTop: 16 }}>
            <Text style={{ fontSize: 13, color: colors.inkMuted, marginBottom: 10, ...fontStyle(design.body, 600) }}>
              {resultado.length} {resultado.length === 1 ? 'resultado' : 'resultados'} para “{busca.trim()}”
            </Text>
            {resultado.length > 0 ? (
              <Grade produtos={resultado} naSacola={naSacola} flash={flash} aoTocar={aoAbrirProduto} aoAdicionar={adicionarRapido} />
            ) : (
              <Text style={{ fontSize: 14, color: colors.inkMuted, paddingVertical: 24, textAlign: 'center', ...fontStyle(design.body, 500) }}>
                Nada com esse nome. Tente outra palavra.
              </Text>
            )}
          </View>
        ) : (
          <>
            {/* ── Ofertas do dia: preço na frente ── */}
            {ofertas.length > 0 && (
              <View style={{ paddingTop: 18 }}>
                <Letreiro titulo="Ofertas do dia" contagem={ofertas.length} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.screenX, gap: 8 }}>
                  {ofertas.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => aoAbrirProduto(p)}
                      activeOpacity={consumerDesign.opacity.pressedSoft}
                      style={{
                        width: 150,
                        padding: 10,
                        borderRadius: design.radius.md,
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.line,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Image
                          source={{ uri: p.foto_url ?? undefined }}
                          style={{ width: 44, height: 44, borderRadius: design.radius.sm, backgroundColor: colors.surfaceMuted }}
                          resizeMode="cover"
                        />
                        <View style={{ backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 10.5, color: colors.accentInk, ...fontStyle(design.body, 800) }}>-{descontoPct(p)}%</Text>
                        </View>
                      </View>
                      <Text style={{ marginTop: 8, fontSize: 16, color: colors.accent, ...fontStyle(design.display, 800) }}>
                        {formatarReais(precoFinalDe(p))}
                        <Text style={{ fontSize: 11, color: colors.inkMuted, ...fontStyle(design.body, 600) }}>{sufixoUnidade(p)}</Text>
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.inkSoft, textDecorationLine: 'line-through', ...fontStyle(design.body, 500) }}>
                        {formatarReais(p.preco)}
                      </Text>
                      <Text numberOfLines={2} style={{ marginTop: 4, fontSize: 12, lineHeight: 16, color: colors.ink, ...fontStyle(design.body, 600) }}>
                        {p.nome}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── Corredores: grade densa por seção ── */}
            {secoes.map((secao) => (
              <View
                key={secao.titulo}
                onLayout={(e) => {
                  posicoes.current[secao.titulo] = e.nativeEvent.layout.y
                }}
                style={{ paddingTop: 22, paddingHorizontal: spacing.screenX }}
              >
                <Letreiro titulo={secao.titulo} contagem={secao.produtos.length} semGutter />
                <Grade produtos={secao.produtos} naSacola={naSacola} flash={flash} aoTocar={aoAbrirProduto} aoAdicionar={adicionarRapido} />
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <BarraMenuGondola sairPara={sairPara} />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Grade densa — 3 colunas, preço grande, "+" que vira contador
// ─────────────────────────────────────────────────────────────

function Grade<T extends ProdutoGondolaItem>({
  produtos,
  naSacola,
  flash,
  aoTocar,
  aoAdicionar,
}: {
  produtos: T[]
  naSacola: Map<string, number>
  flash: Set<string>
  aoTocar: (p: T) => void
  aoAdicionar: (p: T) => void
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
      {produtos.map((p) => (
        <CardGondola
          key={p.id}
          produto={p}
          quantidade={naSacola.get(p.id) ?? 0}
          acabouDeEntrar={flash.has(p.id)}
          aoTocar={() => aoTocar(p)}
          aoAdicionar={() => aoAdicionar(p)}
        />
      ))}
    </View>
  )
}

function CardGondola({
  produto,
  quantidade,
  acabouDeEntrar,
  aoTocar,
  aoAdicionar,
}: {
  produto: ProdutoGondolaItem
  quantidade: number
  acabouDeEntrar: boolean
  aoTocar: () => void
  aoAdicionar: () => void
}) {
  const design = useStoreDesign()
  const { colors, spacing } = design
  const larguraTela = Dimensions.get('window').width
  const largura = Math.floor((larguraTela - spacing.screenX * 2 - GAP * (COLUNAS - 1)) / COLUNAS)
  const desc = descontoPct(produto)
  const escala = useRef(new Animated.Value(1)).current

  const aoTocarMais = () => {
    Animated.sequence([
      Animated.timing(escala, { toValue: 0.86, duration: 70, useNativeDriver: true }),
      Animated.spring(escala, { toValue: 1, speed: 26, bounciness: 8, useNativeDriver: true }),
    ]).start()
    aoAdicionar()
  }

  return (
    <View
      style={{
        width: largura,
        borderRadius: design.radius.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        padding: 8,
      }}
    >
      <TouchableOpacity onPress={aoTocar} activeOpacity={consumerDesign.opacity.pressedSoft}>
        <View style={{ width: '100%', aspectRatio: 1, borderRadius: design.radius.sm, overflow: 'hidden', backgroundColor: colors.surfaceMuted }}>
          {produto.foto_url ? (
            <Image source={{ uri: produto.foto_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ConsumerIcon name="bag" size={20} color={colors.inkSoft} />
            </View>
          )}
          {desc > 0 && (
            <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 10, color: colors.accentInk, ...fontStyle(design.body, 800) }}>-{desc}%</Text>
            </View>
          )}
        </View>
        <Text numberOfLines={2} style={{ marginTop: 7, fontSize: 12, lineHeight: 15.5, minHeight: 31, color: colors.ink, ...fontStyle(design.body, 600) }}>
          {produto.nome}
        </Text>
        <Text style={{ marginTop: 4, fontSize: 15, color: desc > 0 ? colors.accent : colors.ink, ...fontStyle(design.display, 800) }}>
          {formatarReais(precoFinalDe(produto))}
          <Text style={{ fontSize: 10.5, color: colors.inkMuted, ...fontStyle(design.body, 600) }}>{sufixoUnidade(produto)}</Text>
        </Text>
        {desc > 0 && (
          <Text style={{ fontSize: 10.5, color: colors.inkSoft, textDecorationLine: 'line-through', ...fontStyle(design.body, 500) }}>
            {formatarReais(produto.preco)}
          </Text>
        )}
      </TouchableOpacity>

      {/* Adição rápida: "+" verde que vira contador quando o item já está na sacola */}
      <Animated.View style={{ marginTop: 8, transform: [{ scale: escala }] }}>
        <TouchableOpacity
          onPress={aoTocarMais}
          activeOpacity={0.85}
          style={{
            height: 32,
            borderRadius: 999,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            backgroundColor: acabouDeEntrar ? colors.success : quantidade > 0 ? colors.accent : colors.surfaceMuted,
          }}
        >
          <ConsumerIcon
            name={acabouDeEntrar ? 'check' : 'plus'}
            size={14}
            color={acabouDeEntrar || quantidade > 0 ? colors.accentInk : colors.ink}
            strokeWidth={2.6}
          />
          {quantidade > 0 && !acabouDeEntrar && (
            <Text style={{ fontSize: 12.5, color: colors.accentInk, ...fontStyle(design.body, 800) }}>{quantidade}</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Apoio
// ─────────────────────────────────────────────────────────────

function Letreiro({ titulo, contagem, semGutter = false }: { titulo: string; contagem: number; semGutter?: boolean }) {
  const design = useStoreDesign()
  const { colors, spacing } = design
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        paddingHorizontal: semGutter ? 0 : spacing.screenX,
        marginBottom: 10,
      }}
    >
      <Text style={{ fontSize: Math.round(17 * design.typeFactor), color: colors.ink, ...fontStyle(design.display, 800) }}>{titulo}</Text>
      <Text style={{ fontSize: 11.5, color: colors.inkSoft, ...fontStyle(design.body, 700) }}>
        {contagem} {contagem === 1 ? 'ITEM' : 'ITENS'}
      </Text>
    </View>
  )
}

function AcaoGondola({ icone, aoTocar, contador = 0 }: { icone: 'back' | 'bag'; aoTocar: (e: GestureResponderEvent) => void; contador?: number }) {
  const { colors } = useStoreDesign()
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={0.7}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
    >
      <ConsumerIcon name={icone} size={22} color={colors.ink} strokeWidth={2.1} />
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

/** Barra fixa — molde A, verde no ativo. */
function BarraMenuGondola({ sairPara }: { sairPara: (acao: () => void) => (e: GestureResponderEvent) => void }) {
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
            <ConsumerIcon name={item.icone} size={21} color={cor} strokeWidth={item.ativo ? 2.2 : 1.7} />
            <Text style={{ fontSize: 10, color: cor, ...fontStyle(design.body, item.ativo ? 700 : 500) }}>{item.rotulo}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}
