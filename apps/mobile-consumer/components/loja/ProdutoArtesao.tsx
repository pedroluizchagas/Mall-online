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
 * PDP artesão — a peça em tela cheia com a narrativa de materialidade.
 *
 * Mesmos ossos dos PDPs irmãos (galeria full-bleed via metadata.galeria,
 * scrim de rampa única, adição direta vs. ModalProduto p/ variações), com a
 * assinatura da referência Graft: FICHA TÉCNICA — linhas "Dimensões /
 * Material / Acabamento" separadas por fios, lidas de
 * `metadata.especificacoes` (pares rótulo/valor); sem specs, cai na
 * descrição. Cartão creme de cantos generosos e CTA pill sólida com seta.
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

export function ProdutoArtesao({ produto, loja, onFechar }: Props) {
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

  // Ficha técnica: pares [rótulo, valor] em metadata.especificacoes.
  const especificacoes = Array.isArray((produto.metadata as any)?.especificacoes)
    ? (((produto.metadata as any).especificacoes as [string, string][]) ?? [])
        .filter((par) => Array.isArray(par) && par.length === 2)
        .slice(0, 3)
    : []

  const precoFinal = produto.preco_promocional ?? produto.preco
  const temPromo = !!produto.preco_promocional

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
        toValue: 0.96,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(escalaCta, {
        toValue: 1,
        speed: 20,
        bounciness: 5,
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
            <ConsumerIcon name="back" size={22} color="#FFFFFF" strokeWidth={1.9} />
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
            <ConsumerIcon name="bag" size={22} color="#FFFFFF" strokeWidth={1.9} />
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

        {/* Marcadores + cartão creme com ficha técnica */}
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
                    width: i === fotoAtiva ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor:
                      i === fotoAtiva ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
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
            <View>
              <Text
                style={{
                  fontSize: 10,
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  color: colors.accent,
                  marginBottom: 4,
                  ...fontStyle(design.body, 700),
                }}
              >
                {loja.nome}
              </Text>
              <Text
                numberOfLines={2}
                style={{
                  fontSize: Math.round(22 * design.typeFactor),
                  lineHeight: Math.round(28 * design.typeFactor),
                  color: colors.ink,
                  ...fontStyle(design.display, 600),
                }}
              >
                {produto.nome}
              </Text>
            </View>

            {/* Ficha técnica (narrativa de materialidade) ou descrição */}
            {especificacoes.length > 0 ? (
              <View>
                {especificacoes.map(([rotulo, valor], i) => (
                  <View
                    key={rotulo}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 12,
                      paddingVertical: 8,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: colors.line,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.ink,
                        ...fontStyle(design.body, 700),
                      }}
                    >
                      {rotulo}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        textAlign: 'right',
                        fontSize: 12,
                        color: colors.inkMuted,
                        ...fontStyle(design.body, 400),
                      }}
                    >
                      {valor}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              produto.descricao && (
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
              )
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
                    ...fontStyle(design.display, 700),
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

              {/* CTA pill sólida com seta, como os botões da referência */}
              <Animated.View style={{ transform: [{ scale: escalaCta }] }}>
                <TouchableOpacity
                  onPress={aoTocarCta}
                  activeOpacity={0.85}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 22,
                    paddingVertical: 12,
                    borderRadius: 999,
                    backgroundColor: colors.accent,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.accentInk,
                      ...fontStyle(design.body, 600),
                    }}
                  >
                    {adicionado ? 'Na sacola ✓' : 'Adicionar'}
                  </Text>
                  {!adicionado && (
                    <Text style={{ fontSize: 15, color: colors.accentInk }}>→</Text>
                  )}
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
              backgroundColor: 'rgba(43, 39, 31, 0.5)',
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
                  ...fontStyle(design.display, 600),
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
