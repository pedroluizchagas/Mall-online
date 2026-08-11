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
import { Botao } from '@/components/ui/Botao'
import { useCartStore } from '@/store/useCartStore'
import { useTransicaoSaida } from '@/store/useTransicaoSaida'
import { supabase } from '@/lib/supabase'
import { type ProdutoVitrine } from '@/components/loja/LojaEditorial'
import {
  BotaoPassarela,
  ChipEstoque,
  MonogramaCoroado,
  PillRapida,
  comAlfa,
  type EstadoRapido,
} from '@/components/loja/passarela-ui'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * Vitrine passarela — layout PRÓPRIO do arquétipo `mono` para moda
 * monocromática (docs/store-theme/02 §A8; referência: Homelander).
 *
 * DNA destilado da referência:
 * - MUNDO SEM COR: página branca, tinta quase-preta e fotografia em preto e
 *   branco. A única mancha de cor do sistema inteiro é o CHIP de escassez;
 * - COMÉRCIO NO CARD: a pill "adicionar" flutua SOBRE a foto e coloca a peça
 *   na sacola sem abrir o produto — é a diferença estrutural que separa este
 *   arquétipo do editorial, onde toda compra passa pelo PDP;
 * - cards de canto redondo em PALCO CINZA: primeiro uma coluna quase
 *   full-width (os destaques), depois grades de 2;
 * - linha NOME à esquerda / PREÇO à direita escrita direto na página;
 * - títulos de seção em peso REGULAR gigante — a elegância vem do tamanho,
 *   não do bold;
 * - MONOGRAMA COROADO como único ornamento.
 *
 * Primeira vitrine sem fonte-DNA local: a voz aqui é o PESO da Manrope do
 * tema (400 gigante nos títulos, 600 nas âncoras), não uma família extra.
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

/** Abaixo disto, a peça vira chip de escassez. */
const ESTOQUE_BAIXO = 40

/** Dias na ordem de `Date.getDay()` — chaves de `stores.horarios`. */
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const

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
    // `id` e `taxa_entrega` são exigência DESTA vitrine: a adição rápida
    // monta o item do carrinho aqui, sem passar pelo PDP.
    id: string
    taxa_entrega: number
    nome: string
    descricao?: string | null
    banner_url?: string | null
    tempo_entrega?: number | null
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

/** Estoque publicado pelo lojista (`products.metadata.estoque`). */
function estoqueDe(p: ProdutoVitrine): number | null {
  const v = (p as { metadata?: Record<string, unknown> | null }).metadata?.estoque
  return typeof v === 'number' ? v : null
}

/**
 * O texto do chip — ou nada. A única cor do design é reservada ao que é de
 * fato urgente: pouca peça na loja ou oferta. Sem isso, o card fica limpo.
 */
function chipDe(p: ProdutoVitrine): string | null {
  const estoque = estoqueDe(p)
  if (estoque != null && estoque <= ESTOQUE_BAIXO) return `Só ${estoque} na loja`
  return temPromo(p) ? 'Oferta' : null
}

/** Hora local curta pt-BR — a batida do relógio do fecho. */
function horaAgora(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Reparte a descrição entre as duas vozes que a mostram (mesmo racional da
 * vitrine forno): a 1ª oração vira a manchete do hero e o resto vai para o
 * bloco "sobre", para o mesmo texto não aparecer duas vezes na rolagem.
 *
 * `manchete` null quando não há oração aproveitável — aí o hero grita o NOME
 * da casa e omite o sobretítulo, senão o nome apareceria duas vezes seguidas.
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

export function LojaPassarela<T extends ProdutoVitrine>({
  loja,
  secoes,
  aoAbrirProduto,
  espacoFinal,
}: Props<T>) {
  const design = useStoreDesign()
  const { colors, spacing } = design
  const insets = useSafeAreaInsets()
  const totalItens = useCartStore((s) => s.totalItens())
  const adicionarItem = useCartStore((s) => s.adicionarItem)
  const storeAtual = useCartStore((s) => s.store_id)
  const limparCarrinho = useCartStore((s) => s.limparCarrinho)
  const iniciarSaida = useTransicaoSaida((s) => s.iniciar)

  const [reduzirMovimento, setReduzirMovimento] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const gradeY = useRef(0)
  // O hero é foto (escura sob o véu) e o resto da página é branco: os ícones
  // do sistema precisam trocar de cor na virada.
  const alturaHero = useRef(Math.round(SCREEN_H * 0.88))
  const [statusClaro, setStatusClaro] = useState(true)

  // ── Estado da adição rápida ──
  /** Ids em flash "NA SACOLA ✓" (some sozinho). */
  const [confirmados, setConfirmados] = useState<string[]>([])
  /** Id em consulta de opções — a pill fica inerte enquanto isso. */
  const [checando, setChecando] = useState<string | null>(null)
  /** Produto esperando o usuário decidir se troca de loja. */
  const [pedidoTroca, setPedidoTroca] = useState<T | null>(null)
  /** Cache de "tem variação?" por produto — uma consulta por peça, não por toque. */
  const temOpcoesCache = useRef(new Map<string, boolean>())
  const timeoutsFlash = useRef<ReturnType<typeof setTimeout>[]>([])
  const vivo = useRef(true)

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

  useEffect(() => {
    vivo.current = true
    return () => {
      vivo.current = false
      timeoutsFlash.current.forEach(clearTimeout)
      timeoutsFlash.current = []
    }
  }, [])

  const sairPara = (acao: () => void) => (e: GestureResponderEvent) =>
    iniciarSaida({
      acao,
      // Fecha na tinta: no mono o accent É a tinta, e a onda preta é a única
      // saída coerente com um mundo sem cor.
      cor: colors.ink,
      origem: { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY },
    })

  /** Consulta (uma vez por produto) se a peça exige escolha de variação. */
  async function checarOpcoes(id: string): Promise<boolean> {
    const cacheado = temOpcoesCache.current.get(id)
    if (cacheado !== undefined) return cacheado
    try {
      const [opts, mods] = await Promise.all([
        (supabase as any)
          .from('product_option_groups')
          .select('id')
          .eq('product_id', id),
        (supabase as any)
          .from('product_modifier_groups')
          .select('id')
          .eq('product_id', id),
      ])
      const tem = ((opts.data?.length ?? 0) + (mods.data?.length ?? 0)) > 0
      temOpcoesCache.current.set(id, tem)
      return tem
    } catch {
      // Falha de rede não pode virar venda às cegas: roupa tem tamanho, e o
      // caminho seguro é abrir o produto. Não cacheia — a próxima tenta de novo.
      return true
    }
  }

  function porNaSacola(p: T) {
    adicionarItem(
      {
        product_id: p.id,
        nome: p.nome,
        preco: precoFinalDe(p),
        quantidade: 1,
        foto_url: p.foto_url ?? undefined,
      },
      loja.id,
      loja.nome,
      loja.taxa_entrega,
    )
    setPedidoTroca(null)
    setConfirmados((atual) => [...atual, p.id])
    const id = setTimeout(() => {
      if (vivo.current) {
        setConfirmados((atual) => atual.filter((x) => x !== p.id))
      }
    }, 1400)
    timeoutsFlash.current.push(id)
  }

  /**
   * A adição rápida da referência: a peça entra na sacola direto da grade.
   * Peça com variação (tamanho, cor) NUNCA entra às cegas — abre o produto,
   * que é onde a escolha existe.
   */
  async function adicaoRapida(p: T) {
    if (checando) return
    setChecando(p.id)
    const exigeEscolha = await checarOpcoes(p.id)
    if (!vivo.current) return
    setChecando(null)

    if (exigeEscolha) {
      aoAbrirProduto(p)
      return
    }
    if (storeAtual && storeAtual !== loja.id) {
      setPedidoTroca(p)
      return
    }
    porNaSacola(p)
  }

  const estadoDe = (p: T): EstadoRapido =>
    confirmados.includes(p.id)
      ? 'adicionado'
      : checando === p.id
        ? 'checando'
        : 'pronta'

  // Fotos da casa: banner na frente, produtos completando.
  const fotos = useMemo(() => {
    const urls = [
      loja.banner_url,
      ...secoes.flatMap((s) => s.produtos).map((p) => p.foto_url),
    ].filter((u): u is string => !!u)
    return Array.from(new Set(urls))
  }, [loja.banner_url, secoes])

  const { manchete, detalhe } = useMemo(
    () => repartirDescricao(loja.descricao),
    [loja.descricao],
  )

  // Coluna de destaques (a tela 2 da referência); sem seção eleita, as
  // primeiras peças com foto servem de destaque.
  const secaoDestaque = useMemo(
    () =>
      secoes.find((s) => /destaque|novidade|lançament|new|essencia/i.test(s.titulo)),
    [secoes],
  )
  const destaques = useMemo(
    () =>
      (
        secaoDestaque?.produtos ??
        secoes.flatMap((s) => s.produtos).filter((p) => p.foto_url)
      )
        .filter((p) => p.foto_url)
        .slice(0, 3),
    [secaoDestaque, secoes],
  )
  // A seção eleita só SAI das grades quando a coluna mostra todos os seus
  // itens — senão as peças que não couberam sumiriam do app inteiro (a mesma
  // regra que a vitrine forno aprendeu do jeito difícil).
  const secoesGrade = useMemo(
    () =>
      secoes.filter(
        (s) => s !== secaoDestaque || destaques.length < s.produtos.length,
      ),
    [secoes, secaoDestaque, destaques],
  )

  const rolarParaGrade = () =>
    scrollRef.current?.scrollTo({
      y: Math.max(gradeY.current - 12, 0),
      animated: !reduzirMovimento,
    })

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style={statusClaro ? 'light' : 'dark'} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) => {
          const claro =
            e.nativeEvent.contentOffset.y < alturaHero.current - insets.top - 48
          if (claro !== statusClaro) setStatusClaro(claro)
        }}
        contentContainerStyle={{ paddingBottom: espacoFinal + insets.bottom }}
      >
        <View
          onLayout={(e) => {
            alturaHero.current = e.nativeEvent.layout.height
          }}
        >
          <HeroPassarela
            nome={loja.nome}
            manchete={manchete}
            foto={fotos[0] ?? null}
            aoVerPecas={rolarParaGrade}
          />
        </View>

        {/* ── Destaques: a coluna única, um card por vez ── */}
        {destaques.length > 0 && (
          <View style={{ paddingTop: 34, paddingHorizontal: spacing.screenX, gap: 30 }}>
            {destaques.map((p) => (
              <CardPassarela
                key={p.id}
                produto={p}
                largura={SCREEN_W - spacing.screenX * 2}
                proporcao={1.15}
                estado={estadoDe(p)}
                aoAdicionar={() => adicaoRapida(p)}
                aoAbrir={() => aoAbrirProduto(p)}
              />
            ))}
          </View>
        )}

        {/* ── Grades de 2, uma por seção ── */}
        <View
          onLayout={(e) => {
            gradeY.current = e.nativeEvent.layout.y
          }}
        >
          {secoesGrade.map((secao) => (
            <GradePassarela
              key={secao.titulo}
              secao={secao}
              estadoDe={estadoDe}
              aoAdicionar={adicaoRapida}
              aoAbrirProduto={aoAbrirProduto}
            />
          ))}
        </View>

        {/* ── Sobre: o silêncio do design, só texto entre dois fios ── */}
        {detalhe && <SobrePassarela texto={detalhe} />}

        {/* ── Fecho: monograma coroado, nome e relógio ── */}
        <FechoPassarela
          nome={loja.nome}
          tempo={loja.tempo_entrega ?? null}
          horarios={loja.horarios ?? null}
        />
      </ScrollView>

      {/* Chrome: dois botões claros fixos, legíveis sobre a foto e sobre o branco. */}
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
        <BotaoPassarela
          icone="chevron-left"
          aoTocar={sairPara(() => router.back())}
        />
        <BotaoPassarela
          icone="bag"
          contador={totalItens}
          aoTocar={() => {
            if (totalItens > 0) router.push('/checkout')
          }}
        />
      </View>

      {/* Guarda de troca de loja — aqui, e não só no PDP: a compra desta
          vitrine acontece na grade, então a pergunta também precisa. */}
      {pedidoTroca && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: comAlfa(colors.ink, 0.5),
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View
            style={[
              {
                width: '100%',
                maxWidth: 360,
                backgroundColor: colors.surface,
                borderRadius: 24,
                padding: 24,
                gap: 12,
              },
              consumerDesign.shadow.medium,
            ]}
          >
            <Text
              style={{
                fontSize: 20,
                color: colors.ink,
                ...fontStyle(design.display, 700),
              }}
            >
              Trocar de loja?
            </Text>
            <Text
              style={{
                fontSize: 14,
                lineHeight: 21,
                color: colors.inkMuted,
                ...fontStyle(design.body, 400),
              }}
            >
              Sua sacola atual será esvaziada para adicionar peças de{' '}
              <Text style={{ ...fontStyle(design.body, 700) }}>{loja.nome}</Text>.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Botao
                  label="Cancelar"
                  onPress={() => setPedidoTroca(null)}
                  variante="ghost"
                  tamanho="md"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Botao
                  label="Trocar"
                  onPress={() => {
                    limparCarrinho()
                    porNaSacola(pedidoTroca)
                  }}
                  variante="primario"
                  tamanho="md"
                />
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero — foto de moda full-bleed com véu, manchete e pill branca
// ─────────────────────────────────────────────────────────────

function HeroPassarela({
  nome,
  manchete,
  foto,
  aoVerPecas,
}: {
  nome: string
  /** null → o nome da casa é que vira a manchete, e o sobretítulo some. */
  manchete: string | null
  foto: string | null
  aoVerPecas: () => void
}) {
  const design = useStoreDesign()
  const { colors, typeFactor } = design
  const insets = useSafeAreaInsets()
  const altura = Math.round(SCREEN_H * 0.88)

  // Sem foto o hero não vira retângulo branco vazio: vira o bloco de tinta
  // com o monograma, que é o mesmo mundo por outro caminho.
  if (!foto) {
    return (
      <View
        style={{
          height: altura,
          paddingTop: insets.top,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.ink,
        }}
      >
        <MonogramaCoroado
          inicial={nome.trim().charAt(0).toUpperCase()}
          tamanho={64}
          cor={colors.canvas}
        />
        <Text
          style={{
            marginTop: 22,
            paddingHorizontal: 34,
            textAlign: 'center',
            fontSize: Math.round(26 * typeFactor),
            lineHeight: Math.round(34 * typeFactor),
            color: colors.canvas,
            ...fontStyle(design.display, 600),
          }}
        >
          {manchete ?? nome}
        </Text>
      </View>
    )
  }

  return (
    <View style={{ height: altura }}>
      <Image
        source={{ uri: foto }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />

      {/* Véu chapado só na metade de baixo — sem gradiente, que exigiria
          dependência nova; a foto de moda já escurece no pé. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: altura * 0.52,
          backgroundColor: comAlfa('#000000', 0.38),
        }}
      />

      {/* Véu curto no topo: o relógio e a bateria do sistema são CLAROS aqui,
          e a foto de moda pode ser clara justamente em cima (a da Selene é).
          Sem isso o status bar some em metade das lojas. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: insets.top + 64,
          backgroundColor: comAlfa('#000000', 0.22),
        }}
      />

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          paddingHorizontal: 30,
          paddingBottom: 44,
        }}
      >
        {/* Sobretítulo só quando a manchete NÃO é o próprio nome — senão o
            nome apareceria duas vezes, uma embaixo da outra. */}
        {manchete && (
          <Text
            style={{
              fontSize: 11.5,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: comAlfa('#FFFFFF', 0.85),
              ...fontStyle(design.body, 600),
            }}
          >
            {nome}
          </Text>
        )}

        <Text
          numberOfLines={3}
          style={{
            marginTop: manchete ? 14 : 0,
            textAlign: 'center',
            fontSize: Math.round(29 * typeFactor),
            lineHeight: Math.round(37 * typeFactor),
            color: '#FFFFFF',
            ...fontStyle(design.display, 600),
          }}
        >
          {manchete ?? nome}
        </Text>

        <TouchableOpacity
          onPress={aoVerPecas}
          activeOpacity={0.85}
          style={[
            {
              marginTop: 26,
              paddingHorizontal: 34,
              paddingVertical: 15,
              borderRadius: 999,
              backgroundColor: '#FFFFFF',
            },
            consumerDesign.shadow.soft,
          ]}
        >
          <Text
            style={{
              fontSize: 12,
              letterSpacing: 1.6,
              textTransform: 'uppercase',
              color: '#111111',
              ...fontStyle(design.body, 600),
            }}
          >
            Ver peças
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Card — foto em palco cinza, pill de adição e a linha nome/preço
// ─────────────────────────────────────────────────────────────

function CardPassarela<T extends ProdutoVitrine>({
  produto,
  largura,
  proporcao,
  estado,
  compacto = false,
  aoAdicionar,
  aoAbrir,
}: {
  produto: T
  largura: number
  /** altura = largura × proporção */
  proporcao: number
  estado: EstadoRapido
  compacto?: boolean
  aoAdicionar: () => void
  aoAbrir: () => void
}) {
  const design = useStoreDesign()
  const { colors } = design
  const chip = chipDe(produto)
  const promo = temPromo(produto)
  const altura = Math.round(largura * proporcao)

  const respiro = compacto ? 10 : 16

  return (
    <View style={{ width: largura }}>
      {/* Palco: a foto é irmã da pill, não mãe dela — tocar na pill compra,
          tocar na foto abre a peça, e os dois gestos nunca se confundem. */}
      <View
        style={{
          height: altura,
          borderRadius: compacto ? 20 : 24,
          backgroundColor: colors.surfaceMuted,
          overflow: 'hidden',
        }}
      >
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={aoAbrir}
          style={{ flex: 1 }}
        >
          {produto.foto_url && (
            <Image
              source={{ uri: produto.foto_url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          )}
        </TouchableOpacity>

        {chip && (
          <ChipEstoque
            texto={chip}
            style={{ position: 'absolute', top: 12, left: 12 }}
          />
        )}

        <PillRapida
          estado={estado}
          compacta={compacto}
          aoTocar={aoAdicionar}
          style={{
            position: 'absolute',
            left: respiro,
            right: respiro,
            bottom: respiro,
          }}
        />
      </View>

      <View
        style={{
          marginTop: 12,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <Text
          numberOfLines={2}
          style={{
            flex: 1,
            fontSize: compacto ? 14 : 16,
            lineHeight: compacto ? 19 : 22,
            color: colors.ink,
            ...fontStyle(design.body, 600),
          }}
        >
          {produto.nome}
        </Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={{
              fontSize: compacto ? 14 : 16,
              color: colors.ink,
              ...fontStyle(design.body, 600),
            }}
          >
            {formatarReais(precoFinalDe(produto))}
          </Text>
          {promo && (
            <Text
              style={{
                fontSize: compacto ? 11.5 : 13,
                color: colors.inkMuted,
                textDecorationLine: 'line-through',
                ...fontStyle(design.body, 400),
              }}
            >
              {formatarReais(produto.preco)}
            </Text>
          )}
        </View>
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Grade — título em peso leve gigante e duas colunas
// ─────────────────────────────────────────────────────────────

function GradePassarela<T extends ProdutoVitrine>({
  secao,
  estadoDe,
  aoAdicionar,
  aoAbrirProduto,
}: {
  secao: SecaoLoja<T>
  estadoDe: (p: T) => EstadoRapido
  aoAdicionar: (p: T) => void
  aoAbrirProduto: (p: T) => void
}) {
  const design = useStoreDesign()
  const { colors, spacing, typeFactor } = design

  const gap = 12
  const coluna = Math.round((SCREEN_W - spacing.screenX * 2 - gap) / 2)

  if (secao.produtos.length === 0) return null

  return (
    <View style={{ paddingTop: 54, paddingHorizontal: spacing.screenX }}>
      <Text
        style={{
          textAlign: 'center',
          fontSize: Math.round(34 * typeFactor),
          lineHeight: Math.round(42 * typeFactor),
          letterSpacing: -0.4,
          color: colors.ink,
          // Peso 400 de propósito: a assinatura tipográfica da referência é o
          // título GRANDE e LEVE. Subir para 600 aqui mata o arquétipo.
          ...fontStyle(design.display, 400),
        }}
      >
        {secao.titulo}
      </Text>

      <View
        style={{
          marginTop: 26,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap,
        }}
      >
        {secao.produtos.map((p) => (
          <CardPassarela
            key={p.id}
            produto={p}
            largura={coluna}
            proporcao={1.3}
            compacto
            estado={estadoDe(p)}
            aoAdicionar={() => aoAdicionar(p)}
            aoAbrir={() => aoAbrirProduto(p)}
          />
        ))}
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Sobre — o texto da casa entre dois fios, sem ornamento
// ─────────────────────────────────────────────────────────────

function SobrePassarela({ texto }: { texto: string }) {
  const design = useStoreDesign()
  const { colors, spacing } = design

  return (
    <View
      style={{
        marginTop: 56,
        marginHorizontal: spacing.screenX,
        paddingVertical: 30,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.line,
      }}
    >
      <Text
        style={{
          textAlign: 'center',
          fontSize: 15,
          lineHeight: 25,
          color: colors.inkMuted,
          ...fontStyle(design.body, 400),
        }}
      >
        {texto}
      </Text>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Fecho — o monograma coroado, o nome e o relógio vivo
// ─────────────────────────────────────────────────────────────

function FechoPassarela({
  nome,
  tempo,
  horarios,
}: {
  nome: string
  tempo: number | null
  horarios: Record<string, Horario> | null
}) {
  const design = useStoreDesign()
  const { colors } = design
  const [hora, setHora] = useState(horaAgora)

  useEffect(() => {
    const id = setInterval(() => setHora(horaAgora()), 30_000)
    return () => clearInterval(id)
  }, [])

  const hoje = horarios?.[DIAS[new Date().getDay()]]
  const meta = [
    hoje ? `HOJE ${hoje.abre}–${hoje.fecha}` : 'ABERTO',
    tempo != null ? `${tempo} MIN` : null,
    hora,
  ].filter(Boolean)

  return (
    <View
      style={{
        marginTop: 56,
        paddingTop: 40,
        paddingBottom: 48,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.line,
      }}
    >
      <MonogramaCoroado
        inicial={nome.trim().charAt(0).toUpperCase()}
        tamanho={34}
        cor={colors.ink}
      />

      <Text
        style={{
          marginTop: 16,
          fontSize: 13,
          letterSpacing: 3.4,
          textTransform: 'uppercase',
          color: colors.ink,
          ...fontStyle(design.body, 700),
        }}
      >
        {nome}
      </Text>

      <Text
        style={{
          marginTop: 10,
          fontSize: 11,
          letterSpacing: 1.6,
          color: colors.inkMuted,
          ...fontStyle(design.body, 500),
        }}
      >
        {meta.join('  ·  ')}
      </Text>
    </View>
  )
}
