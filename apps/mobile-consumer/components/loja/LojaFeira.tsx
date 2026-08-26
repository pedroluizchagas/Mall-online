import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AccessibilityInfo,
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
import { formatarReais } from '@mallevo/lib'
import { useCartStore } from '@/store/useCartStore'
import { useTransicaoSaida } from '@/store/useTransicaoSaida'
import { type ProdutoVitrine } from '@/components/loja/LojaEditorial'
import {
  BotaoFeira,
  CREME_FEIRA,
  ChipCronometro,
  DiscoCategoria,
  SeloOferta,
  VERDE_MATA,
  comAlfa,
} from '@/components/loja/feira-ui'
import { ConsumerIcon, type ConsumerIconName } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * Vitrine feira — layout PRÓPRIO do arquétipo `fresh` para hortifruti e
 * mercados frescos (docs/store-theme/02 §A9; referência: mockup de app
 * grocery).
 *
 * DNA destilado da referência:
 * - HERO-CARTÃO verde-mata (cartão com gutter, NÃO full-bleed) com manchete
 *   clara, pill de ação e uma COLAGEM de discos de foto sangrando o canto;
 *   vira pager quando há mais de uma foto, com dots;
 * - CHIPS CIRCULARES de categoria com foto, que rolam a página até a seção;
 * - OFERTAS com CRONÔMETRO — recorte transversal do catálogo, contando até a
 *   virada do dia;
 * - CARDS soltos com sombra suave, selo de oferta no canto e preço com
 *   UNIDADE ("/kg"), que é o jeito de vender de uma quitanda.
 *
 * A página é clara do topo ao pé (o hero é cartão, não foto full-bleed), então
 * esta é a primeira vitrine sem virada de status bar. Como toda vitrine, ela
 * desenha a própria barra de menu inferior (réplica da régua do shell vestida
 * no DNA da casa — nunca a TabBar do app), e não usa FAB: a sacola do chrome
 * é a porta do carrinho.
 */

const { width: SCREEN_W } = Dimensions.get('window')

/** Dias na ordem de `Date.getDay()` — chaves de `stores.horarios`. */
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const

/** Teto de itens no bloco de ofertas — o resto continua nos corredores. */
const MAX_OFERTAS = 6

/** Altura útil da barra de menu inferior (sem o safe-area inset). */
const ALTURA_BARRA_MENU = 58

interface Horario {
  abre: string
  fecha: string
}

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
    horarios?: Record<string, Horario> | null
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

/** Unidade de venda publicada pelo lojista (`products.metadata.unidade`). */
function unidadeDe(p: ProdutoVitrine): string | null {
  const v = (p as { metadata?: Record<string, unknown> | null }).metadata?.unidade
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/** Hora local curta pt-BR — a batida do relógio do fecho. */
function horaAgora(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Segundos que faltam para a virada do dia LOCAL — o prazo das ofertas. */
function segundosAteMeiaNoite(): number {
  const agora = new Date()
  const virada = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate() + 1,
    0,
    0,
    0,
    0,
  )
  return Math.max(0, Math.floor((virada.getTime() - agora.getTime()) / 1000))
}

/**
 * Reparte a descrição entre as duas vozes que a mostram (mesmo racional das
 * vitrines forno e passarela): a 1ª oração vira a manchete do hero e o resto
 * vira o subtexto, para o mesmo texto não aparecer duas vezes na mesma tela.
 * `manchete` null → o hero grita o nome da casa.
 */
function repartirDescricao(descricao: string | null | undefined): {
  manchete: string | null
  detalhe: string | null
} {
  const texto = descricao?.trim() ?? ''
  if (!texto) return { manchete: null, detalhe: null }

  const corte = texto.search(/[—.!?]/)
  const primeira = (corte === -1 ? texto : texto.slice(0, corte)).trim()
  if (primeira.length < 8 || primeira.length > 64) {
    return { manchete: null, detalhe: texto }
  }
  const resto = corte === -1 ? '' : texto.slice(corte + 1).trim()
  return { manchete: primeira, detalhe: resto || null }
}

export function LojaFeira<T extends ProdutoVitrine>({
  loja,
  secoes,
  aoAbrirProduto,
  espacoFinal,
}: Props<T>) {
  const design = useStoreDesign()
  const { colors, spacing } = design
  const insets = useSafeAreaInsets()
  const totalItens = useCartStore((s) => s.totalItens())
  const iniciarSaida = useTransicaoSaida((s) => s.iniciar)

  const [reduzirMovimento, setReduzirMovimento] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  /**
   * `y` de cada alvo de rolagem. A chave é a POSIÇÃO da seção, não o título:
   * o agrupamento em `[slug].tsx` é por `category_id`, então duas categorias
   * homônimas geram duas seções com o mesmo nome — e por título uma comeria a
   * âncora da outra.
   */
  const ancoras = useRef(new Map<string, number>())

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

  const sairPara = (acao: () => void) => (e: GestureResponderEvent) =>
    iniciarSaida({
      acao,
      // Fecha no verde-mata: é a cor da casa nesta vitrine, e o lima de ação
      // é claro demais para cobrir a tela.
      cor: VERDE_MATA,
      origem: { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY },
    })

  const todos = useMemo(() => secoes.flatMap((s) => s.produtos), [secoes])

  // Fotos da casa: banner na frente, produtos completando — a colagem do hero
  // se serve daqui.
  const fotos = useMemo(() => {
    const urls = [loja.banner_url, ...todos.map((p) => p.foto_url)].filter(
      (u): u is string => !!u,
    )
    return Array.from(new Set(urls))
  }, [loja.banner_url, todos])

  const { manchete, detalhe } = useMemo(
    () => repartirDescricao(loja.descricao),
    [loja.descricao],
  )

  /**
   * Ofertas: recorte TRANSVERSAL do catálogo. Nenhuma seção é removida dos
   * corredores por causa disto — o bloco é uma vitrine do que já está lá, e
   * produto nenhum deixa de ter o seu lugar na lista.
   */
  const ofertas = useMemo(
    () => todos.filter(temPromo).slice(0, MAX_OFERTAS),
    [todos],
  )

  const rolarPara = (titulo: string) => {
    const y = ancoras.current.get(titulo)
    if (y == null) return
    scrollRef.current?.scrollTo({
      y: Math.max(y - 12, 0),
      animated: !reduzirMovimento,
    })
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {/* A página é clara do topo ao pé — o hero é CARTÃO, não foto
          full-bleed —, então os ícones do sistema nunca precisam trocar. */}
      <StatusBar style="dark" />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 66,
          paddingBottom: espacoFinal + ALTURA_BARRA_MENU + insets.bottom,
        }}
      >
        <HeroFeira
          nome={loja.nome}
          manchete={manchete}
          detalhe={detalhe}
          fotos={fotos}
          temOfertas={ofertas.length > 0}
          aoAgir={() => rolarPara(ofertas.length > 0 ? 'ofertas' : 'sec-0')}
        />

        {/* ── Chips circulares: a fileira de categorias da referência ── */}
        {secoes.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: 26,
              paddingHorizontal: spacing.screenX,
              gap: 12,
            }}
          >
            {secoes.map((s, i) => (
              <DiscoCategoria
                key={`${s.titulo}-${i}`}
                uri={s.produtos.find((p) => p.foto_url)?.foto_url ?? null}
                rotulo={s.titulo}
                aoTocar={() => rolarPara(`sec-${i}`)}
              />
            ))}
          </ScrollView>
        )}

        {/* ── Ofertas: recorte transversal, com o relógio correndo ── */}
        {ofertas.length > 0 && (
          <View
            onLayout={(e) => {
              ancoras.current.set('ofertas', e.nativeEvent.layout.y)
            }}
          >
            <OfertasFeira produtos={ofertas} aoAbrirProduto={aoAbrirProduto} />
          </View>
        )}

        {/* ── Corredores: uma grade por seção, com TODOS os produtos ── */}
        {secoes.map((secao, i) => (
          <View
            key={`${secao.titulo}-${i}`}
            onLayout={(e) => {
              ancoras.current.set(`sec-${i}`, e.nativeEvent.layout.y)
            }}
          >
            <CorredorFeira secao={secao} aoAbrirProduto={aoAbrirProduto} />
          </View>
        ))}

        {/* ── Fecho: o cartão verde com o relógio da casa ── */}
        <FechoFeira
          nome={loja.nome}
          tempo={loja.tempo_entrega ?? null}
          taxa={loja.taxa_entrega ?? null}
          horarios={loja.horarios ?? null}
        />
      </ScrollView>

      {/* Chrome: dois botões claros fixos no topo, a barra de menu no pé.
          Sem FAB — a sacola do chrome é a porta do carrinho. */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: insets.top + 8,
          left: spacing.screenX,
          right: spacing.screenX,
          zIndex: 30,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <BotaoFeira
          icone="chevron-left"
          aoTocar={sairPara(() => router.back())}
        />
        <BotaoFeira
          icone="bag"
          contador={totalItens}
          aoTocar={() => {
            if (totalItens > 0) router.push('/checkout')
          }}
        />
      </View>

      <BarraMenuFeira sairPara={sairPara} />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero — cartão verde-mata com colagem de frescos e pill de ação
// ─────────────────────────────────────────────────────────────

function HeroFeira({
  nome,
  manchete,
  detalhe,
  fotos,
  temOfertas,
  aoAgir,
}: {
  nome: string
  manchete: string | null
  detalhe: string | null
  fotos: string[]
  temOfertas: boolean
  aoAgir: () => void
}) {
  const design = useStoreDesign()
  const { colors, spacing, typeFactor } = design
  const [slideAtivo, setSlideAtivo] = useState(0)

  const largura = SCREEN_W - spacing.screenX * 2
  // Cada slide come uma foto principal e mostra a seguinte no disco pequeno,
  // então N fotos rendem no máximo N slides — teto de 3, como a referência.
  const slides = Math.min(Math.max(fotos.length, 1), 3)

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled={slides > 1}
        scrollEnabled={slides > 1}
        showsHorizontalScrollIndicator={false}
        // Largura explícita: sem ela a ScrollView se dimensiona pelo CONTEÚDO
        // e a paginação sai de passo (erro já pago pelas vitrines irmãs).
        style={{ width: SCREEN_W }}
        onMomentumScrollEnd={(e) =>
          setSlideAtivo(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
        }
      >
        {Array.from({ length: slides }, (_, i) => (
          <View key={i} style={{ width: SCREEN_W, paddingHorizontal: spacing.screenX }}>
            <View
              style={{
                width: largura,
                minHeight: 196,
                borderRadius: 28,
                padding: 20,
                backgroundColor: VERDE_MATA,
                overflow: 'hidden',
                justifyContent: 'center',
              }}
            >
              {/* Colagem: disco grande sangrando o canto + disco menor por
                  cima — a fruta "saindo" do cartão da referência. */}
              {fotos.length > 0 && (
                <>
                  <Image
                    source={{ uri: fotos[i % fotos.length] }}
                    style={{
                      position: 'absolute',
                      right: -largura * 0.12,
                      top: -largura * 0.06,
                      width: largura * 0.52,
                      height: largura * 0.52,
                      borderRadius: (largura * 0.52) / 2,
                    }}
                    resizeMode="cover"
                  />
                  {fotos.length > 1 && (
                    <Image
                      source={{ uri: fotos[(i + 1) % fotos.length] }}
                      style={{
                        position: 'absolute',
                        right: largura * 0.26,
                        bottom: -largura * 0.05,
                        width: largura * 0.24,
                        height: largura * 0.24,
                        borderRadius: (largura * 0.24) / 2,
                        borderWidth: 3,
                        borderColor: VERDE_MATA,
                      }}
                      resizeMode="cover"
                    />
                  )}
                </>
              )}

              <View style={{ width: '58%' }}>
                {/* Sobretítulo com o NOME da casa. A rota roda com
                    `headerShown: false`, então a vitrine é a única que pode
                    dizer de quem é a loja — e quando a descrição vira
                    manchete, o nome não apareceria em lugar nenhum do topo.
                    Sem manchete, o nome já É o título e o sobretítulo sairia
                    repetido. */}
                {manchete && (
                  <Text
                    numberOfLines={1}
                    style={{
                      marginBottom: 7,
                      fontSize: 10.5,
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                      color: comAlfa(CREME_FEIRA, 0.72),
                      ...fontStyle(design.body, 600),
                    }}
                  >
                    {nome}
                  </Text>
                )}

                <Text
                  numberOfLines={3}
                  style={{
                    fontSize: Math.round(21 * typeFactor),
                    lineHeight: Math.round(27 * typeFactor),
                    color: CREME_FEIRA,
                    ...fontStyle(design.display, 700),
                  }}
                >
                  {manchete ?? nome}
                </Text>

                {detalhe && (
                  <Text
                    numberOfLines={2}
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      lineHeight: 17,
                      color: comAlfa(CREME_FEIRA, 0.75),
                      ...fontStyle(design.body, 400),
                    }}
                  >
                    {detalhe}
                  </Text>
                )}

                <TouchableOpacity
                  onPress={aoAgir}
                  activeOpacity={0.85}
                  style={{
                    marginTop: 16,
                    alignSelf: 'flex-start',
                    paddingHorizontal: 20,
                    paddingVertical: 11,
                    borderRadius: 999,
                    backgroundColor: colors.accent,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11.5,
                      letterSpacing: 1.1,
                      textTransform: 'uppercase',
                      color: colors.accentInk,
                      ...fontStyle(design.body, 700),
                    }}
                  >
                    {temOfertas ? 'Ver ofertas' : 'Ver produtos'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {slides > 1 && (
        <View
          pointerEvents="none"
          style={{
            marginTop: 12,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {Array.from({ length: slides }, (_, i) => (
            <View
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.ink,
                opacity: i === slideAtivo ? 1 : 0.25,
              }}
            />
          ))}
        </View>
      )}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Ofertas — recorte transversal com o relógio até a virada do dia
// ─────────────────────────────────────────────────────────────

function OfertasFeira<T extends ProdutoVitrine>({
  produtos,
  aoAbrirProduto,
}: {
  produtos: T[]
  aoAbrirProduto: (p: T) => void
}) {
  const design = useStoreDesign()
  const { colors, spacing, typeFactor } = design
  const [restam, setRestam] = useState(segundosAteMeiaNoite)

  // O relógio é o único tique desta vitrine. Recalcula do RELÓGIO a cada
  // segundo (em vez de decrementar) para não acumular deriva e para virar o
  // dia sozinho quando passa da meia-noite.
  useEffect(() => {
    const id = setInterval(() => setRestam(segundosAteMeiaNoite()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <View style={{ paddingTop: 34, paddingHorizontal: spacing.screenX }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Text
          style={{
            fontSize: Math.round(20 * typeFactor),
            lineHeight: Math.round(26 * typeFactor),
            color: colors.ink,
            ...fontStyle(design.display, 700),
          }}
        >
          Ofertas do dia
        </Text>
        <ChipCronometro segundos={restam} />
      </View>

      <GradeFeira produtos={produtos} aoAbrirProduto={aoAbrirProduto} />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Corredor — uma seção do cardápio, com todos os seus produtos
// ─────────────────────────────────────────────────────────────

function CorredorFeira<T extends ProdutoVitrine>({
  secao,
  aoAbrirProduto,
}: {
  secao: SecaoLoja<T>
  aoAbrirProduto: (p: T) => void
}) {
  const design = useStoreDesign()
  const { colors, spacing, typeFactor } = design

  if (secao.produtos.length === 0) return null

  return (
    <View style={{ paddingTop: 34, paddingHorizontal: spacing.screenX }}>
      <Text
        style={{
          fontSize: Math.round(19 * typeFactor),
          lineHeight: Math.round(25 * typeFactor),
          color: colors.ink,
          ...fontStyle(design.display, 700),
        }}
      >
        {secao.titulo}
      </Text>

      <GradeFeira produtos={secao.produtos} aoAbrirProduto={aoAbrirProduto} />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Grade e card — a banca: foto, nome, descrição e preço por unidade
// ─────────────────────────────────────────────────────────────

function GradeFeira<T extends ProdutoVitrine>({
  produtos,
  aoAbrirProduto,
}: {
  produtos: T[]
  aoAbrirProduto: (p: T) => void
}) {
  const design = useStoreDesign()
  const { spacing } = design
  const gap = 12
  const coluna = Math.round((SCREEN_W - spacing.screenX * 2 - gap) / 2)

  return (
    <View
      style={{
        marginTop: 16,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap,
      }}
    >
      {produtos.map((p) => (
        <CardFeira
          key={p.id}
          produto={p}
          largura={coluna}
          aoTocar={() => aoAbrirProduto(p)}
        />
      ))}
    </View>
  )
}

function CardFeira<T extends ProdutoVitrine>({
  produto,
  largura,
  aoTocar,
}: {
  produto: T
  largura: number
  aoTocar: () => void
}) {
  const design = useStoreDesign()
  const { colors } = design
  const promo = temPromo(produto)
  const unidade = unidadeDe(produto)
  const ladoFoto = largura - 20

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={aoTocar}
      style={[
        {
          width: largura,
          padding: 10,
          borderRadius: 20,
          backgroundColor: colors.surface,
        },
        consumerDesign.shadow.soft,
      ]}
    >
      <View
        style={{
          height: ladoFoto,
          borderRadius: 14,
          backgroundColor: colors.surfaceMuted,
          overflow: 'hidden',
        }}
      >
        {produto.foto_url && (
          <Image
            source={{ uri: produto.foto_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        )}
      </View>

      {/* O canto que na referência era o coração de favorito. */}
      {promo && (
        <SeloOferta style={{ position: 'absolute', top: 18, right: 18 }} />
      )}

      <Text
        numberOfLines={2}
        style={{
          marginTop: 10,
          fontSize: 14,
          lineHeight: 19,
          color: colors.ink,
          ...fontStyle(design.body, 600),
        }}
      >
        {produto.nome}
      </Text>

      {produto.descricao && (
        <Text
          numberOfLines={1}
          style={{
            marginTop: 3,
            fontSize: 11.5,
            color: colors.inkMuted,
            ...fontStyle(design.body, 400),
          }}
        >
          {produto.descricao}
        </Text>
      )}

      <View
        style={{
          marginTop: 8,
          flexDirection: 'row',
          alignItems: 'baseline',
          flexWrap: 'wrap',
        }}
      >
        <Text
          style={{
            fontSize: 15,
            color: colors.ink,
            ...fontStyle(design.body, 700),
          }}
        >
          {formatarReais(precoFinalDe(produto))}
        </Text>
        {unidade && (
          <Text
            style={{
              marginLeft: 3,
              fontSize: 11.5,
              color: colors.inkMuted,
              ...fontStyle(design.body, 400),
            }}
          >
            /{unidade}
          </Text>
        )}
        {promo && (
          <Text
            style={{
              marginLeft: 7,
              fontSize: 11.5,
              color: colors.inkMuted,
              textDecorationLine: 'line-through',
              ...fontStyle(design.body, 400),
            }}
          >
            {formatarReais(produto.preco)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────────────────────────
// Fecho — cartão verde com o relógio vivo da casa
// ─────────────────────────────────────────────────────────────

function FechoFeira({
  nome,
  tempo,
  taxa,
  horarios,
}: {
  nome: string
  tempo: number | null
  taxa: number | null
  horarios: Record<string, Horario> | null
}) {
  const design = useStoreDesign()
  const { spacing, typeFactor } = design
  const [hora, setHora] = useState(horaAgora)

  useEffect(() => {
    const id = setInterval(() => setHora(horaAgora()), 30_000)
    return () => clearInterval(id)
  }, [])

  const hoje = horarios?.[DIAS[new Date().getDay()]]
  const meta = [
    hoje ? `HOJE ${hoje.abre}–${hoje.fecha}` : 'ABERTO',
    tempo != null ? `${tempo} MIN` : null,
    taxa === 0 ? 'ENTREGA GRÁTIS' : null,
    hora,
  ].filter(Boolean)

  return (
    <View
      style={{
        marginTop: 40,
        marginHorizontal: spacing.screenX,
        paddingVertical: 30,
        paddingHorizontal: 24,
        borderRadius: 28,
        alignItems: 'center',
        backgroundColor: VERDE_MATA,
      }}
    >
      <Text
        numberOfLines={2}
        style={{
          textAlign: 'center',
          fontSize: Math.round(22 * typeFactor),
          lineHeight: Math.round(28 * typeFactor),
          color: CREME_FEIRA,
          ...fontStyle(design.display, 700),
        }}
      >
        {nome}
      </Text>

      <Text
        style={{
          marginTop: 10,
          textAlign: 'center',
          fontSize: 11,
          letterSpacing: 1.4,
          color: comAlfa(CREME_FEIRA, 0.8),
          ...fontStyle(design.body, 500),
        }}
      >
        {meta.join('  ·  ')}
      </Text>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Barra de menu inferior — a régua do shell no claro da quitanda
// ─────────────────────────────────────────────────────────────

const ITENS_MENU: {
  rotulo: string
  icone: ConsumerIconName
  rota: string
  ativo?: boolean
}[] = [
  // A loja é navegada a partir do Início — é o item "aceso" da barra.
  { rotulo: 'Início', icone: 'home', rota: '/', ativo: true },
  { rotulo: 'Explorar', icone: 'reels', rota: '/explorar' },
  { rotulo: 'Pedidos', icone: 'orders', rota: '/pedidos' },
  { rotulo: 'Perfil', icone: 'user', rota: '/perfil' },
]

/**
 * Barra fixa no claro da página, com o fio dos cards.
 *
 * O ativo é o VERDE_MATA, e NÃO o `accent`: o acento desta pele é o LIMA, que
 * só existe como FUNDO (com `accentInk` por cima) — como tinta sobre a página
 * clara ele reprova AA na hora. Mesma regra que o preço e o título já seguem.
 */
function BarraMenuFeira({
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
        const cor = item.ativo ? VERDE_MATA : colors.inkMuted
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
