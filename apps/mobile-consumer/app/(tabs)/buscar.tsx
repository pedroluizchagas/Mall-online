import { useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { LojaCard } from '@/components/LojaCard'
import { formatarReais } from '@mallora/lib'

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  function handleTexto(texto: string) {
    setTermo(texto)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => buscar(texto), 400)
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
              <View className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                {item.foto_url ? (
                  <Image
                    source={{ uri: item.foto_url }}
                    style={{ width: 56, height: 56 }}
                    resizeMode="cover"
                  />
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
