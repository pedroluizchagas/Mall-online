import { useState, useCallback, useRef } from 'react'
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { LojaCard } from '@/components/LojaCard'
import { HeaderTela } from '@/components/HeaderTela'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { formatarReais } from '@mallora/lib'
import { consumerDesign } from '@/lib/consumer-design'

const { colors, radius, spacing, shadow } = consumerDesign

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

  function limparTermo() {
    setTermo('')
    setResultados([])
    setBuscaFeita(false)
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <HeaderTela variante="voltar" titulo="Buscar" />

      <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
        <Input
          valor={termo}
          aoMudar={handleTexto}
          placeholder="Lojas, restaurantes ou produtos..."
          iconeEsquerda="search"
          autoFocus
          autoCapitalize="none"
          acessorioDireita={
            termo ? (
              <TouchableOpacity onPress={limparTermo} activeOpacity={0.7}>
                <ConsumerIcon name="close" size={18} color={colors.inkSoft} />
              </TouchableOpacity>
            ) : null
          }
        />
      </View>

      {buscando ? (
        <LoadingState altura={120} />
      ) : (
        <FlatList
          data={resultados}
          keyExtractor={(item) => `${item.tipo}-${item.id}`}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: spacing.tabBarHeight,
            gap: 12,
          }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            resultados.length > 0 ? (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: colors.inkMuted,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                }}
              >
                {resultados.length}{' '}
                {resultados.length === 1 ? 'resultado' : 'resultados'}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            buscaFeita && !buscando ? (
              <EmptyState
                icone="search"
                titulo="Nada encontrado"
                descricao={`Tente buscar por outra loja, produto ou categoria.`}
              />
            ) : termo.length === 0 ? (
              <EmptyState
                icone="search"
                titulo="O que você procura?"
                descricao="Digite o nome de uma loja ou produto para começar."
              />
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

            return <ResultadoProdutoItem produto={item} />
          }}
        />
      )}
    </View>
  )
}

function ResultadoProdutoItem({ produto }: { produto: ResultadoProduto }) {
  return (
    <TouchableOpacity
      onPress={() => router.push(`/loja/${produto.store_slug}`)}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
        shadow.soft,
      ]}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.md,
          backgroundColor: colors.canvasAlt,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {produto.foto_url ? (
          <Image
            source={{ uri: produto.foto_url }}
            style={{ width: 56, height: 56 }}
            resizeMode="cover"
          />
        ) : (
          <ConsumerIcon name="bag" size={22} color={colors.inkSoft} />
        )}
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}
          numberOfLines={1}
        >
          {produto.nome}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: colors.inkMuted,
            marginTop: 2,
            fontWeight: '500',
          }}
          numberOfLines={1}
        >
          {produto.store_nome}
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '800',
            color: colors.ink,
            marginTop: 4,
          }}
        >
          {formatarReais(produto.preco)}
        </Text>
      </View>

      <ConsumerIcon name="chevron-right" size={16} color={colors.inkSoft} />
    </TouchableOpacity>
  )
}
