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
  BotaoPassarela,
  ChipEstoque,
  MonogramaCoroado,
  comAlfa,
} from '@/components/loja/passarela-ui'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * PDP passarela — a peça no mesmo palco cinza da grade, em tela cheia.
 *
 * A ficha repete a âncora da vitrine: NOME à esquerda, PREÇO à direita, tudo
 * escrito direto na página. O CTA é o único bloco de tinta cheia da tela e,
 * ao confirmar, INVERTE (pill claro com fio) em vez de mudar de cor — no mono
 * não há cor para onde ir, e é justamente esse o ponto.
 *
 * Mesmos ossos dos PDPs irmãos: galeria via `metadata.galeria`, adição direta
 * vs. `ModalProduto` para variações, guarda de troca de loja e CTA que pisca.
 */

const { width: TELA_W } = Dimensions.get('window')

/** Abaixo disto, a peça vira chip de escassez (espelha LojaPassarela). */
const ESTOQUE_BAIXO = 40

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

export function ProdutoPassarela({ produto, loja, onFechar }: Props) {
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

  const estoque = (produto.metadata as { estoque?: number } | null)?.estoque
  const precoFinal = produto.preco_promocional ?? produto.preco
  const temPromo =
    !!produto.preco_promocional && produto.preco_promocional < produto.preco
  const chip =
    typeof estoque === 'number' && estoque <= ESTOQUE_BAIXO
      ? `Só ${estoque} na loja`
      : temPromo
        ? 'Oferta'
        : null

  const larguraPalco = TELA_W - spacing.screenX * 2
  const alturaPalco = Math.round(larguraPalco * 1.2)

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
        {/* A página é clara do topo ao pé — ícones escuros o tempo todo. */}
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
          <BotaoPassarela icone="close" aoTocar={onFechar} />
          <BotaoPassarela
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
          {/* PALCO: o mesmo cartão cinza da grade, agora em tela cheia */}
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
                // CONTEÚDO (a soma das páginas) e a paginação sai de passo.
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

            {chip && (
              <ChipEstoque
                texto={chip}
                style={{ position: 'absolute', top: 14, left: 14 }}
              />
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
                  gap: 6,
                }}
              >
                {paginas.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: colors.ink,
                      opacity: i === fotoAtiva ? 1 : 0.28,
                    }}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Ficha: nome à esquerda, preço à direita — a âncora da vitrine */}
          <View style={{ paddingHorizontal: spacing.screenX, marginTop: 24 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 14,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontSize: Math.round(24 * typeFactor),
                  lineHeight: Math.round(31 * typeFactor),
                  color: colors.ink,
                  ...fontStyle(design.display, 700),
                }}
              >
                {produto.nome}
              </Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={{
                    fontSize: Math.round(20 * typeFactor),
                    color: colors.ink,
                    ...fontStyle(design.display, 700),
                  }}
                >
                  {formatarReais(precoFinal)}
                </Text>
                {temPromo && (
                  <Text
                    style={{
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
            </View>

            <Text
              numberOfLines={1}
              style={{
                marginTop: 14,
                fontSize: 11,
                letterSpacing: 2.4,
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
                  lineHeight: 24,
                  color: colors.inkMuted,
                  ...fontStyle(design.body, 400),
                }}
              >
                {produto.descricao}
              </Text>
            )}

            <MonogramaCoroado
              inicial={loja.nome.trim().charAt(0).toUpperCase()}
              tamanho={26}
              cor={comAlfa(colors.ink, 0.35)}
              style={{ marginTop: 34 }}
            />
          </View>
        </ScrollView>

        {/* Barra de compra: o único bloco de tinta cheia — ao confirmar,
            INVERTE para claro com fio (no mono não há cor para onde ir). */}
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
                backgroundColor: adicionado ? colors.canvas : colors.accent,
                borderWidth: 1,
                borderColor: adicionado ? colors.ink : colors.accent,
              }}
            >
              <Text
                style={{
                  fontSize: 12.5,
                  letterSpacing: 1.6,
                  textTransform: 'uppercase',
                  color: adicionado ? colors.ink : colors.accentInk,
                  ...fontStyle(design.body, 600),
                }}
              >
                {adicionado
                  ? 'NA SACOLA  ✓'
                  : `Adicionar à sacola  ·  ${formatarReais(precoFinal)}`}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Variações por cima (tamanho, cor...) */}
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
                Sua sacola atual será esvaziada para adicionar peças de{' '}
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
