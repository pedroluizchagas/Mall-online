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
  BotaoAdesivo,
  SeloRecortado,
  comAlfa,
} from '@/components/loja/horta-ui'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * PDP horta — o item colado numa folha creme, no vocabulário da vitrine.
 *
 * O palco é um CARTÃO PASTEL (rosa ou caramelo, escolhido de forma estável
 * pelo id) com a foto escapando por cima da borda e o SELO RECORTADO girado
 * no canto — o mesmo cartão dos favoritos, agora em tela cheia. A ficha é
 * escrita direto no creme: nome em serifa macia, linha de ingredientes e
 * preço.
 *
 * Mesmos ossos dos PDPs irmãos: galeria via `metadata.galeria`, adição direta
 * vs. `ModalProduto` para variações, guarda de troca de loja e CTA que pisca
 * ao confirmar.
 */

const { width: TELA_W } = Dimensions.get('window')

// ── DNA fixo da vitrine horta (espelha as constantes de LojaHorta.tsx) ──
/** Rosa-pastel dos cartões e do CTA. */
const ROSA = '#F2BCC9'
/** Caramelo dos cartões alternados. */
const CARAMELO = '#DCA57F'
/** Tinta única de tudo que é escrito sobre os pastéis (7,68:1 no rosa). */
const TINTA_PASTEL = '#22391B'
/** Rótulo escrito direto no creme. */
const TAN_ROTULO = '#8A6038'

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

/**
 * Pastel do palco: estável por produto (o mesmo item abre sempre na mesma
 * cor) e alternado entre itens, como a fileira de favoritos da vitrine.
 */
function pastelDe(id: string): string {
  let soma = 0
  for (let i = 0; i < id.length; i++) soma += id.charCodeAt(i)
  return soma % 2 === 0 ? ROSA : CARAMELO
}

export function ProdutoHorta({ produto, loja, onFechar }: Props) {
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

  const recorte = (produto.metadata as { recorte?: string } | null)?.recorte
  const galeria = Array.isArray((produto.metadata as any)?.galeria)
    ? ((produto.metadata as any).galeria as string[])
    : []
  const fotos =
    galeria.length > 0 ? galeria : produto.foto_url ? [produto.foto_url] : []
  const paginas = recorte ? [recorte] : fotos

  const precoFinal = produto.preco_promocional ?? produto.preco
  const temPromo =
    !!produto.preco_promocional && produto.preco_promocional < produto.preco

  const pastel = pastelDe(produto.id)
  const larguraPalco = TELA_W - spacing.screenX * 2
  const alturaPalco = Math.round(TELA_W * 1.05)

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
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(escalaCta, {
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
        {/* A folha é clara do topo ao pé — ícones escuros o tempo todo. */}
        <StatusBar style="dark" />

        {/* Chrome: os mesmos botões-adesivo da vitrine. */}
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
          <BotaoAdesivo icone="close" aoTocar={onFechar} />
          <BotaoAdesivo
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
          {/* PALCO: cartão pastel com a foto escapando e o selo no canto */}
          <View
            style={{
              marginHorizontal: spacing.screenX,
              height: alturaPalco,
              borderRadius: 36,
              backgroundColor: pastel,
            }}
          >
            {paginas.length > 0 ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) =>
                  setFotoAtiva(
                    Math.round(e.nativeEvent.contentOffset.x / larguraPalco),
                  )
                }
              >
                {paginas.map((uri, i) => (
                  <View
                    key={i}
                    style={{
                      width: larguraPalco,
                      height: alturaPalco,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 18,
                      paddingVertical: 20,
                    }}
                  >
                    <Image
                      source={{ uri }}
                      style={{
                        width: '100%',
                        height: '100%',
                        // Recorte é cutout solto; foto comum entra emoldurada
                        // no pastel, como o cartão de favorito.
                        borderRadius: recorte ? 0 : 26,
                      }}
                      resizeMode={recorte ? 'contain' : 'cover'}
                    />
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            <SeloRecortado
              tamanho={Math.round(larguraPalco * 0.26)}
              cor={colors.accent}
              rotacao={10}
              style={{ position: 'absolute', top: -14, right: -8 }}
            >
              <Text
                style={{
                  fontSize: 11,
                  letterSpacing: 0.6,
                  color: colors.accentInk,
                  ...fontStyle(design.body, 700),
                }}
              >
                {temPromo ? 'oferta' : 'da casa'}
              </Text>
            </SeloRecortado>

            {paginas.length > 1 && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 16,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 7,
                }}
              >
                {paginas.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 3.5,
                      backgroundColor: TINTA_PASTEL,
                      opacity: i === fotoAtiva ? 1 : 0.3,
                    }}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Ficha direto no creme — sem cartão, como na vitrine */}
          <View style={{ paddingHorizontal: spacing.screenX, marginTop: 26 }}>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 11,
                letterSpacing: 1.8,
                textTransform: 'uppercase',
                color: TAN_ROTULO,
                ...fontStyle(design.body, 700),
              }}
            >
              {loja.nome}
            </Text>

            <Text
              style={{
                marginTop: 8,
                fontSize: Math.round(28 * typeFactor),
                lineHeight: Math.round(34 * typeFactor),
                color: colors.ink,
                ...fontStyle(design.display, 700),
              }}
            >
              {produto.nome}
            </Text>

            {produto.descricao && (
              <Text
                style={{
                  marginTop: 12,
                  fontSize: 15,
                  lineHeight: 23,
                  color: colors.inkMuted,
                  ...fontStyle(design.body, 500),
                }}
              >
                {produto.descricao}
              </Text>
            )}

            <View
              style={{
                marginTop: 20,
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: 10,
              }}
            >
              <Text
                style={{
                  fontSize: Math.round(30 * typeFactor),
                  color: colors.accent,
                  ...fontStyle(design.display, 700),
                }}
              >
                {formatarReais(precoFinal)}
              </Text>
              {temPromo && (
                <Text
                  style={{
                    fontSize: 15,
                    marginBottom: 5,
                    color: colors.inkMuted,
                    textDecorationLine: 'line-through',
                    ...fontStyle(design.body, 500),
                  }}
                >
                  {formatarReais(produto.preco)}
                </Text>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Barra de compra: pill ROSA que vira VERDE ao confirmar */}
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
                backgroundColor: adicionado ? colors.accent : ROSA,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  letterSpacing: 1.6,
                  textTransform: 'uppercase',
                  color: adicionado ? colors.accentInk : TINTA_PASTEL,
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

        {/* Variações/modificadores por cima (tamanho, complementos...) */}
        {mostrarOpcoes && (
          <ModalProduto
            produto={produto}
            loja={loja}
            onFechar={() => setMostrarOpcoes(false)}
          />
        )}

        {/* Guarda de troca de loja — cartão claro sobre véu escuro */}
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
                  borderRadius: 30,
                  padding: 24,
                  gap: 12,
                },
                consumerDesign.shadow.medium,
              ]}
            >
              <Text
                style={{
                  fontSize: 21,
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
                  ...fontStyle(design.body, 500),
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
