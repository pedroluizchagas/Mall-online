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
import { ModalProduto } from '@/components/ModalProduto'
import { ProdutoCard } from '@/components/ProdutoCard'
import { Badge } from '@/components/ui/Badge'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { useCartStore } from '@/store/useCartStore'
import { consumerDesign } from '@/lib/consumer-design'
import {
  StoreColorsProvider,
  useStoreColors,
  colorsFromTheme,
} from '@/lib/store-theme'

const { radius, shadow } = consumerDesign

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

export default function PaginaLoja() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const insets = useSafeAreaInsets()
  const [loja, setLoja] = useState<any>(null)
  const [secoes, setSecoes] = useState<SecaoCardapio[]>([])
  const [carregando, setCarregando] = useState(true)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const scrollY = useRef(new Animated.Value(0)).current
  const totalItens = useCartStore((s) => s.totalItens())
  const total = useCartStore((s) => s.total())

  // Pele da loja: preset v2 explícito tematiza; sem tema / v1 → Mallevo.
  const colors = useMemo(() => colorsFromTheme(loja?.theme), [loja?.theme])

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
      </View>
    )
  }

  // Gateway-only: só métodos online aparecem (política Mallevo, §3d).
  const metodos: MetodoPagamento[] = [
    { rotulo: 'Cartão de crédito', ativo: !!loja?.aceita_cartao_online },
    { rotulo: 'Pix', ativo: !!loja?.aceita_pix },
  ].filter((m) => m.ativo)

  const espacoFinal = totalItens > 0 ? 120 : 40

  return (
    <StoreColorsProvider value={colors}>
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
            fontWeight: '800',
            color: colors.ink,
            textAlign: 'center',
            opacity: titleOpacity,
            marginRight: 40,
            letterSpacing: -0.2,
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
            paddingHorizontal: 24,
            paddingVertical: 24,
            gap: 12,
          }}
        >
          <Text
            style={{
              fontSize: 26,
              fontWeight: '800',
              color: colors.ink,
              letterSpacing: -0.5,
            }}
          >
            {loja?.nome}
          </Text>

          {loja?.descricao && (
            <Text
              style={{
                fontSize: 14,
                color: colors.inkMuted,
                fontWeight: '500',
                lineHeight: 20,
              }}
              numberOfLines={3}
            >
              {loja.descricao}
            </Text>
          )}

          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.success,
                }}
              />
              <Text
                style={{ fontSize: 13, color: colors.inkMuted, fontWeight: '600' }}
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
            style={{ marginTop: 16, paddingHorizontal: 24 }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '800',
                color: colors.ink,
                letterSpacing: -0.2,
                marginBottom: 4,
              }}
            >
              {secao.titulo}
            </Text>

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
      {totalItens > 0 && (
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
            <ConsumerIcon name="bag" size={20} color={colors.accentInk} strokeWidth={2.1} />
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.accentInk }}>
              {totalItens} {totalItens === 1 ? 'item' : 'itens'}
            </Text>
          </View>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.accentInk }}>
            {formatarReais(total)}
          </Text>
        </TouchableOpacity>
      )}

      {/* Modal do produto */}
      {produtoSelecionado && loja && (
        <ModalProduto
          produto={produtoSelecionado}
          loja={loja}
          onFechar={() => setProdutoSelecionado(null)}
        />
      )}
    </View>
    </StoreColorsProvider>
  )
}

function BotaoCircular({
  icone,
  aoTocar,
}: {
  icone: 'back'
  aoTocar: () => void
}) {
  const colors = useStoreColors()
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
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <ConsumerIcon name={icone} size={14} color={cor} />
      <Text style={{ fontSize: 13, color: cor, fontWeight: '600' }}>
        {rotulo}
      </Text>
    </View>
  )
}
