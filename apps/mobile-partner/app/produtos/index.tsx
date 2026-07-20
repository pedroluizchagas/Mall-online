import { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { router, useFocusEffect } from 'expo-router'
import { formatarReais } from '@mallevo/lib'
import { useAuthStore } from '@/store/useAuthStore'
import {
  listarProdutos,
  toggleDisponibilidade,
  type ProdutoLista,
  type UsoPlano,
} from '@/lib/catalogo'
import { CabecalhoTela, Chip } from '@/components/Basicos'
import { PartnerIcon } from '@/components/PartnerIcon'
import { partnerDesign, softColor } from '@/lib/partner-design'

// Produtos — busca, filtro por categoria/disponibilidade, toggle inline
// otimista (ação nº 1 do dia a dia) e barra de uso do plano.
// docs/partner-app/06-stage-4-catalogo.md

export default function TelaProdutos() {
  const { lojaAtivaId } = useAuthStore()
  const [produtos, setProdutos] = useState<ProdutoLista[]>([])
  const [uso, setUso] = useState<UsoPlano | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<string | 'todas'>('todas')
  const { colors, radius, spacing, typography } = partnerDesign

  const carregar = useCallback(async () => {
    if (!lojaAtivaId) return
    setCarregando(true)
    const r = await listarProdutos(lojaAtivaId)
    setProdutos(r.produtos)
    setUso(r.uso)
    setCarregando(false)
  }, [lojaAtivaId])

  // Recarrega ao voltar de criar/editar
  useFocusEffect(
    useCallback(() => {
      void carregar()
    }, [carregar])
  )

  const categorias = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const p of produtos) {
      if (p.categories) mapa.set(p.categories.id, p.categories.nome)
    }
    return [...mapa.entries()].map(([id, nome]) => ({ id, nome }))
  }, [produtos])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return produtos.filter((p) => {
      if (filtroCategoria !== 'todas' && p.categories?.id !== filtroCategoria) return false
      if (q && !p.nome.toLowerCase().includes(q)) return false
      return true
    })
  }, [produtos, busca, filtroCategoria])

  async function handleToggle(produto: ProdutoLista) {
    // Otimista + rollback
    const novo = !produto.disponivel
    setProdutos((prev) => prev.map((p) => (p.id === produto.id ? { ...p, disponivel: novo } : p)))
    const r = await toggleDisponibilidade(produto.id, novo)
    if (r.erro) {
      setProdutos((prev) =>
        prev.map((p) => (p.id === produto.id ? { ...p, disponivel: produto.disponivel } : p))
      )
      Alert.alert('Não foi possível atualizar', r.erro)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void carregar()} />}
        contentContainerStyle={{ paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: 120 }}
      >
        <CabecalhoTela titulo="Produtos">
          <TouchableOpacity
            onPress={() => router.push('/produtos/novo')}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.accent,
              borderRadius: radius.pill,
              paddingVertical: 10,
              paddingHorizontal: 14,
              gap: 6,
            }}
          >
            <PartnerIcon name="plus" size={16} color={colors.ink} strokeWidth={2.4} />
            <Text style={{ color: colors.ink, fontWeight: '800', fontSize: typography.bodySm.size }}>
              Novo
            </Text>
          </TouchableOpacity>
        </CabecalhoTela>

        {/* Uso do plano */}
        {uso && (
          <View style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
              <Text style={{ flex: 1, color: colors.inkMuted, fontSize: typography.bodySm.size }}>
                {uso.atual}/{uso.maximo} produtos do plano
              </Text>
              <Text style={{ color: colors.inkMuted, fontSize: typography.bodySm.size, fontWeight: '700' }}>
                {Math.min(uso.percentual, 100)}%
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: colors.surfaceMuted, borderRadius: radius.pill }}>
              <View
                style={{
                  width: `${Math.min(uso.percentual, 100)}%`,
                  height: 6,
                  borderRadius: radius.pill,
                  backgroundColor: uso.percentual >= 90 ? colors.warning : colors.accentStrong,
                }}
              />
            </View>
          </View>
        )}

        {/* Busca */}
        <TextInput
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar produto…"
          placeholderTextColor={colors.inkSoft}
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.sm,
            paddingHorizontal: 14,
            height: 46,
            color: colors.ink,
            fontSize: typography.bodyLg.size,
            marginBottom: spacing.md,
          }}
        />

        {/* Filtro por categoria */}
        {categorias.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm }}>
            <Chip rotulo="Todas" ativo={filtroCategoria === 'todas'} onPress={() => setFiltroCategoria('todas')} />
            {categorias.map((c) => (
              <Chip key={c.id} rotulo={c.nome} ativo={filtroCategoria === c.id} onPress={() => setFiltroCategoria(c.id)} />
            ))}
          </View>
        )}

        {filtrados.length === 0 && !carregando ? (
          <Text style={{ color: colors.inkSoft, textAlign: 'center', marginTop: spacing['3xl'] }}>
            {produtos.length === 0 ? 'Nenhum produto ainda — crie o primeiro.' : 'Nada encontrado.'}
          </Text>
        ) : (
          filtrados.map((p) => {
            const estoqueBaixo =
              p.track_stock &&
              p.stock_quantity !== null &&
              (p.stock_quantity ?? 0) <= (p.stock_minimo ?? 0)
            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.7}
                onPress={() => router.push(`/produtos/${p.id}`)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.surface,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                  gap: spacing.md,
                }}
              >
                {p.foto_url ? (
                  <Image
                    source={{ uri: p.foto_url }}
                    style={{ width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted }}
                  />
                ) : (
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: radius.sm,
                      backgroundColor: colors.surfaceMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PartnerIcon name="box" size={22} color={colors.inkSoft} />
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '700', fontSize: typography.bodyLg.size }}>
                    {p.nome}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={{ color: colors.ink, fontWeight: '800', fontSize: typography.bodySm.size }}>
                      {formatarReais(p.preco_promocional ?? p.preco)}
                    </Text>
                    {p.preco_promocional ? (
                      <Text style={{ color: colors.inkSoft, fontSize: typography.bodySm.size, textDecorationLine: 'line-through' }}>
                        {formatarReais(p.preco)}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
                    {estoqueBaixo && (
                      <BadgeMini texto={`Estoque: ${p.stock_quantity}`} cor={colors.warning} />
                    )}
                    {p.product_variants.length > 0 && (
                      <BadgeMini texto={`${p.product_variants.length} variações`} cor={colors.info} />
                    )}
                  </View>
                </View>

                <Switch
                  value={p.disponivel}
                  onValueChange={() => void handleToggle(p)}
                  trackColor={{ true: colors.accentStrong, false: colors.canvasAlt }}
                  thumbColor={colors.white}
                />
              </TouchableOpacity>
            )
          })
        )}
      </ScrollView>
    </View>
  )
}

function BadgeMini({ texto, cor }: { texto: string; cor: string }) {
  const { colors, radius, typography } = partnerDesign
  return (
    <View style={{ backgroundColor: softColor(cor), borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: 8 }}>
      <Text style={{ color: colors.ink, fontSize: typography.micro.size, fontWeight: '700' }}>{texto}</Text>
    </View>
  )
}
