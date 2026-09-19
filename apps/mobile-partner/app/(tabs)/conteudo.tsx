import { useCallback, useMemo, useState } from 'react'
import { Alert, Dimensions, Image, Text, TouchableOpacity, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { tenantPodePublicar } from '@mallevo/lib'
import { useAuthStore } from '@/store/useAuthStore'
import {
  badgeDoPost,
  descartarOrfaos,
  detectarOrfaos,
  listarPosts,
  type Post,
} from '@/lib/posts'
import { GatePublicacao } from '@/components/GatePublicacao'
import { SeletorLoja } from '@/components/SeletorLoja'
import { PartnerIcon } from '@/components/PartnerIcon'
import { TelaMarquise } from '@/components/marquise/TelaMarquise'
import { PilulaVidro, Portaria, Statement } from '@/components/marquise/Marquise'
import { SecaoFolha, CartaoFolha } from '@/components/ui/SecaoFolha'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { partnerDesign, softColor } from '@/lib/partner-design'

/**
 * Meu conteúdo — o que a loja publicou no Explorar, na arquitetura
 * marquise + folha: MARQUISE com o statement, a contagem e os filtros em
 * pílulas de vidro; FOLHA com a grade (3 colunas, thumb real, badge de
 * estado só quando não publicado) e o aviso de uploads órfãos.
 * docs/partner-app/10 · docs/system-design/partner/01-telas.md §4
 */

type FiltroTipo = 'todos' | 'video' | 'foto'

const LARGURA = Dimensions.get('window').width
const COLUNAS = 3
const GAP = 6
const GUTTER = 16

const { colors, radius } = partnerDesign

export default function TelaConteudo() {
  const { tenant, lojaAtivaId, lojas } = useAuthStore()
  const [posts, setPosts] = useState<Post[]>([])
  const [carregando, setCarregando] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos')
  const [soLojaAtiva, setSoLojaAtiva] = useState(true)
  const [orfaos, setOrfaos] = useState<string[]>([])

  const carregar = useCallback(async () => {
    if (!tenant) return
    setCarregando(true)
    const lista = await listarPosts()
    setPosts(lista)
    if (lojaAtivaId) {
      setOrfaos(await detectarOrfaos(tenant.id, lojaAtivaId, lista))
    }
    setCarregando(false)
  }, [tenant?.id, lojaAtivaId])

  useFocusEffect(
    useCallback(() => {
      void carregar()
    }, [carregar]),
  )

  const daLoja = useMemo(
    () => posts.filter((p) => !soLojaAtiva || !lojaAtivaId || p.store_id === lojaAtivaId),
    [posts, soLojaAtiva, lojaAtivaId],
  )
  const filtrados = useMemo(
    () => daLoja.filter((p) => filtroTipo === 'todos' || p.tipo === filtroTipo),
    [daLoja, filtroTipo],
  )
  const videos = daLoja.filter((p) => p.tipo === 'video').length
  const fotos = daLoja.length - videos

  if (tenant && !tenantPodePublicar(tenant)) {
    return <GatePublicacao contexto="conteudo" />
  }

  function handleOrfaos() {
    Alert.alert(
      'Arquivos sem publicação',
      `${orfaos.length} arquivo(s) foram enviados mas a publicação não foi concluída. Deseja descartá-los?`,
      [
        { text: 'Manter', style: 'cancel' },
        {
          text: 'Descartar arquivos',
          style: 'destructive',
          onPress: async () => {
            const r = await descartarOrfaos(orfaos)
            if (r.erro) Alert.alert('Não foi possível descartar', r.erro)
            void carregar()
          },
        },
      ],
    )
  }

  const larguraCelula = (LARGURA - GUTTER * 2 - GAP * (COLUNAS - 1)) / COLUNAS

  const resumo =
    carregando && posts.length === 0
      ? 'Abrindo a galeria…'
      : daLoja.length === 0
        ? 'Nada publicado ainda.'
        : [
            `${daLoja.length} ${daLoja.length === 1 ? 'post' : 'posts'}`,
            videos > 0 ? `${videos} ${videos === 1 ? 'vídeo' : 'vídeos'}` : null,
            fotos > 0 ? `${fotos} ${fotos === 1 ? 'foto' : 'fotos'}` : null,
          ]
            .filter(Boolean)
            .join(' · ')

  return (
    <TelaMarquise
      refreshing={carregando}
      onRefresh={() => void carregar()}
      marquise={
        <>
          <Portaria esquerda={<SeletorLoja escuro />} />

          <Statement
            sobrelinha="Meu conteúdo"
            linha="O que sua loja"
            acento="mostrou ao shopping."
            sublinha={resumo}
          />

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              paddingHorizontal: 24,
              paddingTop: 20,
            }}
          >
            <PilulaVidro rotulo="Tudo" ativa={filtroTipo === 'todos'} aoTocar={() => setFiltroTipo('todos')} />
            <PilulaVidro
              rotulo="Vídeos"
              icone="play"
              ativa={filtroTipo === 'video'}
              aoTocar={() => setFiltroTipo('video')}
            />
            <PilulaVidro
              rotulo="Fotos"
              icone="camera"
              ativa={filtroTipo === 'foto'}
              aoTocar={() => setFiltroTipo('foto')}
            />
            {lojas.length > 1 && (
              <PilulaVidro
                rotulo={soLojaAtiva ? 'Só esta loja' : 'Todas as lojas'}
                icone="store"
                ativa={!soLojaAtiva}
                aoTocar={() => setSoLojaAtiva((v) => !v)}
              />
            )}
          </View>
        </>
      }
    >
      {orfaos.length > 0 && (
        <View style={{ paddingHorizontal: 16 }}>
          <TouchableOpacity
            onPress={handleOrfaos}
            activeOpacity={partnerDesign.opacity.pressedSoft}
            accessibilityRole="button"
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                padding: 14,
              },
              partnerDesign.shadow.soft,
            ]}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.sm,
                backgroundColor: softColor(colors.warning),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PartnerIcon name="info" size={18} color={colors.ink} />
            </View>
            <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: colors.ink, lineHeight: 18 }}>
              {orfaos.length} upload{orfaos.length === 1 ? '' : 's'} incompleto
              {orfaos.length === 1 ? '' : 's'} ocupando espaço
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.ink }}>Resolver ›</Text>
          </TouchableOpacity>
        </View>
      )}

      <SecaoFolha
        sobrelinha="Publicações"
        titulo="Galeria"
        direita={
          filtrados.length > 0 ? (
            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: colors.inkSoft }}>
              {filtrados.length} {filtrados.length === 1 ? 'POST' : 'POSTS'}
            </Text>
          ) : undefined
        }
      >
        {filtrados.length === 0 && !carregando ? (
          <CartaoFolha padding={0}>
            <EmptyState
              icone="gallery"
              titulo={daLoja.length === 0 ? 'Nenhum post ainda' : 'Nada com esse filtro'}
              descricao={
                daLoja.length === 0
                  ? 'Publique uma foto ou um vídeo de um produto e ele aparece no Explorar do shopping.'
                  : 'Troque o filtro na marquise para ver o resto.'
              }
              acao={
                daLoja.length === 0
                  ? { label: 'Publicar primeiro post', aoTocar: () => router.navigate('/(tabs)/publicar') }
                  : undefined
              }
            />
          </CartaoFolha>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
            {filtrados.map((p) => (
              <CelulaPost key={p.id} post={p} largura={larguraCelula} />
            ))}
          </View>
        )}
      </SecaoFolha>
    </TelaMarquise>
  )
}

/** Uma célula da grade: thumb full-bleed, pílulas de leitura sobre a foto. */
function CelulaPost({ post, largura }: { post: Post; largura: number }) {
  const badge = badgeDoPost(post)
  return (
    <TouchableOpacity
      activeOpacity={partnerDesign.opacity.pressed}
      onPress={() => router.push(`/post/${post.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${post.tipo === 'video' ? 'Vídeo' : 'Foto'}, ${post.views} visualizações, ${badge.rotulo}`}
      style={[
        {
          width: largura,
          aspectRatio: 9 / 14,
          borderRadius: radius.sm,
          overflow: 'hidden',
          backgroundColor: colors.surfaceMuted,
        },
        partnerDesign.shadow.soft,
      ]}
    >
      {post.thumb_url ? (
        <Image source={{ uri: post.thumb_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <PartnerIcon name="gallery" size={22} color={colors.inkSoft} />
        </View>
      )}

      {/* Duração do vídeo — pílula de vidro escuro sobre a mídia */}
      {post.tipo === 'video' && (
        <View
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.inkGlass,
            borderRadius: radius.pill,
            paddingVertical: 3,
            paddingHorizontal: 7,
            gap: 4,
          }}
        >
          <PartnerIcon name="play" size={9} color={colors.white} strokeWidth={2.4} />
          {post.duracao_seg ? (
            <Text style={{ color: colors.white, fontSize: 10, fontWeight: '700' }}>
              {post.duracao_seg}s
            </Text>
          ) : null}
        </View>
      )}

      {/* Views */}
      <View
        style={{
          position: 'absolute',
          bottom: 6,
          left: 6,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: colors.inkGlass,
          borderRadius: radius.pill,
          paddingVertical: 3,
          paddingHorizontal: 7,
        }}
      >
        <PartnerIcon name="eye" size={11} color={colors.white} strokeWidth={2.2} />
        <Text style={{ color: colors.white, fontSize: 10, fontWeight: '700' }}>{post.views}</Text>
      </View>

      {/* Estado — só quando não publicado */}
      {badge.rotulo !== 'Publicado' && (
        <View style={{ position: 'absolute', top: 6, left: 6 }}>
          <Badge rotulo={badge.rotulo} cor={colors[badge.corKey]} preenchido tamanho="sm" />
        </View>
      )}
    </TouchableOpacity>
  )
}
