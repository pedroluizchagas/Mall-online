import { useEffect, useRef, useState } from 'react'
import { Animated, Dimensions, Image, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { formatarReais, lerMetadataProduto } from '@mallevo/lib'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { ModalProduto } from '@/components/ModalProduto'
import { Botao } from '@/components/ui/Botao'
import { useCartStore } from '@/store/useCartStore'
import { supabase } from '@/lib/supabase'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * PDP gôndola — a ficha de mercado: foto em palco CONTIDO (nada de tela
 * cheia; o produto é embalagem, não cena), nome, PREÇO GRANDE com unidade e
 * desconto, descrição objetiva e a barra de compra com CONTADOR de
 * quantidade — em mercado se compra mais de um. Item com variação ou
 * modificador delega ao ModalProduto; sacola de outra loja passa pela
 * guarda de troca.
 */

const { width: TELA_W } = Dimensions.get('window')

interface ProdutoPdp {
  id: string
  nome: string
  descricao: string | null
  preco: number
  preco_promocional: number | null
  foto_url: string | null
  metadata?: Record<string, unknown> | null
}

interface LojaPdp {
  id: string
  nome: string
  slug: string
  taxa_entrega: number
  categoria_slug?: string | null
}

interface Props {
  produto: ProdutoPdp
  loja: LojaPdp
  onFechar: () => void
}

export function ProdutoGondola({ produto, loja, onFechar }: Props) {
  const design = useStoreDesign()
  const { colors } = design
  const insets = useSafeAreaInsets()

  const adicionarItem = useCartStore((s) => s.adicionarItem)
  const storeAtual = useCartStore((s) => s.store_id)
  const limparCarrinho = useCartStore((s) => s.limparCarrinho)
  const totalItens = useCartStore((s) => s.totalItens())

  const [quantidade, setQuantidade] = useState(1)
  const [fotoAtiva, setFotoAtiva] = useState(0)
  const [mostrarOpcoes, setMostrarOpcoes] = useState(false)
  const [trocandoLoja, setTrocandoLoja] = useState(false)
  const [adicionado, setAdicionado] = useState(false)
  const [temOpcoes, setTemOpcoes] = useState<boolean | null>(null)
  const escalaCta = useRef(new Animated.Value(1)).current

  // `metadata` é JSONB do lojista: a leitura passa pelo contrato único da lib
  // (campo corrompido some sozinho, nada lança).
  const metadata = lerMetadataProduto(produto.metadata)
  const galeria = metadata.galeria ?? []
  const fotos = galeria.length > 0 ? galeria : produto.foto_url ? [produto.foto_url] : []
  const unidade = typeof produto.metadata?.unidade === 'string' ? `/${produto.metadata.unidade}` : ''

  const precoFinal = produto.preco_promocional ?? produto.preco
  const temPromo = !!produto.preco_promocional && produto.preco_promocional < produto.preco
  const desconto = temPromo ? Math.round((1 - precoFinal / produto.preco) * 100) : 0
  const larguraPalco = TELA_W - 32

  useEffect(() => {
    let cancelado = false
    Promise.all([
      supabase.from('product_option_groups').select('id').eq('product_id', produto.id),
      supabase.from('product_modifier_groups').select('id').eq('product_id', produto.id),
    ])
      .then(([opts, mods]: any[]) => {
        if (cancelado) return
        setTemOpcoes((opts.data?.length ?? 0) + (mods.data?.length ?? 0) > 0)
      })
      .catch(() => {
        if (!cancelado) setTemOpcoes(false)
      })
    return () => {
      cancelado = true
    }
  }, [produto.id])

  function adicionarDireto() {
    adicionarItem(
      { product_id: produto.id, nome: produto.nome, preco: precoFinal, quantidade, foto_url: produto.foto_url ?? undefined },
      loja.id,
      loja.nome,
      loja.taxa_entrega,
    )
    setTrocandoLoja(false)
    setAdicionado(true)
    setTimeout(() => setAdicionado(false), 1200)
  }

  function aoTocarCta() {
    Animated.sequence([
      Animated.timing(escalaCta, { toValue: 0.96, duration: 90, useNativeDriver: true }),
      Animated.spring(escalaCta, { toValue: 1, speed: 22, bounciness: 6, useNativeDriver: true }),
    ]).start()
    if (temOpcoes === null) return
    if (temOpcoes) {
      setMostrarOpcoes(true)
      return
    }
    if (storeAtual && storeAtual !== loja.id) {
      setTrocandoLoja(true)
      return
    }
    adicionarDireto()
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onFechar}>
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <StatusBar style="dark" />

        {/* Header claro */}
        <View
          style={{
            paddingTop: insets.top + 6,
            paddingBottom: 8,
            paddingHorizontal: 8,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.line,
          }}
        >
          <TouchableOpacity onPress={onFechar} activeOpacity={0.7} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <ConsumerIcon name="back" size={22} color={colors.ink} strokeWidth={2.1} />
          </TouchableOpacity>
          <Text numberOfLines={1} style={{ flex: 1, textAlign: 'center', fontSize: 15, color: colors.inkMuted, ...fontStyle(design.body, 700) }}>
            {loja.nome}
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (totalItens === 0) return
              onFechar()
              router.push('/checkout')
            }}
            activeOpacity={0.7}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <ConsumerIcon name="bag" size={22} color={colors.ink} strokeWidth={2.1} />
            {totalItens > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 3,
                  right: 0,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                }}
              >
                <Text style={{ fontSize: 10, color: colors.accentInk, fontWeight: '800' }}>{totalItens}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          {/* Palco contido: a embalagem, com desconto no canto */}
          <View style={{ borderRadius: design.radius.lg, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setFotoAtiva(Math.round(e.nativeEvent.contentOffset.x / larguraPalco))}
            >
              {fotos.length > 0 ? (
                fotos.map((uri, i) => <Image key={i} source={{ uri }} style={{ width: larguraPalco, height: larguraPalco }} resizeMode="cover" />)
              ) : (
                <View style={{ width: larguraPalco, height: larguraPalco * 0.7, alignItems: 'center', justifyContent: 'center' }}>
                  <ConsumerIcon name="bag" size={48} color={colors.inkSoft} />
                </View>
              )}
            </ScrollView>
            {desconto > 0 && (
              <View style={{ position: 'absolute', top: 12, left: 12, backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
                <Text style={{ fontSize: 12, color: colors.accentInk, ...fontStyle(design.body, 800) }}>-{desconto}%</Text>
              </View>
            )}
            {fotos.length > 1 && (
              <View style={{ position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
                {fotos.map((_, i) => (
                  <View key={i} style={{ width: i === fotoAtiva ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === fotoAtiva ? colors.accent : colors.line }} />
                ))}
              </View>
            )}
          </View>

          <Text style={{ marginTop: 16, fontSize: Math.round(20 * design.typeFactor), lineHeight: Math.round(26 * design.typeFactor), color: colors.ink, ...fontStyle(design.display, 800) }}>
            {produto.nome}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
            <Text style={{ fontSize: 28, color: temPromo ? colors.accent : colors.ink, ...fontStyle(design.display, 800) }}>
              {formatarReais(precoFinal)}
              <Text style={{ fontSize: 14, color: colors.inkMuted, ...fontStyle(design.body, 600) }}>{unidade}</Text>
            </Text>
            {temPromo && (
              <Text style={{ fontSize: 14, color: colors.inkSoft, textDecorationLine: 'line-through', ...fontStyle(design.body, 500) }}>
                {formatarReais(produto.preco)}
              </Text>
            )}
          </View>

          {produto.descricao && (
            <Text style={{ marginTop: 12, fontSize: 14, lineHeight: 21, color: colors.inkMuted, ...fontStyle(design.body, 400) }}>{produto.descricao}</Text>
          )}
        </ScrollView>

        {/* Barra de compra: contador + adicionar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 12,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.line,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 999, backgroundColor: colors.surfaceMuted, height: 48 }}>
            <TouchableOpacity
              onPress={() => setQuantidade((q) => Math.max(1, q - 1))}
              disabled={quantidade <= 1}
              style={{ width: 44, height: 48, alignItems: 'center', justifyContent: 'center', opacity: quantidade <= 1 ? 0.4 : 1 }}
            >
              <Text style={{ fontSize: 20, color: colors.ink, ...fontStyle(design.body, 700) }}>−</Text>
            </TouchableOpacity>
            <Text style={{ minWidth: 24, textAlign: 'center', fontSize: 16, color: colors.ink, ...fontStyle(design.display, 800) }}>{quantidade}</Text>
            <TouchableOpacity onPress={() => setQuantidade((q) => Math.min(99, q + 1))} style={{ width: 44, height: 48, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20, color: colors.ink, ...fontStyle(design.body, 700) }}>+</Text>
            </TouchableOpacity>
          </View>
          <Animated.View style={{ flex: 1, transform: [{ scale: escalaCta }] }}>
            <TouchableOpacity
              onPress={aoTocarCta}
              activeOpacity={0.85}
              style={{ height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: adicionado ? colors.success : colors.accent }}
            >
              <Text style={{ fontSize: 14.5, color: colors.accentInk, ...fontStyle(design.body, 800) }}>
                {adicionado ? 'Na sacola ✓' : `Adicionar · ${formatarReais(precoFinal * quantidade)}`}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {mostrarOpcoes && <ModalProduto produto={produto} loja={loja} onFechar={() => setMostrarOpcoes(false)} />}

        {trocandoLoja && (
          <View
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(27, 37, 25, 0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          >
            <View style={[{ width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: design.radius.lg, padding: 20, gap: 12 }, consumerDesign.shadow.medium]}>
              <Text style={{ fontSize: 18, color: colors.ink, ...fontStyle(design.display, 800) }}>Trocar de loja?</Text>
              <Text style={{ fontSize: 14, color: colors.inkMuted, lineHeight: 20, ...fontStyle(design.body, 400) }}>
                Sua sacola atual será esvaziada para adicionar itens de <Text style={{ color: colors.ink, ...fontStyle(design.body, 600) }}>{loja.nome}</Text>.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Botao label="Cancelar" onPress={() => setTrocandoLoja(false)} variante="ghost" tamanho="md" />
                </View>
                <View style={{ flex: 1 }}>
                  <Botao
                    label="Trocar"
                    onPress={() => {
                      limparCarrinho()
                      adicionarDireto()
                    }}
                    variante="primario"
                    tamanho="md"
                  />
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  )
}
