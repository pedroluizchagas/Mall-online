import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  Keyboard,
  BackHandler,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { GlowNeon } from '@/components/home/Marquise'
import { useImersao } from '@/store/useImersao'
import { useBuscasRecentes } from '@/store/useBuscasRecentes'
import { formatarReais } from '@mallevo/lib'
import { consumerDesign } from '@/lib/consumer-design'

/**
 * Concierge — a busca do Início, dentro da própria fachada.
 *
 * Tocar a pílula de vidro da marquise não navega mais: a noite toma a tela
 * (véu `marquee` + o mesmo glow de neon), a pílula acende (aro `accentRing`,
 * a linguagem das vitrines seguidas) e vira um campo de verdade. Embaixo, o
 * balcão do concierge: buscas recentes do aparelho e os termos muito
 * buscados; digitou, os resultados (lojas + produtos) chegam ao vivo em
 * lista limpa, sem chrome. Fechar recua o véu — o Início está exatamente
 * onde ficou, scroll e estado intactos, porque nunca houve navegação.
 *
 * A tab bar se recolhe enquanto o concierge está de pé (useImersao, o mesmo
 * mecanismo do modo imersivo do Explorar): buscar é um momento modal.
 * Navegar para uma loja NÃO desmonta o overlay — na volta os resultados
 * continuam lá, sem re-focar o teclado (o foco só acontece na abertura).
 *
 * Spec: docs/system-design/consumer/07-telas.md §4
 */

const { colors, radius, motion } = consumerDesign

/**
 * Chips do balcão. Todos os termos existem no dataset de demonstração —
 * chip que devolve zero resultado é anti-vitrine.
 */
const MUITO_BUSCADOS = [
  'Pizza',
  'Açaí',
  'Burger',
  'Sushi',
  'Café',
  'Farmácia',
  'Barbearia',
  'Ração',
]

const DEBOUNCE_MS = 400
const MIN_TERMO = 2

interface LojaEncontrada {
  id: string
  nome: string
  slug: string | null
  logo_url: string | null
  tempo_entrega: number | null
  categoria: string | null
}

interface ProdutoEncontrado {
  id: string
  nome: string
  preco: number
  foto_url: string | null
  storeSlug: string | null
  storeNome: string
}

export function Concierge({ aoFechar }: { aoFechar: () => void }) {
  const insets = useSafeAreaInsets()
  const setImersivo = useImersao((s) => s.setImersivo)
  const recentes = useBuscasRecentes((s) => s.termos)
  const registrar = useBuscasRecentes((s) => s.registrar)
  const limparRecentes = useBuscasRecentes((s) => s.limpar)

  const [termo, setTermo] = useState('')
  const [lojas, setLojas] = useState<LojaEncontrada[]>([])
  const [produtos, setProdutos] = useState<ProdutoEncontrado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [buscaFeita, setBuscaFeita] = useState(false)

  const inputRef = useRef<TextInput>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Carimbo da última busca disparada — resposta atrasada de termo antigo é descartada. */
  const requisicaoRef = useRef(0)
  const fechandoRef = useRef(false)

  // Coreografia de abertura: o véu cai primeiro, a pílula acende, o balcão
  // sobe — um Animated.Value único com janelas, o padrão da Marquise.
  const entrada = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(entrada, {
      toValue: 1,
      duration: motion.slow,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()

    // Foco depois que o véu assenta — o teclado subindo durante o fade
    // engasgaria a entrada.
    const foco = setTimeout(() => inputRef.current?.focus(), motion.base + 40)
    return () => clearTimeout(foco)
  }, [])

  // Momento modal: a tab bar se recolhe enquanto o concierge vive.
  useEffect(() => {
    setImersivo(true)
    return () => setImersivo(false)
  }, [setImersivo])

  function fechar() {
    if (fechandoRef.current) return
    fechandoRef.current = true
    Keyboard.dismiss()
    // Saída mais curta que a entrada: some rápido, sem cerimônia.
    Animated.timing(entrada, {
      toValue: 0,
      duration: motion.base,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => aoFechar())
  }

  // Botão físico de voltar (Android) fecha o overlay em vez de sair da tela.
  useEffect(() => {
    const assinatura = BackHandler.addEventListener('hardwareBackPress', () => {
      fechar()
      return true
    })
    return () => assinatura.remove()
  }, [])

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    [],
  )

  async function buscar(texto: string) {
    const limpo = texto.trim()
    if (limpo.length < MIN_TERMO) {
      requisicaoRef.current++
      setLojas([])
      setProdutos([])
      setBuscando(false)
      setBuscaFeita(false)
      return
    }

    const requisicao = ++requisicaoRef.current
    setBuscando(true)

    const padrao = `%${limpo}%`
    const [resLojas, resProdutos] = await Promise.all([
      supabase
        .from('stores')
        .select('id, nome, slug, logo_url, tempo_entrega, categories (nome)')
        .eq('ativo', true)
        .ilike('nome', padrao)
        .limit(5),
      supabase
        .from('products')
        .select('id, nome, preco, foto_url, stores!inner (slug, nome, ativo)')
        .eq('disponivel', true)
        .eq('stores.ativo', true)
        .ilike('nome', padrao)
        .limit(10),
    ])

    if (requisicao !== requisicaoRef.current) return

    setLojas(
      (resLojas.data ?? []).map((l: any) => ({
        id: l.id,
        nome: l.nome,
        slug: l.slug,
        logo_url: l.logo_url,
        tempo_entrega: l.tempo_entrega,
        categoria: l.categories?.nome ?? null,
      })),
    )
    setProdutos(
      (resProdutos.data ?? []).map((p: any) => ({
        id: p.id,
        nome: p.nome,
        preco: p.preco,
        foto_url: p.foto_url,
        storeSlug: p.stores?.slug ?? null,
        storeNome: p.stores?.nome ?? '',
      })),
    )
    setBuscando(false)
    setBuscaFeita(true)
  }

  function aoDigitar(texto: string) {
    setTermo(texto)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => buscar(texto), DEBOUNCE_MS)
  }

  /** Chip tocado: busca na hora, sem esperar debounce. */
  function aplicarTermo(sugestao: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setTermo(sugestao)
    buscar(sugestao)
  }

  function limparTermo() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    requisicaoRef.current++
    setTermo('')
    setLojas([])
    setProdutos([])
    setBuscando(false)
    setBuscaFeita(false)
    inputRef.current?.focus()
  }

  /** Resultado tocado = busca que valeu: registra o termo e entra na loja. */
  function abrirLoja(slug: string | null) {
    if (!slug) return
    registrar(termo)
    Keyboard.dismiss()
    router.push(`/loja/${slug}`)
  }

  const janela = (de: number, ate: number) => ({
    opacity: entrada.interpolate({
      inputRange: [de, ate],
      outputRange: [0, 1],
      extrapolate: 'clamp' as const,
    }),
    transform: [
      {
        translateY: entrada.interpolate({
          inputRange: [de, ate],
          outputRange: [10, 0],
          extrapolate: 'clamp' as const,
        }),
      },
    ],
  })

  const termoAtivo = termo.trim().length >= MIN_TERMO
  const temResultados = lojas.length > 0 || produtos.length > 0
  const mostraFantasmas = termoAtivo && buscando && !temResultados
  const mostraVazio = termoAtivo && buscaFeita && !buscando && !temResultados

  return (
    <Animated.View
      accessibilityViewIsModal
      style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor: colors.marquee,
          paddingTop: insets.top + 10,
          // Acima da barra do carrinho (elevation 8 no Android).
          zIndex: 20,
          elevation: 20,
          opacity: entrada.interpolate({
            inputRange: [0, 0.45],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          }),
        },
      ]}
    >
      <GlowNeon />

      {/* Balcão: pílula acesa + Cancelar */}
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            paddingHorizontal: 24,
          },
          janela(0.15, 0.6),
        ]}
      >
        <View style={estilos.pilula}>
          <ConsumerIcon name="search" size={17} color={colors.accent} />
          <TextInput
            ref={inputRef}
            value={termo}
            onChangeText={aoDigitar}
            placeholder="O que você procura hoje?"
            placeholderTextColor={colors.marqueeInkMuted}
            selectionColor={colors.accent}
            cursorColor={colors.accent}
            // O teclado também é fachada: escuro no iOS. (Android segue o
            // tema do app de teclado do usuário — não é controlável.)
            keyboardAppearance="dark"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => registrar(termo)}
            style={estilos.campo}
          />
          {buscando ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : termo.length > 0 ? (
            <TouchableOpacity
              onPress={limparTermo}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={estilos.moedaLimpar}>
                <ConsumerIcon
                  name="close"
                  size={12}
                  color={colors.white}
                  strokeWidth={2.4}
                />
              </View>
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={fechar}
          accessibilityRole="button"
          accessibilityLabel="Fechar busca"
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        >
          <Text style={estilos.cancelar}>Cancelar</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={[{ flex: 1 }, janela(0.3, 0.85)]}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 30,
            paddingBottom: 140,
          }}
        >
          {!termoAtivo ? (
            <>
              {recentes.length > 0 && (
                <View style={{ marginBottom: 30 }}>
                  <View style={estilos.linhaRotulo}>
                    <ConsumerIcon
                      name="clock"
                      size={12}
                      color={colors.marqueeInkMuted}
                    />
                    <Text style={estilos.rotulo}>Recentes</Text>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity
                      onPress={limparRecentes}
                      accessibilityRole="button"
                      accessibilityLabel="Limpar buscas recentes"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={estilos.rotuloAcao}>Limpar</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={estilos.nuvemChips}>
                    {recentes.map((t) => (
                      <ChipTermo
                        key={t}
                        termo={t}
                        aoTocar={() => {
                          // Reusar um recente também conta como uso: sobe ao topo.
                          registrar(t)
                          aplicarTermo(t)
                        }}
                      />
                    ))}
                  </View>
                </View>
              )}

              <View style={estilos.linhaRotulo}>
                <ConsumerIcon name="spark" size={12} color={colors.accent} />
                <Text style={estilos.rotulo}>Muito buscados</Text>
              </View>
              <View style={estilos.nuvemChips}>
                {MUITO_BUSCADOS.map((t) => (
                  <ChipTermo key={t} termo={t} aoTocar={() => aplicarTermo(t)} />
                ))}
              </View>
            </>
          ) : mostraFantasmas ? (
            <View style={{ gap: 10, paddingTop: 6 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <LinhaFantasma key={i} />
              ))}
            </View>
          ) : mostraVazio ? (
            <Vazio termo={termo.trim()} />
          ) : (
            <>
              {lojas.length > 0 && (
                <>
                  <Text style={[estilos.rotulo, { marginBottom: 6 }]}>
                    Lojas
                  </Text>
                  {lojas.map((l) => (
                    <LinhaLoja
                      key={l.id}
                      loja={l}
                      aoTocar={() => abrirLoja(l.slug)}
                    />
                  ))}
                </>
              )}
              {produtos.length > 0 && (
                <>
                  <Text
                    style={[
                      estilos.rotulo,
                      { marginBottom: 6, marginTop: lojas.length > 0 ? 26 : 0 },
                    ]}
                  >
                    Produtos
                  </Text>
                  {produtos.map((p) => (
                    <LinhaProduto
                      key={p.id}
                      produto={p}
                      aoTocar={() => abrirLoja(p.storeSlug)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  )
}

// ─────────────────────────────────────────────────────────
// Peças do balcão
// ─────────────────────────────────────────────────────────

function ChipTermo({ termo, aoTocar }: { termo: string; aoTocar: () => void }) {
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      accessibilityRole="button"
      style={estilos.chip}
    >
      <Text style={estilos.chipTexto}>{termo}</Text>
    </TouchableOpacity>
  )
}

function LinhaLoja({
  loja,
  aoTocar,
}: {
  loja: LojaEncontrada
  aoTocar: () => void
}) {
  const inicial = loja.nome.charAt(0).toUpperCase()
  const sub = [
    loja.categoria,
    loja.tempo_entrega !== null ? `${loja.tempo_entrega} min` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressed}
      accessibilityRole="button"
      style={estilos.linha}
    >
      {loja.logo_url ? (
        <Image
          source={{ uri: loja.logo_url }}
          style={estilos.aroLoja}
          resizeMode="cover"
        />
      ) : (
        <View style={[estilos.aroLoja, estilos.centro]}>
          <Text style={estilos.monograma}>{inicial}</Text>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={estilos.nomeLinha} numberOfLines={1}>
          {loja.nome}
        </Text>
        {sub.length > 0 && (
          <Text style={estilos.subLinha} numberOfLines={1}>
            {sub}
          </Text>
        )}
      </View>
      <ConsumerIcon
        name="chevron-right"
        size={16}
        color={colors.marqueeInkMuted}
      />
    </TouchableOpacity>
  )
}

function LinhaProduto({
  produto,
  aoTocar,
}: {
  produto: ProdutoEncontrado
  aoTocar: () => void
}) {
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressed}
      accessibilityRole="button"
      style={estilos.linha}
    >
      <View style={estilos.thumb}>
        {produto.foto_url ? (
          <Image
            source={{ uri: produto.foto_url }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : (
          <ConsumerIcon name="bag" size={18} color={colors.marqueeInkMuted} />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={estilos.nomeLinha} numberOfLines={1}>
          {produto.nome}
        </Text>
        <Text style={estilos.subLinha} numberOfLines={1}>
          {produto.storeNome}
        </Text>
      </View>
      <Text style={estilos.preco}>{formatarReais(produto.preco)}</Text>
    </TouchableOpacity>
  )
}

/** Placeholder enquanto a primeira leva de resultados chega — vidro apagado. */
function LinhaFantasma() {
  return (
    <View style={estilos.linha}>
      <View style={[estilos.aroLoja, { backgroundColor: colors.marqueeGlass }]} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={estilos.fantasmaTitulo} />
        <View style={estilos.fantasmaSub} />
      </View>
    </View>
  )
}

function Vazio({ termo }: { termo: string }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 64, paddingHorizontal: 24 }}>
      <View style={estilos.discoVazio}>
        <ConsumerIcon name="search" size={24} color={colors.marqueeInkMuted} />
      </View>
      <Text style={estilos.tituloVazio}>Nada por aqui</Text>
      <Text style={estilos.subVazio}>
        Nenhuma loja ou produto com “{termo}”. Tente outro nome.
      </Text>
    </View>
  )
}

const estilos = StyleSheet.create({
  pilula: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 18,
    backgroundColor: colors.marqueeGlass,
    borderWidth: 1,
    // A pílula ativa tem o aro aceso — a mesma luz das vitrines seguidas.
    borderColor: colors.accentRing,
    borderRadius: radius.pill,
  },
  campo: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.white,
    paddingVertical: 0,
  },
  moedaLimpar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.marqueeGlassStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelar: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.marqueeInkSoft,
  },
  linhaRotulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  rotulo: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.marqueeInkMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  rotuloAcao: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.marqueeInkSoft,
    letterSpacing: 0.5,
  },
  nuvemChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.marqueeGlass,
    borderWidth: 1,
    borderColor: colors.marqueeLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipTexto: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.white,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
  },
  centro: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aroLoja: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.marqueeGlassStrong,
  },
  monograma: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: -0.5,
  },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.marqueeGlassStrong,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nomeLinha: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.2,
  },
  subLinha: {
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.marqueeInkSoft,
    marginTop: 2,
  },
  preco: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
  },
  fantasmaTitulo: {
    width: '55%',
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.marqueeGlass,
  },
  fantasmaSub: {
    width: '35%',
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.marqueeGlass,
  },
  discoVazio: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.marqueeGlass,
    borderWidth: 1,
    borderColor: colors.marqueeLine,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  tituloVazio: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.3,
  },
  subVazio: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.marqueeInkSoft,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
})
