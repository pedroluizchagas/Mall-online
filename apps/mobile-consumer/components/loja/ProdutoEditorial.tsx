import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { formatarReais } from '@mallevo/lib'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { ModalProduto } from '@/components/ModalProduto'
import { Botao } from '@/components/ui/Botao'
import { useCartStore } from '@/store/useCartStore'
import { supabase } from '@/lib/supabase'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * PDP editorial de moda — a peça em tela cheia, o resto em segundo plano.
 *
 * DNA da referência: foto full-bleed (galeria deslizável quando o lojista
 * envia mais de uma imagem — look de corpo inteiro, detalhe, verso), ações
 * brancas flutuando sobre a foto e um cartão de vidro na base com thumb,
 * nome em caps, loja, descrição, preço e o "+" escuro de adicionar.
 *
 * Adição ao carrinho:
 * - produto simples → "+" adiciona direto (com guarda de troca de loja);
 * - produto com variações/modificadores (tamanho, cor...) → "+" abre o
 *   ModalProduto por cima, que já domina essa seleção.
 */

const { width: TELA_W } = Dimensions.get('window')

// Scrim do topo: rampa ÚNICA (denso em cima → transparente embaixo), sem a
// segunda banda do gradiente do hero — reusar aquele PNG rotacionado criava
// uma faixa escura com corte seco na borda inferior do scrim.
const SCRIM_TOPO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAABACAYAAADbER1AAAAAhElEQVR42k3EXWeCYQCA4adPfViWKUmSTJJIIiORSEQkIiIiIqKDGKOD2A+v6+TVzX2FEML/6/DAHX/4xQ1XXHDGCUccsMcOW2ywxgpLLDDHDFNMMMYIPxhigD566KKDNlr4RhMN1FFDFRWUUcIXivhEAR/II4csMkgjhSQSEXHEIt56AnLKDLBZxh60AAAAAElFTkSuQmCC'

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

export function ProdutoEditorial({ produto, loja, onFechar }: Props) {
  const design = useStoreDesign()
  const { colors } = design
  const insets = useSafeAreaInsets()

  const adicionarItem = useCartStore((s) => s.adicionarItem)
  const storeAtual = useCartStore((s) => s.store_id)
  const limparCarrinho = useCartStore((s) => s.limparCarrinho)
  const totalItens = useCartStore((s) => s.totalItens())

  const [fotoAtiva, setFotoAtiva] = useState(0)
  const [mostrarOpcoes, setMostrarOpcoes] = useState(false)
  const [trocandoLoja, setTrocandoLoja] = useState(false)
  const [adicionado, setAdicionado] = useState(false)
  // null = ainda verificando se o produto tem variações/modificadores.
  const [temOpcoes, setTemOpcoes] = useState<boolean | null>(null)
  const escalaMais = useRef(new Animated.Value(1)).current

  const galeria = Array.isArray((produto.metadata as any)?.galeria)
    ? ((produto.metadata as any).galeria as string[])
    : []
  const fotos = galeria.length > 0 ? galeria : produto.foto_url ? [produto.foto_url] : []

  const precoFinal = produto.preco_promocional ?? produto.preco
  const temPromo = !!produto.preco_promocional

  // Produtos de moda costumam ter tamanho/cor: se houver grupos de variação
  // ou modificadores, o "+" delega ao ModalProduto (dono dessa seleção).
  useEffect(() => {
    let cancelado = false
    Promise.all([
      (supabase as any)
        .from('product_option_groups')
        .select('id')
        .eq('product_id', produto.id),
      (supabase as any)
        .from('product_modifier_groups')
        .select('id')
        .eq('product_id', produto.id),
    ])
      .then(([opts, mods]: any[]) => {
        if (cancelado) return
        const total = (opts.data?.length ?? 0) + (mods.data?.length ?? 0)
        setTemOpcoes(total > 0)
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
      {
        product_id: produto.id,
        nome: produto.nome,
        preco: precoFinal,
        quantidade: 1,
        foto_url: produto.foto_url ?? undefined,
      },
      loja.id,
      loja.nome,
      loja.taxa_entrega,
    )
    setTrocandoLoja(false)
    setAdicionado(true)
    setTimeout(() => setAdicionado(false), 1100)
  }

  function aoTocarMais() {
    // Micro-feedback: anticipation + pouso (personalidade premium, sutil).
    Animated.sequence([
      Animated.timing(escalaMais, {
        toValue: 0.9,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(escalaMais, {
        toValue: 1,
        speed: 22,
        bounciness: 6,
        useNativeDriver: true,
      }),
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
    <Modal visible animationType="fade" onRequestClose={onFechar}>
      <View style={{ flex: 1, backgroundColor: colors.surfaceDark }}>
        <StatusBar style="light" />

        {/* Galeria full-bleed — o lojista pode enviar o look inteiro */}
        <ScrollView
          style={{ flex: 1 }}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setFotoAtiva(Math.round(e.nativeEvent.contentOffset.x / TELA_W))
          }
        >
          {fotos.length > 0 ? (
            fotos.map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={{ width: TELA_W, height: '100%' }}
                resizeMode="cover"
              />
            ))
          ) : (
            <View
              style={{
                width: TELA_W,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ConsumerIcon name="bag" size={64} color={colors.inkSoft} />
            </View>
          )}
        </ScrollView>

        {/* Scrim do topo p/ ações brancas — dissolve sem borda visível */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 170 }}
        >
          <Image
            source={{ uri: SCRIM_TOPO }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="stretch"
          />
        </View>

        {/* Ações sobre a foto */}
        <View
          style={{
            position: 'absolute',
            top: insets.top + 6,
            left: 12,
            right: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <TouchableOpacity
            onPress={onFechar}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ConsumerIcon name="back" size={23} color="#FFFFFF" strokeWidth={2.1} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (totalItens === 0) return
              onFechar()
              router.push('/checkout')
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ConsumerIcon name="bag" size={22} color="#FFFFFF" strokeWidth={2.1} />
            {totalItens > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 3,
                  right: 0,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: colors.danger,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                }}
              >
                <Text style={{ fontSize: 10, color: '#FFFFFF', fontWeight: '700' }}>
                  {totalItens}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Dots da galeria + cartão de vidro (dots ancorados acima do cartão) */}
        <View
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: insets.bottom + 16,
          }}
        >
          {fotos.length > 1 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                alignSelf: 'flex-end',
                marginBottom: 12,
                marginRight: 6,
              }}
            >
              {fotos.map((_, i) =>
                i === fotoAtiva ? (
                  <View
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      borderWidth: 1.5,
                      borderColor: '#FFFFFF',
                    }}
                  />
                ) : (
                  <View
                    key={i}
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: 'rgba(255,255,255,0.6)',
                    }}
                  />
                ),
              )}
            </View>
          )}

          <View style={{ borderRadius: 26, overflow: 'hidden' }}>
          <BlurView
            intensity={45}
            tint="light"
            experimentalBlurMethod="dimezisBlurView"
          >
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.72)',
                padding: 16,
                gap: 14,
              }}
            >
              <View style={{ flexDirection: 'row', gap: 14 }}>
                {produto.foto_url && (
                  <Image
                    source={{ uri: produto.foto_url }}
                    style={{
                      width: 92,
                      height: 112,
                      borderRadius: 18,
                      backgroundColor: colors.canvasAlt,
                    }}
                    resizeMode="cover"
                  />
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={{
                      fontSize: Math.round(23 * design.typeFactor),
                      color: colors.ink,
                      textTransform: 'uppercase',
                      letterSpacing: 0.4,
                      ...fontStyle(design.display, 800),
                    }}
                  >
                    {produto.nome}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      marginTop: 2,
                      fontSize: 14,
                      color: colors.inkMuted,
                      ...fontStyle(design.body, 500),
                    }}
                  >
                    {loja.nome}
                  </Text>
                  {produto.descricao && (
                    <Text
                      numberOfLines={3}
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        lineHeight: 17,
                        color: colors.inkMuted,
                        ...fontStyle(design.body, 400),
                      }}
                    >
                      {produto.descricao}
                    </Text>
                  )}
                </View>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Text
                    style={{
                      fontSize: 24,
                      color: colors.ink,
                      letterSpacing: -0.4,
                      ...fontStyle(design.display, 800),
                    }}
                  >
                    {formatarReais(precoFinal)}
                  </Text>
                  {temPromo && (
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.inkSoft,
                        textDecorationLine: 'line-through',
                        ...fontStyle(design.body, 400),
                      }}
                    >
                      {formatarReais(produto.preco)}
                    </Text>
                  )}
                </View>

                <Animated.View style={{ transform: [{ scale: escalaMais }] }}>
                  <TouchableOpacity
                    onPress={aoTocarMais}
                    activeOpacity={0.85}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: colors.ink,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ConsumerIcon
                      name={adicionado ? 'check' : 'plus'}
                      size={20}
                      color={colors.canvas}
                      strokeWidth={2.4}
                    />
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>
          </BlurView>
          </View>
        </View>

        {/* Seleção de variações/modificadores por cima, quando existirem */}
        {mostrarOpcoes && (
          <ModalProduto
            produto={produto}
            loja={loja}
            onFechar={() => setMostrarOpcoes(false)}
          />
        )}

        {/* Guarda de troca de loja (adição direta) */}
        {trocandoLoja && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(17, 18, 22, 0.5)',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 360,
                borderRadius: 24,
                backgroundColor: colors.surface,
                padding: 20,
                gap: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  color: colors.ink,
                  ...fontStyle(design.display, 800),
                }}
              >
                Trocar de loja?
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.inkMuted,
                  lineHeight: 20,
                  ...fontStyle(design.body, 500),
                }}
              >
                Seu carrinho atual será esvaziado para adicionar itens de{' '}
                <Text style={{ color: colors.ink, ...fontStyle(design.body, 700) }}>
                  {loja.nome}
                </Text>
                .
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Botao
                    label="Cancelar"
                    onPress={() => setTrocandoLoja(false)}
                    variante="ghost"
                    tamanho="md"
                  />
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
