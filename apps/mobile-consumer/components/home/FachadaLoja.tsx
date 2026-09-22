import { useEffect, useState } from 'react'
import {
  View,
  Text,
  Image,
  Pressable,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { formatarReais, VOZ_PADRAO_PISO, VOZ_POR_PISO } from '@mallevo/lib'
import { supabase } from '@/lib/supabase'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { BotaoSeguir } from '@/components/BotaoSeguir'
import { Skeleton } from '@/components/ui/Skeleton'
import { consumerDesign, corComAlpha } from '@/lib/consumer-design'
import { useStoreDesignFromTheme, type StoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * Fachada da loja — a vitrine de cada loja vista do corredor (fileira
 * horizontal por piso, uma fachada por "página").
 *
 * Referência: cards "Vitrines das Lojas". A marquise é a fachada do
 * shopping; o corredor de cada piso agora é uma sequência de FACHADAS de
 * loja, e cada uma veste a pele da própria loja desde a home: fundo, tinta,
 * accent, fonte de display e raio vêm do StoreTheme dela (o mesmo
 * `useStoreDesignFromTheme` que veste a tela da loja). Loja dark é dark no
 * corredor; loja serifada é serifada no corredor. O único chrome Mallevo
 * é o botão Seguir — seguir é um gesto do shopping, não da loja.
 *
 * Anatomia (de cima para baixo):
 *   hero      — banner full-bleed, pílula "CATEGORIA • PISO N" e Seguir;
 *   identidade— tijolo do logo cortando a base do hero, nome na fonte da
 *               loja, descrição em uma linha;
 *   vitrine   — rótulo por piso ("Frescos do dia") + link + 3 produtos;
 *   rodapé    — entrega/frete à esquerda, CTA accent à direita ("Pedir
 *               agora" / "Passear" / …, vocabulário por piso).
 *
 * Nada aqui é inventado: pílula = categoria real; rating, "verificado" e
 * "curadoria" da referência ficaram de fora até existir dado.
 *
 * Spec: docs/system-design/consumer/07-telas.md §1 (corredores)
 */

const { colors: mallevo, radius: raioMallevo, shadow } = consumerDesign

const { width } = Dimensions.get('window')
/** Passo entre fachadas na fileira do corredor. */
export const FACHADA_GAP = 12
/**
 * Largura da fachada na fileira horizontal: quase a tela (é UMA loja por
 * página), deixando ~34px da próxima espiando — o convite para rolar.
 */
export const FACHADA_W = width - 16 - 34
/** Largura na pilha VERTICAL (corredor expandido em "Ver todas"): tela − gutter. */
export const FACHADA_W_VERTICAL = width - 16 * 2
const HERO_H = 224
/**
 * A partir de que fração do hero a foto começa a se dissolver no fundo do
 * card. Abaixo dessa linha não existe borda: o degradê vai de transparente
 * até a cor EXATA do fundo, e a identidade pousa sobre a zona já dissolvida.
 */
const DISSOLVE_DE = 0.42
/** Quanto o tijolo do logo sobe para dentro da zona dissolvida do hero. */
const LOGO_SOBRE_HERO = 44
const LOGO = 60
const PAD = 16
/** Respiro interno da caixinha do produto; a foto ocupa o que sobra. */
const TILE_PAD = 10
/** Largura de cada tile de produto: 3 por linha com gap 10 e padding 16. */
const tileW = (largura: number) => Math.floor((largura - PAD * 2 - 10 * 2) / 3)

/**
 * Raios FIXOS (tokens Mallevo), não a escala de forma do arquétipo: a
 * fachada é uma caixa do shopping que emoldura a loja — a pele da loja
 * entra pela cor e pela fonte; a forma da caixa é a da casa, igual em
 * todos os corredores (referência: card 20, caixinha 14, foto 8, tijolo 14).
 */
const RAIO = {
  card: raioMallevo.md,
  tijolo: raioMallevo.sm,
  tile: raioMallevo.sm,
  foto: 8,
} as const

export interface LojaFachada {
  id: string
  nome: string
  slug: string | null
  descricao: string | null
  logo_url: string | null
  banner_url: string | null
  taxa_entrega: number
  tempo_entrega: number | null
  categoria_nome: string | null
  /** `stores.theme` cru (JSONB) — resolvido aqui para a pele da loja. */
  theme: unknown
}

interface Props {
  loja: LojaFachada
  pisoSlug: string
  pisoOrdem: number
  aoEntrar: () => void
  /** `FACHADA_W` na fileira horizontal; `FACHADA_W_VERTICAL` na pilha. */
  largura?: number
}

export function FachadaLoja({
  loja,
  pisoSlug,
  pisoOrdem,
  aoEntrar,
  largura = FACHADA_W,
}: Props) {
  const design = useStoreDesignFromTheme(loja.theme)
  const { colors } = design
  const TILE_W = tileW(largura)
  const TILE_FOTO = TILE_W - TILE_PAD * 2
  // Vocabulário do corredor (vitrine/link/cta) mora em @mallevo/lib: o mesmo
  // que o storefront e o saguão leem — nada de cópia local.
  const voz = VOZ_POR_PISO[pisoSlug] ?? VOZ_PADRAO_PISO
  const destaques = useDestaquesLoja(loja.id)

  // Loja sem pele: a fachada é branca sobre o canvas (elevação por
  // luminosidade). Com pele: o fundo é o `bg` do arquétipo — a loja em
  // miniatura, escura ou clara conforme ela é.
  const fundo = design.themed ? colors.canvas : colors.surface
  // Caixinha de produto: um degrau de luminosidade acima do fundo.
  const caixinha = design.themed ? colors.surface : colors.surfaceMuted
  const freteGratis = loja.taxa_entrega === 0

  return (
    <Pressable
      onPress={aoEntrar}
      accessibilityRole="button"
      accessibilityLabel={`${loja.nome}${loja.categoria_nome ? `, ${loja.categoria_nome}` : ''}. Entrar na loja`}
      style={({ pressed }) => [
        {
          width: largura,
          borderRadius: RAIO.card,
          backgroundColor: fundo,
          overflow: 'hidden',
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        shadow.medium,
      ]}
    >
      {/* ── Hero ── */}
      <View style={{ height: HERO_H, backgroundColor: fundo }}>
        {loja.banner_url ? (
          <Image
            source={{ uri: loja.banner_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <HeroVazio design={design} inicial={loja.nome.charAt(0)} />
        )}
        <VeuHero fundo={fundo} />

        <View
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            right: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View
            style={{
              height: 26,
              paddingHorizontal: 11,
              borderRadius: raioMallevo.pill,
              backgroundColor: corComAlpha(mallevo.white, 0.92),
              justifyContent: 'center',
              flexShrink: 1,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 1.1,
                textTransform: 'uppercase',
                color: mallevo.ink,
              }}
              numberOfLines={1}
            >
              {loja.categoria_nome ? `${loja.categoria_nome}  •  ` : ''}Piso {pisoOrdem}
            </Text>
          </View>
          {loja.slug && (
            <BotaoSeguir
              loja={{ slug: loja.slug, nome: loja.nome }}
              variante="reel"
              tamanho="sm"
            />
          )}
        </View>
      </View>

      {/* ── Identidade ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 12,
          paddingHorizontal: PAD,
          marginTop: -LOGO_SOBRE_HERO,
        }}
      >
        <Tijolo loja={loja} design={design} />
        <View style={{ flex: 1, paddingBottom: 2 }}>
          <Text
            style={[
              fontStyle(design.display, 700),
              {
                fontSize: Math.round(19 * design.typeFactor),
                lineHeight: Math.round(23 * design.typeFactor),
                letterSpacing: -0.3,
                color: colors.ink,
              },
            ]}
            numberOfLines={1}
          >
            {loja.nome}
          </Text>
          {loja.descricao ? (
            <Text
              style={[
                fontStyle(design.body, 500),
                { fontSize: 12.5, color: colors.inkMuted, marginTop: 2 },
              ]}
              numberOfLines={1}
            >
              {loja.descricao}
            </Text>
          ) : null}
        </View>
      </View>

      {/* ── Vitrine ── */}
      {destaques === null || destaques.length > 0 ? (
        <View style={{ paddingHorizontal: PAD, paddingTop: 18 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: '700',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: colors.inkMuted,
              }}
            >
              {voz.vitrine}
            </Text>
            <TouchableOpacity
              onPress={aoEntrar}
              activeOpacity={consumerDesign.opacity.pressedSoft}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>
                {voz.link}
              </Text>
              <ConsumerIcon
                name="chevron-right"
                size={13}
                color={colors.ink}
                strokeWidth={2.2}
              />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {destaques === null
              ? Array.from({ length: 3 }).map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: TILE_W,
                      padding: TILE_PAD,
                      borderRadius: RAIO.tile,
                      backgroundColor: caixinha,
                      gap: 8,
                    }}
                  >
                    <Skeleton largura={TILE_FOTO} altura={TILE_FOTO} raio={RAIO.foto} />
                    <Skeleton largura="80%" altura={11} raio={4} />
                    <Skeleton largura="45%" altura={11} raio={4} />
                  </View>
                ))
              : destaques.map((p) => (
                  <View
                    key={p.id}
                    style={{
                      width: TILE_W,
                      padding: TILE_PAD,
                      borderRadius: RAIO.tile,
                      backgroundColor: caixinha,
                    }}
                  >
                    <View
                      style={{
                        width: TILE_FOTO,
                        height: TILE_FOTO,
                        borderRadius: RAIO.foto,
                        backgroundColor: colors.surfaceMuted,
                        overflow: 'hidden',
                      }}
                    >
                      {p.foto_url ? (
                        <Image
                          source={{ uri: p.foto_url }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                          <ConsumerIcon name="bag" size={22} color={colors.inkSoft} />
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        fontStyle(design.body, 600),
                        { fontSize: 12.5, color: colors.ink, marginTop: 8 },
                      ]}
                      numberOfLines={1}
                    >
                      {p.nome}
                    </Text>
                    <Text
                      style={[
                        fontStyle(design.body, 700),
                        { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
                      ]}
                      numberOfLines={1}
                    >
                      {formatarReais(p.preco_promocional ?? p.preco)}
                    </Text>
                  </View>
                ))}
          </View>
        </View>
      ) : null}

      {/* ── Rodapé ── (marginTop auto: na fileira os cards esticam à altura
          do mais alto; o rodapé fica sempre na base, a folga sobe) */}
      <View
        style={{
          marginTop: 'auto',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: PAD,
          paddingTop: 18,
          paddingBottom: PAD,
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 6 }}>
          {loja.tempo_entrega !== null && (
            <Info design={design} icone="clock" texto={`Entrega em ${loja.tempo_entrega} min`} />
          )}
          <Info
            design={design}
            icone="truck"
            texto={freteGratis ? 'Frete grátis' : `Frete ${formatarReais(loja.taxa_entrega)}`}
            destaque={freteGratis}
          />
        </View>
        <TouchableOpacity
          onPress={aoEntrar}
          activeOpacity={consumerDesign.opacity.pressed}
          accessibilityRole="button"
          accessibilityLabel={`${voz.cta}: ${loja.nome}`}
          style={{
            height: 40,
            paddingHorizontal: 20,
            borderRadius: raioMallevo.pill,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={[
              fontStyle(design.body, 700),
              { fontSize: 13.5, color: colors.accentInk, letterSpacing: -0.1 },
            ]}
          >
            {voz.cta}
          </Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  )
}

/** Fachada apagada enquanto o catálogo carrega. */
export function FachadaApagada() {
  const TILE_W = tileW(FACHADA_W)
  return (
    <View
      style={{
        width: FACHADA_W,
        borderRadius: RAIO.card,
        backgroundColor: mallevo.surface,
        overflow: 'hidden',
      }}
    >
      <Skeleton largura="100%" altura={HERO_H} raio={0} />
      <View style={{ padding: PAD, gap: 10 }}>
        <Skeleton largura="55%" altura={18} raio={6} />
        <Skeleton largura="80%" altura={12} raio={4} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} largura={TILE_W} altura={TILE_W} raio={RAIO.tile} />
          ))}
        </View>
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────
// Peças
// ─────────────────────────────────────────────────────────

/**
 * Tijolo do logo, pousado sobre a zona já dissolvida do hero — sem aro:
 * não há borda para recortar. Com logo: imagem sobre `surface` da loja.
 * Sem logo: monograma (duas iniciais) `accentInk` sobre `accent` — o par
 * com contraste garantido pelo resolve do tema.
 */
function Tijolo({ loja, design }: { loja: LojaFachada; design: StoreDesign }) {
  const { colors } = design
  const iniciais = loja.nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')

  return (
    <View
      style={[
        {
          width: LOGO,
          height: LOGO,
          borderRadius: RAIO.tijolo,
          overflow: 'hidden',
          backgroundColor: loja.logo_url ? colors.surface : colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        },
        shadow.soft,
      ]}
    >
      <View style={{ flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>
        {loja.logo_url ? (
          <Image
            source={{ uri: loja.logo_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <Text
            style={[
              fontStyle(design.display, 700),
              { fontSize: 20, letterSpacing: -0.5, color: colors.accentInk },
            ]}
          >
            {iniciais}
          </Text>
        )}
      </View>
    </View>
  )
}

/** Hero sem banner: a inicial gigante apagada sobre a superfície da loja. */
function HeroVazio({ design, inicial }: { design: StoreDesign; inicial: string }) {
  const { colors } = design
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surfaceMuted,
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        paddingRight: 24,
        paddingTop: 8,
      }}
    >
      <Text
        style={[
          fontStyle(design.display, 700),
          { fontSize: 150, color: colors.accent, opacity: 0.16, letterSpacing: -6 },
        ]}
      >
        {inicial.toUpperCase()}
      </Text>
    </View>
  )
}

/**
 * O véu do hero — a camada que faz a foto ser parte do card, não um
 * retângulo colado nele. Dois degradês num SVG só:
 *
 * 1. dissolução na base: de transparente (em `DISSOLVE_DE` da altura) até
 *    a cor EXATA do fundo do card (100% no pé). Curva ease-in (0 → 0.28 →
 *    0.72 → 1): a foto "vai embora" devagar e chega sólida — nenhuma
 *    linha, nenhum degrau. A cor vem do tema da loja, então a dissolução
 *    é escura numa loja dark e clara numa loja clara;
 * 2. sombra de topo (ink 42% → 0 em 38%): a pílula e o Seguir leem sobre
 *    qualquer foto.
 */
function VeuHero({ fundo }: { fundo: string }) {
  return (
    <Svg
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HERO_H }}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id="veuTopo" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={mallevo.ink} stopOpacity={0.42} />
          <Stop offset="0.38" stopColor={mallevo.ink} stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="veuBase" x1="0" y1="0" x2="0" y2="1">
          <Stop offset={String(DISSOLVE_DE)} stopColor={fundo} stopOpacity={0} />
          <Stop
            offset={String(DISSOLVE_DE + (1 - DISSOLVE_DE) * 0.35)}
            stopColor={fundo}
            stopOpacity={0.28}
          />
          <Stop
            offset={String(DISSOLVE_DE + (1 - DISSOLVE_DE) * 0.7)}
            stopColor={fundo}
            stopOpacity={0.72}
          />
          <Stop offset="1" stopColor={fundo} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#veuTopo)" />
      <Rect width="100%" height="100%" fill="url(#veuBase)" />
    </Svg>
  )
}

function Info({
  design,
  icone,
  texto,
  destaque = false,
}: {
  design: StoreDesign
  icone: 'clock' | 'truck'
  texto: string
  destaque?: boolean
}) {
  const { colors } = design
  const cor = destaque ? colors.success : colors.inkMuted
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <ConsumerIcon name={icone} size={13} color={cor} strokeWidth={2} />
      <Text
        style={[fontStyle(design.body, 600), { fontSize: 12, color: cor }]}
        numberOfLines={1}
      >
        {texto}
      </Text>
    </View>
  )
}

// ─────────────────────────────────────────────────────────
// Dados: 3 destaques por loja
// ─────────────────────────────────────────────────────────

export interface Destaque {
  id: string
  nome: string
  preco: number
  preco_promocional: number | null
  foto_url: string | null
}

/**
 * Cache de módulo: a home remonta fachadas ao expandir/recolher um corredor
 * e no pull-to-refresh — os destaques de uma loja não mudam nesse ritmo.
 */
const cacheDestaques = new Map<string, Destaque[]>()
const emVoo = new Map<string, Promise<Destaque[]>>()

async function buscarDestaques(storeId: string): Promise<Destaque[]> {
  const pronto = cacheDestaques.get(storeId)
  if (pronto) return pronto
  const voando = emVoo.get(storeId)
  if (voando) return voando

  const promessa = (async () => {
    const { data } = await supabase
      .from('products')
      .select('id, nome, preco, preco_promocional, foto_url')
      .eq('store_id', storeId)
      .eq('disponivel', true)
      .order('ordem')
      .limit(3)
    const lista = (data ?? []) as Destaque[]
    cacheDestaques.set(storeId, lista)
    emVoo.delete(storeId)
    return lista
  })()
  emVoo.set(storeId, promessa)
  return promessa
}

/**
 * `null` enquanto carrega; depois a lista (possivelmente vazia).
 * `storeId` null (loja seguida fora do catálogo) → lista vazia direto.
 */
export function useDestaquesLoja(storeId: string | null): Destaque[] | null {
  const [destaques, setDestaques] = useState<Destaque[] | null>(() =>
    storeId ? (cacheDestaques.get(storeId) ?? null) : [],
  )
  useEffect(() => {
    if (!storeId) {
      setDestaques([])
      return
    }
    let vivo = true
    buscarDestaques(storeId).then((lista) => {
      if (vivo) setDestaques(lista)
    })
    return () => {
      vivo = false
    }
  }, [storeId])
  return destaques
}
