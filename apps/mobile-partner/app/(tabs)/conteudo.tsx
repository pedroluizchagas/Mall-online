import { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
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
import { Chip } from '@/components/Basicos'
import { partnerDesign, softColor } from '@/lib/partner-design'

// Meu conteúdo — grade de posts (espelha a GaleriaGrid do Explorar, com
// thumb real), badges de estado, filtros por loja/tipo, órfãos.
// docs/partner-app/10.

type FiltroTipo = 'todos' | 'video' | 'foto'

const LARGURA = Dimensions.get('window').width
const COLUNAS = 3
const GAP = 4

export default function TelaConteudo() {
  const { tenant, lojaAtivaId, lojas } = useAuthStore()
  const [posts, setPosts] = useState<Post[]>([])
  const [carregando, setCarregando] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos')
  const [soLojaAtiva, setSoLojaAtiva] = useState(true)
  const [orfaos, setOrfaos] = useState<string[]>([])
  const { colors, radius, spacing, typography } = partnerDesign

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
    }, [carregar])
  )

  const filtrados = useMemo(
    () =>
      posts.filter((p) => {
        if (soLojaAtiva && lojaAtivaId && p.store_id !== lojaAtivaId) return false
        if (filtroTipo !== 'todos' && p.tipo !== filtroTipo) return false
        return true
      }),
    [posts, filtroTipo, soLojaAtiva, lojaAtivaId]
  )

  if (tenant && !tenantPodePublicar(tenant)) {
    return <GatePublicacao />
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
      ]
    )
  }

  const larguraCelula = (LARGURA - spacing.lg * 2 - GAP * (COLUNAS - 1)) / COLUNAS

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void carregar()} />}
        contentContainerStyle={{
          paddingTop: 72,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.tabBarHeight + spacing.lg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <Text
            style={{
              flex: 1,
              color: colors.ink,
              fontSize: typography.h1.size,
              fontWeight: typography.h1.weight,
              letterSpacing: typography.h1.tracking,
            }}
          >
            Meu conteúdo
          </Text>
          <SeletorLoja />
        </View>

        {/* Filtros */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm }}>
          <Chip rotulo="Tudo" ativo={filtroTipo === 'todos'} onPress={() => setFiltroTipo('todos')} />
          <Chip rotulo="Vídeos" ativo={filtroTipo === 'video'} onPress={() => setFiltroTipo('video')} />
          <Chip rotulo="Fotos" ativo={filtroTipo === 'foto'} onPress={() => setFiltroTipo('foto')} />
          {lojas.length > 1 && (
            <Chip
              rotulo={soLojaAtiva ? 'Só loja ativa' : 'Todas as lojas'}
              ativo={soLojaAtiva}
              onPress={() => setSoLojaAtiva((v) => !v)}
            />
          )}
        </View>

        {/* Órfãos */}
        {orfaos.length > 0 && (
          <TouchableOpacity
            onPress={handleOrfaos}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: softColor(colors.warning),
              borderRadius: radius.sm,
              padding: spacing.md,
              marginBottom: spacing.md,
              gap: spacing.sm,
            }}
          >
            <Text style={{ flex: 1, color: colors.ink, fontSize: typography.bodySm.size, fontWeight: '600' }}>
              {orfaos.length} upload(s) incompletos ocupando espaço
            </Text>
            <Text style={{ color: colors.ink, fontSize: typography.bodySm.size, fontWeight: '800', textDecorationLine: 'underline' }}>
              Resolver
            </Text>
          </TouchableOpacity>
        )}

        {/* Grade */}
        {filtrados.length === 0 && !carregando ? (
          <View style={{ alignItems: 'center', marginTop: spacing['4xl'] }}>
            <PartnerIcon name="gallery" size={34} color={colors.inkSoft} />
            <Text style={{ color: colors.inkMuted, fontSize: typography.bodyLg.size, fontWeight: '600', marginTop: spacing.md, marginBottom: spacing.lg }}>
              Nenhum post ainda
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/publicar')}
              activeOpacity={0.85}
              style={{
                height: 50,
                paddingHorizontal: spacing['2xl'],
                borderRadius: radius.pill,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.ink, fontWeight: '800' }}>Publicar primeiro post</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
            {filtrados.map((p) => {
              const badge = badgeDoPost(p)
              return (
                <TouchableOpacity
                  key={p.id}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/post/${p.id}`)}
                  style={{
                    width: larguraCelula,
                    aspectRatio: 9 / 14,
                    borderRadius: radius.sm,
                    overflow: 'hidden',
                    backgroundColor: colors.surfaceMuted,
                  }}
                >
                  {p.thumb_url ? (
                    <Image source={{ uri: p.thumb_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <PartnerIcon name="gallery" size={22} color={colors.inkSoft} />
                    </View>
                  )}

                  {/* Tipo + duração */}
                  {p.tipo === 'video' && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(17,18,22,0.75)',
                        borderRadius: radius.pill,
                        paddingVertical: 2,
                        paddingHorizontal: 7,
                        gap: 3,
                      }}
                    >
                      <Text style={{ color: colors.white, fontSize: 10, fontWeight: '800' }}>▶</Text>
                      {p.duracao_seg ? (
                        <Text style={{ color: colors.white, fontSize: 10, fontWeight: '700' }}>
                          {p.duracao_seg}s
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
                      gap: 3,
                      backgroundColor: 'rgba(17,18,22,0.75)',
                      borderRadius: radius.pill,
                      paddingVertical: 2,
                      paddingHorizontal: 7,
                    }}
                  >
                    <PartnerIcon name="eye" size={11} color={colors.white} strokeWidth={2.2} />
                    <Text style={{ color: colors.white, fontSize: 10, fontWeight: '700' }}>{p.views}</Text>
                  </View>

                  {/* Badge de estado (só quando não publicado) */}
                  {badge.rotulo !== 'Publicado' && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        backgroundColor: softColor(colors[badge.corKey]),
                        borderRadius: radius.pill,
                        paddingVertical: 2,
                        paddingHorizontal: 8,
                      }}
                    >
                      <Text style={{ color: colors.ink, fontSize: 9, fontWeight: '800' }}>{badge.rotulo}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>
    </View>
  )
}
