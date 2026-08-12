import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { useVideoPlayer, VideoView } from 'expo-video'
import { formatarReais } from '@mallevo/lib'
import { BotaoSeguir } from '@/components/BotaoSeguir'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign, tempoRelativo } from '@/lib/consumer-design'
import { compartilharPost, formatarContagem, type Post } from '@/lib/posts'
import { useComentariosDoPost } from '@/store/useComentarios'
import { useCurtida } from '@/store/useFavoritos'

/**
 * Card de post no feed Seguindo.
 *
 * Deliberadamente o OPOSTO do Explorar: lá o post ocupa a tela inteira e o
 * conteúdo flutua sobre o vídeo; aqui ele é um cartão sobre `canvas`, com
 * cabeçalho, mídia e ações separados — feed de quem já escolheu quem segue,
 * feito para varrer, não para descobrir.
 *
 * Vídeo toca só quando o card é o mais visível da lista (`ativo`), sempre
 * respeitando o mudo global da tela.
 *
 * Spec: docs/system-design/consumer/07-telas.md §Seguindo
 */

const { colors, radius, shadow } = consumerDesign

const { width: W } = Dimensions.get('window')
const CARD_W = W - 32
// 4:5 — retrato de feed. Reel inteiro (9:16) tomaria a tela e apagaria a
// diferença entre este feed e o Explorar.
const MIDIA_H = Math.round(CARD_W * 1.25)

const JANELA_TOQUE_DUPLO = 280

interface Props {
  post: Post
  /** Card mais visível da lista — só ele toca vídeo. */
  ativo: boolean
  mutado: boolean
  onAlternarMudo: () => void
  /** Logo da loja (vem do fetch de `stores`); sem ela, cai na inicial. */
  logoUrl?: string | null
}

export function CardPost({
  post,
  ativo,
  mutado,
  onAlternarMudo,
  logoUrl,
}: Props) {
  // Curtir = favoritar: o coração salva o post na tela Favoritos.
  const { favorito, curtidas, alternar, favoritar } = useCurtida(post)
  // Comentários escritos no app entram por cima do contador da view.
  const escritos = useComentariosDoPost(post.id)
  const [expandido, setExpandido] = useState(false)

  const escalaCoracao = useRef(new Animated.Value(1)).current
  const explosao = useRef(new Animated.Value(0)).current
  const ultimoToque = useRef(0)

  const ehVideo = post.tipo === 'video'
  // Foto não instancia player (source null) — mesmo hook, sem custo.
  const player = useVideoPlayer(ehVideo ? post.media_url : null, (p) => {
    p.loop = true
    p.muted = mutado
  })

  useEffect(() => {
    if (!ehVideo) return
    if (ativo) {
      player.play()
    } else {
      player.pause()
      player.currentTime = 0
    }
  }, [ativo, ehVideo])

  useEffect(() => {
    if (ehVideo) player.muted = mutado
  }, [mutado, ehVideo])

  function pulsarCoracao() {
    Animated.sequence([
      Animated.spring(escalaCoracao, {
        toValue: 1.4,
        damping: 6,
        stiffness: 220,
        useNativeDriver: true,
      }),
      Animated.spring(escalaCoracao, {
        toValue: 1,
        damping: 10,
        stiffness: 180,
        useNativeDriver: true,
      }),
    ]).start()
  }

  function alternarCurtida() {
    pulsarCoracao()
    alternar()
  }

  /** Toque duplo na mídia curte (e nunca descurte) — gesto de feed. */
  function aoTocarMidia() {
    const agora = Date.now()
    const duplo = agora - ultimoToque.current < JANELA_TOQUE_DUPLO
    ultimoToque.current = duplo ? 0 : agora
    if (!duplo) return

    if (!favorito) {
      favoritar()
      pulsarCoracao()
    }

    explosao.setValue(0)
    Animated.sequence([
      Animated.spring(explosao, {
        toValue: 1,
        damping: 8,
        stiffness: 180,
        useNativeDriver: true,
      }),
      Animated.timing(explosao, {
        toValue: 0,
        duration: 260,
        delay: 180,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const abrirLoja = () => router.push(`/loja/${post.loja_slug}`)

  return (
    <View
      style={[
        {
          width: CARD_W,
          marginHorizontal: 16,
          marginBottom: 20,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          overflow: 'hidden',
        },
        shadow.soft,
      ]}
    >
      {/* Cabeçalho */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <TouchableOpacity
          onPress={abrirLoja}
          activeOpacity={consumerDesign.opacity.pressedSoft}
        >
          <Avatar nome={post.loja_inicial} logoUrl={logoUrl} tamanho={40} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={abrirLoja}
          activeOpacity={consumerDesign.opacity.pressedSoft}
          style={{ flex: 1 }}
        >
          <Text
            style={{ fontSize: 14.5, fontWeight: '800', color: colors.ink }}
            numberOfLines={1}
          >
            {post.loja_nome}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '500',
              color: colors.inkSoft,
              marginTop: 1,
            }}
          >
            {tempoRelativo(post.publicado_em)}
          </Text>
        </TouchableOpacity>

        <BotaoSeguir
          loja={{ slug: post.loja_slug, nome: post.loja_nome }}
          variante="claro"
          tamanho="sm"
        />
      </View>

      {/* Mídia */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={aoTocarMidia}
        style={{ width: CARD_W, height: MIDIA_H, backgroundColor: colors.surfaceDark }}
      >
        {ehVideo ? (
          <VideoView
            player={player}
            style={{ width: CARD_W, height: MIDIA_H }}
            contentFit="cover"
            nativeControls={false}
          />
        ) : (
          <Image
            source={{ uri: post.media_url }}
            style={{ width: CARD_W, height: MIDIA_H }}
            resizeMode="cover"
          />
        )}

        {/* Coração do toque duplo */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: explosao,
            transform: [
              {
                scale: explosao.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
              },
            ],
          }}
          pointerEvents="none"
        >
          <ConsumerIcon
            name="heart"
            size={92}
            color={colors.white}
            strokeWidth={1.6}
          />
        </Animated.View>

        {ehVideo && (
          <>
            <TouchableOpacity
              onPress={onAlternarMudo}
              activeOpacity={consumerDesign.opacity.pressedSoft}
              style={{
                position: 'absolute',
                right: 12,
                bottom: 12,
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: 'rgba(0,0,0,0.45)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ConsumerIcon
                name={mutado ? 'volume-off' : 'volume'}
                size={16}
                color={colors.white}
              />
            </TouchableOpacity>

            {post.duracao_seg ? (
              <View
                style={{
                  position: 'absolute',
                  left: 12,
                  bottom: 12,
                  borderRadius: 6,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  backgroundColor: 'rgba(0,0,0,0.45)',
                }}
              >
                <Text
                  style={{ color: colors.white, fontSize: 10, fontWeight: '800' }}
                >
                  {post.duracao_seg}s
                </Text>
              </View>
            ) : null}
          </>
        )}
      </TouchableOpacity>

      {/* Ações */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 18,
          paddingHorizontal: 14,
          paddingTop: 12,
        }}
      >
        <TouchableOpacity
          onPress={alternarCurtida}
          activeOpacity={consumerDesign.opacity.pressedSoft}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          accessibilityRole="button"
          accessibilityLabel={
            favorito ? 'Remover dos favoritos' : 'Curtir e salvar nos favoritos'
          }
        >
          <Animated.View style={{ transform: [{ scale: escalaCoracao }] }}>
            <ConsumerIcon
              name="heart"
              size={22}
              color={favorito ? colors.danger : colors.ink}
              strokeWidth={favorito ? 2.2 : 1.9}
            />
          </Animated.View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
            {formatarContagem(curtidas)}
          </Text>
        </TouchableOpacity>

        {/* Contador, não botão: comentários ainda não têm tela (igual ao
            Explorar, que também só exibe o número). */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <ConsumerIcon name="comment" size={22} color={colors.inkMuted} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.inkMuted }}>
            {formatarContagem(post.comentarios + (escritos?.length ?? 0))}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => void compartilharPost(post)}
          activeOpacity={consumerDesign.opacity.pressedSoft}
          accessibilityRole="button"
          accessibilityLabel="Compartilhar"
        >
          <ConsumerIcon name="send" size={22} color={colors.ink} />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        {post.produto && (
          <TouchableOpacity
            onPress={abrirLoja}
            activeOpacity={consumerDesign.opacity.pressed}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: colors.accent,
              borderRadius: radius.pill,
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <ConsumerIcon name="bag" size={14} color={colors.ink} strokeWidth={2.1} />
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.ink }}>
              {formatarReais(post.produto.preco)}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Legenda */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setExpandido((v) => !v)}
        style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14, gap: 6 }}
      >
        <Text
          style={{
            fontSize: 13.5,
            lineHeight: 19,
            color: colors.ink,
            fontWeight: '500',
          }}
          numberOfLines={expandido ? undefined : 2}
        >
          <Text style={{ fontWeight: '800' }}>{post.loja_nome}</Text>{' '}
          {post.descricao}
        </Text>

        {post.tags.length > 0 && (
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inkSoft }}>
            {post.tags.join('  ')}
          </Text>
        )}

        {post.produto && (
          <Text
            style={{ fontSize: 12.5, fontWeight: '600', color: colors.inkMuted }}
            numberOfLines={1}
          >
            {post.produto.nome}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

/** Avatar redondo da loja: logo quando existe, inicial quando não. */
export function Avatar({
  nome,
  logoUrl,
  tamanho,
}: {
  nome: string
  logoUrl?: string | null
  tamanho: number
}) {
  if (logoUrl) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={{
          width: tamanho,
          height: tamanho,
          borderRadius: tamanho / 2,
          backgroundColor: colors.canvasAlt,
        }}
        resizeMode="cover"
      />
    )
  }

  return (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho / 2,
        backgroundColor: colors.ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: colors.accent,
          fontWeight: '800',
          fontSize: tamanho * 0.42,
        }}
      >
        {(nome || '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  )
}
