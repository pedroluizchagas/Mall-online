import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { formatarReais } from '@mallora/lib'
import { Skeleton } from '@/components/Skeleton'
import { ModalProduto } from '@/components/ModalProduto'
import { useCartStore } from '@/store/useCartStore'

interface Produto {
  id: string
  nome: string
  descricao: string | null
  preco: number
  preco_promocional: number | null
  foto_url: string | null
  disponivel: boolean
  category_id: string | null
}

interface SecaoCardapio {
  title: string
  data: Produto[]
}

export default function PaginaLoja() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const [loja, setLoja] = useState<any>(null)
  const [secoes, setSecoes] = useState<SecaoCardapio[]>([])
  const [carregando, setCarregando] = useState(true)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const scrollY = useRef(new Animated.Value(0)).current
  const totalItens = useCartStore((s) => s.totalItens())

  useEffect(() => {
    async function carregar() {
      const { data: lojaData } = await supabase
        .from('stores')
        .select(`
          id, nome, descricao, logo_url, banner_url,
          taxa_entrega, tempo_entrega, telefone,
          aceita_dinheiro, aceita_pix,
          aceita_cartao_maquininha, aceita_cartao_online,
          horarios, tenant_id
        `)
        .eq('slug', slug)
        .eq('ativo', true)
        .single()

      if (!lojaData) {
        router.back()
        return
      }

      setLoja(lojaData)

      // Buscar produtos agrupados por categoria
      const { data: produtos } = await supabase
        .from('products')
        .select(`
          id, nome, descricao, preco, preco_promocional,
          foto_url, disponivel, category_id,
          categories (id, nome, ordem)
        `)
        .eq('store_id', lojaData.id)
        .eq('disponivel', true)
        .order('ordem')

      if (produtos) {
        const grupos: Record<string, { titulo: string; ordem: number; produtos: Produto[] }> = {}

        for (const produto of produtos) {
          const cat = (produto as any).categories
          const chave = cat?.id ?? 'sem-categoria'
          const titulo = cat?.nome ?? 'Outros'
          const ordem = cat?.ordem ?? 999

          if (!grupos[chave]) {
            grupos[chave] = { titulo, ordem, produtos: [] }
          }
          grupos[chave].produtos.push(produto as Produto)
        }

        const secoesOrdenadas = Object.values(grupos)
          .sort((a, b) => a.ordem - b.ordem)
          .map((g) => ({ title: g.titulo, data: g.produtos }))

        setSecoes(secoesOrdenadas)
      }

      setCarregando(false)
    }

    carregar()
  }, [slug])

  // Opacidade do header ao rolar
  const headerOpacity = scrollY.interpolate({
    inputRange: [80, 160],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  if (carregando) {
    return (
      <View className="flex-1 bg-creme">
        <Skeleton largura="100%" altura={200} />
        <View className="p-5 gap-3">
          <Skeleton largura="60%" altura={24} />
          <Skeleton largura="40%" altura={16} />
          <Skeleton largura="80%" altura={16} />
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-creme">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerBackTitle: '',
          headerTintColor: '#1A4D3A',
        }}
      />

      {/* Header fixo com nome da loja (aparece ao rolar) */}
      <Animated.View
        style={{ opacity: headerOpacity }}
        className="absolute top-0 left-0 right-0 z-10 bg-creme/95
          pt-14 pb-3 px-5 border-b border-gray-100"
      >
        <Text className="text-base font-bold text-verde-profundo">
          {loja?.nome}
        </Text>
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <View className="h-52 bg-gray-100">
          {loja?.banner_url ? (
            <Image
              source={{ uri: loja.banner_url }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : loja?.logo_url ? (
            <Image
              source={{ uri: loja.logo_url }}
              className="w-full h-full"
              resizeMode="contain"
            />
          ) : (
            <View
              className="flex-1 items-center justify-center"
              style={{ backgroundColor: '#1A4D3A20' }}
            >
              <Text className="text-6xl text-verde-profundo/20">?</Text>
            </View>
          )}
        </View>

        {/* Info da loja */}
        <View className="px-5 py-5 bg-white mb-2">
          <Text className="text-xl font-bold text-gray-800 mb-1">
            {loja?.nome}
          </Text>

          {loja?.descricao && (
            <Text className="text-sm text-gray-500 mb-3" numberOfLines={2}>
              {loja.descricao}
            </Text>
          )}

          <View className="flex-row flex-wrap gap-3">
            {loja?.tempo_entrega && (
              <View className="bg-gray-50 rounded-lg px-3 py-1.5">
                <Text className="text-xs text-gray-600">
                  {loja.tempo_entrega} min
                </Text>
              </View>
            )}
            <View className="bg-gray-50 rounded-lg px-3 py-1.5">
              <Text className="text-xs text-gray-600">
                {loja?.taxa_entrega === 0
                  ? 'Frete grátis'
                  : `Frete ${formatarReais(loja?.taxa_entrega ?? 0)}`}
              </Text>
            </View>
          </View>

          {/* Métodos de pagamento */}
          <View className="flex-row flex-wrap gap-1.5 mt-3">
            {loja?.aceita_dinheiro && (
              <Text className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                Dinheiro
              </Text>
            )}
            {loja?.aceita_pix && (
              <Text className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                PIX
              </Text>
            )}
            {loja?.aceita_cartao_maquininha && (
              <Text className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                Cartão na entrega
              </Text>
            )}
            {loja?.aceita_cartao_online && (
              <Text className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                Cartão ou PIX online
              </Text>
            )}
          </View>
        </View>

        {/* Cardápio por seções */}
        {secoes.map((secao) => (
          <View key={secao.title} className="mb-2">
            <View className="px-5 py-3 bg-gray-50">
              <Text className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                {secao.title}
              </Text>
            </View>

            {secao.data.map((produto) => (
              <ProdutoItem
                key={produto.id}
                produto={produto}
                onPress={() => setProdutoSelecionado(produto)}
              />
            ))}
          </View>
        ))}

        <View className="h-32" />
      </Animated.ScrollView>

      {/* Botão flutuante do carrinho */}
      {totalItens > 0 && (
        <View className="absolute bottom-6 left-5 right-5">
          <TouchableOpacity
            onPress={() => router.push('/checkout')}
            className="bg-verde-profundo py-4 rounded-2xl flex-row
              items-center justify-between px-5 shadow-lg"
            activeOpacity={0.85}
          >
            <View className="bg-verde-medio w-7 h-7 rounded-full
              items-center justify-center">
              <Text className="text-white text-xs font-bold">
                {totalItens}
              </Text>
            </View>
            <Text className="text-white font-bold text-base">
              Ver carrinho
            </Text>
            <Text className="text-verde-medio/60 text-sm">
              {useCartStore.getState().store_nome}
            </Text>
          </TouchableOpacity>
        </View>
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
  )
}

function ProdutoItem({
  produto,
  onPress,
}: {
  produto: Produto
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center gap-4 px-5 py-4 bg-white
        border-b border-gray-50"
      activeOpacity={0.75}
    >
      <View className="flex-1 min-w-0">
        <Text className="text-sm font-semibold text-gray-800" numberOfLines={1}>
          {produto.nome}
        </Text>
        {produto.descricao && (
          <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={2}>
            {produto.descricao}
          </Text>
        )}
        <View className="flex-row items-center gap-2 mt-1.5">
          <Text className="text-sm font-bold text-verde-profundo">
            {formatarReais(produto.preco_promocional ?? produto.preco)}
          </Text>
          {produto.preco_promocional && (
            <Text className="text-xs text-gray-300 line-through">
              {formatarReais(produto.preco)}
            </Text>
          )}
        </View>
      </View>

      {produto.foto_url ? (
        <Image
          source={{ uri: produto.foto_url }}
          className="w-20 h-20 rounded-xl"
          resizeMode="cover"
        />
      ) : (
        <View className="w-20 h-20 rounded-xl bg-gray-100 items-center justify-center">
          <Text className="text-gray-200 text-2xl">?</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}
