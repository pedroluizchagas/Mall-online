import { useEffect, useRef, useState } from 'react'
import { Animated, Dimensions, Image, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { formatarReais, lerMetadataProduto } from '@mallevo/lib'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { ModalProduto } from '@/components/ModalProduto'
import { Botao } from '@/components/ui/Botao'
import { useCartStore } from '@/store/useCartStore'
import { supabase } from '@/lib/supabase'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * PDP cuidado — o item numa folha acolhedora: foto em cartão de cantos bem
 * redondos dentro do gutter, nome em Nunito, CHECKLIST da ficha técnica
 * (`metadata.especificacoes`) em moedas com ✓, preço e pill quente de
 * largura cheia. Serviço agendável nunca chega aqui (o `[slug].tsx` delega
 * ao ModalProduto, que tem calendário): este PDP serve aos PRODUTOS das
 * casas soft — o pet shop, a linha de casa do salão.
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

export function ProdutoCuidado({ produto, loja, onFechar }: Props) {
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

  // `metadata` é JSONB do lojista: a leitura passa pelo contrato único da lib
  // (campo corrompido some sozinho, nada lança).
  const metadata = lerMetadataProduto(produto.metadata)
  const galeria = metadata.galeria ?? []
  const fotos = galeria.length > 0 ? galeria : produto.foto_url ? [produto.foto_url] : []
  const esp = produto.metadata?.especificacoes
  const ficha: [string, string][] = Array.isArray(esp)
    ? esp.filter((par): par is [string, string] => Array.isArray(par) && typeof par[0] === 'string' && typeof par[1] === 'string')
    : []

  const precoFinal = produto.preco_promocional ?? produto.preco
  const temPromo = !!produto.preco_promocional && produto.preco_promocional < produto.preco
  const larguraPalco = TELA_W - 32

  useEffect(() => {
    let cancelado = false
    Promise.all([
      supabase.from('product_option_groups').select('id').eq('product_id', produto.id),
      supabase.from('product_modifier_groups').select('id').eq('product_id', produto.id),
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
      { product_id: produto.id, nome: produto.nome, preco: precoFinal, quantidade: 1, foto_url: produto.foto_url ?? undefined },
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
    <Modal visible animationType="slide" onRequestClose={onFechar}>
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <StatusBar style="dark" />

        <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity
            onPress={onFechar}
            activeOpacity={0.7}
            style={[{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, consumerDesign.shadow.soft]}
          >
            <ConsumerIcon name="back" size={20} color={colors.ink} strokeWidth={2.1} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (totalItens === 0) return
              onFechar()
              router.push('/checkout')
            }}
            activeOpacity={0.7}
            style={[{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, consumerDesign.shadow.soft]}
          >
            <ConsumerIcon name="bag" size={20} color={colors.ink} strokeWidth={2.1} />
            {totalItens > 0 && (
              <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 10, color: colors.accentInk, fontWeight: '800' }}>{totalItens}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          <View style={{ borderRadius: design.radius.xl, overflow: 'hidden', backgroundColor: colors.accentSoft }}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setFotoAtiva(Math.round(e.nativeEvent.contentOffset.x / larguraPalco))}>
              {fotos.length > 0 ? (
                fotos.map((uri, i) => <Image key={i} source={{ uri }} style={{ width: larguraPalco, height: larguraPalco * 0.9 }} resizeMode="cover" />)
              ) : (
                <View style={{ width: larguraPalco, height: larguraPalco * 0.6, alignItems: 'center', justifyContent: 'center' }}>
                  <ConsumerIcon name="heart" size={44} color={colors.accent} strokeWidth={1.8} />
                </View>
              )}
            </ScrollView>
            {fotos.length > 1 && (
              <View style={{ position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
                {fotos.map((_, i) => (
                  <View key={i} style={{ width: i === fotoAtiva ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === fotoAtiva ? colors.accent : 'rgba(255,255,255,0.7)' }} />
                ))}
              </View>
            )}
          </View>

          <Text style={{ marginTop: 18, fontSize: 10.5, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.accent, ...fontStyle(design.body, 800) }}>{loja.nome}</Text>
          <Text style={{ marginTop: 4, fontSize: Math.round(24 * design.typeFactor), lineHeight: Math.round(30 * design.typeFactor), color: colors.ink, ...fontStyle(design.display, 800) }}>
            {produto.nome}
          </Text>
          {produto.descricao && (
            <Text style={{ marginTop: 8, fontSize: 14.5, lineHeight: 22, color: colors.inkMuted, ...fontStyle(design.body, 500) }}>{produto.descricao}</Text>
          )}

          {ficha.length > 0 && (
            <View style={{ marginTop: 16, borderRadius: design.radius.xl, backgroundColor: colors.surface, padding: 16, gap: 10 }}>
              {ficha.map(([rotulo, valor]) => (
                <View key={rotulo} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                    <ConsumerIcon name="check" size={12} color={colors.accent} strokeWidth={3} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: colors.ink, ...fontStyle(design.body, 600) }}>
                    <Text style={{ color: colors.inkMuted }}>{rotulo}: </Text>
                    {valor}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line }}>
          <View>
            <Text style={{ fontSize: 24, color: colors.ink, ...fontStyle(design.display, 800) }}>{formatarReais(precoFinal)}</Text>
            {temPromo && (
              <Text style={{ fontSize: 12, color: colors.inkSoft, textDecorationLine: 'line-through', ...fontStyle(design.body, 500) }}>{formatarReais(produto.preco)}</Text>
            )}
          </View>
          <Animated.View style={{ flex: 1, transform: [{ scale: escalaCta }] }}>
            <TouchableOpacity
              onPress={aoTocarCta}
              activeOpacity={0.85}
              style={{ height: 50, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: adicionado ? colors.success : colors.accent }}
            >
              <Text style={{ fontSize: 14.5, color: colors.accentInk, ...fontStyle(design.body, 800) }}>{adicionado ? 'Na sacola ✓' : 'Adicionar'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {mostrarOpcoes && <ModalProduto produto={produto} loja={loja} onFechar={() => setMostrarOpcoes(false)} />}

        {trocandoLoja && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(42, 42, 42, 0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <View style={[{ width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: design.radius.xl, padding: 20, gap: 12 }, consumerDesign.shadow.medium]}>
              <Text style={{ fontSize: 18, color: colors.ink, ...fontStyle(design.display, 800) }}>Trocar de loja?</Text>
              <Text style={{ fontSize: 14, color: colors.inkMuted, lineHeight: 20, ...fontStyle(design.body, 500) }}>
                Sua sacola atual será esvaziada para adicionar itens de <Text style={{ color: colors.ink, ...fontStyle(design.body, 700) }}>{loja.nome}</Text>.
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
