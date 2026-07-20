import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useVideoPlayer, VideoView } from 'expo-video'
import { formatarReais, tenantPodePublicar } from '@mallevo/lib'
import { useAuthStore } from '@/store/useAuthStore'
import { useUploadStore } from '@/store/useUploadStore'
import {
  buscarProdutosLoja,
  normalizarTag,
  publicarPost,
  type MidiaCapturada,
  type ProdutoBusca,
} from '@/lib/conteudo'
import { CameraCaptura } from '@/components/CameraCaptura'
import { GatePublicacao } from '@/components/GatePublicacao'
import { SeletorLoja } from '@/components/SeletorLoja'
import { PartnerIcon } from '@/components/PartnerIcon'
import { partnerDesign } from '@/lib/partner-design'

// Publicar — captura (câmera/galeria, foto+vídeo) → preview + detalhes
// (legenda ≤600, tags ≤5, produto opcional) → upload (TUS p/ vídeo) →
// publicado. Base dark como o Explorar. docs/partner-app/09.

export default function TelaPublicar() {
  const { tenant, lojaAtivaId } = useAuthStore()
  const upload = useUploadStore()
  const [cameraAberta, setCameraAberta] = useState(false)
  const [midia, setMidia] = useState<MidiaCapturada | null>(null)
  const [descricao, setDescricao] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagAtual, setTagAtual] = useState('')
  const [produto, setProduto] = useState<ProdutoBusca | null>(null)
  const [buscaProduto, setBuscaProduto] = useState('')
  const [resultados, setResultados] = useState<ProdutoBusca[]>([])
  const [buscando, setBuscando] = useState(false)
  const { colors, radius, spacing, typography } = partnerDesign

  // Busca de produto (debounce simples)
  useEffect(() => {
    if (!buscando || !lojaAtivaId) return
    const t = setTimeout(() => {
      void buscarProdutosLoja(lojaAtivaId, buscaProduto).then(setResultados)
    }, 250)
    return () => clearTimeout(t)
  }, [buscaProduto, buscando, lojaAtivaId])

  if (tenant && !tenantPodePublicar(tenant)) {
    return <GatePublicacao />
  }

  async function escolherDaGaleria() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permissão negada', 'Autorize o acesso à galeria nos ajustes.')
      return
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      videoMaxDuration: 60,
      allowsEditing: false,
      quality: 1,
    })
    if (r.canceled || !r.assets[0]) return
    const a = r.assets[0]
    const ehVideo = a.type === 'video'
    if (ehVideo && a.duration && a.duration > 61_000) {
      Alert.alert('Vídeo muito longo', 'O limite do Explorar é 60 segundos — corte o vídeo e tente de novo.')
      return
    }
    setMidia({
      tipo: ehVideo ? 'video' : 'foto',
      uri: a.uri,
      duracaoSeg: ehVideo && a.duration ? Math.min(60, Math.max(1, Math.round(a.duration / 1000))) : null,
      largura: a.width ?? null,
      altura: a.height ?? null,
    })
  }

  function adicionarTag() {
    const t = normalizarTag(tagAtual)
    if (!t) return
    if (tags.includes(t)) { setTagAtual(''); return }
    if (tags.length >= 5) {
      Alert.alert('Máximo de 5 tags')
      return
    }
    setTags([...tags, t])
    setTagAtual('')
  }

  async function handlePublicar() {
    if (!tenant || !lojaAtivaId || !midia) return
    if (upload.estado === 'comprimindo' || upload.estado === 'enviando' || upload.estado === 'criando-registro') return

    const r = await publicarPost(tenant.id, lojaAtivaId, midia, {
      descricao,
      tags,
      productId: produto?.id ?? null,
    })

    if (r.erro) {
      Alert.alert('Não foi possível publicar', r.erro)
    }
  }

  function limparTudo() {
    upload.resetar()
    setMidia(null)
    setDescricao('')
    setTags([])
    setTagAtual('')
    setProduto(null)
    setBuscaProduto('')
    setBuscando(false)
  }

  const enviando =
    upload.estado === 'comprimindo' ||
    upload.estado === 'enviando' ||
    upload.estado === 'criando-registro'

  // ————— Tela de sucesso —————
  if (upload.estado === 'concluido') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'] }}>
        <StatusBar style="light" />
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: radius.pill,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.xl,
          }}
        >
          <PartnerIcon name="gallery" size={30} color={colors.ink} strokeWidth={2.2} />
        </View>
        <Text style={{ color: colors.white, fontSize: typography.h2.size, fontWeight: '800', marginBottom: 6 }}>
          Publicado!
        </Text>
        <Text style={{ color: '#A4A7AD', textAlign: 'center', marginBottom: spacing['3xl'] }}>
          Seu post já está no Explorar dos clientes.
        </Text>
        <TouchableOpacity
          onPress={() => {
            limparTudo()
            router.push('/(tabs)/conteudo')
          }}
          activeOpacity={0.85}
          style={{
            height: 54,
            minWidth: 240,
            borderRadius: radius.pill,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.sm,
          }}
        >
          <Text style={{ color: colors.ink, fontWeight: '800' }}>Ver em Meu conteúdo</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={limparTudo} activeOpacity={0.7} style={{ height: 46, justifyContent: 'center' }}>
          <Text style={{ color: colors.white, fontWeight: '700' }}>Publicar outro</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ————— Passo 1: escolher origem —————
  if (!midia) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.ink }}>
        <StatusBar style="light" />
        <View style={{ paddingTop: 72, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, color: colors.white, fontSize: typography.h1.size, fontWeight: '800', letterSpacing: -0.5 }}>
            Publicar
          </Text>
          <SeletorLoja />
        </View>
        <Text style={{ color: '#A4A7AD', paddingHorizontal: spacing.lg, marginTop: 4 }}>
          Fotos e vídeos de até 60s no Explorar dos seus clientes.
        </Text>

        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg, gap: spacing.md }}>
          <OpcaoCaptura
            icone="camera"
            titulo="Câmera"
            descricao="Fotografe ou grave agora"
            onPress={() => setCameraAberta(true)}
          />
          <OpcaoCaptura
            icone="gallery"
            titulo="Galeria"
            descricao="Escolha algo já salvo"
            onPress={() => void escolherDaGaleria()}
          />
        </View>

        <CameraCaptura
          visivel={cameraAberta}
          fechar={() => setCameraAberta(false)}
          capturado={(m) => {
            setCameraAberta(false)
            setMidia(m)
          }}
        />
      </View>
    )
  }

  // ————— Passo 2/3: preview + detalhes + envio —————
  return (
    <View style={{ flex: 1, backgroundColor: colors.ink }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: 140 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
            <TouchableOpacity
              onPress={() => (enviando ? null : setMidia(null))}
              activeOpacity={0.7}
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.pill,
                backgroundColor: colors.surfaceDarkSoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.md,
                opacity: enviando ? 0.4 : 1,
              }}
            >
              <PartnerIcon name="back" size={18} color={colors.white} />
            </TouchableOpacity>
            <Text style={{ flex: 1, color: colors.white, fontSize: typography.h2.size, fontWeight: '800' }}>
              Novo post
            </Text>
          </View>

          {/* Preview */}
          <PreviewMidia midia={midia} />

          {/* Legenda */}
          <Rotulo texto={`Legenda · ${descricao.length}/600`} />
          <TextInput
            value={descricao}
            onChangeText={(t) => setDescricao(t.slice(0, 600))}
            placeholder="Conte sobre esse produto ou momento…"
            placeholderTextColor={colors.inkSoft}
            multiline
            editable={!enviando}
            style={{
              backgroundColor: colors.surfaceDarkSoft,
              borderRadius: radius.sm,
              padding: 14,
              minHeight: 84,
              textAlignVertical: 'top',
              color: colors.white,
              fontSize: typography.bodyLg.size,
              marginBottom: spacing.lg,
            }}
          />

          {/* Tags */}
          <Rotulo texto={`Tags · ${tags.length}/5`} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm }}>
            {tags.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => !enviando && setTags(tags.filter((x) => x !== t))}
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
                <Text style={{ color: colors.accent, fontWeight: '700', fontSize: typography.bodySm.size }}>
                  #{t}
                </Text>
                <Text style={{ color: colors.inkSoft, fontWeight: '800' }}>×</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
            <TextInput
              value={tagAtual}
              onChangeText={setTagAtual}
              onSubmitEditing={adicionarTag}
              placeholder="ex.: promocao"
              placeholderTextColor={colors.inkSoft}
              autoCapitalize="none"
              editable={!enviando && tags.length < 5}
              style={{
                flex: 1,
                backgroundColor: colors.surfaceDarkSoft,
                borderRadius: radius.sm,
                paddingHorizontal: 14,
                height: 46,
                color: colors.white,
                fontSize: typography.bodyLg.size,
              }}
            />
            <TouchableOpacity
              onPress={adicionarTag}
              disabled={enviando || tags.length >= 5}
              activeOpacity={0.8}
              style={{
                width: 46,
                height: 46,
                borderRadius: radius.sm,
                backgroundColor: colors.surfaceDarkSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PartnerIcon name="plus" size={18} color={colors.accent} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          {/* Produto vinculado */}
          <Rotulo texto="Produto (opcional)" />
          {produto ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surfaceDarkSoft,
                borderRadius: radius.sm,
                padding: spacing.md,
                marginBottom: spacing.lg,
                gap: spacing.md,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.white, fontWeight: '700' }}>{produto.nome}</Text>
                <Text style={{ color: colors.accent, fontSize: typography.bodySm.size, fontWeight: '700' }}>
                  {formatarReais(produto.preco)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => !enviando && setProduto(null)} activeOpacity={0.7}>
                <Text style={{ color: colors.inkSoft, fontWeight: '800', fontSize: 18 }}>×</Text>
              </TouchableOpacity>
            </View>
          ) : buscando ? (
            <View style={{ marginBottom: spacing.lg }}>
              <TextInput
                value={buscaProduto}
                onChangeText={setBuscaProduto}
                placeholder="Buscar produto da loja…"
                placeholderTextColor={colors.inkSoft}
                autoFocus
                style={{
                  backgroundColor: colors.surfaceDarkSoft,
                  borderRadius: radius.sm,
                  paddingHorizontal: 14,
                  height: 46,
                  color: colors.white,
                  fontSize: typography.bodyLg.size,
                  marginBottom: spacing.sm,
                }}
              />
              {resultados.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => {
                    setProduto(p)
                    setBuscando(false)
                  }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.lineDark,
                    gap: spacing.md,
                  }}
                >
                  <Text style={{ flex: 1, color: colors.white, fontWeight: '600' }}>{p.nome}</Text>
                  <Text style={{ color: colors.inkSoft, fontSize: typography.bodySm.size }}>
                    {formatarReais(p.preco)}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setBuscando(false)} activeOpacity={0.7} style={{ paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ color: colors.inkSoft, fontWeight: '700' }}>Fechar busca</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setBuscando(true)}
              disabled={enviando}
              activeOpacity={0.7}
              style={{
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: colors.lineDark,
                borderRadius: radius.sm,
                paddingVertical: 13,
                alignItems: 'center',
                marginBottom: spacing.lg,
              }}
            >
              <Text style={{ color: colors.inkSoft, fontWeight: '700' }}>+ Vincular produto da loja</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Rodapé: publicar / progresso */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: spacing.lg,
            paddingBottom: spacing['3xl'],
            backgroundColor: colors.ink,
            borderTopWidth: 1,
            borderTopColor: colors.lineDark,
          }}
        >
          {enviando ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 }}>
                <ActivityIndicator color={colors.accent} />
                <Text style={{ flex: 1, color: colors.white, fontWeight: '700' }}>
                  {upload.estado === 'comprimindo'
                    ? 'Preparando mídia…'
                    : upload.estado === 'enviando'
                      ? `Enviando ${Math.round(upload.progresso * 100)}%`
                      : 'Finalizando…'}
                </Text>
                {upload.estado === 'enviando' && upload.cancelarAtual && (
                  <TouchableOpacity onPress={() => upload.cancelarAtual?.()} activeOpacity={0.7}>
                    <Text style={{ color: colors.danger, fontWeight: '800' }}>Cancelar</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ height: 6, backgroundColor: colors.surfaceDarkSoft, borderRadius: radius.pill }}>
                <View
                  style={{
                    width: `${Math.round(upload.progresso * 100)}%`,
                    height: 6,
                    borderRadius: radius.pill,
                    backgroundColor: colors.accent,
                  }}
                />
              </View>
              <Text style={{ color: colors.inkSoft, fontSize: typography.micro.size, marginTop: 6 }}>
                Mantenha o app aberto — se a rede cair, o envio retoma de onde parou.
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => void handlePublicar()}
              activeOpacity={0.85}
              style={{
                height: 54,
                borderRadius: radius.pill,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 15 }}>
                Publicar no Explorar
              </Text>
            </TouchableOpacity>
          )}
          {upload.estado === 'erro' && upload.erro ? (
            <TouchableOpacity onPress={() => void handlePublicar()} activeOpacity={0.7} style={{ marginTop: 8 }}>
              <Text style={{ color: colors.danger, fontSize: typography.bodySm.size, textAlign: 'center' }}>
                {upload.erro} — tocar para tentar de novo
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

// ————— Auxiliares —————

function PreviewMidia({ midia }: { midia: MidiaCapturada }) {
  const { colors, radius, spacing } = partnerDesign

  if (midia.tipo === 'foto') {
    return (
      <Image
        source={{ uri: midia.uri }}
        style={{
          width: '62%',
          aspectRatio: 9 / 16,
          alignSelf: 'center',
          borderRadius: radius.md,
          backgroundColor: colors.surfaceDarkSoft,
          marginBottom: spacing.lg,
        }}
        resizeMode="cover"
      />
    )
  }
  return <PreviewVideo uri={midia.uri} />
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
        backgroundColor: colors.surfaceDarkSoft,
        marginBottom: spacing.lg,
        overflow: 'hidden',
      }}
      contentFit="cover"
      nativeControls={false}
    />
  )
}

function Rotulo({ texto }: { texto: string }) {
  const { colors, spacing, typography } = partnerDesign
  return (
    <Text
      style={{
        color: colors.inkSoft,
        fontSize: typography.micro.size,
        fontWeight: typography.micro.weight,
        letterSpacing: typography.micro.tracking,
        textTransform: 'uppercase',
        marginBottom: spacing.sm,
      }}
    >
      {texto}
    </Text>
  )
}

function OpcaoCaptura({
  icone,
  titulo,
  descricao,
  onPress,
}: {
  icone: 'camera' | 'gallery'
  titulo: string
  descricao: string
  onPress: () => void
}) {
  const { colors, radius, spacing, typography } = partnerDesign
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceDarkSoft,
        borderRadius: radius.md,
        padding: spacing.xl,
        gap: spacing.lg,
      }}
    >
      <View
        style={{
          width: 54,
          height: 54,
          borderRadius: radius.sm,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PartnerIcon name={icone} size={24} color={colors.ink} strokeWidth={2.1} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.white, fontSize: typography.h3.size, fontWeight: '700' }}>
          {titulo}
        </Text>
        <Text style={{ color: '#A4A7AD', fontSize: typography.body.size }}>{descricao}</Text>
      </View>
    </TouchableOpacity>
  )
}
