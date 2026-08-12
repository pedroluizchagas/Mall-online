import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { formatarReais } from '@mallevo/lib'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { HeaderTela } from '@/components/HeaderTela'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { consumerDesign, tempoRelativo } from '@/lib/consumer-design'
import { carregarPosts, type Post } from '@/lib/posts'
import {
  useFavoritos,
  usePostsFavoritos,
  type PostFavorito,
} from '@/store/useFavoritos'

/**
 * Tela Favoritos — os posts que o usuário curtiu.
 *
 * Grade, não feed: Seguindo já é uma coluna de cards para ler, e repetir o
 * mesmo formato aqui faria duas telas iguais com conteúdos diferentes. O que
 * se quer de uma coleção é bater o olho e reconhecer — daí a grade 2×,
 * mídia grande, nome da loja e o preço quando o post vitrina um produto.
 *
 * Toque abre a LOJA (é onde a curtida vira compra); toque longo remove,
 * mesmo gesto do rail de Seguindo.
 *
 * Chega-se por Perfil → "Favoritos" ou pelo atalho da barra: um toque em
 * Pedidos alterna para cá, dois voltam ([`05-shell-app.md`]).
 *
 * Spec: docs/system-design/consumer/07-telas.md §Favoritos
 */

const { colors, radius, spacing, shadow } = consumerDesign

const { width: W } = Dimensions.get('window')
const MARGEM = 16
const VAO = 12
const TILE_W = (W - MARGEM * 2 - VAO) / 2
// 4:5 — mesma proporção da mídia do card em Seguindo, para a coleção
// parecer a mesma biblioteca vista de longe.
const TILE_H = Math.round(TILE_W * 1.25)

export default function TelaFavoritos() {
  const hidratado = useFavoritos((s) => s.hidratado)
  const remover = useFavoritos((s) => s.remover)
  const atualizarSnapshots = useFavoritos((s) => s.atualizarSnapshots)
  const favoritos = usePostsFavoritos()

  const [atualizando, setAtualizando] = useState(false)

  const ids = useMemo(() => favoritos.map((f) => f.post.id), [favoritos])
  const chaveIds = useMemo(() => [...ids].sort().join(','), [ids])

  /**
   * Refresca o que ainda está publicado. Silencioso de propósito: a tela já
   * tem o snapshot na mão, então falha de rede não é erro visível — só
   * significa "seguimos com o que está salvo".
   */
  const refrescar = useCallback(async () => {
    if (ids.length === 0) return
    try {
      atualizarSnapshots(await carregarPosts({ ids, limite: ids.length }))
    } catch {
      // segue com o snapshot local
    }
    // `chaveIds` resume `ids`; o array mudaria de identidade a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveIds, atualizarSnapshots])

  useEffect(() => {
    if (hidratado) void refrescar()
  }, [hidratado, refrescar])

  const aoAtualizar = useCallback(async () => {
    setAtualizando(true)
    await refrescar()
    setAtualizando(false)
  }, [refrescar])

  const irParaExplorar = () => router.navigate('/(tabs)/explorar')

  function confirmarRemocao(post: Post) {
    Alert.alert(post.loja_nome, 'Remover dos favoritos?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => remover(post.id),
      },
    ])
  }

  const cabecalho = (
    <HeaderTela
      variante="voltar"
      titulo="Favoritos"
      // Sempre Pedidos — o mesmo destino do toque duplo no atalho da barra.
      // `router.back()` dependeria de haver pilha, e não há quando se chega
      // pelo atalho.
      aoVoltar={() => router.navigate('/(tabs)/pedidos')}
      acaoDireita={
        <TouchableOpacity
          onPress={irParaExplorar}
          activeOpacity={consumerDesign.opacity.pressedSoft}
          accessibilityRole="button"
          accessibilityLabel="Descobrir posts no Explorar"
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

  if (!hidratado) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        {cabecalho}
        <EsqueletoGrade />
      </View>
    )
  }

  if (favoritos.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        {cabecalho}
        <EmptyState
          icone="heart"
          titulo="Nenhum favorito ainda"
          descricao="Toque no coração de um post no Explorar ou no feed Seguindo e ele fica guardado aqui."
          acao={{ label: 'Descobrir posts', aoTocar: irParaExplorar }}
        />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {cabecalho}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: MARGEM,
          paddingTop: 8,
          paddingBottom: spacing.tabBarHeight,
        }}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={aoAtualizar}
            tintColor={colors.ink}
          />
        }
      >
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: VAO,
          }}
        >
          {favoritos.map((favorito) => (
            <TileFavorito
              key={favorito.post.id}
              favorito={favorito}
              aoTocar={() => router.push(`/loja/${favorito.post.loja_slug}`)}
              aoRemover={() => confirmarRemocao(favorito.post)}
            />
          ))}
        </View>

        <Text
          style={{
            fontSize: 12,
            fontWeight: '500',
            color: colors.inkSoft,
            textAlign: 'center',
            paddingTop: 20,
            lineHeight: 18,
          }}
        >
          Toque longo em um favorito para remover.
        </Text>
      </ScrollView>
    </View>
  )
}

// ─────────────────────────────────────────────────────────
// Sub-componentes locais
// ─────────────────────────────────────────────────────────

function TileFavorito({
  favorito,
  aoTocar,
  aoRemover,
}: {
  favorito: PostFavorito
  aoTocar: () => void
  aoRemover: () => void
}) {
  const { post } = favorito
  // Vídeo publicado de verdade tem thumb; `media_url` de vídeo é mp4 e não
  // renderiza em <Image> — por isso o fallback com a inicial da loja.
  const imagem = post.thumb_url ?? (post.tipo === 'foto' ? post.media_url : null)

  return (
    <TouchableOpacity
      onPress={aoTocar}
      onLongPress={aoRemover}
      activeOpacity={consumerDesign.opacity.pressed}
      accessibilityRole="button"
      accessibilityLabel={`${post.loja_nome} — ${post.descricao}`}
      accessibilityHint="Toque para abrir a loja, toque longo para remover"
      style={[
        {
          width: TILE_W,
          height: TILE_H,
          borderRadius: radius.lg,
          overflow: 'hidden',
          backgroundColor: colors.surfaceDark,
        },
        shadow.soft,
      ]}
    >
      {imagem ? (
        <Image
          source={{ uri: imagem }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { alignItems: 'center', justifyContent: 'center' },
          ]}
        >
          <Text
            style={{
              fontSize: 72,
              fontWeight: '900',
              color: colors.accentSoft,
              letterSpacing: -2,
            }}
          >
            {post.loja_inicial}
          </Text>
        </View>
      )}

      {/* Véu inferior: o nome da loja precisa ler sobre qualquer foto.
          rgba literal é o caso documentado em 01-tokens.md §11. */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '52%',
        }}
        pointerEvents="none"
      >
        {[0, 0.06, 0.16, 0.3, 0.5, 0.68].map((opacidade, i) => (
          <View
            key={i}
            style={{ flex: 1, backgroundColor: `rgba(0,0,0,${opacidade})` }}
          />
        ))}
      </View>

      {/* Coração aceso: é o que diz "isto está salvo" sem virar botão —
          remover é o toque longo, para o toque abrir a loja. */}
      <View
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: 'rgba(0,0,0,0.4)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ConsumerIcon name="heart" size={15} color={colors.danger} strokeWidth={2.3} />
      </View>

      {post.tipo === 'video' && (
        <View
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: 'rgba(0,0,0,0.4)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ConsumerIcon name="play" size={13} color={colors.white} />
        </View>
      )}

      <View
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 12,
          gap: 6,
        }}
      >
        {post.produto && (
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: colors.accent,
              borderRadius: radius.pill,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.ink }}>
              {formatarReais(post.produto.preco)}
            </Text>
          </View>
        )}

        <Text
          style={{ fontSize: 13, fontWeight: '800', color: colors.white }}
          numberOfLines={1}
        >
          {post.loja_nome}
        </Text>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '600',
            color: 'rgba(255,255,255,0.7)',
          }}
          numberOfLines={1}
        >
          {tempoRelativo(post.publicado_em)}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

function EsqueletoGrade() {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: VAO,
        paddingHorizontal: MARGEM,
        paddingTop: 8,
      }}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} largura={TILE_W} altura={TILE_H} raio={radius.lg} />
      ))}
    </View>
  )
}
