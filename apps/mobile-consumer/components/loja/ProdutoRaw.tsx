import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  type TextStyle,
} from 'react-native'
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
import { SCRIM_TOPO } from '@/components/loja/gradientes'

/**
 * PDP raw/street — a peça em tela cheia com o acabamento brutalista.
 *
 * Mesmos ossos do ProdutoEditorial (galeria full-bleed via metadata.galeria,
 * scrim de rampa única, adição direta vs. ModalProduto p/ variações), pele
 * oposta: painel opaco escuro com MOLDURA no accent, cantos retos, nome em
 * MONO caps, tag de desconto e botão "+" QUADRADO — sem vidro, sem sombra.
 */

const { width: TELA_W } = Dimensions.get('window')

const MONO_FAMILY = Platform.select({ ios: 'Menlo', default: 'monospace' })
const mono = (peso: TextStyle['fontWeight'] = '400'): TextStyle => ({
  fontFamily: MONO_FAMILY,
  fontWeight: peso,
})

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

export function ProdutoRaw({ produto, loja, onFechar }: Props) {
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
  const [temOpcoes, setTemOpcoes] = useState<boolean | null>(null)
  const escalaMais = useRef(new Animated.Value(1)).current

  const galeria = Array.isArray((produto.metadata as any)?.galeria)
    ? ((produto.metadata as any).galeria as string[])
    : []
  const fotos = galeria.length > 0 ? galeria : produto.foto_url ? [produto.foto_url] : []

  const precoFinal = produto.preco_promocional ?? produto.preco
  const temPromo = !!produto.preco_promocional
  const desconto = temPromo
    ? Math.round((1 - precoFinal / produto.preco) * 100)
    : 0

  // Streetwear vive de tamanho/cor: com variações, o "+" delega ao ModalProduto.
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
        setTemOpcoes(((opts.data?.length ?? 0) + (mods.data?.length ?? 0)) > 0)
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
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <StatusBar style="light" />

        {/* Galeria full-bleed */}
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

        {/* Scrim do topo */}
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
                  backgroundColor: colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                }}
              >
                <Text
                  style={{ fontSize: 9, color: colors.accentInk, ...mono('700') }}
                >
                  {totalItens}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Marcadores da galeria (quadrados) + painel com moldura */}
        <View
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: insets.bottom + 14,
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
                marginRight: 4,
              }}
            >
              {fotos.map((_, i) => (
                <View
                  key={i}
                  style={
                    i === fotoAtiva
                      ? { width: 8, height: 8, backgroundColor: colors.accent }
                      : {
                          width: 4,
                          height: 4,
                          backgroundColor: 'rgba(255,255,255,0.6)',
                        }
                  }
                />
              ))}
            </View>
          )}

          <View
            style={{
              backgroundColor: colors.surface,
              borderWidth: 2,
              borderColor: colors.accent,
              padding: 14,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {produto.foto_url && (
                <Image
                  source={{ uri: produto.foto_url }}
                  style={{
                    width: 84,
                    height: 84,
                    borderWidth: 1,
                    borderColor: colors.line,
                    backgroundColor: colors.surfaceMuted,
                  }}
                  resizeMode="cover"
                />
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <Text
                    numberOfLines={2}
                    style={{
                      flex: 1,
                      fontSize: 15,
                      lineHeight: 20,
                      color: colors.ink,
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      ...mono('700'),
                    }}
                  >
                    {produto.nome}
                  </Text>
                  {desconto > 0 && (
                    <View
                      style={{
                        backgroundColor: colors.accent,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          color: colors.accentInk,
                          letterSpacing: 0.6,
                          ...mono('700'),
                        }}
                      >
                        {desconto}% OFF
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    marginTop: 4,
                    fontSize: 10,
                    letterSpacing: 1.6,
                    color: colors.inkMuted,
                    textTransform: 'uppercase',
                    ...mono('400'),
                  }}
                >
                  {loja.nome}
                </Text>
                {produto.descricao && (
                  <Text
                    numberOfLines={2}
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      lineHeight: 16,
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
              <View
                style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}
              >
                <Text
                  style={{
                    fontSize: 22,
                    color: colors.ink,
                    letterSpacing: -0.3,
                    ...fontStyle(design.display, 800),
                  }}
                >
                  {formatarReais(precoFinal)}
                </Text>
                {temPromo && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.inkMuted,
                      textDecorationLine: 'line-through',
                      ...mono('400'),
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
                    width: 46,
                    height: 46,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ConsumerIcon
                    name={adicionado ? 'check' : 'plus'}
                    size={20}
                    color={colors.accentInk}
                    strokeWidth={2.6}
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </View>

        {/* Variações/modificadores por cima, quando existirem */}
        {mostrarOpcoes && (
          <ModalProduto
            produto={produto}
            loja={loja}
            onFechar={() => setMostrarOpcoes(false)}
          />
        )}

        {/* Guarda de troca de loja */}
        {trocandoLoja && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 360,
                backgroundColor: colors.surface,
                borderWidth: 2,
                borderColor: colors.accent,
                padding: 20,
                gap: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: colors.ink,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  ...mono('700'),
                }}
              >
                Trocar de loja?
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.inkMuted,
                  lineHeight: 19,
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
