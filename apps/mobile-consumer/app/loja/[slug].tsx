import { useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { formatarReais } from '@mallevo/lib'
import { Skeleton } from '@/components/ui/Skeleton'
import { SplashLoja } from '@/components/SplashLoja'
import { ModalProduto } from '@/components/ModalProduto'
import { ProdutoCard } from '@/components/ProdutoCard'
import { LojaEditorial } from '@/components/loja/LojaEditorial'
import { ProdutoEditorial } from '@/components/loja/ProdutoEditorial'
import { LojaRaw } from '@/components/loja/LojaRaw'
import { ProdutoRaw } from '@/components/loja/ProdutoRaw'
import { LojaSerena } from '@/components/loja/LojaSerena'
import { ProdutoSereno } from '@/components/loja/ProdutoSereno'
import { LojaArtesa } from '@/components/loja/LojaArtesa'
import { ProdutoArtesao } from '@/components/loja/ProdutoArtesao'
import { LojaNoir } from '@/components/loja/LojaNoir'
import { ProdutoNoir } from '@/components/loja/ProdutoNoir'
import { LojaVolt } from '@/components/loja/LojaVolt'
import { ProdutoVolt } from '@/components/loja/ProdutoVolt'
import { LojaClinica } from '@/components/loja/LojaClinica'
import { ProdutoClinico } from '@/components/loja/ProdutoClinico'
import { LojaTorra } from '@/components/loja/LojaTorra'
import { ProdutoTorra } from '@/components/loja/ProdutoTorra'
import { LojaSmash } from '@/components/loja/LojaSmash'
import { ProdutoSmash } from '@/components/loja/ProdutoSmash'
import { LojaRitual } from '@/components/loja/LojaRitual'
import { ProdutoRitual } from '@/components/loja/ProdutoRitual'
import { LojaMagazine } from '@/components/loja/LojaMagazine'
import { ProdutoMagazine } from '@/components/loja/ProdutoMagazine'
import { Badge } from '@/components/ui/Badge'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { useCartStore } from '@/store/useCartStore'
import { consumerDesign } from '@/lib/consumer-design'
import {
  StoreDesignProvider,
  useStoreDesign,
  useStoreDesignFromTheme,
} from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

const { shadow } = consumerDesign

interface Produto {
  id: string
  nome: string
  descricao: string | null
  preco: number
  preco_promocional: number | null
  foto_url: string | null
  disponivel: boolean
  category_id: string | null
  metadata: Record<string, unknown> | null
}

interface SecaoCardapio {
  titulo: string
  produtos: Produto[]
}

interface MetodoPagamento {
  rotulo: string
  ativo: boolean
}

/**
 * Categorias que ganham a vitrine editorial de moda quando a pele da loja é
 * o arquétipo `editorial` (docs/store-theme/02 §C). As demais categorias — e
 * os outros arquétipos — seguem no layout de catálogo padrão.
 */
const CATEGORIAS_VITRINE_EDITORIAL = new Set([
  'vestuario-calcados',
  'beleza-cosmeticos',
  'acessorios-joias',
])

/** Categorias da vitrine serena (arquétipo `serene` — beleza/joias delicadas). */
const CATEGORIAS_VITRINE_SERENA = new Set([
  'beleza-cosmeticos',
  'acessorios-joias',
  'saloes-estetica',
])

/** Categorias da vitrine artesã (arquétipo `artisan` — casa/decoração/flores). */
const CATEGORIAS_VITRINE_ARTESA = new Set([
  'casa-decoracao',
  'floricultura-plantas',
])

export default function PaginaLoja() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const insets = useSafeAreaInsets()
  const [loja, setLoja] = useState<any>(null)
  const [secoes, setSecoes] = useState<SecaoCardapio[]>([])
  const [carregando, setCarregando] = useState(true)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [splashVisivel, setSplashVisivel] = useState(true)
  const scrollY = useRef(new Animated.Value(0)).current
  const totalItens = useCartStore((s) => s.totalItens())

  // Pele da loja: preset v2 explícito tematiza (cores + forma + densidade +
  // tipografia, fontes carregadas em background); sem tema / v1 → Mallevo.
  const design = useStoreDesignFromTheme(loja?.theme)
  const { colors, spacing, typeFactor } = design

  useEffect(() => {
    async function carregar() {
      const { data: lojaData } = await supabase
        .from('stores')
        .select(`
          id, nome, descricao, logo_url, banner_url,
          taxa_entrega, tempo_entrega, telefone,
          aceita_pix, aceita_cartao_online,
          horarios, tenant_id, theme,
          categoria:categories(slug)
        `)
        .eq('slug', slug)
        .eq('ativo', true)
        .single()

      if (!lojaData) {
        router.back()
        return
      }

      const categoria_slug =
        (lojaData as any).categoria?.slug ?? null
      setLoja({ ...lojaData, categoria_slug })

      const { data: produtos } = await supabase
        .from('products')
        .select(`
          id, nome, descricao, preco, preco_promocional,
          foto_url, disponivel, category_id, metadata,
          categories (id, nome, ordem)
        `)
        .eq('store_id', lojaData.id)
        .eq('disponivel', true)
        .order('ordem')

      if (produtos) {
        const grupos: Record<
          string,
          { titulo: string; ordem: number; produtos: Produto[] }
        > = {}

        for (const produto of produtos) {
          const cat = (produto as any).categories
          const chave = cat?.id ?? 'sem-categoria'
          const titulo = cat?.nome ?? 'Outros'
          const ordem = cat?.ordem ?? 999

          if (!grupos[chave]) {
            grupos[chave] = { titulo, ordem, produtos: [] }
          }
          grupos[chave].produtos.push(produto as unknown as Produto)
        }

        const secoesOrdenadas = Object.values(grupos)
          .sort((a, b) => a.ordem - b.ordem)
          .map((g) => ({ titulo: g.titulo, produtos: g.produtos }))

        setSecoes(secoesOrdenadas)
      }

      setCarregando(false)
    }

    carregar()
  }, [slug])

  // Header animado: bg muda de transparente → surface conforme rola
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [80, 160],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  const titleOpacity = scrollY.interpolate({
    inputRange: [120, 180],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  // Transição para a pele do parceiro: o splash cobre a tela desde o primeiro
  // frame (inclusive o skeleton) e só sai depois que a paleta assumiu.
  const splash = splashVisivel ? (
    <SplashLoja
      nome={loja?.nome ?? ''}
      logoUrl={loja?.logo_url ?? null}
      design={design}
      pronto={!carregando && !!loja}
      onFim={() => setSplashVisivel(false)}
    />
  ) : null

  if (carregando) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Skeleton largura="100%" altura={200} raio={0} />
        <View style={{ padding: 20, gap: 12 }}>
          <Skeleton largura="60%" altura={24} />
          <Skeleton largura="40%" altura={16} />
          <Skeleton largura="80%" altura={16} />
        </View>
        {splash}
      </View>
    )
  }

  // Gateway-only: só métodos online aparecem (política Mallevo, §3d).
  const metodos: MetodoPagamento[] = [
    { rotulo: 'Cartão de crédito', ativo: !!loja?.aceita_cartao_online },
    { rotulo: 'Pix', ativo: !!loja?.aceita_pix },
  ].filter((m) => m.ativo)

  const espacoFinal = totalItens > 0 ? 120 : 40

  // Vitrines por arquétipo: layout PRÓPRIO além da pele (docs/store-theme/05
  // §5.6). Editorial cobre moda/beleza/acessórios; raw é streetwear puro;
  // serene é beleza/joias delicadas.
  const vitrineEditorial =
    design.arquetipo === 'editorial' &&
    CATEGORIAS_VITRINE_EDITORIAL.has(loja?.categoria_slug)
  const vitrineRaw =
    design.arquetipo === 'raw' && loja?.categoria_slug === 'vestuario-calcados'
  const vitrineSerena =
    design.arquetipo === 'serene' &&
    CATEGORIAS_VITRINE_SERENA.has(loja?.categoria_slug)
  const vitrineArtesa =
    design.arquetipo === 'artisan' &&
    CATEGORIAS_VITRINE_ARTESA.has(loja?.categoria_slug)
  // Noir gastronômico: fine dining (restaurantes refinados escolhem a pele
  // noir e ganham o cardápio-livro).
  const vitrineNoir =
    design.arquetipo === 'noir' && loja?.categoria_slug === 'alimentos-bebidas'
  // Volt: fitness/esporte (vestuário esportivo e suplementos).
  const vitrineVolt =
    design.arquetipo === 'volt' &&
    ['vestuario-calcados', 'saude-bem-estar'].includes(loja?.categoria_slug)
  // Clínica: farmácia/saúde/vet — layout de utilidade (busca + lista densa).
  const vitrineClinica =
    design.arquetipo === 'clinic' &&
    ['farmacia-medicamentos', 'saude-bem-estar', 'veterinaria'].includes(
      loja?.categoria_slug,
    )
  // Torra: cafeterias/confeitarias (pôster retrô + cardápio âmbar).
  const vitrineTorra =
    design.arquetipo === 'roast' && loja?.categoria_slug === 'alimentos-bebidas'
  // Smash: hamburgueria/fast-food (bordô + laranja, folha creme de cardápio).
  const vitrineSmash =
    design.arquetipo === 'smash' && loja?.categoria_slug === 'alimentos-bebidas'
  // Ritual: açaíterias/lifestyle (rosa chiclete, cartões flutuando, cardápio
  // creme puramente tipográfico).
  const vitrineRitual =
    design.arquetipo === 'ritual' && loja?.categoria_slug === 'alimentos-bebidas'
  // Magazine: lojas de departamento/vende-tudo (categoria guarda-chuva).
  const vitrineMagazine =
    design.arquetipo === 'magazine' && loja?.categoria_slug === 'outros'

  if (
    vitrineEditorial ||
    vitrineRaw ||
    vitrineSerena ||
    vitrineArtesa ||
    vitrineNoir ||
    vitrineVolt ||
    vitrineClinica ||
    vitrineTorra ||
    vitrineSmash ||
    vitrineRitual ||
    vitrineMagazine
  ) {
    // LojaClinica fica fora da união (o `loja.id` extra quebra a inferência
    // do JSX sobre componentes genéricos) — renderizada num ramo próprio.
    const Vitrine = vitrineRaw
      ? LojaRaw
      : vitrineSerena
        ? LojaSerena
        : vitrineArtesa
          ? LojaArtesa
          : vitrineNoir
            ? LojaNoir
            : vitrineVolt
              ? LojaVolt
              : vitrineTorra
                ? LojaTorra
                : vitrineSmash
                  ? LojaSmash
                  : vitrineRitual
                    ? LojaRitual
                    : LojaEditorial
    const Pdp = vitrineRaw
      ? ProdutoRaw
      : vitrineSerena
        ? ProdutoSereno
        : vitrineArtesa
          ? ProdutoArtesao
          : vitrineNoir
            ? ProdutoNoir
            : vitrineVolt
              ? ProdutoVolt
              : vitrineClinica
                ? ProdutoClinico
                : vitrineTorra
                  ? ProdutoTorra
                  : vitrineSmash
                    ? ProdutoSmash
                    : vitrineRitual
                      ? ProdutoRitual
                      : vitrineMagazine
                        ? ProdutoMagazine
                        : ProdutoEditorial
    return (
      <StoreDesignProvider value={design}>
        <View style={{ flex: 1, backgroundColor: colors.canvas }}>
          <Stack.Screen options={{ headerShown: false }} />

          {/*
           * Sem FAB de carrinho nestes layouts: a sacola do header (com
           * contador) é a porta do carrinho — a pill flutuante duplicaria a
           * função e disputaria espaço com a barra de menu da vitrine.
           */}
          {vitrineClinica ? (
            <LojaClinica
              loja={loja}
              secoes={secoes}
              aoAbrirProduto={setProdutoSelecionado}
              espacoFinal={24}
            />
          ) : vitrineMagazine ? (
            <LojaMagazine
              loja={loja}
              secoes={secoes}
              aoAbrirProduto={setProdutoSelecionado}
              espacoFinal={24}
            />
          ) : (
            <Vitrine
              loja={loja}
              secoes={secoes}
              aoAbrirProduto={setProdutoSelecionado}
              espacoFinal={24}
            />
          )}

          {produtoSelecionado && loja && (
            <Pdp
              produto={produtoSelecionado}
              loja={loja}
              onFechar={() => setProdutoSelecionado(null)}
            />
          )}
          {splash}
        </View>
      </StoreDesignProvider>
    )
  }

  return (
    <StoreDesignProvider value={design}>
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header animado fixo */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: insets.top + 6,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: colors.surface,
          opacity: headerBgOpacity,
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
        }}
        pointerEvents="none"
      />
      <View
        style={{
          position: 'absolute',
          top: insets.top + 6,
          left: 16,
          right: 16,
          zIndex: 11,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <BotaoCircular icone="back" aoTocar={() => router.back()} />
        <Animated.Text
          style={{
            flex: 1,
            fontSize: 16,
            color: colors.ink,
            textAlign: 'center',
            opacity: titleOpacity,
            marginRight: 40,
            letterSpacing: -0.2,
            ...fontStyle(design.display, 800),
          }}
          numberOfLines={1}
        >
          {loja?.nome}
        </Animated.Text>
      </View>

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: espacoFinal }}
      >
        {/* Banner */}
        <View style={{ height: 200, backgroundColor: colors.surfaceDark }}>
          {loja?.banner_url ? (
            <Image
              source={{ uri: loja.banner_url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : loja?.logo_url ? (
            <Image
              source={{ uri: loja.logo_url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  right: -40,
                  top: -40,
                  width: 180,
                  height: 180,
                  borderRadius: 90,
                  backgroundColor: colors.accentSoft,
                }}
              />
              <Text
                style={{
                  color: colors.accent,
                  fontSize: 96,
                  fontWeight: '800',
                  letterSpacing: -3,
                  opacity: 0.85,
                }}
              >
                {(loja?.nome ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Cabeçalho da loja */}
        <View
          style={{
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.screenX,
            paddingVertical: 24,
            gap: 12,
          }}
        >
          <Text
            style={{
              fontSize: Math.round(26 * typeFactor),
              color: colors.ink,
              letterSpacing: -0.5,
              ...fontStyle(design.display, 800),
            }}
          >
            {loja?.nome}
          </Text>

          {/* Assinatura do arquétipo: barra na cor da marca do lojista */}
          {design.themed && (
            <View
              style={{
                width: 44,
                height: 4,
                borderRadius: Math.min(design.radius.sm, 4),
                backgroundColor: colors.accent,
                marginTop: -4,
              }}
            />
          )}

          {loja?.descricao && (
            <Text
              style={{
                fontSize: 14,
                color: colors.inkMuted,
                lineHeight: 20,
                ...fontStyle(design.body, 500),
              }}
              numberOfLines={3}
            >
              {loja.descricao}
            </Text>
          )}

          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
          >
            {loja?.tempo_entrega !== null && loja?.tempo_entrega !== undefined && (
              <LinhaMeta
                icone="clock"
                rotulo={`${loja.tempo_entrega} min`}
                cor={colors.inkMuted}
              />
            )}
            <LinhaMeta
              icone="truck"
              rotulo={
                loja?.taxa_entrega === 0
                  ? 'Frete grátis'
                  : formatarReais(loja?.taxa_entrega ?? 0)
              }
              cor={loja?.taxa_entrega === 0 ? colors.success : colors.inkMuted}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: colors.surfaceMuted,
                borderRadius: design.radius.pill,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.success,
                }}
              />
              <Text
                style={{
                  fontSize: 13,
                  color: colors.inkMuted,
                  ...fontStyle(design.body, 600),
                }}
              >
                Aberto
              </Text>
            </View>
          </View>

          {metodos.length > 0 && (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 6,
                marginTop: 4,
              }}
            >
              {metodos.map((m) => (
                <Badge
                  key={m.rotulo}
                  rotulo={m.rotulo}
                  cor={colors.inkMuted}
                  tamanho="sm"
                />
              ))}
            </View>
          )}
        </View>

        {/* Cardápio */}
        {secoes.map((secao) => (
          <View
            key={secao.titulo}
            style={{ marginTop: spacing.section, paddingHorizontal: spacing.screenX }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 4,
              }}
            >
              {design.themed && (
                <View
                  style={{
                    width: 4,
                    height: Math.round(16 * typeFactor),
                    borderRadius: Math.min(design.radius.sm, 3),
                    backgroundColor: colors.accent,
                  }}
                />
              )}
              <Text
                style={{
                  fontSize: Math.round(18 * typeFactor),
                  color: colors.ink,
                  letterSpacing: -0.2,
                  ...fontStyle(design.display, 800),
                }}
              >
                {secao.titulo}
              </Text>
            </View>

            {secao.produtos.map((produto) => (
              <ProdutoCard
                key={produto.id}
                produto={produto}
                aoTocar={() => setProdutoSelecionado(produto)}
              />
            ))}
          </View>
        ))}
      </Animated.ScrollView>

      {/* FAB carrinho */}
      {totalItens > 0 && <FabCarrinho />}

      {/* Modal do produto */}
      {produtoSelecionado && loja && (
        <ModalProduto
          produto={produtoSelecionado}
          loja={loja}
          onFechar={() => setProdutoSelecionado(null)}
        />
      )}

      {splash}
    </View>
    </StoreDesignProvider>
  )
}

function FabCarrinho() {
  const insets = useSafeAreaInsets()
  const design = useStoreDesign()
  const { colors } = design
  const totalItens = useCartStore((s) => s.totalItens())
  const total = useCartStore((s) => s.total())
  return (
    <TouchableOpacity
      onPress={() => router.push('/checkout')}
      activeOpacity={consumerDesign.opacity.pressed}
      style={[
        {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: insets.bottom + 16,
          height: 56,
          borderRadius: design.radius.pill,
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
        <ConsumerIcon name="bag" size={20} color={colors.accentInk} strokeWidth={2.1} />
        <Text
          style={{ fontSize: 15, color: colors.accentInk, ...fontStyle(design.body, 800) }}
        >
          {totalItens} {totalItens === 1 ? 'item' : 'itens'}
        </Text>
      </View>
      <Text
        style={{ fontSize: 15, color: colors.accentInk, ...fontStyle(design.body, 800) }}
      >
        {formatarReais(total)}
      </Text>
    </TouchableOpacity>
  )
}

function BotaoCircular({
  icone,
  aoTocar,
}: {
  icone: 'back'
  aoTocar: () => void
}) {
  const { colors } = useStoreDesign()
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={0.7}
      style={[
        {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        },
        shadow.soft,
      ]}
    >
      <ConsumerIcon name={icone} size={18} color={colors.ink} strokeWidth={2.1} />
    </TouchableOpacity>
  )
}

function LinhaMeta({
  icone,
  rotulo,
  cor,
}: {
  icone: 'clock' | 'truck'
  rotulo: string
  cor: string
}) {
  const design = useStoreDesign()
  const { colors } = design
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.surfaceMuted,
        borderRadius: design.radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      <ConsumerIcon name={icone} size={14} color={cor} />
      <Text style={{ fontSize: 13, color: cor, ...fontStyle(design.body, 600) }}>
        {rotulo}
      </Text>
    </View>
  )
}
