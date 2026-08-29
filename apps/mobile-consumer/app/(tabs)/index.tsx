import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Easing,
  AccessibilityInfo,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg'
import { supabase } from '@/lib/supabase'
import { BannerCarousel } from '@/components/BannerCarousel'
import { LojaCardH } from '@/components/LojaCardH'
import { NotificacoesPopup } from '@/components/NotificacoesPopup'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import {
  Marquise,
  useFontesMarquee,
  type VitrineLoja,
} from '@/components/home/Marquise'
import { Concierge } from '@/components/home/Concierge'
import { Diretorio, ICONE_POR_PISO } from '@/components/home/Diretorio'
import { Vidro } from '@/components/ui/Vidro'
import { useCartStore } from '@/store/useCartStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useOrderStore } from '@/store/useOrderStore'
import { useSeguidas } from '@/store/useSeguidas'
import { formatarReais, PISOS } from '@mallevo/lib'
import { consumerDesign, saudacaoPorHorario } from '@/lib/consumer-design'
import { metaDoStatus, ehAtivo } from '@/lib/status-pedido'
import { BANNERS_MOCK } from '@/lib/banners-mock'

const { colors, radius, spacing, shadow, motion } = consumerDesign

interface Loja {
  id: string
  nome: string
  slug: string | null
  logo_url: string | null
  taxa_entrega: number
  tempo_entrega: number | null
  categoria_slug: string | null
}

/**
 * Seções temáticas do home — derivadas dos 9 PISOS curatoriais de
 * @mallevo/lib (packages/lib/src/pisos.ts é a fonte da verdade), na ordem
 * declarada por `ordem`. Nada de fatiar por posição: com o catálogo
 * crescendo, o chunk antigo desalinhava títulos e repetia seções.
 *
 * Os pisos não representam andar físico — são curadoria. Por isso o
 * subtítulo diz o que o consumidor encontra ali, não onde fica.
 */

/** Piso curatorial → subtítulo (o que o consumidor encontra na seção). */
const SUBTITULO_POR_PISO: Record<string, string> = {
  'praca-alimentacao': 'Restaurantes, lanches e cafés',
  'moda-estilo': 'Roupas, calçados e acessórios',
  'saude': 'Farmácias, clínicas e bem-estar',
  'beleza': 'Salões, estética e cosméticos',
  'pet': 'Ração, acessórios e cuidados do pet',
  'casa-vida': 'Decoração, eletrônicos e ferramentas',
  'mercado': 'Mercado, hortifrúti e conveniência',
  'servicos': 'Oficinas, manutenção e cursos',
  'presentes-diversao': 'Brinquedos, papelaria e presentes',
}

const SECOES = [...PISOS]
  .sort((a, b) => a.ordem - b.ordem)
  .map((piso) => ({
    slug: piso.slug,
    titulo: piso.nome,
    subtitulo: SUBTITULO_POR_PISO[piso.slug] ?? '',
  }))

/**
 * Teto da busca de lojas. Precisa cobrir o shopping inteiro: o corte é
 * aplicado ANTES do agrupamento por piso, então toda loja que fica de fora
 * some da tela — e um piso inteiro sem loja deixa de renderizar.
 */
const LIMITE_LOJAS = 200

/**
 * Fallback: 'casa-vida'. É o piso mais abrangente (decoração, eletrônicos,
 * ferramentas, plantas, automotivo) e o único que já absorvia a categoria
 * 'outros' — que, por sinal, não pertence a piso nenhum. Loja sem categoria
 * ou com slug desconhecido aparece ali em vez de sumir do home.
 */
const PISO_FALLBACK = 'casa-vida'
const SECAO_FALLBACK = Math.max(
  0,
  SECOES.findIndex((s) => s.slug === PISO_FALLBACK),
)

/**
 * Categoria (slug global) → índice da seção em SECOES. Construído UMA vez,
 * fora do render.
 *
 * Uma categoria pode pertencer a 2 pisos (veterinária em Saúde+Pet,
 * salões-estética em Beleza+Serviços, floricultura em Casa&Vida+Presentes),
 * mas a loja entra só no primeiro (menor `ordem`) — senão ela apareceria
 * duas vezes no home, que é justamente o que d67f3c8 eliminou.
 */
const SECAO_POR_CATEGORIA: Record<string, number> = (() => {
  const mapa: Record<string, number> = {}
  SECOES.forEach((secao, indice) => {
    const piso = PISOS.find((p) => p.slug === secao.slug)!
    piso.categoriasSlugs.forEach((categoria) => {
      if (mapa[categoria] === undefined) mapa[categoria] = indice
    })
  })
  return mapa
})()

/** Quantas lojas entram na fileira de vitrines da marquise. */
const MAX_VITRINES_SEGUIDAS = 12
const MAX_VITRINES_ALTA = 8

// ─────────────────────────────────────────────────────────
// Sub-componentes locais
// ─────────────────────────────────────────────────────────

/**
 * Cartão do pedido em andamento, no pé da marquise — vidro sobre a fachada,
 * com a barra de progresso do fluxo (META_STATUS.progresso) acesa no accent
 * e o ponto "ao vivo" pulsando. Adaptação Mallevo do cartão de limites da
 * referência: status vira progresso visível, não só rótulo.
 */
function CardPedidoVivo({
  pedidoId,
  statusAtual,
}: {
  pedidoId: string
  statusAtual: string
}) {
  const meta = metaDoStatus(statusAtual)

  // Barra anima até o progresso do status — e re-anima quando o status muda.
  const progresso = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(progresso, {
      toValue: meta.progresso,
      duration: motion.slow * 2,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // anima width (layout)
    }).start()
  }, [meta.progresso])

  // Respiração do ponto "ao vivo" — loop infinito, então respeita o
  // reduce motion do aparelho (fica aceso fixo, sem pulsar).
  const pulso = useRef(new Animated.Value(1)).current
  useEffect(() => {
    let ciclo: Animated.CompositeAnimation | undefined
    let ativo = true

    AccessibilityInfo.isReduceMotionEnabled().then((reduzido) => {
      if (!ativo || reduzido) return
      ciclo = Animated.loop(
        Animated.sequence([
          Animated.timing(pulso, {
            toValue: 0.3,
            duration: motion.pulse / 2,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulso, {
            toValue: 1,
            duration: motion.pulse / 2,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      )
      ciclo.start()
    })

    return () => {
      ativo = false
      ciclo?.stop()
    }
  }, [])

  return (
    <TouchableOpacity
      onPress={() => router.push(`/pedido/${pedidoId}`)}
      activeOpacity={consumerDesign.opacity.pressed}
      style={{
        backgroundColor: colors.marqueeGlass,
        borderWidth: 1,
        borderColor: colors.marqueeLine,
        borderRadius: radius.lg,
        padding: 18,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Animated.View
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: colors.accent,
            opacity: pulso,
          }}
        />
        <Text
          style={{
            flex: 1,
            fontSize: 11,
            fontWeight: '700',
            color: colors.marqueeInkMuted,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          Pedido em andamento
        </Text>
        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.accent }}>
          {Math.round(meta.progresso * 100)}%
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginTop: 12,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.marqueeGlassStrong,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ConsumerIcon name={meta.icone} size={18} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.white }}>
            {meta.rotuloLongo}
          </Text>
          <Text
            style={{
              fontSize: 12.5,
              fontWeight: '500',
              color: colors.marqueeInkSoft,
              marginTop: 1,
            }}
          >
            {meta.descricao}
          </Text>
        </View>
        <ConsumerIcon
          name="chevron-right"
          size={18}
          color={colors.marqueeInkSoft}
        />
      </View>

      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.marqueeGlassStrong,
          marginTop: 14,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            height: '100%',
            borderRadius: 3,
            backgroundColor: colors.accent,
            width: progresso.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          }}
        />
      </View>
    </TouchableOpacity>
  )
}

/**
 * Corredor de um piso. O cabeçalho é o "letreiro de corredor": placa de
 * sinalização com o ícone de linha do piso (a mesma da placa do diretório,
 * para o olho reconhecer aonde o elevador o trouxe), nome completo na
 * fonte-assinatura, subtítulo com o que se encontra ali e a contagem de
 * lojas no canto — tudo monocromático, identidade sem 9 matizes.
 *
 * `aoMedir` devolve o y do corredor (relativo à folha) para o scroll
 * ancorado do diretório.
 */
function SecaoLojas({
  slug,
  titulo,
  subtitulo,
  lojas,
  aoMedir,
}: {
  slug: string
  titulo: string
  subtitulo: string
  lojas: Loja[]
  aoMedir: (y: number) => void
}) {
  // Letreiro de corredor: mesma fonte-assinatura da marquise.
  const fontes = useFontesMarquee()

  if (lojas.length === 0) return null

  return (
    <View
      style={{ paddingTop: 30 }}
      onLayout={(e) => aoMedir(e.nativeEvent.layout.y)}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 24,
          marginBottom: 14,
        }}
      >
        {/* Placa do corredor — mesmo vidro das placas do diretório. */}
        <Vidro raio={radius.sm}>
          <View
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ConsumerIcon
              name={ICONE_POR_PISO[slug] ?? 'store'}
              size={19}
              color={colors.ink}
              strokeWidth={1.8}
            />
          </View>
        </Vidro>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              fontes.letreiro,
              {
                fontSize: 21,
                color: colors.ink,
                letterSpacing: -0.4,
              },
            ]}
            numberOfLines={1}
          >
            {titulo}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: colors.inkMuted,
              fontWeight: '500',
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {subtitulo}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.8,
            color: colors.inkSoft,
          }}
        >
          {lojas.length} {lojas.length === 1 ? 'LOJA' : 'LOJAS'}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {lojas.map((loja) => (
          <LojaCardH
            key={loja.id}
            loja={loja}
            onPress={() => router.push(`/loja/${loja.slug}`)}
          />
        ))}
      </ScrollView>
    </View>
  )
}

/**
 * Vidro fosco da folha — referência: o fundo difuso do iOS ("send with
 * effect"), que não é cinza chapado e sim um material nublado. Sobre o
 * canvas zinco, quatro nuvens em SVG (só tokens, nada de hex novo):
 *
 * 1. sombra da fachada dissolvendo do topo (`marquee` 7% → 0);
 * 2. nuvem fria à esquerda (`inkSoft`) e um fôlego azul embaixo (`info`) —
 *    as nuvens frias do vidro iOS;
 * 3. bloom leitoso à direita (`white` 55% → 0) — a mancha clara do fosco;
 * 4. o neon da marquise ATRAVESSANDO o vidro no canto (`marqueeGlow` 5%) —
 *    continuidade física com a fachada acima; o iOS não tem essa.
 *
 * Alphas ≤ 7% (branco ≤ 55%): no squint é um fumê nublado, nunca "sujo".
 * O campo vive nos primeiros ~860px (onde o olho pousa); abaixo, o canvas
 * segue limpo — a dissolução é imperceptível nessas opacidades.
 */
function VidroFosco() {
  return (
    <Svg
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 860 }}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id="sombraFachada" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.marquee} stopOpacity={0.07} />
          <Stop offset="0.28" stopColor={colors.marquee} stopOpacity={0.025} />
          <Stop offset="0.55" stopColor={colors.marquee} stopOpacity={0} />
        </LinearGradient>
        <RadialGradient id="nuvemFria" cx="12%" cy="22%" r="58%">
          <Stop offset="0" stopColor={colors.inkSoft} stopOpacity={0.07} />
          <Stop offset="1" stopColor={colors.inkSoft} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="folegoAzul" cx="25%" cy="78%" r="50%">
          <Stop offset="0" stopColor={colors.info} stopOpacity={0.04} />
          <Stop offset="1" stopColor={colors.info} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="bloomLeitoso" cx="88%" cy="38%" r="60%">
          <Stop offset="0" stopColor={colors.white} stopOpacity={0.55} />
          <Stop offset="1" stopColor={colors.white} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="neonAtravessa" cx="92%" cy="0%" r="42%">
          <Stop offset="0" stopColor={colors.marqueeGlow} stopOpacity={0.05} />
          <Stop offset="1" stopColor={colors.marqueeGlow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#nuvemFria)" />
      <Rect width="100%" height="100%" fill="url(#folegoAzul)" />
      <Rect width="100%" height="100%" fill="url(#bloomLeitoso)" />
      <Rect width="100%" height="100%" fill="url(#neonAtravessa)" />
      <Rect width="100%" height="100%" fill="url(#sombraFachada)" />
    </Svg>
  )
}

function SkeletonSecao() {
  return (
    <View style={{ paddingTop: 30 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 24,
          marginBottom: 14,
        }}
      >
        <Skeleton largura={44} altura={44} raio={radius.sm} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton largura="55%" altura={20} raio={6} />
          <Skeleton largura="40%" altura={13} raio={4} />
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} largura={220} altura={200} raio={radius.lg} />
        ))}
      </ScrollView>
    </View>
  )
}

// ─────────────────────────────────────────────────────────
// Tela
// ─────────────────────────────────────────────────────────

export default function TelaHome() {
  const [lojas, setLojas] = useState<Loja[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false)
  // Busca = overlay Concierge sobre a própria home, nunca navegação: fechar
  // devolve a tela exatamente onde estava (scroll, estado, tudo).
  const [buscaAberta, setBuscaAberta] = useState(false)

  // Scroll ancorado do diretório: o y de cada corredor (relativo à folha) +
  // o y da folha (relativo ao conteúdo do ScrollView) = destino do elevador.
  // Refs, não estado: medidas não devem re-renderizar a home.
  const scrollRef = useRef<ScrollView>(null)
  const folhaY = useRef(0)
  const posicaoPorPiso = useRef<Record<string, number>>({})

  function irParaPiso(slug: string) {
    const y = posicaoPorPiso.current[slug]
    if (y === undefined) return
    // O paddingTop do corredor (30) vira o respiro acima do letreiro.
    scrollRef.current?.scrollTo({ y: folhaY.current + y, animated: true })
  }

  // Foco da tela: a status bar clara só vale enquanto o Início está à frente
  // (as outras abas são claras e usam a status bar escura do layout).
  const [focado, setFocado] = useState(false)
  useFocusEffect(
    useCallback(() => {
      setFocado(true)
      return () => setFocado(false)
    }, []),
  )

  const totalItens = useCartStore((s) => s.totalItens())
  const total = useCartStore((s) => s.total())
  const consumer = useAuthStore((s) => s.consumer)
  const pedidoAtivoId = useOrderStore((s) => s.pedidoAtivoId)
  const statusAtual = useOrderStore((s) => s.statusAtual)
  const seguidasMap = useSeguidas((s) => s.seguidas)
  const primeiroNome = consumer?.nome?.split(' ')[0] ?? ''

  async function carregarDados() {
    const { data } = await supabase
      .from('stores')
      .select(
        'id, nome, slug, logo_url, taxa_entrega, tempo_entrega, categoria:categories(slug)',
      )
      .eq('ativo', true)
      // Teto alto de propósito: a home distribui o resultado nos 9 pisos, e
      // um corte baixo não "encurta" as seções — ele APAGA as últimas, porque
      // seção vazia não é renderizada. Com o limite antigo (40) as lojas de
      // Mercado, Serviços e Presentes & Diversão nunca chegavam à tela.
      // O teto existe só como guarda contra catálogo gigante.
      .limit(LIMITE_LOJAS)

    setLojas(
      (data ?? []).map((r: any) => ({
        ...r,
        categoria_slug: r.categoria?.slug ?? null,
      })),
    )
    setCarregando(false)
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const onRefresh = useCallback(async () => {
    setAtualizando(true)
    await carregarDados()
    setAtualizando(false)
  }, [])

  // Cada loja entra em UM piso só — o da sua categoria (nunca duplica nem desalinha).
  const grupos = SECOES.map(() => [] as Loja[])
  lojas.forEach((loja) => {
    const indice =
      SECAO_POR_CATEGORIA[loja.categoria_slug ?? ''] ?? SECAO_FALLBACK
    grupos[indice].push(loja)
  })

  // ── Vitrines da marquise ──
  // Quem segue lojas vê as suas (aro aceso); quem não segue vê as em alta.
  // O join com o catálogo devolve logo e tempo; seguida sem match ainda
  // aparece (nome + monograma) — a fileira nunca depende do fetch.
  const porSlug = useMemo(
    () =>
      new Map(
        lojas.filter((l) => l.slug).map((l) => [l.slug as string, l]),
      ),
    [lojas],
  )
  const listaSeguidas = useMemo(
    () =>
      Object.values(seguidasMap).sort((a, b) => b.seguidoEm - a.seguidoEm),
    [seguidasMap],
  )
  const modoVitrines = listaSeguidas.length > 0 ? 'seguidas' : 'alta'
  const vitrines: VitrineLoja[] =
    modoVitrines === 'seguidas'
      ? listaSeguidas.slice(0, MAX_VITRINES_SEGUIDAS).map((s) => {
          const loja = porSlug.get(s.slug)
          return {
            slug: s.slug,
            nome: loja?.nome ?? s.nome,
            logoUrl: loja?.logo_url ?? null,
            tempoEntrega: loja?.tempo_entrega ?? null,
            seguida: true,
          }
        })
      : lojas
          .filter((l) => l.slug)
          .slice(0, MAX_VITRINES_ALTA)
          .map((l) => ({
            slug: l.slug!,
            nome: l.nome,
            logoUrl: l.logo_url,
            tempoEntrega: l.tempo_entrega,
            seguida: false,
          }))

  const saudacao = primeiroNome
    ? `${saudacaoPorHorario()}, ${primeiroNome}`
    : saudacaoPorHorario()

  const mostraPedidoAtivo = pedidoAtivoId && statusAtual && ehAtivo(statusAtual)
  const espacoFinal =
    totalItens > 0 ? spacing.tabBarHeight + 64 : spacing.tabBarHeight

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {/* A fachada é escura: status bar clara só enquanto o Início está em foco. */}
      {focado && <StatusBar style="light" animated />}

      {/* Céu atrás do overscroll superior (iOS rubber-band). */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 480,
          backgroundColor: colors.marquee,
        }}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={onRefresh}
            tintColor={colors.white}
          />
        }
      >
        <Marquise
          saudacao={saudacao}
          vitrines={vitrines}
          modoVitrines={modoVitrines}
          carregandoVitrines={carregando}
          aoTocarLocalizacao={() => {
            /* TODO: abrir seletor de endereço (deferido) */
          }}
          aoTocarBusca={() => setBuscaAberta(true)}
          aoTocarSino={() => setNotificacoesAbertas(true)}
          aoTocarVitrine={(slug) => router.push(`/loja/${slug}`)}
          aoTocarDescobrir={() => router.push('/(tabs)/explorar')}
        >
          {mostraPedidoAtivo && (
            <CardPedidoVivo
              pedidoId={pedidoAtivoId!}
              statusAtual={statusAtual!}
            />
          )}
        </Marquise>

        {/* A folha de vidro fosco sobe sobre a fachada: entrada do shopping.
            Raio md (20, o "raio Apple"): curva maior fazia o banner do
            carrossel parecer estourado para fora nos cantos. overflow
            hidden recorta o VidroFosco no raio da folha. */}
        <View
          onLayout={(e) => {
            folhaY.current = e.nativeEvent.layout.y
          }}
          style={{
            flex: 1,
            marginTop: -24,
            backgroundColor: colors.canvas,
            borderTopLeftRadius: radius.md,
            borderTopRightRadius: radius.md,
            paddingTop: 24,
            paddingBottom: espacoFinal,
            overflow: 'hidden',
          }}
        >
          <VidroFosco />
          <BannerCarousel banners={BANNERS_MOCK} />

          {/* Diretório do shopping: só pisos com loja viram placa — placa
              que não leva a lugar nenhum é sinalização quebrada. */}
          <Diretorio
            carregando={carregando}
            pisos={SECOES.filter((_, i) => grupos[i].length > 0).map((s) => ({
              slug: s.slug,
              nome: s.titulo,
            }))}
            aoTocarPiso={irParaPiso}
          />

          {carregando
            ? Array.from({ length: 2 }).map((_, i) => <SkeletonSecao key={i} />)
            : grupos.map((lojasDaSecao, i) => {
                if (lojasDaSecao.length === 0) return null
                const meta = SECOES[i]
                return (
                  <SecaoLojas
                    key={meta.slug}
                    slug={meta.slug}
                    titulo={meta.titulo}
                    subtitulo={meta.subtitulo}
                    lojas={lojasDaSecao}
                    aoMedir={(y) => {
                      posicaoPorPiso.current[meta.slug] = y
                    }}
                  />
                )
              })}
        </View>
      </ScrollView>

      {/* Barra do carrinho fixa acima da tab bar */}
      {totalItens > 0 && (
        <TouchableOpacity
          onPress={() => router.push('/checkout')}
          activeOpacity={consumerDesign.opacity.pressed}
          style={[
            {
              position: 'absolute',
              left: 16,
              right: 16,
              bottom: spacing.tabBarHeight,
              height: 56,
              borderRadius: radius.pill,
              backgroundColor: colors.accent,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
            },
            shadow.floating,
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ConsumerIcon name="bag" size={18} color={colors.ink} strokeWidth={2.1} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>
              {totalItens} {totalItens === 1 ? 'item' : 'itens'}
            </Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>
            {formatarReais(total)}
          </Text>
        </TouchableOpacity>
      )}

      {/* Concierge por cima de tudo (inclusive da barra do carrinho); a tab
          bar se recolhe via useImersao enquanto ele vive. Permanece montado
          ao navegar para uma loja — na volta, os resultados continuam lá. */}
      {buscaAberta && <Concierge aoFechar={() => setBuscaAberta(false)} />}

      <NotificacoesPopup
        visivel={notificacoesAbertas}
        onFechar={() => setNotificacoesAbertas(false)}
      />
    </View>
  )
}
