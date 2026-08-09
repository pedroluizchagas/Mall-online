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
 * PDP volt — o produto em tela cheia com energia de performance.
 *
 * Mesmos ossos dos PDPs irmãos (galeria full-bleed via metadata.galeria,
 * scrim de rampa única, adição direta vs. ModalProduto p/ variações), pele
 * volt: cartão branco de cantos generosos, chip de desconto vermelho, nome
 * em CAPS pesadas, preço promocional em vermelho e CTA em PILL PRETA de
 * largura cheia que pisca no accent ao confirmar.
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

export function ProdutoVolt({ produto, loja, onFechar }: Props) {
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
  const escalaCta = useRef(new Animated.Value(1)).current

  const galeria = Array.isArray((produto.metadata as any)?.galeria)
    ? ((produto.metadata as any).galeria as string[])
    : []
  const fotos = galeria.length > 0 ? galeria : produto.foto_url ? [produto.foto_url] : []

  const precoFinal = produto.preco_promocional ?? produto.preco
  const temPromo = !!produto.preco_promocional
  const desconto = temPromo
    ? Math.round((1 - precoFinal / produto.preco) * 100)
    : 0

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
    setTimeout(() => setAdicionado(false), 1200)
  }

  function aoTocarCta() {
    Animated.sequence([
      Animated.timing(escalaCta, {
        toValue: 0.96,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(escalaCta, {
        toValue: 1,
        speed: 24,
        bounciness: 7,
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
      <View style={{ flex: 1, backgroundColor: colors.canvasAlt }}>
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
            <ConsumerIcon name="back" size={23} color="#FFFFFF" strokeWidth={2.2} />
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
            <ConsumerIcon name="bag" size={22} color="#FFFFFF" strokeWidth={2.2} />
            {totalItens > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 3,
                  right: 0,
                  minWidth: 17,
                  height: 17,
                  borderRadius: 9,
                  backgroundColor: colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    color: colors.accentInk,
                    fontWeight: '800',
                  }}
                >
                  {totalItens}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Marcadores em pills + cartão branco */}
        <View
          style={{
            position: 'absolute',
            left: 14,
            right: 14,
            bottom: insets.bottom + 14,
          }}
        >
          {fotos.length > 1 && (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 6,
                marginBottom: 12,
                marginRight: 4,
              }}
            >
              {fotos.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: i === fotoAtiva ? 20 : 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor:
                      i === fotoAtiva ? colors.accent : 'rgba(255,255,255,0.55)',
                  }}
                />
              ))}
            </View>
          )}

          <View
            style={[
              {
                backgroundColor: colors.surface,
                borderRadius: design.radius.xl,
                padding: 18,
                gap: 12,
              },
              consumerDesign.shadow.medium,
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 10,
                    letterSpacing: 1.8,
                    textTransform: 'uppercase',
                    color: colors.inkMuted,
                    marginBottom: 4,
                    ...fontStyle(design.body, 600),
                  }}
                >
                  {loja.nome}
                </Text>
                <Text
                  numberOfLines={2}
                  style={{
                    fontSize: Math.round(22 * design.typeFactor),
                    lineHeight: Math.round(26 * design.typeFactor),
                    letterSpacing: -0.4,
                    textTransform: 'uppercase',
                    color: colors.ink,
                    ...fontStyle(design.display, 800),
                  }}
                >
                  {produto.nome}
                </Text>
              </View>
              {desconto > 0 && (
                <View
                  style={{
                    backgroundColor: colors.danger,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 999,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#FFFFFF',
                      ...fontStyle(design.body, 700),
                    }}
                  >
                    -{desconto}%
                  </Text>
                </View>
              )}
            </View>

            {produto.descricao && (
              <Text
                numberOfLines={2}
                style={{
                  fontSize: 13,
                  lineHeight: 19,
                  color: colors.inkMuted,
                  ...fontStyle(design.body, 400),
                }}
              >
                {produto.descricao}
              </Text>
            )}

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                gap: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 24,
                  letterSpacing: -0.4,
                  color: temPromo ? colors.danger : colors.ink,
                  ...fontStyle(design.display, 800),
                }}
              >
                {formatarReais(precoFinal)}
              </Text>
              {temPromo && (
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.inkSoft,
                    textDecorationLine: 'line-through',
                    ...fontStyle(design.body, 400),
                  }}
                >
                  {formatarReais(produto.preco)}
                </Text>
              )}
            </View>

            {/* Pill preta de largura cheia que pisca no accent ao confirmar */}
            <Animated.View style={{ transform: [{ scale: escalaCta }] }}>
              <TouchableOpacity
                onPress={aoTocarCta}
                activeOpacity={0.85}
                style={{
                  paddingVertical: 15,
                  alignItems: 'center',
                  borderRadius: 999,
                  backgroundColor: adicionado ? colors.accent : colors.ink,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                    color: adicionado ? colors.accentInk : colors.canvas,
                    ...fontStyle(design.body, 700),
                  }}
                >
                  {adicionado ? 'Adicionado ✓' : 'Adicionar à sacola'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
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
              backgroundColor: 'rgba(12, 14, 8, 0.5)',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <View
              style={[
                {
                  width: '100%',
                  maxWidth: 360,
                  backgroundColor: colors.surface,
                  borderRadius: design.radius.xl,
                  padding: 20,
                  gap: 12,
                },
                consumerDesign.shadow.medium,
              ]}
            >
              <Text
                style={{
                  fontSize: 18,
                  textTransform: 'uppercase',
                  letterSpacing: -0.2,
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
                  ...fontStyle(design.body, 400),
                }}
              >
                Sua sacola atual será esvaziada para adicionar itens de{' '}
                <Text style={{ color: colors.ink, ...fontStyle(design.body, 600) }}>
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
