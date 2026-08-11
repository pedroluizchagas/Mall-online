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
  type TextStyle,
} from 'react-native'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Archivo_900Black } from '@expo-google-fonts/archivo'
import { useFonts } from 'expo-font'
import { formatarReais } from '@mallevo/lib'
import { ModalProduto } from '@/components/ModalProduto'
import { Botao } from '@/components/ui/Botao'
import { useCartStore } from '@/store/useCartStore'
import { supabase } from '@/lib/supabase'
import {
  BotaoForno,
  CirculosConcentricos,
  Coroa,
  PizzaRedonda,
  comAlfa,
} from '@/components/loja/forno-ui'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * PDP forno — o item no ALVO, no vocabulário da vitrine.
 *
 * O palco é o gesto do cartão vermelho da referência trazido para o creme: os
 * anéis concêntricos desenhados em vermelho sobre a página e a pizza em
 * recorte redondo no centro deles, com o badge coroado girado no canto. A
 * ficha é escrita direto no creme, com o nome em caps esmagadas.
 *
 * Mesmos ossos dos PDPs irmãos: galeria via `metadata.galeria`, adição direta
 * vs. `ModalProduto` para variações, guarda de troca de loja e CTA que pisca
 * ao confirmar.
 */

const { width: TELA_W } = Dimensions.get('window')

// ── DNA fixo da vitrine forno (espelha as constantes de LojaForno.tsx) ──
/** Preto de forno: o CTA confirmado e o véu da guarda de troca de loja. */
const PRETO_FORNO = '#1A150F'
/** Ouro do wordmark e do "NA SACOLA ✓" sobre o preto (8,66:1). */
const OURO = '#F2A31B'

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

/** A Archivo Black 900 do layout — mesmo hook local da vitrine. */
function useFonteForno(): { black: TextStyle } {
  const { display } = useStoreDesign()
  const [pronta] = useFonts({ Archivo_900Black })
  return {
    black: pronta ? { fontFamily: 'Archivo_900Black' } : fontStyle(display, 800),
  }
}

export function ProdutoForno({ produto, loja, onFechar }: Props) {
  const design = useStoreDesign()
  const { colors, spacing, typeFactor } = design
  const insets = useSafeAreaInsets()
  const { black } = useFonteForno()

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

  const larguraPalco = TELA_W - spacing.screenX * 2
  const alvo = Math.round(larguraPalco * 0.98)
  const disco = Math.round(alvo * 0.72)

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

        {/* Chrome: os mesmos botões redondos da vitrine. */}
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
          <BotaoForno icone="close" aoTocar={onFechar} />
          <BotaoForno
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
          {/* PALCO: o alvo de anéis com a pizza no centro e o selo coroado */}
          <View
            style={{
              marginHorizontal: spacing.screenX,
              height: alvo,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CirculosConcentricos
              tamanho={alvo}
              cor={comAlfa(colors.accent, 0.22)}
              style={{ position: 'absolute' }}
            />

            {paginas.length > 0 ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                // Largura explícita: o palco centra os filhos (para a pizza
                // pousar no meio dos anéis), e sem isso a ScrollView se
                // dimensionaria pelo CONTEÚDO — a soma das páginas —, largando
                // a paginação da galeria fora de passo.
                style={{ width: larguraPalco }}
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
                      height: alvo,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {recorte ? (
                      // Recorte transparente é cutout solto: entra inteiro, sem
                      // o círculo que a foto de pizza ganha.
                      <Image
                        source={{ uri }}
                        style={{ width: disco, height: disco }}
                        resizeMode="contain"
                      />
                    ) : (
                      <PizzaRedonda uri={uri} tamanho={disco} />
                    )}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            {/* Badge coroado: o carimbo da casa, girado como na referência. */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 4,
                right: 0,
                width: 74,
                height: 74,
                borderRadius: 37,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                backgroundColor: colors.accent,
                transform: [{ rotate: '-12deg' }],
              }}
            >
              <Coroa tamanho={17} cor={colors.accentInk} />
              <Text
                style={{
                  fontSize: 10,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  color: colors.accentInk,
                  ...fontStyle(design.body, 700),
                }}
              >
                {temPromo ? 'oferta' : 'da casa'}
              </Text>
            </View>

            {paginas.length > 1 && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
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
                      backgroundColor: colors.accent,
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
                letterSpacing: 2.2,
                textTransform: 'uppercase',
                color: colors.inkMuted,
                ...fontStyle(design.body, 700),
              }}
            >
              {loja.nome}
            </Text>

            <Text
              style={{
                marginTop: 10,
                fontSize: Math.round(30 * typeFactor),
                lineHeight: Math.round(32 * typeFactor),
                letterSpacing: -0.6,
                textTransform: 'uppercase',
                color: colors.accent,
                ...black,
              }}
            >
              {produto.nome}
            </Text>

            {produto.descricao && (
              <Text
                style={{
                  marginTop: 14,
                  fontSize: 15,
                  lineHeight: 23,
                  color: colors.inkMuted,
                  ...fontStyle(design.body, 400),
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
                  fontSize: Math.round(28 * typeFactor),
                  color: colors.ink,
                  ...fontStyle(design.display, 800),
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

        {/* Barra de compra: o pill vermelho que vira PRETO ao confirmar */}
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
                borderRadius: 14,
                backgroundColor: adicionado ? PRETO_FORNO : colors.accent,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  letterSpacing: 1.6,
                  textTransform: 'uppercase',
                  // Confirmado, o botão vira o hero: preto com o ouro por cima.
                  color: adicionado ? OURO : colors.accentInk,
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

        {/* Variações/modificadores por cima (tamanho, borda, complementos...) */}
        {mostrarOpcoes && (
          <ModalProduto
            produto={produto}
            loja={loja}
            onFechar={() => setMostrarOpcoes(false)}
          />
        )}

        {/* Guarda de troca de loja — cartão claro sobre véu de forno */}
        {trocandoLoja && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: comAlfa(PRETO_FORNO, 0.55),
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
                  letterSpacing: 0.3,
                  textTransform: 'uppercase',
                  color: colors.accent,
                  ...fontStyle(design.display, 800),
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
