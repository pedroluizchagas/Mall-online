# 16 — Consumer App — Home e Exploração

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

Este arquivo cobre as telas de descoberta do app do consumidor:
a Home com seções de destaques, categorias e lojas, a tela de busca
global, a listagem de lojas por categoria e a página individual de
cada loja com seu cardápio.

Todas as queries ao Supabase são feitas diretamente no componente
via hooks — sem Server Actions, pois estamos no ambiente React Native.
O padrão é buscar dados no `useEffect` e controlar estado de loading
com Skeleton components.

-----

## TELA HOME

### app/(tabs)/index.tsx

```typescript
import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/Skeleton'
import { LojaCard } from '@/components/LojaCard'
import { CategoriaChip } from '@/components/CategoriaChip'
import { BannerCarousel } from '@/components/BannerCarousel'
import { useCartStore } from '@/store/useCartStore'

interface Loja {
  id: string
  nome: string
  slug: string
  logo_url: string | null
  taxa_entrega: number
  tempo_entrega: number | null
  categories?: { nome: string } | null
}

interface Categoria {
  id: string
  nome: string
  icone: string | null
}

export default function TelaHome() {
  const [lojas, setLojas] = useState<Loja[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const totalItens = useCartStore((s) => s.totalItens())

  async function carregarDados() {
    const [resLojas, resCategorias] = await Promise.all([
      supabase
        .from('stores')
        .select(`
          id, nome, slug, logo_url, taxa_entrega, tempo_entrega,
          categories (nome)
        `)
        .eq('ativo', true)
        .limit(20),

      supabase
        .from('categories')
        .select('id, nome, icone')
        .is('tenant_id', null)
        .eq('ativa', true)
        .order('ordem'),
    ])

    setLojas(resLojas.data ?? [])
    setCategorias(resCategorias.data ?? [])
    setCarregando(false)
  }

  async function carregarLojasPorCategoria(categoria_id: string) {
    setCarregando(true)

    const { data } = await supabase
      .from('stores')
      .select(`
        id, nome, slug, logo_url, taxa_entrega, tempo_entrega,
        categories (nome)
      `)
      .eq('ativo', true)
      .eq('categories.id', categoria_id)
      .limit(20)

    setLojas(data ?? [])
    setCarregando(false)
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const onRefresh = useCallback(async () => {
    setAtualizando(true)
    setCategoriaSelecionada(null)
    await carregarDados()
    setAtualizando(false)
  }, [])

  function handleCategoria(id: string) {
    if (categoriaSelecionada === id) {
      setCategoriaSelecionada(null)
      carregarDados()
    } else {
      setCategoriaSelecionada(id)
      carregarLojasPorCategoria(id)
    }
  }

  return (
    <View className="flex-1 bg-creme">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={onRefresh}
            tintColor="#1A4D3A"
          />
        }
      >
        {/* Header */}
        <View className="px-5 pt-14 pb-4">
          <Text className="text-gray-500 text-sm">Bem-vindo a</Text>
          <Text className="text-2xl font-bold text-verde-profundo">
            Divinópolis
          </Text>
        </View>

        {/* Barra de busca — navega para a tela de busca */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/buscar')}
          className="mx-5 mb-5 bg-white border border-gray-100 rounded-2xl
            px-4 py-3.5 flex-row items-center gap-3"
          activeOpacity={0.7}
        >
          <Text className="text-gray-400 flex-1 text-base">
            Buscar lojas ou produtos...
          </Text>
        </TouchableOpacity>

        {/* Banners de destaque */}
        <BannerCarousel />

        {/* Categorias */}
        <View className="mt-6 mb-2">
          <Text className="px-5 text-lg font-bold text-verde-profundo mb-3">
            O que você quer?
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
          >
            {carregando
              ? Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} largura={80} altura={36} />
                ))
              : categorias.map((cat) => (
                  <CategoriaChip
                    key={cat.id}
                    categoria={cat}
                    ativa={categoriaSelecionada === cat.id}
                    onPress={() => handleCategoria(cat.id)}
                  />
                ))}
          </ScrollView>
        </View>

        {/* Lojas em destaque */}
        <View className="mt-6 px-5 pb-24">
          <Text className="text-lg font-bold text-verde-profundo mb-3">
            {categoriaSelecionada
              ? categorias.find((c) => c.id === categoriaSelecionada)?.nome
              : 'Lojas disponíveis'}
          </Text>

          {carregando ? (
            <View className="gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} className="bg-white rounded-2xl p-4 gap-3">
                  <Skeleton largura="100%" altura={140} />
                  <Skeleton largura="60%" altura={18} />
                  <Skeleton largura="40%" altura={14} />
                </View>
              ))}
            </View>
          ) : lojas.length === 0 ? (
            <View className="py-12 items-center">
              <Text className="text-gray-400 text-base">
                Nenhuma loja encontrada.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {lojas.map((loja) => (
                <LojaCard
                  key={loja.id}
                  loja={loja}
                  onPress={() => router.push(`/loja/${loja.slug}`)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Badge do carrinho flutuante */}
      {totalItens > 0 && (
        <TouchableOpacity
          onPress={() => router.push('/checkout')}
          className="absolute bottom-24 right-5 bg-verde-profundo px-5 py-3
            rounded-2xl flex-row items-center gap-2 shadow-lg"
          activeOpacity={0.85}
        >
          <View className="bg-ambar w-5 h-5 rounded-full items-center justify-center">
            <Text className="text-white text-xs font-bold">{totalItens}</Text>
          </View>
          <Text className="text-white font-semibold">Ver carrinho</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
```

-----

## COMPONENTE BANNER CAROUSEL

### components/BannerCarousel.tsx

Banners rotativos com auto-play. No MVP os banners são estáticos —
podem ser tornados dinâmicos via tabela no banco futuramente.

```typescript
import { useEffect, useRef, useState } from 'react'
import { View, ScrollView, Dimensions, Text } from 'react-native'

const { width } = Dimensions.get('window')
const LARGURA_BANNER = width - 40 // padding de 20 em cada lado

const BANNERS = [
  { id: '1', cor: '#1A4D3A', titulo: 'Frete grátis no primeiro pedido', subtitulo: 'Use o código BEMVINDO' },
  { id: '2', cor: '#4CAF82', titulo: 'Novos restaurantes esta semana', subtitulo: 'Confira as novidades' },
  { id: '3', cor: '#F5A623', titulo: 'Pague com PIX e economize', subtitulo: 'Aceito em todas as lojas' },
]

export function BannerCarousel() {
  const [indice, setIndice] = useState(0)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      const proximo = (indice + 1) % BANNERS.length
      scrollRef.current?.scrollTo({
        x: proximo * LARGURA_BANNER + proximo * 12,
        animated: true,
      })
      setIndice(proximo)
    }, 4000)
    return () => clearInterval(timer)
  }, [indice])

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled={false}
        decelerationRate="fast"
        snapToInterval={LARGURA_BANNER + 12}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(
            e.nativeEvent.contentOffset.x / (LARGURA_BANNER + 12)
          )
          setIndice(i)
        }}
      >
        {BANNERS.map((banner) => (
          <View
            key={banner.id}
            style={{
              width: LARGURA_BANNER,
              backgroundColor: banner.cor,
              borderRadius: 16,
              padding: 20,
              height: 110,
              justifyContent: 'flex-end',
            }}
          >
            <Text className="text-white font-bold text-base">
              {banner.titulo}
            </Text>
            <Text className="text-white/70 text-sm mt-0.5">
              {banner.subtitulo}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Indicadores */}
      <View className="flex-row justify-center gap-1.5 mt-3">
        {BANNERS.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === indice ? 16 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === indice ? '#1A4D3A' : '#D1D5DB',
            }}
          />
        ))}
      </View>
    </View>
  )
}
```

-----

## COMPONENTE CATEGORIA CHIP

### components/CategoriaChip.tsx

```typescript
import { TouchableOpacity, Text } from 'react-native'

interface Props {
  categoria: { id: string; nome: string; icone: string | null }
  ativa: boolean
  onPress: () => void
}

export function CategoriaChip({ categoria, ativa, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center gap-1.5 px-4 py-2 rounded-full border
        ${ativa
          ? 'bg-verde-profundo border-verde-profundo'
          : 'bg-white border-gray-100'
        }`}
      activeOpacity={0.75}
    >
      {categoria.icone && (
        <Text className="text-base">{categoria.icone}</Text>
      )}
      <Text
        className={`text-sm font-medium ${
          ativa ? 'text-white' : 'text-gray-700'
        }`}
      >
        {categoria.nome}
      </Text>
    </TouchableOpacity>
  )
}
```

-----

## COMPONENTE LOJA CARD

### components/LojaCard.tsx

```typescript
import { View, Text, Image, TouchableOpacity } from 'react-native'
import { formatarReais } from '@mallevo/lib'

interface Props {
  loja: {
    id: string
    nome: string
    logo_url: string | null
    taxa_entrega: number
    tempo_entrega: number | null
    categories?: { nome: string } | null
  }
  onPress: () => void
}

export function LojaCard({ loja, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-2xl overflow-hidden"
      activeOpacity={0.85}
    >
      {/* Imagem de capa */}
      <View className="h-36 bg-gray-100">
        {loja.logo_url ? (
          <Image
            source={{ uri: loja.logo_url }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-4xl text-gray-200">?</Text>
          </View>
        )}
      </View>

      {/* Informações */}
      <View className="p-4">
        <Text className="text-base font-bold text-gray-800" numberOfLines={1}>
          {loja.nome}
        </Text>

        {loja.categories?.nome && (
          <Text className="text-sm text-gray-400 mt-0.5">
            {loja.categories.nome}
          </Text>
        )}

        <View className="flex-row items-center gap-3 mt-2">
          {loja.tempo_entrega && (
            <Text className="text-xs text-gray-500">
              {loja.tempo_entrega} min
            </Text>
          )}
          <Text className="text-xs text-gray-300">·</Text>
          <Text className="text-xs text-gray-500">
            {loja.taxa_entrega === 0
              ? 'Frete grátis'
              : `Frete ${formatarReais(loja.taxa_entrega)}`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}
```

-----

## TELA DE BUSCA

### app/(tabs)/buscar.tsx

```typescript
import { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { LojaCard } from '@/components/LojaCard'
import { formatarReais } from '@mallevo/lib'

interface ResultadoLoja {
  tipo: 'loja'
  id: string
  nome: string
  slug: string
  logo_url: string | null
  taxa_entrega: number
  tempo_entrega: number | null
  categories?: { nome: string } | null
}

interface ResultadoProduto {
  tipo: 'produto'
  id: string
  nome: string
  descricao: string | null
  preco: number
  foto_url: string | null
  store_slug: string
  store_nome: string
}

type Resultado = ResultadoLoja | ResultadoProduto

export default function TelaBuscar() {
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [buscaFeita, setBuscaFeita] = useState(false)

  const buscar = useCallback(async (texto: string) => {
    if (texto.trim().length < 2) {
      setResultados([])
      setBuscaFeita(false)
      return
    }

    setBuscando(true)
    setBuscaFeita(false)

    const termoBusca = `%${texto.trim()}%`

    const [resLojas, resProdutos] = await Promise.all([
      supabase
        .from('stores')
        .select(`
          id, nome, slug, logo_url, taxa_entrega, tempo_entrega,
          categories (nome)
        `)
        .eq('ativo', true)
        .ilike('nome', termoBusca)
        .limit(5),

      supabase
        .from('products')
        .select(`
          id, nome, descricao, preco, foto_url,
          stores!inner (slug, nome, ativo)
        `)
        .eq('disponivel', true)
        .eq('stores.ativo', true)
        .ilike('nome', termoBusca)
        .limit(10),
    ])

    const lojasFormatadas: ResultadoLoja[] = (resLojas.data ?? []).map((l) => ({
      tipo: 'loja',
      ...l,
    }))

    const produtosFormatados: ResultadoProduto[] = (resProdutos.data ?? []).map(
      (p: any) => ({
        tipo: 'produto',
        id: p.id,
        nome: p.nome,
        descricao: p.descricao,
        preco: p.preco,
        foto_url: p.foto_url,
        store_slug: p.stores.slug,
        store_nome: p.stores.nome,
      })
    )

    setResultados([...lojasFormatadas, ...produtosFormatados])
    setBuscando(false)
    setBuscaFeita(true)
  }, [])

  // Debounce da busca
  let debounce: ReturnType<typeof setTimeout>
  function handleTexto(texto: string) {
    setTermo(texto)
    clearTimeout(debounce)
    debounce = setTimeout(() => buscar(texto), 400)
  }

  return (
    <View className="flex-1 bg-creme">
      {/* Header com input */}
      <View className="px-5 pt-14 pb-4 bg-creme">
        <Text className="text-xl font-bold text-verde-profundo mb-4">
          Buscar
        </Text>

        <View className="bg-white border border-gray-100 rounded-2xl
          px-4 py-3 flex-row items-center gap-3">
          <TextInput
            value={termo}
            onChangeText={handleTexto}
            placeholder="Lojas, restaurantes ou produtos..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 text-base text-gray-800"
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => buscar(termo)}
          />
          {buscando && <ActivityIndicator size="small" color="#1A4D3A" />}
        </View>
      </View>

      {/* Resultados */}
      <FlatList
        data={resultados}
        keyExtractor={(item) => `${item.tipo}-${item.id}`}
        contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          buscaFeita && !buscando ? (
            <View className="py-12 items-center">
              <Text className="text-gray-400 text-base">
                Nenhum resultado para "{termo}"
              </Text>
              <Text className="text-gray-300 text-sm mt-1">
                Tente outro termo de busca
              </Text>
            </View>
          ) : !buscaFeita && termo.length === 0 ? (
            <View className="py-12 items-center">
              <Text className="text-gray-300 text-base">
                Digite para buscar lojas ou produtos
              </Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          resultados.length > 0 ? (
            <Text className="text-sm text-gray-400 mb-2">
              {resultados.length} resultado{resultados.length !== 1 ? 's' : ''}
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          if (item.tipo === 'loja') {
            return (
              <LojaCard
                loja={item}
                onPress={() => router.push(`/loja/${item.slug}`)}
              />
            )
          }

          // Resultado de produto
          return (
            <TouchableOpacity
              onPress={() => router.push(`/loja/${item.store_slug}`)}
              className="bg-white rounded-2xl p-4 flex-row items-center gap-3"
              activeOpacity={0.85}
            >
              <View className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden
                flex-shrink-0">
                {item.foto_url ? (
                  <View
                    style={{
                      width: 56,
                      height: 56,
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        backgroundImage: `url(${item.foto_url})`,
                      }}
                    />
                  </View>
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-gray-200 text-lg">?</Text>
                  </View>
                )}
              </View>

              <View className="flex-1 min-w-0">
                <Text
                  className="text-sm font-semibold text-gray-800"
                  numberOfLines={1}
                >
                  {item.nome}
                </Text>
                <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
                  {item.store_nome}
                </Text>
                <Text className="text-sm font-bold text-verde-profundo mt-1">
                  {formatarReais(item.preco)}
                </Text>
              </View>
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}
```

-----

## PAGINA DA LOJA

### app/loja/[slug].tsx

```typescript
import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  SectionList,
  Animated,
} from 'react-native'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { formatarReais } from '@mallevo/lib'
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
        // Agrupar por categoria
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
```

-----

## MODAL DE PRODUTO

### components/ModalProduto.tsx

Bottom sheet com detalhes do produto, campo de observações e
seletor de quantidade. Ao confirmar, adiciona ao carrinho.

```typescript
import { useState } from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native'
import { useCartStore } from '@/store/useCartStore'
import { formatarReais } from '@mallevo/lib'

const { height } = Dimensions.get('window')

interface Produto {
  id: string
  nome: string
  descricao: string | null
  preco: number
  preco_promocional: number | null
  foto_url: string | null
}

interface Loja {
  id: string
  nome: string
  slug: string
  taxa_entrega: number
}

interface Props {
  produto: Produto
  loja: Loja
  onFechar: () => void
}

export function ModalProduto({ produto, loja, onFechar }: Props) {
  const [quantidade, setQuantidade] = useState(1)
  const [observacoes, setObservacoes] = useState('')
  const [trocandoLoja, setTrocandoLoja] = useState(false)
  const adicionarItem = useCartStore((s) => s.adicionarItem)
  const storeAtual = useCartStore((s) => s.store_id)

  const preco = produto.preco_promocional ?? produto.preco
  const totalItem = preco * quantidade

  function handleAdicionar() {
    // Se tem itens de outra loja, confirmar antes de trocar
    if (storeAtual && storeAtual !== loja.id) {
      setTrocandoLoja(true)
      return
    }

    confirmarAdicao()
  }

  function confirmarAdicao() {
    adicionarItem(
      {
        product_id: produto.id,
        nome: produto.nome,
        preco,
        quantidade,
        foto_url: produto.foto_url ?? undefined,
        observacoes: observacoes.trim() || undefined,
      },
      loja.id,
      loja.nome,
      loja.taxa_entrega
    )
    setTrocandoLoja(false)
    onFechar()
  }

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onFechar}
    >
      <TouchableOpacity
        className="flex-1 bg-black/40"
        activeOpacity={1}
        onPress={onFechar}
      />

      <View
        className="bg-white rounded-t-3xl overflow-hidden"
        style={{ maxHeight: height * 0.85 }}
      >
        <ScrollView bounces={false}>
          {/* Foto */}
          {produto.foto_url && (
            <Image
              source={{ uri: produto.foto_url }}
              className="w-full h-52"
              resizeMode="cover"
            />
          )}

          <View className="p-5">
            <Text className="text-xl font-bold text-gray-800">
              {produto.nome}
            </Text>

            {produto.descricao && (
              <Text className="text-gray-500 mt-2 leading-6">
                {produto.descricao}
              </Text>
            )}

            <View className="flex-row items-center gap-2 mt-3">
              <Text className="text-xl font-bold text-verde-profundo">
                {formatarReais(preco)}
              </Text>
              {produto.preco_promocional && (
                <Text className="text-base text-gray-300 line-through">
                  {formatarReais(produto.preco)}
                </Text>
              )}
            </View>

            {/* Observações */}
            <View className="mt-5">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Observações (opcional)
              </Text>
              <TextInput
                value={observacoes}
                onChangeText={setObservacoes}
                placeholder="Ex: sem cebola, ponto da carne..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={2}
                className="border border-gray-200 rounded-xl px-4 py-3
                  text-sm text-gray-700"
                style={{ textAlignVertical: 'top' }}
              />
            </View>

            {/* Quantidade */}
            <View className="flex-row items-center justify-between mt-5">
              <Text className="text-sm font-medium text-gray-700">
                Quantidade
              </Text>
              <View className="flex-row items-center gap-4">
                <TouchableOpacity
                  onPress={() => setQuantidade((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-full border border-gray-200
                    items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-xl text-gray-600 leading-none">−</Text>
                </TouchableOpacity>

                <Text className="text-lg font-bold text-gray-800 w-6 text-center">
                  {quantidade}
                </Text>

                <TouchableOpacity
                  onPress={() => setQuantidade((q) => q + 1)}
                  className="w-9 h-9 rounded-full bg-verde-profundo
                    items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-xl text-white leading-none">+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Botão adicionar */}
        <View className="px-5 pb-8 pt-3 border-t border-gray-50">
          <TouchableOpacity
            onPress={handleAdicionar}
            className="bg-verde-profundo py-4 rounded-2xl flex-row
              items-center justify-between px-5"
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-base">
              Adicionar ao carrinho
            </Text>
            <Text className="text-verde-medio/80 font-semibold">
              {formatarReais(totalItem)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Diálogo de confirmação de troca de loja */}
      {trocandoLoja && (
        <Modal visible transparent animationType="fade">
          <View className="flex-1 bg-black/50 items-center justify-center px-6">
            <View className="bg-white rounded-2xl p-6 w-full">
              <Text className="text-base font-bold text-gray-800 mb-2">
                Trocar de loja?
              </Text>
              <Text className="text-sm text-gray-500 mb-5">
                Seu carrinho atual será esvaziado para adicionar itens
                de {loja.nome}.
              </Text>
              <View className="gap-2">
                <TouchableOpacity
                  onPress={confirmarAdicao}
                  className="bg-verde-profundo py-3 rounded-xl items-center"
                  activeOpacity={0.85}
                >
                  <Text className="text-white font-semibold">
                    Esvaziar e trocar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTrocandoLoja(false)}
                  className="py-3 rounded-xl items-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-gray-500">Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  )
}
```

-----

## CHECKLIST DO MODULO

- [ ] Supabase configurado com `ilike` para buscas case-insensitive
- [ ] Índice `gin` ou `ilike` no banco para performance em buscas por nome
  (considerar no futuro: `CREATE INDEX idx_stores_nome_search ON stores USING gin(to_tsvector('portuguese', nome))`)
- [ ] `lucide-react-native` instalado para ícones (usado no layout de tabs)
- [ ] `react-native-reanimated` instalado e configurado no babel para o header animado
- [ ] Confirmação de troca de loja no `ModalProduto` — não perder carrinho silenciosamente
- [ ] Skeleton components em todos os estados de carregamento
- [ ] `numberOfLines` nos textos de cards para evitar quebra de layout
- [ ] Barra de busca na Home é apenas um botão que navega para `/(tabs)/buscar`
  (não um input real — evita teclado abrindo na Home)
- [ ] Debounce de 400ms na busca para não disparar queries a cada tecla
- [ ] Verificar se loja está ativa antes de exibir (`eq('ativo', true)`)
- [ ] Produto sem foto exibe placeholder ao invés de quebrar layout

-----

*Arquivo 16 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 17 — Consumer App — Carrinho e Checkout Stripe*
