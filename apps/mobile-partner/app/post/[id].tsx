import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useVideoPlayer, VideoView } from 'expo-video'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { normalizarTag } from '@/lib/conteudo'
import {
  alternarVisibilidade,
  atualizarPost,
  badgeDoPost,
  removerPost,
  type Post,
} from '@/lib/posts'
import { BotaoPrimario, CabecalhoTela, Cartao, Legenda } from '@/components/Basicos'
import { PartnerIcon } from '@/components/PartnerIcon'
import { partnerDesign, softColor, formatarMomentoCurto } from '@/lib/partner-design'

// Detalhe/edição de um post — métricas SOMENTE LEITURA (quem incrementa
// é o consumer); editável: descrição, tags, visibilidade; remover = soft
// delete com confirmação dupla. Mídia não se troca (publicar outro).
// docs/partner-app/10.

export default function TelaPost() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { lojaAtivaId } = useAuthStore()
  const [post, setPost] = useState<Post | null>(null)
  const [descricao, setDescricao] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagAtual, setTagAtual] = useState('')
  const [salvando, setSalvando] = useState(false)
  const { colors, radius, spacing, typography } = partnerDesign

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from('store_posts')
      .select(
        'id, store_id, tipo, media_url, media_path, thumb_url, thumb_path, descricao, tags, product_id, status, moderacao, duracao_seg, curtidas, comentarios, views, criado_em, publicado_em'
      )
      .eq('id', String(id))
      .single()

    if (!data) {
      Alert.alert('Post não encontrado')
      router.back()
      return
    }
    const p = data as Post
    setPost(p)
    setDescricao(p.descricao ?? '')
    setTags(p.tags ?? [])
  }, [id])

  useFocusEffect(
    useCallback(() => {
      void carregar()
    }, [carregar])
  )

  if (!post) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    )
  }

  const badge = badgeDoPost(post)
  const oculto = post.status === 'hidden'

  async function handleSalvar() {
    if (!post || salvando) return
    setSalvando(true)
    const r = await atualizarPost(post.id, { descricao: descricao.trim() || null, tags })
    setSalvando(false)
    if (r.erro) Alert.alert('Não foi possível salvar', r.erro)
    else Alert.alert('Alterações salvas')
  }

  async function handleVisibilidade(novoOculto: boolean) {
    if (!post) return
    setPost({ ...post, status: novoOculto ? 'hidden' : 'published' })
    const r = await alternarVisibilidade(post.id, novoOculto)
    if (r.erro) {
      setPost({ ...post, status: post.status })
      Alert.alert('Não foi possível atualizar', r.erro)
    }
  }

  function handleRemover() {
    // Confirmação dupla (docs/partner-app/10)
    Alert.alert('Remover post', 'Ele some do Explorar imediatamente.', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Continuar',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Tem certeza?', 'Essa ação não pode ser desfeita.', [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Remover de vez',
              style: 'destructive',
              onPress: async () => {
                if (!post) return
                const r = await removerPost(post)
                if (r.erro) Alert.alert('Não foi possível remover', r.erro)
                else router.back()
              },
            },
          ]),
      },
    ])
  }

  function adicionarTag() {
    const t = normalizarTag(tagAtual)
    if (!t || tags.includes(t)) { setTagAtual(''); return }
    if (tags.length >= 5) { Alert.alert('Máximo de 5 tags'); return }
    setTags([...tags, t])
    setTagAtual('')
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: 48 }}>
          <CabecalhoTela titulo="Post">
            <View
              style={{
                backgroundColor: softColor(colors[badge.corKey]),
                borderRadius: radius.pill,
                paddingVertical: 5,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ color: colors.ink, fontSize: typography.bodySm.size, fontWeight: '800' }}>
                {badge.rotulo}
              </Text>
            </View>
          </CabecalhoTela>

          {/* Mídia */}
          {post.tipo === 'video' ? (
            <PreviewVideo uri={post.media_url} />
          ) : (
            <Image
              source={{ uri: post.media_url }}
              style={{
                width: '62%',
                aspectRatio: 9 / 16,
                alignSelf: 'center',
                borderRadius: radius.md,
                backgroundColor: colors.surfaceMuted,
                marginBottom: spacing.lg,
              }}
              resizeMode="cover"
            />
          )}

          {/* Métricas — somente leitura */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
            <Metrica icone="eye" rotulo="Views" valor={post.views} />
            <Metrica icone="star" rotulo="Curtidas" valor={post.curtidas} />
            <Metrica icone="chat" rotulo="Comentários" valor={post.comentarios} />
          </View>
          <Text style={{ color: colors.inkSoft, fontSize: typography.bodySm.size, textAlign: 'center', marginTop: -spacing.sm, marginBottom: spacing.lg }}>
            {post.publicado_em ? `Publicado ${formatarMomentoCurto(post.publicado_em)}` : 'Ainda não publicado'}
            {post.tipo === 'video' && post.duracao_seg ? ` · ${post.duracao_seg}s` : ''}
          </Text>

          {/* Visibilidade */}
          <Cartao>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.ink, fontWeight: '700', fontSize: typography.bodyLg.size }}>
                  Visível no Explorar
                </Text>
                <Text style={{ color: colors.inkMuted, fontSize: typography.bodySm.size }}>
                  Ocultar tira do feed na hora, sem apagar.
                </Text>
              </View>
              <Switch
                value={!oculto}
                onValueChange={(visivel) => void handleVisibilidade(!visivel)}
                trackColor={{ true: colors.accentStrong, false: colors.canvasAlt }}
                thumbColor={colors.white}
              />
            </View>
          </Cartao>

          {/* Edição */}
          <Legenda>Legenda</Legenda>
          <Cartao>
            <TextInput
              value={descricao}
              onChangeText={(t) => setDescricao(t.slice(0, 600))}
              placeholder="Sem legenda"
              placeholderTextColor={colors.inkSoft}
              multiline
              style={{
                backgroundColor: colors.surfaceMuted,
                borderRadius: radius.sm,
                padding: 12,
                minHeight: 76,
                textAlignVertical: 'top',
                color: colors.ink,
                fontSize: typography.bodyLg.size,
                marginBottom: spacing.sm,
              }}
            />
            <Text style={{ color: colors.inkSoft, fontSize: typography.micro.size, textAlign: 'right' }}>
              {descricao.length}/600
            </Text>
          </Cartao>

          <Legenda>{`Tags · ${tags.length}/5`}</Legenda>
          <Cartao>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: tags.length ? spacing.sm : 0 }}>
              {tags.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTags(tags.filter((x) => x !== t))}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.accentSoft,
                    borderRadius: radius.pill,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    gap: 6,
                  }}
                >
                  <Text style={{ color: colors.ink, fontWeight: '700', fontSize: typography.bodySm.size }}>#{t}</Text>
                  <Text style={{ color: colors.inkSoft, fontWeight: '800' }}>×</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TextInput
                value={tagAtual}
                onChangeText={setTagAtual}
                onSubmitEditing={adicionarTag}
                placeholder="Adicionar tag…"
                placeholderTextColor={colors.inkSoft}
                autoCapitalize="none"
                style={{
                  flex: 1,
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radius.sm,
                  paddingHorizontal: 12,
                  height: 44,
                  color: colors.ink,
                }}
              />
              <TouchableOpacity
                onPress={adicionarTag}
                activeOpacity={0.8}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.sm,
                  backgroundColor: colors.surfaceMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PartnerIcon name="plus" size={18} color={colors.ink} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          </Cartao>

          <BotaoPrimario rotulo="Salvar alterações" onPress={() => void handleSalvar()} carregando={salvando} />
          <BotaoPrimario rotulo="Remover post" onPress={handleRemover} destrutivo />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

function PreviewVideo({ uri }: { uri: string }) {
  const { colors, radius, spacing } = partnerDesign
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true
    p.muted = true
    p.play()
  })
  return (
    <VideoView
      player={player}
      style={{
        width: '62%',
        aspectRatio: 9 / 16,
        alignSelf: 'center',
        borderRadius: radius.md,
        backgroundColor: colors.surfaceMuted,
        marginBottom: spacing.lg,
        overflow: 'hidden',
      }}
      contentFit="cover"
      nativeControls={false}
    />
  )
}

function Metrica({ icone, rotulo, valor }: { icone: 'eye' | 'star' | 'chat'; rotulo: string; valor: number }) {
  const { colors, radius, spacing, typography } = partnerDesign
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        alignItems: 'center',
        gap: 3,
      }}
    >
      <PartnerIcon name={icone} size={16} color={colors.inkMuted} />
      <Text style={{ color: colors.ink, fontSize: typography.h3.size, fontWeight: '800' }}>{valor}</Text>
      <Text style={{ color: colors.inkSoft, fontSize: typography.micro.size, fontWeight: '700', textTransform: 'uppercase' }}>
        {rotulo}
      </Text>
    </View>
  )
}
