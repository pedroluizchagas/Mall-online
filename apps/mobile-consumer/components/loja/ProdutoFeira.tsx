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
import { ModalProduto } from '@/components/ModalProduto'
import { Botao } from '@/components/ui/Botao'
import { useCartStore } from '@/store/useCartStore'
import { supabase } from '@/lib/supabase'
import {
  BotaoFeira,
  CREME_FEIRA,
  SeloOferta,
  VERDE_MATA,
  comAlfa,
} from '@/components/loja/feira-ui'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * PDP feira — a peça no mesmo cartão claro da grade, em tela cheia.
 *
 * A ficha repete a âncora da vitrine: preço grande com a UNIDADE ao lado, que
 * é como uma quitanda vende. O CTA é lima (a cor de ação) e, ao confirmar,
 * vira o VERDE-MATA da casa.
 *
 * Mesmos ossos dos PDPs irmãos: galeria via `metadata.galeria`, adição direta
 * vs. `ModalProduto` para variações, guarda de troca de loja e CTA que pisca.
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

export function ProdutoFeira({ produto, loja, onFechar }: Props) {
  const design = useStoreDesign()
  const { colors, spacing, typeFactor } = design
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
  const paginas =
    galeria.length > 0 ? galeria : produto.foto_url ? [produto.foto_url] : []

  const meta = produto.metadata as {
    unidade?: string
    especificacoes?: [string, string][]
  } | null
  const unidade =
    typeof meta?.unidade === 'string' && meta.unidade.trim()
      ? meta.unidade.trim()
      : null
  const especificacoes = Array.isArray(meta?.especificacoes)
    ? meta.especificacoes
    : []

  const precoFinal = produto.preco_promocional ?? produto.preco
  const temPromo =
    !!produto.preco_promocional && produto.preco_promocional < produto.preco

  const larguraPalco = TELA_W - spacing.screenX * 2
  const alturaPalco = Math.round(larguraPalco * 0.92)

  useEffect(() => {
    let cancelado = false
    const consultar = (tabela: string) =>
      (supabase as any).from(tabela).select('id').eq('product_id', produto.id)

    Promise.all([
      consultar('product_option_groups'),
      consultar('product_modifier_groups'),
    ])
      .then(([opts, mods]: any[]) => {
        if (cancelado) return
        // O supabase-js NÃO rejeita em falha de rede: resolve com
        // `{ data: null, error }`. Sem resposta confiável, o caminho seguro é
        // assumir que HÁ escolha a fazer e abrir o modal de variações — nunca
        // adicionar no escuro.
        if (opts?.error || mods?.error || !opts?.data || !mods?.data) {
          setTemOpcoes(true)
          return
        }
        setTemOpcoes(opts.data.length + mods.data.length > 0)
      })
      .catch(() => {
        if (!cancelado) setTemOpcoes(true)
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
        speed: 22,
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
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <StatusBar style="dark" />

        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: insets.top + 8,
            left: spacing.screenX,
            right: spacing.screenX,
            zIndex: 20,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <BotaoFeira icone="close" aoTocar={onFechar} />
          <BotaoFeira
            icone="bag"
            contador={totalItens}
            aoTocar={() => {
              if (totalItens === 0) return
              onFechar()
              router.push('/checkout')
            }}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + 74,
            paddingBottom: insets.bottom + 130,
          }}
        >
          {/* PALCO: o mesmo cartão claro da grade, agora em tela cheia */}
          <View
            style={{
              marginHorizontal: spacing.screenX,
              height: alturaPalco,
              borderRadius: 24,
              backgroundColor: colors.surfaceMuted,
              overflow: 'hidden',
            }}
          >
            {paginas.length > 0 && (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                // Largura explícita: sem ela a ScrollView se dimensiona pelo
                // CONTEÚDO e a paginação sai de passo.
                style={{ width: larguraPalco }}
                onMomentumScrollEnd={(e) =>
                  setFotoAtiva(
                    Math.round(e.nativeEvent.contentOffset.x / larguraPalco),
                  )
                }
              >
                {paginas.map((uri, i) => (
                  <Image
                    key={i}
                    source={{ uri }}
                    style={{ width: larguraPalco, height: alturaPalco }}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            )}

            {temPromo && (
              <SeloOferta style={{ position: 'absolute', top: 14, left: 14 }} />
            )}

            {paginas.length > 1 && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 14,
                  flexDirection: 'row',
                  justifyContent: 'center',
                }}
              >
                {/* Cápsula por baixo: os pontos caem sobre a FOTO, e fruta em
                    fundo escuro engoliria pontos de tinta. */}
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 6,
                    paddingHorizontal: 9,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: comAlfa('#000000', 0.38),
                  }}
                >
                  {paginas.map((_, i) => (
                    <View
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: '#FFFFFF',
                        opacity: i === fotoAtiva ? 1 : 0.4,
                      }}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Ficha: o preço grande com a unidade ao lado — a venda da feira */}
          <View style={{ paddingHorizontal: spacing.screenX, marginTop: 24 }}>
            <Text
              style={{
                fontSize: Math.round(24 * typeFactor),
                lineHeight: Math.round(31 * typeFactor),
                color: colors.ink,
                ...fontStyle(design.display, 700),
              }}
            >
              {produto.nome}
            </Text>

            <View
              style={{
                marginTop: 12,
                flexDirection: 'row',
                alignItems: 'baseline',
                flexWrap: 'wrap',
              }}
            >
              <Text
                style={{
                  fontSize: Math.round(26 * typeFactor),
                  color: colors.ink,
                  ...fontStyle(design.display, 700),
                }}
              >
                {formatarReais(precoFinal)}
              </Text>
              {unidade && (
                <Text
                  style={{
                    marginLeft: 4,
                    fontSize: 14,
                    color: colors.inkMuted,
                    ...fontStyle(design.body, 500),
                  }}
                >
                  /{unidade}
                </Text>
              )}
              {temPromo && (
                <Text
                  style={{
                    marginLeft: 10,
                    fontSize: 14,
                    color: colors.inkMuted,
                    textDecorationLine: 'line-through',
                    ...fontStyle(design.body, 400),
                  }}
                >
                  {formatarReais(produto.preco)}
                </Text>
              )}
            </View>

            <Text
              numberOfLines={1}
              style={{
                marginTop: 14,
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: colors.inkMuted,
                ...fontStyle(design.body, 600),
              }}
            >
              {loja.nome}
            </Text>

            {produto.descricao && (
              <Text
                style={{
                  marginTop: 12,
                  fontSize: 15,
                  lineHeight: 23,
                  color: colors.inkMuted,
                  ...fontStyle(design.body, 400),
                }}
              >
                {produto.descricao}
              </Text>
            )}

            {especificacoes.length > 0 && (
              <View
                style={{
                  marginTop: 20,
                  borderTopWidth: 1,
                  borderTopColor: colors.line,
                }}
              >
                {especificacoes.map(([rotulo, valor]) => (
                  <View
                    key={rotulo}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      gap: 14,
                      paddingVertical: 11,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.line,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.inkMuted,
                        ...fontStyle(design.body, 400),
                      }}
                    >
                      {rotulo}
                    </Text>
                    <Text
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
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Barra de compra: lima de ação que vira o verde da casa */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: spacing.screenX,
            paddingTop: 14,
            paddingBottom: Math.max(insets.bottom, 14),
            backgroundColor: colors.canvas,
            borderTopWidth: 1,
            borderTopColor: colors.line,
          }}
        >
          <Animated.View style={{ transform: [{ scale: escalaCta }] }}>
            <TouchableOpacity
              onPress={aoTocarCta}
              activeOpacity={0.88}
              style={{
                paddingVertical: 17,
                alignItems: 'center',
                borderRadius: 999,
                backgroundColor: adicionado ? VERDE_MATA : colors.accent,
              }}
            >
              <Text
                style={{
                  fontSize: 12.5,
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  color: adicionado ? CREME_FEIRA : colors.accentInk,
                  ...fontStyle(design.body, 700),
                }}
              >
                {adicionado
                  ? 'NA SACOLA  ✓'
                  : `Adicionar  ·  ${formatarReais(precoFinal)}`}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Variações por cima (peso, maturação, embalagem...) */}
        {mostrarOpcoes && (
          <ModalProduto
            produto={produto}
            loja={loja}
            onFechar={() => setMostrarOpcoes(false)}
          />
        )}

        {/* Guarda de troca de loja — acima do chrome (zIndex 20) */}
        {trocandoLoja && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 40,
              backgroundColor: comAlfa(colors.ink, 0.5),
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
                  borderRadius: 24,
                  padding: 24,
                  gap: 12,
                },
                consumerDesign.shadow.medium,
              ]}
            >
              <Text
                style={{
                  fontSize: 20,
                  color: colors.ink,
                  ...fontStyle(design.display, 700),
                }}
              >
                Trocar de loja?
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 21,
                  color: colors.inkMuted,
                  ...fontStyle(design.body, 400),
                }}
              >
                Sua sacola atual será esvaziada para adicionar itens de{' '}
                <Text style={{ ...fontStyle(design.body, 700) }}>
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
