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

/**
 * PDP clínico — informação antes de espetáculo.
 *
 * Diferente dos PDPs full-bleed dos outros arquétipos: aqui a foto fica em
 * PALCO BRANCO contido (produto de farmácia recortado não sustenta capa
 * dramática) e o painel prioriza INFORMAÇÃO: aviso de receita médica em
 * destaque (metadata.exige_receita — mesmo contrato do ModalProduto), linhas
 * de entrega/procedência com fios e CTA sólido no verde-água.
 *
 * Mesmos ossos dos irmãos: galeria (metadata.galeria), adição direta vs.
 * ModalProduto para variações, guarda de troca de loja.
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
  tempo_entrega?: number | null
  categoria_slug?: string | null
}

interface Props {
  produto: ProdutoPdp
  loja: LojaPdp
  onFechar: () => void
}

export function ProdutoClinico({ produto, loja, onFechar }: Props) {
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
  const exigeReceita = (produto.metadata as any)?.exige_receita === true

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
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <StatusBar style="dark" />

        {/* Header claro fixo */}
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingBottom: 10,
            paddingHorizontal: 16,
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.line,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity
            onPress={onFechar}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ width: 40, height: 32, justifyContent: 'center' }}
          >
            <ConsumerIcon name="chevron-left" size={22} color={colors.ink} strokeWidth={2} />
          </TouchableOpacity>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 15,
              color: colors.inkMuted,
              ...fontStyle(design.body, 600),
            }}
          >
            Detalhes do produto
          </Text>
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
              height: 32,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ConsumerIcon name="bag" size={21} color={colors.ink} strokeWidth={2} />
            {totalItens > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: -2,
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
                <Text style={{ fontSize: 10, color: colors.accentInk, fontWeight: '700' }}>
                  {totalItens}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Galeria em palco branco contido */}
          <View
            style={{
              margin: 16,
              backgroundColor: colors.surface,
              borderRadius: design.radius.lg,
              borderWidth: 1,
              borderColor: colors.line,
              overflow: 'hidden',
            }}
          >
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) =>
                setFotoAtiva(
                  Math.round(e.nativeEvent.contentOffset.x / (TELA_W - 32)),
                )
              }
            >
              {fotos.length > 0 ? (
                fotos.map((uri, i) => (
                  <Image
                    key={i}
                    source={{ uri }}
                    style={{ width: TELA_W - 32, height: 280 }}
                    resizeMode="cover"
                  />
                ))
              ) : (
                <View
                  style={{
                    width: TELA_W - 32,
                    height: 280,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ConsumerIcon name="bag" size={48} color={colors.inkSoft} />
                </View>
              )}
            </ScrollView>
            {fotos.length > 1 && (
              <View
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 0,
                  right: 0,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {fotos.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: i === fotoAtiva ? 16 : 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor:
                        i === fotoAtiva ? colors.accent : colors.line,
                    }}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Informação */}
          <View style={{ paddingHorizontal: 20, gap: 14 }}>
            <View>
              <Text
                style={{
                  fontSize: 20,
                  lineHeight: 26,
                  color: colors.ink,
                  ...fontStyle(design.display, 700),
                }}
              >
                {produto.nome}
              </Text>
              {produto.descricao && (
                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 14,
                    lineHeight: 20,
                    color: colors.inkMuted,
                    ...fontStyle(design.body, 400),
                  }}
                >
                  {produto.descricao}
                </Text>
              )}
            </View>

            {/* Aviso de receita — mesmo contrato do ModalProduto */}
            {exigeReceita && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: 12,
                  borderRadius: design.radius.md,
                  backgroundColor: 'rgba(232, 163, 61, 0.16)',
                  borderWidth: 1,
                  borderColor: 'rgba(232, 163, 61, 0.45)',
                }}
              >
                <ConsumerIcon name="file" size={18} color={colors.warning} strokeWidth={2} />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    lineHeight: 18,
                    color: colors.ink,
                    ...fontStyle(design.body, 500),
                  }}
                >
                  <Text style={fontStyle(design.body, 700)}>
                    Exige receita médica.
                  </Text>{' '}
                  Apresente a receita ao finalizar o pedido — o farmacêutico
                  confere na entrega.
                </Text>
              </View>
            )}

            {/* Linhas informativas */}
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: design.radius.md,
                borderWidth: 1,
                borderColor: colors.line,
              }}
            >
              <LinhaInfo
                rotulo="Entrega"
                valor={
                  loja.tempo_entrega != null
                    ? `Hoje, em até ${loja.tempo_entrega} min`
                    : 'Entrega rápida'
                }
              />
              <LinhaInfo rotulo="Vendido por" valor={loja.nome} />
              <LinhaInfo rotulo="Procedência" valor="Produto original lacrado" ultima />
            </View>
          </View>
        </ScrollView>

        {/* Barra de compra fixa */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 14),
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.line,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 20,
                color: colors.accent,
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
          <Animated.View style={{ flex: 1, transform: [{ scale: escalaCta }] }}>
            <TouchableOpacity
              onPress={aoTocarCta}
              activeOpacity={0.85}
              style={{
                paddingVertical: 14,
                alignItems: 'center',
                borderRadius: 999,
                backgroundColor: adicionado ? colors.success : colors.accent,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  color: colors.accentInk,
                  ...fontStyle(design.body, 700),
                }}
              >
                {adicionado ? 'Adicionado ✓' : 'Adicionar'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
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
              backgroundColor: 'rgba(20, 48, 44, 0.45)',
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
                  borderRadius: design.radius.lg,
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
                  ...fontStyle(design.display, 700),
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

function LinhaInfo({
  rotulo,
  valor,
  ultima,
}: {
  rotulo: string
  valor: string
  ultima?: boolean
}) {
  const design = useStoreDesign()
  const { colors } = design
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderBottomWidth: ultima ? 0 : 1,
        borderBottomColor: colors.line,
      }}
    >
      <Text
        style={{ fontSize: 13, color: colors.inkMuted, ...fontStyle(design.body, 500) }}
      >
        {rotulo}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          textAlign: 'right',
          fontSize: 13,
          color: colors.ink,
          ...fontStyle(design.body, 600),
        }}
      >
        {valor}
      </Text>
    </View>
  )
}
