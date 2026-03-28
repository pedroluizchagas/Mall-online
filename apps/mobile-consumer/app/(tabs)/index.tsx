import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
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
