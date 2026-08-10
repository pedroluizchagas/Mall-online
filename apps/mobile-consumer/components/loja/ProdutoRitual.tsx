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
import { useFonts, Shrikhand_400Regular } from '@expo-google-fonts/shrikhand'
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
 * PDP ritual — o item em tela cheia sobre o rosa chiclete da vitrine.
 *
 * O momento é o PALCO: cartão accent com o NOME DO PRODUTO gigante em caps
 * condensadas rosa FIXO atrás e a foto deslizando por cima — o mesmo truque do
 * bloco "ESPECIAIS" da vitrine, agora com um item só. Recorte transparente
 * vira cutout "solto" (contain, sem moldura); foto comum ganha moldura
 * arredondada menor que a palavra, para a tipografia continuar aparecendo.
 *
 * Mesmos ossos dos PDPs irmãos: galeria via metadata.galeria, adição direta
 * vs. ModalProduto para variações (em açaiteria os modificadores são a regra:
 * tamanho da tigela, acompanhamentos, caldas) e guarda de troca de loja.
 */

const { width: TELA_W } = Dimensions.get('window')

// ── DNA fixo da vitrine ritual (espelha as constantes de LojaRitual.tsx) ──
/** Creme dos cartões de papel — aqui, o cartão do diálogo de troca de loja. */
const CREME = '#FBF3DC'
/** Rosa de leitura sobre o creme (4.85:1) — a mesma tinta do cardápio. */
const ROSA_MENU = '#B93A72'
// Fora essas duas, tudo sai da paleta: `colors.canvas` é o rosa chiclete e
// `colors.accent` o roxo-açaí — assim matcha/pitaya trocam a pele sem código.

/** rgba a partir de hex — pra véus e contornos derivados da paleta. */
function comAlfa(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, '')
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

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

export function ProdutoRitual({ produto, loja, onFechar }: Props) {
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

  // Shrikhand é DNA do layout, não token do arquétipo: carrega aqui e, enquanto
  // não chega (ou se falhar), a assinatura cai nas caps condensadas do tema.
  const [shrikhandPronta] = useFonts({ Shrikhand_400Regular })
  const estiloAssinatura: TextStyle = shrikhandPronta
    ? { fontFamily: 'Shrikhand_400Regular' }
    : fontStyle(design.display, 800)

  const recorte = (produto.metadata as { recorte?: string } | null)?.recorte
  const galeria = Array.isArray((produto.metadata as any)?.galeria)
    ? ((produto.metadata as any).galeria as string[])
    : []
  const fotos =
    galeria.length > 0 ? galeria : produto.foto_url ? [produto.foto_url] : []
  const paginas = recorte ? [recorte] : fotos

  const precoFinal = produto.preco_promocional ?? produto.preco
  const temPromo = !!produto.preco_promocional

  // O palco é um cartão flutuando no rosa: gutter de 12 em volta, como toda
  // seção da vitrine.
  const larguraPalco = TELA_W - 24
  const alturaPalco = Math.round(TELA_W * 1.1)
  const primeiroNome = loja.nome.trim().split(/\s+/)[0] ?? loja.nome

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
        <StatusBar style="dark" />

        {/* Header: o mesmo pill flutuante CENTRADO da vitrine — chrome único */}
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: insets.top + 6,
            left: 0,
            right: 0,
            zIndex: 10,
            alignItems: 'center',
          }}
        >
          <View
            style={[
              {
                height: 52,
                maxWidth: TELA_W - 28,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingLeft: 4,
                paddingRight: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: comAlfa(colors.accentInk, 0.18),
                backgroundColor: colors.accent,
              },
              consumerDesign.shadow.floating,
            ]}
          >
            <TouchableOpacity
              onPress={onFechar}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              style={{
                width: 38,
                height: 38,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ConsumerIcon
                name="back"
                size={20}
                color={colors.accentInk}
                strokeWidth={2.1}
              />
            </TouchableOpacity>

            <Text
              numberOfLines={1}
              style={{
                flexShrink: 1,
                fontSize: 13,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                color: colors.accentInk,
                ...fontStyle(design.display, 800),
              }}
            >
              {loja.nome}
            </Text>

            {/* Círculo rosa com a sacola — recorte da paleta dentro do pill */}
            <TouchableOpacity
              onPress={() => {
                if (totalItens === 0) return
                onFechar()
                router.push('/checkout')
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.canvas,
              }}
            >
              <ConsumerIcon
                name="bag"
                size={17}
                color={colors.accent}
                strokeWidth={2.1}
              />
              {totalItens > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    minWidth: 17,
                    height: 17,
                    borderRadius: 9,
                    borderWidth: 1.5,
                    borderColor: colors.accent,
                    backgroundColor: colors.canvas,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 3,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      color: colors.accent,
                      fontWeight: '800',
                    }}
                  >
                    {totalItens}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + 76,
            paddingBottom: insets.bottom + 132,
          }}
        >
          {/* PALCO: nome gigante fixo atrás, foto deslizando por cima */}
          <View
            style={{
              marginHorizontal: 12,
              height: alturaPalco,
              borderRadius: 28,
              overflow: 'hidden',
              backgroundColor: colors.accent,
            }}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 10,
                right: 10,
                bottom: 0,
                justifyContent: 'center',
              }}
            >
              <Text
                numberOfLines={2}
                adjustsFontSizeToFit
                style={{
                  textAlign: 'center',
                  fontSize: Math.round(76 * typeFactor),
                  lineHeight: Math.round(80 * typeFactor),
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  color: colors.canvas,
                  ...fontStyle(design.display, 800),
                }}
              >
                {produto.nome}
              </Text>
            </View>

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
                    }}
                  >
                    {recorte ? (
                      // Cutout solto: sem moldura, respirando sobre a palavra.
                      <Image
                        source={{ uri }}
                        style={{
                          width: Math.round(larguraPalco * 0.78),
                          height: Math.round(alturaPalco * 0.72),
                        }}
                        resizeMode="contain"
                      />
                    ) : (
                      // Sem recorte, a foto entra emoldurada e menor que a
                      // palavra — a tipografia continua sangrando pelas bordas.
                      <View
                        style={{
                          width: Math.round(larguraPalco * 0.7),
                          height: Math.round(alturaPalco * 0.68),
                          borderRadius: 24,
                          overflow: 'hidden',
                        }}
                      >
                        <Image
                          source={{ uri }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ConsumerIcon
                  name="chef"
                  size={64}
                  color={comAlfa(colors.accentInk, 0.55)}
                />
              </View>
            )}

            {/* Assinatura groovy da casa carimbada no canto do palco — não
                pode roubar o arrasto do pager que corre por baixo. */}
            <View
              pointerEvents="none"
              style={{ position: 'absolute', top: 18, left: 20, right: 20 }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 20,
                  opacity: 0.85,
                  color: colors.canvas,
                  ...estiloAssinatura,
                }}
              >
                {primeiroNome}
              </Text>
            </View>

            {/* Dots dentro do palco: creme só funciona sobre o accent */}
            {paginas.length > 1 && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 18,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 7,
                }}
              >
                {paginas.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.accentInk,
                      opacity: i === fotoAtiva ? 1 : 0.35,
                    }}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Ficha do item, direto sobre o rosa (sem cartão) */}
          <View style={{ paddingHorizontal: spacing.screenX, marginTop: 24 }}>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 11,
                letterSpacing: 2.2,
                textTransform: 'uppercase',
                color: colors.accent,
                ...fontStyle(design.body, 700),
              }}
            >
              {loja.nome}
            </Text>
            <Text
              style={{
                marginTop: 8,
                fontSize: Math.round(24 * typeFactor),
                lineHeight: Math.round(29 * typeFactor),
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                color: colors.ink,
                ...fontStyle(design.display, 800),
              }}
            >
              {produto.nome}
            </Text>

            {produto.descricao && (
              <Text
                style={{
                  marginTop: 10,
                  fontSize: 15,
                  lineHeight: 22,
                  color: colors.inkMuted,
                  ...fontStyle(design.body, 500),
                }}
              >
                {produto.descricao}
              </Text>
            )}

            <View
              style={{
                marginTop: 18,
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 30,
                  color: colors.accent,
                  ...fontStyle(design.display, 800),
                }}
              >
                {formatarReais(precoFinal)}
              </Text>
              {temPromo && (
                <Text
                  style={{
                    fontSize: 15,
                    marginBottom: 4,
                    color: colors.inkMuted,
                    textDecorationLine: 'line-through',
                    ...fontStyle(design.body, 600),
                  }}
                >
                  {formatarReais(produto.preco)}
                </Text>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Barra de compra fixa: pill accent que pisca INVERTIDA ao confirmar
            (o contorno mantém a pílula visível quando o miolo vira rosa). */}
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
                paddingVertical: 16,
                alignItems: 'center',
                borderRadius: 999,
                borderWidth: 2,
                borderColor: colors.accent,
                backgroundColor: adicionado ? colors.canvas : colors.accent,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: adicionado ? colors.accent : colors.accentInk,
                  ...fontStyle(design.display, 800),
                }}
              >
                {adicionado ? 'NA SACOLA  ✓' : 'PEDIR'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Variações/modificadores por cima (tamanho, acompanhamentos...) */}
        {mostrarOpcoes && (
          <ModalProduto
            produto={produto}
            loja={loja}
            onFechar={() => setMostrarOpcoes(false)}
          />
        )}

        {/* Guarda de troca de loja — cartão creme, o papel do cardápio */}
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
                  backgroundColor: CREME,
                  borderRadius: 28,
                  padding: 22,
                  gap: 12,
                },
                consumerDesign.shadow.medium,
              ]}
            >
              <Text
                style={{
                  fontSize: 19,
                  letterSpacing: 0.4,
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
                  lineHeight: 20,
                  color: ROSA_MENU,
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
