import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
  type ViewToken,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { HeaderTela } from '@/components/HeaderTela'
import { CardPost } from '@/components/seguindo/CardPost'
import { RailSeguindo } from '@/components/seguindo/RailSeguindo'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { consumerDesign } from '@/lib/consumer-design'
import { carregarPosts, PAGINA_POSTS, type Post } from '@/lib/posts'
import { supabase } from '@/lib/supabase'
import { useLojasSeguidas, useSeguidas } from '@/store/useSeguidas'

/**
 * Tela Seguindo — as lojas que o usuário escolheu acompanhar.
 *
 * UMA superfície só: rail das lojas seguidas no topo, feed cronológico
 * abaixo. Sem segmentado — dividir em abas "Feed"/"Lojas" empurrava o
 * conteúdo para baixo e fazia o usuário escolher antes de ver qualquer
 * coisa; o rail já responde "quem eu sigo" enquanto o feed responde "o que
 * publicaram". Cards vêm da mesma view do Explorar
 * (`public_explore_feed`), filtrada pelos slugs seguidos, com a mesma
 * paginação keyset por `publicado_em`.
 *
 * Chega-se aqui por dois caminhos: Perfil → "Lojas que sigo", ou o atalho da
 * barra (um toque em Início alterna para cá, dois voltam ao começo) — a
 * coreografia do atalho mora em `(tabs)/_layout.tsx`.
 *
 * Spec: docs/system-design/consumer/07-telas.md §Seguindo
 */

const { colors, radius, spacing } = consumerDesign

/** Só o que o rail e o cabeçalho do card desenham. */
interface PerfilLoja {
  nome: string
  slug: string
  logo_url: string | null
}

/** Teto do fetch de perfis: ninguém segue mais lojas que isso na prática. */
const LIMITE_PERFIS = 200

export default function TelaSeguindo() {
  const hidratado = useSeguidas((s) => s.hidratado)
  const deixarDeSeguir = useSeguidas((s) => s.deixarDeSeguir)
  const seguidas = useLojasSeguidas()

  const slugs = useMemo(() => seguidas.map((l) => l.slug), [seguidas])
  // Chave estável do conjunto seguido — dispara recarga só quando muda de fato.
  const chaveSlugs = useMemo(() => [...slugs].sort().join(','), [slugs])

  const [perfis, setPerfis] = useState<Record<string, PerfilLoja>>({})
  const [posts, setPosts] = useState<Post[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [fim, setFim] = useState(false)
  const [mutado, setMutado] = useState(true)
  const [ativo, setAtivo] = useState<string | null>(null)
  const [focado, setFocado] = useState(true)

  // Sair da aba pausa o vídeo do card ativo — som de feed não acompanha
  // o usuário para outra tela.
  useFocusEffect(
    useCallback(() => {
      setFocado(true)
      return () => setFocado(false)
    }, []),
  )

  const carregandoMais = useRef(false)
  const chaveCarregada = useRef<string | null>(null)

  const carregarPerfis = useCallback(async (lojas: string[]) => {
    if (lojas.length === 0) {
      setPerfis({})
      return
    }
    const { data } = await supabase
      .from('stores')
      .select('nome, slug, logo_url')
      .in('slug', lojas)
      .limit(LIMITE_PERFIS)

    const mapa: Record<string, PerfilLoja> = {}
    for (const linha of data ?? []) {
      if (linha.slug) mapa[linha.slug] = linha as PerfilLoja
    }
    setPerfis(mapa)
  }, [])

  const carregarTudo = useCallback(
    async (lojas: string[]) => {
      setErro(null)
      try {
        const [pagina] = await Promise.all([
          carregarPosts({ lojas }),
          carregarPerfis(lojas),
        ])
        setPosts(pagina)
        setFim(pagina.length < PAGINA_POSTS)
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Falha ao carregar o feed')
      }
    },
    [carregarPerfis],
  )

  /**
   * Recarrega quando o conjunto seguido muda — exceto se só houve REMOÇÃO:
   * aí basta tirar os posts daquela loja da lista. Deixar de seguir no meio
   * da rolagem não deve jogar o usuário de volta ao topo.
   */
  useEffect(() => {
    if (!hidratado) return

    const anterior = chaveCarregada.current
    if (anterior !== null) {
      const antes = new Set(anterior.split(',').filter(Boolean))
      const soRemocoes = slugs.every((s) => antes.has(s))
      if (soRemocoes) {
        chaveCarregada.current = chaveSlugs
        const permitidos = new Set(slugs)
        setPosts((p) => p.filter((post) => permitidos.has(post.loja_slug)))
        return
      }
    }

    chaveCarregada.current = chaveSlugs
    setCarregando(true)
    void carregarTudo(slugs).finally(() => setCarregando(false))
    // `chaveSlugs` resume `slugs`; incluir o array reexecutaria a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveSlugs, hidratado, carregarTudo])

  const aoAtualizar = useCallback(async () => {
    setAtualizando(true)
    await carregarTudo(slugs)
    setAtualizando(false)
  }, [carregarTudo, slugs])

  // Scroll infinito: keyset por `publicado_em`, igual ao Explorar.
  const carregarMais = useCallback(async () => {
    if (carregandoMais.current || fim || posts.length === 0) return
    carregandoMais.current = true
    try {
      const pagina = await carregarPosts({
        lojas: slugs,
        antesDe: posts[posts.length - 1].publicado_em,
      })
      if (pagina.length < PAGINA_POSTS) setFim(true)
      if (pagina.length > 0) {
        setPosts((prev) => {
          const ids = new Set(prev.map((p) => p.id))
          return [...prev, ...pagina.filter((p) => !ids.has(p.id))]
        })
      }
    } catch {
      // silencioso — tenta de novo no próximo onEndReached
    } finally {
      carregandoMais.current = false
    }
  }, [fim, posts, slugs])

  const aoMudarVisiveis = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const primeiro = viewableItems[0]?.item as Post | undefined
      if (primeiro) setAtivo(primeiro.id)
    },
    [],
  )

  const configVisibilidade = useRef({ itemVisiblePercentThreshold: 60 }).current

  const itensRail = useMemo(
    () =>
      seguidas.map((loja) => ({
        slug: loja.slug,
        nome: perfis[loja.slug]?.nome ?? loja.nome,
        logo_url: perfis[loja.slug]?.logo_url ?? null,
      })),
    [seguidas, perfis],
  )

  const irParaExplorar = () => router.navigate('/(tabs)/explorar')
  const abrirLoja = (slug: string) => router.push(`/loja/${slug}`)

  /**
   * O rail é a única lista completa de quem se segue, e uma loja que ainda
   * não publicou não tem card no feed com botão "Seguindo". Toque longo no
   * avatar cobre esse caso sem acrescentar botão nenhum à tela.
   */
  function confirmarUnfollow(loja: { slug: string; nome: string }) {
    Alert.alert(loja.nome, 'Deixar de seguir esta loja?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Deixar de seguir',
        style: 'destructive',
        onPress: () => deixarDeSeguir(loja.slug),
      },
    ])
  }

  const cabecalho = (
    <HeaderTela
      variante="voltar"
      titulo="Seguindo"
      // Sempre Início — o mesmo destino do toque duplo no atalho da barra.
      // `router.back()` aqui dependeria de haver pilha, e não há quando se
      // chega pelo atalho.
      aoVoltar={() => router.navigate('/(tabs)')}
      acaoDireita={
        <TouchableOpacity
          onPress={irParaExplorar}
          activeOpacity={consumerDesign.opacity.pressedSoft}
          accessibilityRole="button"
          accessibilityLabel="Descobrir lojas no Explorar"
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.sm,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ConsumerIcon name="search" size={18} color={colors.ink} />
        </TouchableOpacity>
      }
    />
  )

  // ── Estados de exceção ──

  if (!hidratado) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        {cabecalho}
        <EsqueletoFeed />
      </View>
    )
  }

  if (seguidas.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        {cabecalho}
        <EmptyState
          icone="users"
          titulo="Você ainda não segue nenhuma loja"
          descricao="Siga suas lojas favoritas no Explorar e as novidades delas aparecem aqui, sem precisar procurar."
          acao={{ label: 'Descobrir lojas', aoTocar: irParaExplorar }}
        />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {cabecalho}

      {carregando ? (
        <EsqueletoFeed />
      ) : erro ? (
        <ErroFeed aoTentar={() => void aoAtualizar()} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom: spacing.tabBarHeight,
          }}
          ListHeaderComponent={
            <View style={{ paddingBottom: 12 }}>
              <RailSeguindo
                lojas={itensRail}
                onAbrirLoja={abrirLoja}
                onDescobrir={irParaExplorar}
                onRemover={confirmarUnfollow}
              />
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icone="reels"
              titulo="Nada novo por aqui"
              descricao="As lojas que você segue ainda não publicaram. Enquanto isso, o Explorar está cheio de novidades."
              acao={{ label: 'Ir para o Explorar', aoTocar: irParaExplorar }}
            />
          }
          ListFooterComponent={
            posts.length > 0 ? <Rodape fim={fim} /> : null
          }
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              onRefresh={aoAtualizar}
              tintColor={colors.ink}
            />
          }
          onViewableItemsChanged={aoMudarVisiveis}
          viewabilityConfig={configVisibilidade}
          onEndReached={() => void carregarMais()}
          onEndReachedThreshold={1.2}
          initialNumToRender={3}
          maxToRenderPerBatch={4}
          windowSize={5}
          renderItem={({ item }) => (
            <CardPost
              post={item}
              ativo={focado && item.id === ativo}
              mutado={mutado}
              onAlternarMudo={() => setMutado((m) => !m)}
              logoUrl={perfis[item.loja_slug]?.logo_url ?? null}
            />
          )}
        />
      )}
    </View>
  )
}

// ─────────────────────────────────────────────────────────
// Sub-componentes locais
// ─────────────────────────────────────────────────────────

function EsqueletoFeed() {
  return (
    <View style={{ paddingTop: 12, gap: 20 }}>
      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} largura={58} altura={58} raio={29} />
        ))}
      </View>
      {Array.from({ length: 2 }).map((_, i) => (
        <View key={i} style={{ paddingHorizontal: 16, gap: 10 }}>
          <Skeleton largura="55%" altura={40} raio={radius.sm} />
          <Skeleton largura="100%" altura={280} raio={radius.lg} />
        </View>
      ))}
    </View>
  )
}

function ErroFeed({ aoTentar }: { aoTentar: () => void }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingHorizontal: 32,
      }}
    >
      <ConsumerIcon name="info" size={28} color={colors.inkSoft} strokeWidth={1.6} />
      <Text
        style={{
          color: colors.inkMuted,
          fontSize: 14,
          fontWeight: '500',
          textAlign: 'center',
        }}
      >
        Não foi possível carregar o feed das lojas que você segue.
      </Text>
      <TouchableOpacity
        onPress={aoTentar}
        activeOpacity={consumerDesign.opacity.pressed}
        style={{
          paddingHorizontal: 18,
          paddingVertical: 10,
          borderRadius: radius.pill,
          backgroundColor: colors.accent,
        }}
      >
        <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 13 }}>
          Tentar de novo
        </Text>
      </TouchableOpacity>
    </View>
  )
}

/** Fim da lista: confirma que acabou e ensina o atalho de volta. */
function Rodape({ fim }: { fim: boolean }) {
  if (!fim) {
    return (
      <View style={{ paddingVertical: 24 }}>
        <ActivityIndicator color={colors.inkSoft} />
      </View>
    )
  }

  return (
    <View style={{ paddingVertical: 28, paddingHorizontal: 32, gap: 6 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: colors.inkMuted,
          textAlign: 'center',
        }}
      >
        Você está em dia
      </Text>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '500',
          color: colors.inkSoft,
          textAlign: 'center',
          lineHeight: 18,
        }}
      >
        Toque em Início na barra para voltar ao shopping.
      </Text>
    </View>
  )
}
