import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, View } from 'react-native'
import { router } from 'expo-router'
import { FeedReels } from '@/components/explorar/FeedReels'
import { RailSeguindo } from '@/components/seguindo/RailSeguindo'
import { EmptyState } from '@/components/ui/EmptyState'
import { consumerDesign } from '@/lib/consumer-design'
import { supabase } from '@/lib/supabase'
import { useLojasSeguidas, useSeguidas } from '@/store/useSeguidas'

/**
 * Tela Seguindo — o Explorar de quem já escolheu o que explorar.
 *
 * É o MESMO feed de reels em tela cheia do Explorar (`FeedReels`), com um
 * filtro só: as lojas que o usuário segue. Nada de card sobre canvas nem
 * segunda mecânica — uma tela existe para achar o que não se conhece, a
 * outra para não perder o que já se ama, e as duas se sentem iguais.
 *
 * O que é próprio daqui:
 * - o filtro (`lojas`) vem de `useSeguidas`; deixar de seguir no meio do
 *   feed só tira os reels daquela loja (o FeedReels não recarrega);
 * - o rail das lojas seguidas mora no topo da galeria (pinch ou lupa) —
 *   toque abre a loja, toque longo deixa de seguir: é a única lista completa
 *   de quem se segue, inclusive de quem ainda não publicou;
 * - dois vazios: não seguir ninguém (convite ao Explorar) e seguir sem
 *   post novo ("Nada novo por aqui").
 *
 * Chega-se aqui por três caminhos: Perfil → "Lojas que sigo", o atalho da
 * barra (um toque em Início alterna para cá, dois voltam — coreografia em
 * `(tabs)/_layout.tsx`) e um post tocado na marquise do Início, que chega
 * com `?post=<id>` e abre direto nesse reel (o FeedReels trata o param).
 *
 * Spec: docs/system-design/consumer/07-telas.md §Seguindo
 */

const { colors } = consumerDesign

/** Só o que o rail desenha. */
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
  const chaveSlugs = useMemo(() => [...slugs].sort().join(','), [slugs])

  // Nome e logo das lojas para o rail; a tela funciona sem eles.
  const [perfis, setPerfis] = useState<Record<string, PerfilLoja>>({})
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
  useEffect(() => {
    if (!hidratado) return
    void carregarPerfis(slugs)
    // `chaveSlugs` resume `slugs`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveSlugs, hidratado, carregarPerfis])

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

  // Sem hidratar não se sabe o filtro — montar o feed agora mostraria o
  // vazio errado por um instante.
  if (!hidratado) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.ink,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    )
  }

  const vazio =
    seguidas.length === 0 ? (
      <EmptyState
        variante="escuro"
        icone="users"
        titulo="Você ainda não segue nenhuma loja"
        descricao="Siga suas lojas favoritas no Explorar e as novidades delas aparecem aqui, sem precisar procurar."
        acao={{ label: 'Descobrir lojas', aoTocar: irParaExplorar }}
      />
    ) : (
      <EmptyState
        variante="escuro"
        icone="reels"
        titulo="Nada novo por aqui"
        descricao="As lojas que você segue ainda não publicaram. Enquanto isso, o Explorar está cheio de novidades."
        acao={{ label: 'Ir para o Explorar', aoTocar: irParaExplorar }}
      />
    )

  return (
    <FeedReels
      titulo="Seguindo"
      lojas={slugs}
      // Sempre Início — o mesmo destino do toque duplo no atalho da barra.
      // `router.back()` dependeria de haver pilha, e não há pelo atalho.
      aoVoltar={() => router.navigate('/(tabs)')}
      vazio={vazio}
      cabecalhoGaleria={
        <RailSeguindo
          lojas={itensRail}
          onAbrirLoja={abrirLoja}
          onDescobrir={irParaExplorar}
          onRemover={confirmarUnfollow}
        />
      }
    />
  )
}
