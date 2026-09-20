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
 * PDP mesa — o prato em tela cheia com a calma da casa.
 *
 * Mesmos ossos dos PDPs irmãos (galeria full-bleed via metadata.galeria,
 * scrim de rampa única, adição direta vs. ModalProduto p/ variações — em
 * restaurante os modificadores são comuns: ponto da carne, acompanhamento),
 * pele heritage: FOLHA CREME de cantos suaves subindo da base, nome em
 * SERIFA (Fraunces) com ornamento, descrição em corpo leve, preço em serifa
 * e CTA em pill sólida no accent (madeira) de largura cheia.
 */

const { width: TELA_W } = Dimensions.get('window')
const CREME = '#FFF9F0'

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

export function ProdutoMesa({ produto, loja, onFechar }: Props) {
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

  useEffect(() => {
    let cancelado = false
    Promise.all([
      (supabase as any).from('product_option_groups').select('id').eq('product_id', produto.id),
      (supabase as any).from('product_modifier_groups').select('id').eq('product_id', produto.id),
    ])
      .then(([opts, mods]: any[]) => {
        if (cancelado) return
        setTemOpcoes((opts.data?.length ?? 0) + (mods.data?.length ?? 0) > 0)
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
      Animated.timing(escalaCta, { toValue: 0.96, duration: 90, useNativeDriver: true }),
      Animated.spring(escalaCta, { toValue: 1, speed: 22, bounciness: 6, useNativeDriver: true }),
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
        <StatusBar style="light" />

        {/* Galeria full-bleed — a metade de cima da tela */}
        <View style={{ height: '58%' }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setFotoAtiva(Math.round(e.nativeEvent.contentOffset.x / TELA_W))}
          >
            {fotos.length > 0 ? (
              fotos.map((uri, i) => (
                <Image key={i} source={{ uri }} style={{ width: TELA_W, height: '100%' }} resizeMode="cover" />
              ))
            ) : (
              <View style={{ width: TELA_W, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted }}>
                <ConsumerIcon name="chef" size={64} color={colors.inkSoft} />
              </View>
            )}
          </ScrollView>

          {/* Scrim do topo */}
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 170 }}>
            <Image source={{ uri: SCRIM_TOPO }} style={{ width: '100%', height: '100%' }} resizeMode="stretch" />
          </View>

          {fotos.length > 1 && (
            <View style={{ position: 'absolute', right: 20, bottom: 40, flexDirection: 'row', gap: 6 }}>
              {fotos.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: i === fotoAtiva ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: i === fotoAtiva ? CREME : 'rgba(255,249,240,0.5)',
                  }}
                />
              ))}
            </View>
          )}
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
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <ConsumerIcon name="back" size={22} color={CREME} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (totalItens === 0) return
              onFechar()
              router.push('/checkout')
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <ConsumerIcon name="bag" size={22} color={CREME} strokeWidth={2} />
            {totalItens > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 3,
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
                <Text style={{ fontSize: 10, color: colors.accentInk, fontWeight: '800' }}>{totalItens}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Folha creme subindo da base, cortando a foto */}
        <View
          style={[
            {
              flex: 1,
              marginTop: -28,
              backgroundColor: colors.surface,
              borderTopLeftRadius: design.radius.xl,
              borderTopRightRadius: design.radius.xl,
              paddingHorizontal: 24,
              paddingTop: 26,
              paddingBottom: insets.bottom + 18,
            },
            consumerDesign.shadow.floating,
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
            <View style={{ alignItems: 'center' }}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 10.5,
                  letterSpacing: 2.2,
                  textTransform: 'uppercase',
                  color: colors.accent,
                  marginBottom: 8,
                  ...fontStyle(design.body, 600),
                }}
              >
                {loja.nome}
              </Text>
              <Text
                numberOfLines={3}
                style={{
                  fontSize: Math.round(26 * design.typeFactor),
                  lineHeight: Math.round(31 * design.typeFactor),
                  textAlign: 'center',
                  color: colors.ink,
                  ...fontStyle(design.display, 600),
                }}
              >
                {produto.nome}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }} aria-hidden>
                <View style={{ width: 28, height: 1, backgroundColor: colors.line }} />
                <View style={{ width: 6, height: 6, backgroundColor: colors.accent, transform: [{ rotate: '45deg' }] }} />
                <View style={{ width: 28, height: 1, backgroundColor: colors.line }} />
              </View>
            </View>

            {produto.descricao && (
              <Text
                numberOfLines={4}
                style={{
                  fontSize: 14.5,
                  lineHeight: 22,
                  textAlign: 'center',
                  color: colors.inkMuted,
                  ...fontStyle(design.body, 400),
                }}
              >
                {produto.descricao}
              </Text>
            )}
          </ScrollView>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginTop: 14 }}>
            <View>
              <Text style={{ fontSize: 24, color: colors.ink, ...fontStyle(design.display, 600) }}>{formatarReais(precoFinal)}</Text>
              {temPromo && (
                <Text style={{ fontSize: 12, color: colors.inkSoft, textDecorationLine: 'line-through', ...fontStyle(design.body, 400) }}>
                  {formatarReais(produto.preco)}
                </Text>
              )}
            </View>

            {/* Pill madeira sólida — o gesto da casa */}
            <Animated.View style={{ flex: 1, maxWidth: 200, transform: [{ scale: escalaCta }] }}>
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
                <Text style={{ fontSize: 14, color: colors.accentInk, ...fontStyle(design.body, 700) }}>
                  {adicionado ? 'Adicionado ✓' : 'Adicionar'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* Variações/modificadores (ponto da carne, acompanhamento…) */}
        {mostrarOpcoes && <ModalProduto produto={produto} loja={loja} onFechar={() => setMostrarOpcoes(false)} />}

        {/* Guarda de troca de loja */}
        {trocandoLoja && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(26, 23, 20, 0.6)',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <View
              style={[
                { width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: design.radius.xl, padding: 20, gap: 12 },
                consumerDesign.shadow.medium,
              ]}
            >
              <Text style={{ fontSize: 18, color: colors.ink, ...fontStyle(design.display, 600) }}>Trocar de loja?</Text>
              <Text style={{ fontSize: 14, color: colors.inkMuted, lineHeight: 20, ...fontStyle(design.body, 400) }}>
                Sua sacola atual será esvaziada para adicionar itens de{' '}
                <Text style={{ color: colors.ink, ...fontStyle(design.body, 600) }}>{loja.nome}</Text>.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Botao label="Cancelar" onPress={() => setTrocandoLoja(false)} variante="ghost" tamanho="md" />
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
