import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  MapPin,
  Bell,
  Search,
  ChevronDown,
  ShoppingBag,
  ChevronRight,
} from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import { BannerCarousel } from '@/components/BannerCarousel'
import { LojaCardH } from '@/components/LojaCardH'
import { useCartStore } from '@/store/useCartStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useOrderStore } from '@/store/useOrderStore'
import { formatarReais } from '@mallora/lib'

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
interface Loja {
  id: string
  nome: string
  slug: string | null
  logo_url: string | null
  taxa_entrega: number
  tempo_entrega: number | null
}

interface Categoria {
  id: string
  nome: string
  icone: string | null
}

// ─────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────
const GRADIENTES_CATS = [
  '#C75B3A', '#1A4D3A', '#3D5B9E', '#8A6B1E',
  '#8A2867', '#4A38A8', '#7A5535', '#007055',
]

const ICONES_PADRAO: [string, string][] = [
  ['restaurante', '🍽️'], ['alimentação', '🍽️'], ['comida', '🍽️'],
  ['mercado', '🛒'], ['supermercado', '🛒'],
  ['farmácia', '💊'], ['saúde', '💊'],
  ['bebida', '🍻'],
  ['moda', '👗'], ['roupa', '👗'],
  ['eletrônico', '📱'], ['tech', '📱'],
  ['pet', '🐾'],
  ['casa', '🏠'], ['decoração', '🏠'],
]

function getIcone(nome: string, icone: string | null): string {
  if (icone) return icone
  const lower = nome.toLowerCase()
  for (const [key, emoji] of ICONES_PADRAO) {
    if (lower.includes(key)) return emoji
  }
  return '🏪'
}

// ─────────────────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────────────────
function SectionHeader({
  title,
  onVerTudo,
}: {
  title: string
  onVerTudo?: () => void
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 3,
            height: 20,
            borderRadius: 2,
            backgroundColor: '#1A4D3A',
          }}
        />
        <Text
          style={{
            fontFamily: 'serif',
            fontSize: 20,
            fontWeight: '600',
            color: '#1C1C19',
          }}
        >
          {title}
        </Text>
      </View>
      {onVerTudo && (
        <TouchableOpacity
          onPress={onVerTudo}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
          activeOpacity={0.6}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#287D5C' }}>
            Ver tudo
          </Text>
          <ChevronRight size={14} color="#287D5C" />
        </TouchableOpacity>
      )}
    </View>
  )
}

// ─────────────────────────────────────────────────────────
// Metadados dos pisos (subcategorias e filtros)
// ─────────────────────────────────────────────────────────
type SubCat = { nome: string; emoji: string; cor: string }
interface AndarMeta {
  label: string
  nome: string
  desc: string
  cor: string
  cozinhas?: string[]
  subs?: SubCat[]
}

const FLOOR_METADATA: AndarMeta[] = [
  {
    label: 'Térreo',
    nome: 'Praça de Alimentação',
    desc: 'Restaurantes, fast food, padarias e cafés',
    cor: '#C75B3A',
    cozinhas: ['Todos', 'Brasileira', 'Pizza', 'Hambúrguer', 'Japonesa', 'Açaí', 'Saudável'],
  },
  {
    label: '1º Piso',
    nome: 'Essenciais do Dia a Dia',
    desc: 'Mercado, farmácia, bebidas e conveniência',
    cor: '#287D5C',
    subs: [
      { nome: 'Mercado', emoji: '🛒', cor: '#287D5C' },
      { nome: 'Farmácia', emoji: '💊', cor: '#5B8DEF' },
      { nome: 'Bebidas', emoji: '🍺', cor: '#F5A623' },
    ],
  },
  {
    label: '2º Piso',
    nome: 'Moda & Beleza',
    desc: 'Roupas, calçados, acessórios e cosméticos',
    cor: '#B44580',
    subs: [
      { nome: 'Roupas', emoji: '👗', cor: '#D45B9E' },
      { nome: 'Calçados', emoji: '👟', cor: '#8B5E3C' },
      { nome: 'Cosméticos', emoji: '💄', cor: '#A855C7' },
    ],
  },
  {
    label: '3º Piso',
    nome: 'Tecnologia & Eletrônicos',
    desc: 'Celulares, informática, games e acessórios',
    cor: '#5040C0',
    subs: [
      { nome: 'Celulares', emoji: '📱', cor: '#6C5CE7' },
      { nome: 'Informática', emoji: '💻', cor: '#2E6B8A' },
      { nome: 'Games', emoji: '🎮', cor: '#E8654A' },
    ],
  },
  {
    label: '4º Piso',
    nome: 'Casa & Vida',
    desc: 'Decoração, pet shop, papelaria e utilidades',
    cor: '#008F70',
    subs: [
      { nome: 'Decoração', emoji: '🏠', cor: '#00B894' },
      { nome: 'Pet Shop', emoji: '🐾', cor: '#A67C52' },
      { nome: 'Papelaria', emoji: '✏️', cor: '#E8654A' },
    ],
  },
]

// ─────────────────────────────────────────────────────────
// Filtros de culinária (Térreo)
// ─────────────────────────────────────────────────────────
function FiltrosCulinaria({ itens }: { itens: string[] }) {
  const [ativo, setAtivo] = useState(0)
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 14, gap: 8 }}
    >
      {itens.map((item, i) => {
        const on = i === ativo
        return (
          <TouchableOpacity
            key={i}
            onPress={() => setAtivo(i)}
            activeOpacity={0.75}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 9,
              borderRadius: 100,
              flexShrink: 0,
              backgroundColor: on ? '#1A4D3A' : '#FFFFFF',
              borderWidth: on ? 0 : 1.5,
              borderColor: 'rgba(26,26,23,0.08)',
              shadowColor: on ? '#1A4D3A' : '#000',
              shadowOpacity: on ? 0.22 : 0,
              shadowRadius: on ? 8 : 0,
              shadowOffset: { width: 0, height: 3 },
              elevation: on ? 3 : 0,
            }}
          >
            <Text
              style={{
                fontSize: 12.5,
                fontWeight: '600',
                color: on ? '#FFF' : '#3D3D36',
              }}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

// ─────────────────────────────────────────────────────────
// Linha de subcategorias (demais pisos)
// ─────────────────────────────────────────────────────────
function SubcategoriaRow({ subs }: { subs: SubCat[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 14, gap: 8 }}
    >
      {subs.map((sub, i) => (
        <TouchableOpacity
          key={i}
          activeOpacity={0.75}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 100,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: 'rgba(26,26,23,0.07)',
            shadowColor: '#000',
            shadowOpacity: 0.04,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 1 },
            elevation: 1,
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 9,
              backgroundColor: sub.cor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 13 }}>{sub.emoji}</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#3D3D36' }}>
            {sub.nome}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

// ─────────────────────────────────────────────────────────
// Tela principal
// ─────────────────────────────────────────────────────────
export default function TelaHome() {
  const [lojas, setLojas] = useState<Loja[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)

  const insets = useSafeAreaInsets()
  const totalItens = useCartStore((s) => s.totalItens())
  const total = useCartStore((s) => s.total())
  const consumer = useAuthStore((s) => s.consumer)
  const pedidoAtivoId = useOrderStore((s) => s.pedidoAtivoId)
  const statusAtual = useOrderStore((s) => s.statusAtual)
  const primeiroNome = consumer?.nome?.split(' ')[0] ?? ''

  async function carregarDados() {
    const [resLojas, resCats] = await Promise.all([
      supabase
        .from('stores')
        .select('id, nome, slug, logo_url, taxa_entrega, tempo_entrega')
        .eq('ativo', true)
        .limit(40),
      supabase
        .from('categories')
        .select('id, nome, icone')
        .is('tenant_id', null)
        .eq('ativa', true)
        .order('ordem'),
    ])

    setLojas(resLojas.data ?? [])
    setCategorias(resCats.data ?? [])
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

  // Divide lojas em "andares" de ~6 para criar seções visuais
  const ANDAR_SIZE = 6
  const andares = carregando
    ? []
    : lojas.reduce<Loja[][]>((acc, loja, i) => {
        const andar = Math.floor(i / ANDAR_SIZE)
        if (!acc[andar]) acc[andar] = []
        acc[andar].push(loja)
        return acc
      }, [])


  return (
    <View style={{ flex: 1, backgroundColor: '#F4F0EB' }}>

      {/* ══════════════════════════════
          HEADER FIXO
      ══════════════════════════════ */}
      <View
        style={{
          paddingTop: insets.top + 6,
          paddingHorizontal: 24,
          backgroundColor: '#F4F0EB',
        }}
      >
        {/* Localização + Notificações */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: '#1A4D3A',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#1A4D3A',
                shadowOpacity: 0.32,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: 4,
              }}
            >
              <MapPin size={17} color="#FFF" />
            </View>

            <TouchableOpacity activeOpacity={0.7}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: '#8A8A7E',
                  letterSpacing: 0.9,
                  textTransform: 'uppercase',
                  marginBottom: 2,
                }}
              >
                {primeiroNome ? `Olá, ${primeiroNome}` : 'Entregar em'}
              </Text>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: '#1C1C19',
                    letterSpacing: -0.3,
                  }}
                >
                  Divinópolis
                </Text>
                <ChevronDown size={14} color="#8A8A7E" />
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: 'rgba(26,26,23,0.07)',
              shadowColor: '#000',
              shadowOpacity: 0.05,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            }}
          >
            <Bell size={19} color="#3D3D36" strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* Busca */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/buscar')}
          activeOpacity={0.75}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: '#FFFFFF',
            borderRadius: 100,
            paddingHorizontal: 18,
            paddingVertical: 13,
            marginBottom: 4,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}
        >
          <Search size={17} color="#8A8A7E" />
          <Text
            style={{
              fontSize: 14,
              color: '#B0B0A5',
              fontWeight: '500',
              flex: 1,
            }}
          >
            O que você procura hoje?
          </Text>
        </TouchableOpacity>
      </View>

      {/* ══════════════════════════════
          CONTEÚDO SCROLLÁVEL
      ══════════════════════════════ */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={onRefresh}
            tintColor="#1A4D3A"
          />
        }
      >
        {/* ── Banner Carousel (3 slides, auto-rotate 4s) ── */}
        <View style={{ paddingTop: 20 }}>
          <BannerCarousel />
        </View>

        {/* ── Pedido ativo ── */}
        {pedidoAtivoId && (
          <View style={{ paddingHorizontal: 24, paddingTop: 14 }}>
            <TouchableOpacity
              onPress={() => router.push(`/pedido/${pedidoAtivoId}`)}
              activeOpacity={0.88}
              style={{
                padding: 16,
                borderRadius: 18,
                backgroundColor: '#287D5C',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                overflow: 'hidden',
                shadowColor: '#1A4D3A',
                shadowOpacity: 0.28,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 5,
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <View
                  style={{
                    width: '45%',
                    height: '100%',
                    backgroundColor: '#D4A04A',
                    borderRadius: 2,
                  }}
                />
              </View>

              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 22 }}>🛵</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: '#FFF',
                    marginBottom: 2,
                  }}
                >
                  Pedido a caminho
                </Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.58)' }}>
                  {statusAtual ?? 'Em preparo'} · Toque para rastrear
                </Text>
              </View>

              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 100,
                  backgroundColor: '#D4A04A',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: '#1C1C19',
                  }}
                >
                  Rastrear
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Grid de Categorias ── */}
        <SectionHeader title="Categorias" />

        {carregando ? (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              paddingHorizontal: 16,
              gap: 10,
              paddingBottom: 8,
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: '22%',
                  aspectRatio: 0.85,
                  borderRadius: 18,
                  backgroundColor: 'rgba(26,26,23,0.06)',
                }}
              />
            ))}
          </View>
        ) : categorias.length > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              paddingHorizontal: 16,
              gap: 10,
              paddingBottom: 8,
            }}
          >
            {categorias.slice(0, 8).map((cat, i) => {
              const cor = GRADIENTES_CATS[i % GRADIENTES_CATS.length]
              const emoji = getIcone(cat.nome, cat.icone)
              return (
                <View
                  key={cat.id}
                  style={{
                    width: '22%',
                    alignItems: 'center',
                    gap: 8,
                    paddingTop: 14,
                    paddingBottom: 10,
                    paddingHorizontal: 4,
                    borderRadius: 18,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: 'rgba(26,26,23,0.06)',
                    shadowColor: '#000',
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: cor,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: cor,
                      shadowOpacity: 0.38,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 3 },
                      elevation: 3,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{emoji}</Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 10.5,
                      fontWeight: '600',
                      color: '#3D3D36',
                      textAlign: 'center',
                    }}
                    numberOfLines={2}
                  >
                    {cat.nome}
                  </Text>
                </View>
              )
            })}
          </View>
        ) : null}

        {/* ── Seções de lojas (andares) ── */}
        {carregando
          ? Array.from({ length: 2 }).map((_, i) => (
              <View key={i} style={{ paddingBottom: 32 }}>
                <View
                  style={{
                    marginHorizontal: 24,
                    marginTop: 28,
                    marginBottom: 16,
                    height: 90,
                    borderRadius: 20,
                    backgroundColor: 'rgba(26,26,23,0.06)',
                  }}
                />
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 14,
                    paddingHorizontal: 24,
                  }}
                >
                  {Array.from({ length: 3 }).map((_, j) => (
                    <View
                      key={j}
                      style={{
                        width: 220,
                        height: 200,
                        borderRadius: 20,
                        backgroundColor: 'rgba(26,26,23,0.06)',
                      }}
                    />
                  ))}
                </View>
              </View>
            ))
          : andares.map((lojasDoAndar, i) => {
              const meta = FLOOR_METADATA[i % FLOOR_METADATA.length]

              return (
                <View key={i} style={{ paddingBottom: 32, paddingTop: 20 }}>
                  {/* Banner do andar */}
                  <View
                    style={{
                      marginHorizontal: 24,
                      marginBottom: 12,
                      borderRadius: 20,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        paddingVertical: 18,
                        paddingLeft: 24,
                        paddingRight: 20,
                        backgroundColor: meta.cor,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Barra lateral */}
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 4,
                          backgroundColor: 'rgba(255,255,255,0.22)',
                        }}
                      />
                      {/* Círculo decorativo */}
                      <View
                        style={{
                          position: 'absolute',
                          right: -24,
                          top: -24,
                          width: 100,
                          height: 100,
                          borderRadius: 50,
                          backgroundColor: 'rgba(255,255,255,0.07)',
                        }}
                      />

                      {/* Tag do andar */}
                      <View
                        style={{
                          alignSelf: 'flex-start',
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 100,
                          backgroundColor: 'rgba(255,255,255,0.14)',
                          marginBottom: 10,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '700',
                            color: 'rgba(255,255,255,0.88)',
                            letterSpacing: 1.2,
                            textTransform: 'uppercase',
                          }}
                        >
                          {meta.label}
                        </Text>
                      </View>

                      <Text
                        style={{
                          fontFamily: 'serif',
                          fontSize: 22,
                          fontWeight: '600',
                          color: '#FFFFFF',
                          lineHeight: 26,
                        }}
                      >
                        {meta.nome}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: 'rgba(255,255,255,0.55)',
                          marginTop: 3,
                        }}
                      >
                        {meta.desc}
                      </Text>
                    </View>
                  </View>

                  {/* Filtros: culinária (Térreo) ou subcategorias */}
                  {meta.cozinhas ? (
                    <FiltrosCulinaria itens={meta.cozinhas} />
                  ) : meta.subs ? (
                    <SubcategoriaRow subs={meta.subs} />
                  ) : null}

                  {/* Cards em scroll horizontal */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    decelerationRate="fast"
                    contentContainerStyle={{ paddingHorizontal: 24, gap: 14 }}
                  >
                    {lojasDoAndar.map((loja) => (
                      <LojaCardH
                        key={loja.id}
                        loja={loja}
                        onPress={() => router.push(`/loja/${loja.slug}`)}
                      />
                    ))}
                  </ScrollView>
                </View>
              )
            })}

        {/* ── Estado vazio ── */}
        {!carregando && lojas.length === 0 && (
          <View
            style={{ alignItems: 'center', paddingVertical: 48, gap: 10 }}
          >
            <Text style={{ fontSize: 40 }}>🏪</Text>
            <Text
              style={{
                fontSize: 14,
                color: '#8A8A7E',
                textAlign: 'center',
              }}
            >
              Nenhuma loja disponível no momento.
            </Text>
          </View>
        )}

        {/* ── Rodapé ── */}
        <View
          style={{
            alignItems: 'center',
            paddingTop: 8,
            paddingBottom: totalItens > 0 ? 112 : 40,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 100,
              backgroundColor: 'rgba(26,77,58,0.05)',
            }}
          >
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: '#4CAF82',
              }}
            />
            <Text
              style={{
                fontFamily: 'serif',
                fontSize: 13,
                fontWeight: '500',
                color: '#B0B0A5',
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              Mallora
            </Text>
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: '#4CAF82',
              }}
            />
          </View>
          <Text style={{ fontSize: 11, color: '#D0D0C5', marginTop: 5 }}>
            O shopping digital de Divinópolis
          </Text>
        </View>
      </ScrollView>

      {/* ══════════════════════════════
          CARRINHO FLUTUANTE
      ══════════════════════════════ */}
      {totalItens > 0 && (
        <View
          style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            onPress={() => router.push('/checkout')}
            activeOpacity={0.88}
            style={{
              backgroundColor: '#1A4D3A',
              borderRadius: 18,
              paddingHorizontal: 20,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              shadowColor: '#1A4D3A',
              shadowOpacity: 0.5,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: 'rgba(255,255,255,0.14)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShoppingBag size={16} color="#FFF" />
            </View>

            <Text
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 14.5,
                fontWeight: '700',
                color: '#FFF',
              }}
            >
              Ver sacola
            </Text>

            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  backgroundColor: '#D4A04A',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '800',
                    color: '#FFF',
                  }}
                >
                  {totalItens}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 13.5,
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.72)',
                }}
              >
                {formatarReais(total)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}
