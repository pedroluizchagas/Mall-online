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
 * PDP smash — o cartão da referência em tela cheia: folha creme, palco branco
 * de foto (recorte transparente vira cutout "solto"), nome em caps pesadas
 * bordô, preço laranja e CTA em pílula bordô que pisca OURO ao confirmar.
 *
 * Mesmos ossos dos PDPs irmãos: galeria via metadata.galeria, adição direta
 * vs. ModalProduto para variações (em lanchonete os modificadores são comuns:
 * ponto da carne, extra bacon, molhos) e guarda de troca de loja.
 */

const { width: TELA_W } = Dimensions.get('window')

// DNA da vitrine smash (LojaSmash.tsx) — folha creme e ouro de confirmação.
const CREME = '#FAF3E4'
const CARTAO = '#FFFFFF'
const FIO_CREME = '#EFE5D2'
const OURO = '#F5C445'
const TINTA_APOIO = '#6F6354'

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

export function ProdutoSmash({ produto, loja, onFechar }: Props) {
  const design = useStoreDesign()
  const { colors, spacing } = design
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

  const precoFinal = produto.preco_promocional ?? produto.preco
  const temPromo = !!produto.preco_promocional
  const larguraPalco = TELA_W - spacing.screenX * 2

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
      <View style={{ flex: 1, backgroundColor: CREME }}>
        <StatusBar style="dark" />

        {/* Header: pílula flutuante bordô, eco da vitrine */}
        <View
          style={[
            {
              position: 'absolute',
              top: insets.top + 6,
              left: 14,
              right: 14,
              zIndex: 10,
              height: 52,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 8,
              borderRadius: 999,
              backgroundColor: colors.canvas,
            },
            consumerDesign.shadow.floating,
          ]}
        >
          <AcaoPdp icone="back" aoTocar={onFechar} />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 14,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: colors.ink,
              ...fontStyle(design.display, 800),
            }}
          >
            {loja.nome}
          </Text>
          <AcaoPdp
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
            paddingBottom: insets.bottom + 132,
            paddingHorizontal: spacing.screenX,
          }}
        >
          {/* Palco branco: galeria deslizável (recorte → cutout solto) */}
          <View
            style={{
              borderRadius: 30,
              borderWidth: 1,
              borderColor: FIO_CREME,
              backgroundColor: CARTAO,
              overflow: 'hidden',
            }}
          >
            {fotos.length > 0 || recorte ? (
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
                {(recorte ? [recorte] : fotos).map((uri, i) => (
                  <Image
                    key={i}
                    source={{ uri }}
                    style={{
                      width: larguraPalco,
                      height: Math.round(larguraPalco * 0.94),
                    }}
                    resizeMode={recorte ? 'contain' : 'cover'}
                  />
                ))}
              </ScrollView>
            ) : (
              <View
                style={{
                  height: Math.round(larguraPalco * 0.94),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ConsumerIcon name="chef" size={64} color={FIO_CREME} />
              </View>
            )}
          </View>

          {!recorte && fotos.length > 1 && (
            <View
              style={{
                marginTop: 14,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 7,
              }}
            >
              {fotos.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.accent,
                    opacity: i === fotoAtiva ? 1 : 0.28,
                  }}
                />
              ))}
            </View>
          )}

          {/* Ficha do item */}
          <Text
            style={{
              marginTop: 22,
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
              marginTop: 6,
              fontSize: Math.round(26 * design.typeFactor),
              lineHeight: Math.round(32 * design.typeFactor),
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              color: colors.canvas,
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
                color: TINTA_APOIO,
                ...fontStyle(design.body, 500),
              }}
            >
              {produto.descricao}
            </Text>
          )}

          <View
            style={{
              marginTop: 16,
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: 10,
            }}
          >
            <Text
              style={{
                fontSize: 32,
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
                  color: '#B9AC97',
                  textDecorationLine: 'line-through',
                  ...fontStyle(design.body, 600),
                }}
              >
                {formatarReais(produto.preco)}
              </Text>
            )}
          </View>
        </ScrollView>

        {/* Barra de compra fixa: pílula bordô que pisca ouro ao confirmar */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: spacing.screenX,
            paddingTop: 14,
            paddingBottom: Math.max(insets.bottom, 14),
            backgroundColor: CREME,
            borderTopWidth: 1,
            borderTopColor: FIO_CREME,
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
                backgroundColor: adicionado ? OURO : colors.canvas,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  letterSpacing: 1,
                  color: adicionado ? colors.canvas : colors.ink,
                  ...fontStyle(design.display, 800),
                }}
              >
                {adicionado ? 'NA SACOLA  ✓' : 'PEDIR AGORA'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Variações/modificadores por cima (ponto, extras, molhos...) */}
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
              backgroundColor: 'rgba(40, 8, 12, 0.55)',
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
                  backgroundColor: CARTAO,
                  borderRadius: 26,
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
                  color: colors.canvas,
                  ...fontStyle(design.display, 800),
                }}
              >
                Trocar de loja?
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: TINTA_APOIO,
                  lineHeight: 20,
                  ...fontStyle(design.body, 500),
                }}
              >
                Sua sacola atual será esvaziada para adicionar itens de{' '}
                <Text
                  style={{ color: colors.canvas, ...fontStyle(design.body, 700) }}
                >
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

/** Ação do header: ícone creme num quadrado arredondado de contorno fino. */
function AcaoPdp({
  icone,
  aoTocar,
  contador = 0,
}: {
  icone: 'back' | 'bag'
  aoTocar: () => void
  contador?: number
}) {
  const { colors } = useStoreDesign()
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={0.7}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      style={{
        width: 38,
        height: 38,
        borderRadius: 13,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 246, 232, 0.45)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ConsumerIcon name={icone} size={18} color={colors.ink} strokeWidth={2.1} />
      {contador > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
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
            style={{ fontSize: 10, color: colors.accentInk, fontWeight: '800' }}
          >
            {contador}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}
