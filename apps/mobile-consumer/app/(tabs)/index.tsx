import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { HeaderTela } from '@/components/HeaderTela'
import { BannerCarousel } from '@/components/BannerCarousel'
import { LojaCardH } from '@/components/LojaCardH'
import {
  NotificacoesPopup,
  NOTIFICACOES_NAO_LIDAS,
} from '@/components/NotificacoesPopup'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { Card } from '@/components/ui/Card'
import { useCartStore } from '@/store/useCartStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useOrderStore } from '@/store/useOrderStore'
import { formatarReais, PISOS } from '@mallevo/lib'
import { consumerDesign, softColor } from '@/lib/consumer-design'
import { metaDoStatus, ehAtivo } from '@/lib/status-pedido'
import { BANNERS_MOCK } from '@/lib/banners-mock'

const { colors, radius, spacing, shadow } = consumerDesign

interface Loja {
  id: string
  nome: string
  slug: string | null
  logo_url: string | null
  taxa_entrega: number
  tempo_entrega: number | null
  categoria_slug: string | null
}

/**
 * Seções temáticas do home — derivadas dos 9 PISOS curatoriais de
 * @mallevo/lib (packages/lib/src/pisos.ts é a fonte da verdade), na ordem
 * declarada por `ordem`. Nada de fatiar por posição: com o catálogo
 * crescendo, o chunk antigo desalinhava títulos e repetia seções.
 *
 * Os pisos não representam andar físico — são curadoria. Por isso o
 * subtítulo diz o que o consumidor encontra ali, não onde fica.
 */

/** Piso curatorial → subtítulo (o que o consumidor encontra na seção). */
const SUBTITULO_POR_PISO: Record<string, string> = {
  'praca-alimentacao': 'Restaurantes, lanches e cafés',
  'moda-estilo': 'Roupas, calçados e acessórios',
  'saude': 'Farmácias, clínicas e bem-estar',
  'beleza': 'Salões, estética e cosméticos',
  'pet': 'Ração, acessórios e cuidados do pet',
  'casa-vida': 'Decoração, eletrônicos e ferramentas',
  'mercado': 'Mercado, hortifrúti e conveniência',
  'servicos': 'Oficinas, manutenção e cursos',
  'presentes-diversao': 'Brinquedos, papelaria e presentes',
}

const SECOES = [...PISOS]
  .sort((a, b) => a.ordem - b.ordem)
  .map((piso) => ({
    slug: piso.slug,
    titulo: piso.nome,
    subtitulo: SUBTITULO_POR_PISO[piso.slug] ?? '',
  }))

/**
 * Teto da busca de lojas. Precisa cobrir o shopping inteiro: o corte é
 * aplicado ANTES do agrupamento por piso, então toda loja que fica de fora
 * some da tela — e um piso inteiro sem loja deixa de renderizar.
 */
const LIMITE_LOJAS = 200

/**
 * Fallback: 'casa-vida'. É o piso mais abrangente (decoração, eletrônicos,
 * ferramentas, plantas, automotivo) e o único que já absorvia a categoria
 * 'outros' — que, por sinal, não pertence a piso nenhum. Loja sem categoria
 * ou com slug desconhecido aparece ali em vez de sumir do home.
 */
const PISO_FALLBACK = 'casa-vida'
const SECAO_FALLBACK = Math.max(
  0,
  SECOES.findIndex((s) => s.slug === PISO_FALLBACK),
)

/**
 * Categoria (slug global) → índice da seção em SECOES. Construído UMA vez,
 * fora do render.
 *
 * Uma categoria pode pertencer a 2 pisos (veterinária em Saúde+Pet,
 * salões-estética em Beleza+Serviços, floricultura em Casa&Vida+Presentes),
 * mas a loja entra só no primeiro (menor `ordem`) — senão ela apareceria
 * duas vezes no home, que é justamente o que d67f3c8 eliminou.
 */
const SECAO_POR_CATEGORIA: Record<string, number> = (() => {
  const mapa: Record<string, number> = {}
  SECOES.forEach((secao, indice) => {
    const piso = PISOS.find((p) => p.slug === secao.slug)!
    piso.categoriasSlugs.forEach((categoria) => {
      if (mapa[categoria] === undefined) mapa[categoria] = indice
    })
  })
  return mapa
})()

// ─────────────────────────────────────────────────────────
// Sub-componentes locais
// ─────────────────────────────────────────────────────────

function BotaoBell({ aoTocar }: { aoTocar: () => void }) {
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      style={{
        width: 40,
        height: 40,
        borderRadius: radius.sm,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <ConsumerIcon name="bell" size={18} color={colors.ink} />
      {NOTIFICACOES_NAO_LIDAS > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 8,
            right: 9,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.danger,
            borderWidth: 1.5,
            borderColor: colors.canvas,
          }}
        />
      )}
    </TouchableOpacity>
  )
}

function BarraBusca() {
  return (
    <TouchableOpacity
      onPress={() => router.push('/(tabs)/buscar')}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.surface,
        borderRadius: radius.pill,
        paddingHorizontal: 18,
        paddingVertical: 13,
        marginHorizontal: 24,
        marginTop: 4,
        marginBottom: 12,
      }}
    >
      <ConsumerIcon name="search" size={17} color={colors.inkSoft} />
      <Text
        style={{
          fontSize: 14,
          color: colors.inkSoft,
          fontWeight: '500',
          flex: 1,
        }}
      >
        O que você procura hoje?
      </Text>
    </TouchableOpacity>
  )
}

function CardPedidoAtivo({
  pedidoId,
  statusAtual,
}: {
  pedidoId: string
  statusAtual: string
}) {
  const meta = metaDoStatus(statusAtual)

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
      <TouchableOpacity
        onPress={() => router.push(`/pedido/${pedidoId}`)}
        activeOpacity={consumerDesign.opacity.pressed}
      >
        <Card variante="escuro" raio="lg" preenchimento="md">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: softColor(meta.cor),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ConsumerIcon name={meta.icone} size={20} color={meta.cor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: colors.inkSoft,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                Pedido em andamento
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: colors.white,
                  marginTop: 2,
                }}
              >
                {meta.rotuloLongo}
              </Text>
            </View>
            <ConsumerIcon name="chevron-right" size={20} color={colors.inkSoft} />
          </View>
        </Card>
      </TouchableOpacity>
    </View>
  )
}

function SecaoLojas({
  titulo,
  subtitulo,
  lojas,
}: {
  titulo: string
  subtitulo: string
  lojas: Loja[]
}) {
  if (lojas.length === 0) return null

  return (
    <View style={{ paddingTop: 28 }}>
      <View style={{ paddingHorizontal: 24, marginBottom: 14 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: '800',
            color: colors.ink,
            letterSpacing: -0.3,
          }}
        >
          {titulo}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: colors.inkMuted,
            fontWeight: '500',
            marginTop: 2,
          }}
        >
          {subtitulo}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {lojas.map((loja) => (
          <LojaCardH
            key={loja.id}
            loja={loja}
            onPress={() => router.push(`/loja/${loja.slug}`)}
          />
        ))}
      </ScrollView>
    </View>
  )
}

function SkeletonSecao() {
  return (
    <View style={{ paddingTop: 28 }}>
      <View style={{ paddingHorizontal: 24, marginBottom: 14, gap: 8 }}>
        <Skeleton largura="60%" altura={24} raio={6} />
        <Skeleton largura="40%" altura={14} raio={4} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} largura={220} altura={200} raio={radius.lg} />
        ))}
      </ScrollView>
    </View>
  )
}

// ─────────────────────────────────────────────────────────
// Tela
// ─────────────────────────────────────────────────────────

export default function TelaHome() {
  const [lojas, setLojas] = useState<Loja[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false)

  const totalItens = useCartStore((s) => s.totalItens())
  const total = useCartStore((s) => s.total())
  const consumer = useAuthStore((s) => s.consumer)
  const pedidoAtivoId = useOrderStore((s) => s.pedidoAtivoId)
  const statusAtual = useOrderStore((s) => s.statusAtual)
  const primeiroNome = consumer?.nome?.split(' ')[0] ?? ''

  async function carregarDados() {
    const { data } = await supabase
      .from('stores')
      .select(
        'id, nome, slug, logo_url, taxa_entrega, tempo_entrega, categoria:categories(slug)',
      )
      .eq('ativo', true)
      // Teto alto de propósito: a home distribui o resultado nos 9 pisos, e
      // um corte baixo não "encurta" as seções — ele APAGA as últimas, porque
      // seção vazia não é renderizada. Com o limite antigo (40) as lojas de
      // Mercado, Serviços e Presentes & Diversão nunca chegavam à tela.
      // O teto existe só como guarda contra catálogo gigante.
      .limit(LIMITE_LOJAS)

    setLojas(
      (data ?? []).map((r: any) => ({
        ...r,
        categoria_slug: r.categoria?.slug ?? null,
      })),
    )
    setCarregando(false)
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const onRefresh = useCallback(async () => {
    setAtualizando(true)
    await carregarDados()
    setAtualizando(false)
  }, [])

  // Cada loja entra em UM piso só — o da sua categoria (nunca duplica nem desalinha).
  const grupos = SECOES.map(() => [] as Loja[])
  lojas.forEach((loja) => {
    const indice =
      SECAO_POR_CATEGORIA[loja.categoria_slug ?? ''] ?? SECAO_FALLBACK
    grupos[indice].push(loja)
  })

  const mostraPedidoAtivo = pedidoAtivoId && statusAtual && ehAtivo(statusAtual)
  const espacoFinal =
    totalItens > 0 ? spacing.tabBarHeight + 64 : spacing.tabBarHeight

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <HeaderTela
        variante="principal"
        rotuloLocalizacao={
          primeiroNome ? `Olá, ${primeiroNome}` : 'Entregar em'
        }
        textoLocalizacao="Divinópolis"
        aoTocarLocalizacao={() => {
          /* TODO: abrir seletor de endereço (deferido) */
        }}
        acaoDireita={<BotaoBell aoTocar={() => setNotificacoesAbertas(true)} />}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: espacoFinal }}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={onRefresh}
            tintColor={colors.ink}
          />
        }
      >
        <BarraBusca />

        {mostraPedidoAtivo && (
          <CardPedidoAtivo pedidoId={pedidoAtivoId!} statusAtual={statusAtual!} />
        )}

        <View style={{ paddingTop: 16 }}>
          <BannerCarousel banners={BANNERS_MOCK} />
        </View>

        {carregando
          ? Array.from({ length: 2 }).map((_, i) => <SkeletonSecao key={i} />)
          : grupos.map((lojasDaSecao, i) => {
              if (lojasDaSecao.length === 0) return null
              const meta = SECOES[i]
              return (
                <SecaoLojas
                  key={meta.slug}
                  titulo={meta.titulo}
                  subtitulo={meta.subtitulo}
                  lojas={lojasDaSecao}
                />
              )
            })}
      </ScrollView>

      {/* Barra do carrinho fixa acima da tab bar */}
      {totalItens > 0 && (
        <TouchableOpacity
          onPress={() => router.push('/checkout')}
          activeOpacity={consumerDesign.opacity.pressed}
          style={[
            {
              position: 'absolute',
              left: 16,
              right: 16,
              bottom: spacing.tabBarHeight,
              height: 56,
              borderRadius: radius.pill,
              backgroundColor: colors.accent,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
            },
            shadow.floating,
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ConsumerIcon name="bag" size={18} color={colors.ink} strokeWidth={2.1} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>
              {totalItens} {totalItens === 1 ? 'item' : 'itens'}
            </Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>
            {formatarReais(total)}
          </Text>
        </TouchableOpacity>
      )}

      <NotificacoesPopup
        visivel={notificacoesAbertas}
        onFechar={() => setNotificacoesAbertas(false)}
      />
    </View>
  )
}
