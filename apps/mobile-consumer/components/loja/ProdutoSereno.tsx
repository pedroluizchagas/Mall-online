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
 * PDP sereno — a peça em tela cheia com o acabamento delicado.
 *
 * Mesmos ossos dos PDPs editorial/raw (galeria full-bleed via
 * metadata.galeria, scrim de rampa única, adição direta vs. ModalProduto p/
 * variações), pele serena: cartão BRANCO sólido de cantos generosos, título
 * em peso leve (sentence case), chip de promo branco/vermelho, indicadores
 * de linha e CTA fantasma de largura cheia — "Adicionar à sacola" — que se
 * preenche na cor ardósia ao confirmar.
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

export function ProdutoSereno({ produto, loja, onFechar }: Props) {
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
    setTimeout(() => setAdicionado(false), 1300)
  }

  function aoTocarCta() {
    Animated.sequence([
      Animated.timing(escalaCta, {
        toValue: 0.97,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(escalaCta, {
        toValue: 1,
        speed: 20,
        bounciness: 4,
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
            <ConsumerIcon
              name="chevron-left"
              size={24}
              color="#FFFFFF"
              strokeWidth={1.9}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (totalItens === 0) return
              onFechar()
              router.push('/checkout')
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ height: 40, justifyContent: 'center' }}
          >
            <Text
              style={{
                fontSize: 14,
                color: '#FFFFFF',
                ...fontStyle(design.body, 500),
              }}
            >
              Sacola ({totalItens})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Indicadores de linha + cartão branco */}
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
                justifyContent: 'center',
                gap: 8,
                marginBottom: 14,
              }}
            >
              {fotos.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 30,
                    height: 2,
                    borderRadius: 1,
                    backgroundColor:
                      i === fotoAtiva ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
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
              consumerDesign.shadow.soft,
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
                  numberOfLines={2}
                  style={{
                    fontSize: Math.round(21 * design.typeFactor),
                    lineHeight: Math.round(27 * design.typeFactor),
                    color: colors.ink,
                    ...fontStyle(design.display, 400),
                  }}
                >
                  {produto.nome}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    marginTop: 3,
                    fontSize: 11,
                    letterSpacing: 1.6,
                    textTransform: 'uppercase',
                    color: colors.inkMuted,
                    ...fontStyle(design.body, 500),
                  }}
                >
                  {loja.nome}
                </Text>
              </View>
              {desconto > 0 && (
                <View
                  style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.line,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.danger,
                      ...fontStyle(design.body, 500),
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
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 20,
                    color: colors.ink,
                    ...fontStyle(design.display, 500),
                  }}
                >
                  {formatarReais(precoFinal)}
                </Text>
                {temPromo && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.inkSoft,
                      textDecorationLine: 'line-through',
                      ...fontStyle(design.body, 400),
                    }}
                  >
                    {formatarReais(produto.preco)}
                  </Text>
                )}
              </View>

              {/* CTA fantasma que se preenche ao confirmar */}
              <Animated.View
                style={{ flex: 1, transform: [{ scale: escalaCta }] }}
              >
                <TouchableOpacity
                  onPress={aoTocarCta}
                  activeOpacity={0.8}
                  style={{
                    paddingVertical: 13,
                    alignItems: 'center',
                    borderRadius: design.radius.md,
                    borderWidth: 1.2,
                    borderColor: adicionado ? colors.accent : colors.ink,
                    backgroundColor: adicionado ? colors.accent : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: adicionado ? colors.accentInk : colors.ink,
                      ...fontStyle(design.body, 500),
                    }}
                  >
                    {adicionado ? 'Adicionado ✓' : 'Adicionar à sacola'}
                  </Text>
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
              backgroundColor: 'rgba(28, 36, 34, 0.45)',
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
                  color: colors.ink,
                  ...fontStyle(design.display, 500),
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
