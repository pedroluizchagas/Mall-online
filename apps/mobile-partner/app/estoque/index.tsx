import { useCallback, useMemo, useState } from 'react'
import { Alert, Image, RefreshControl, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { router, useFocusEffect } from 'expo-router'
import { listarProdutosEstoque, toggleControleEstoque, type ProdutoEstoque } from '@/lib/catalogo'
import { CabecalhoTela } from '@/components/Basicos'
import { PartnerIcon } from '@/components/PartnerIcon'
import { abrirNoDashboard } from '@/lib/links'
import { partnerDesign, softColor } from '@/lib/partner-design'

// Estoque — feature de plano (plans.tem_estoque, mesma verificação do
// Dashboard); alerta de mínimo; ativar controle por produto; tap →
// movimentações. docs/partner-app/06 §Estoque.

export default function TelaEstoque() {
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([])
  const [carregando, setCarregando] = useState(false)
  const [semPlano, setSemPlano] = useState(false)
  const [busca, setBusca] = useState('')
  const { colors, radius, spacing, typography } = partnerDesign

  const carregar = useCallback(async () => {
    setCarregando(true)
    const r = await listarProdutosEstoque()
    setSemPlano(!!r.upgrade)
    setProdutos(r.produtos)
    setCarregando(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      void carregar()
    }, [carregar])
  )

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return q ? produtos.filter((p) => p.nome.toLowerCase().includes(q)) : produtos
  }, [produtos, busca])

  async function handleToggleControle(p: ProdutoEstoque) {
    const ativar = !p.track_stock
    const r = await toggleControleEstoque(p.id, ativar, 0)
    if (r.erro) Alert.alert('Não foi possível atualizar', r.erro)
    void carregar()
  }

  if (semPlano) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <StatusBar style="dark" />
        <View style={{ paddingTop: 64, paddingHorizontal: spacing.lg }}>
          <CabecalhoTela titulo="Estoque" />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'] }}>
          <PartnerIcon name="box" size={34} color={colors.inkSoft} />
          <Text style={{ color: colors.ink, fontSize: typography.h3.size, fontWeight: '700', marginTop: spacing.md, marginBottom: 6 }}>
            Disponível em planos superiores
          </Text>
          <Text style={{ color: colors.inkMuted, textAlign: 'center', marginBottom: spacing.xl, maxWidth: 280 }}>
            O controle de estoque não está incluído no seu plano atual.
          </Text>
          <TouchableOpacity
            onPress={() => abrirNoDashboard('/minha-conta?aba=assinatura')}
            activeOpacity={0.85}
            style={{
              height: 50,
              paddingHorizontal: spacing['2xl'],
              borderRadius: radius.pill,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.ink, fontWeight: '800' }}>Fazer upgrade</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void carregar()} />}
        contentContainerStyle={{ paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: 120 }}
      >
        <CabecalhoTela titulo="Estoque" />

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
            marginBottom: spacing.lg,
          }}
        />

        {filtrados.map((p) => {
          const baixo =
            p.track_stock && p.stock_quantity !== null && (p.stock_quantity ?? 0) <= (p.stock_minimo ?? 0)
          return (
            <TouchableOpacity
              key={p.id}
              activeOpacity={0.7}
              disabled={!p.track_stock}
              onPress={() => router.push(`/estoque/${p.id}`)}
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
                <Image source={{ uri: p.foto_url }} style={{ width: 48, height: 48, borderRadius: radius.sm }} />
              ) : (
                <View style={{ width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
                  <PartnerIcon name="box" size={20} color={colors.inkSoft} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '700' }}>
                  {p.nome}
                </Text>
                {p.track_stock ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={{ color: baixo ? colors.ink : colors.inkMuted, fontSize: typography.bodySm.size, fontWeight: baixo ? '800' : '500' }}>
                      {p.stock_quantity ?? 0} un
                    </Text>
                    {baixo && (
                      <View style={{ backgroundColor: softColor(colors.warning), borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: 8 }}>
                        <Text style={{ color: colors.ink, fontSize: typography.micro.size, fontWeight: '700' }}>
                          abaixo do mínimo
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={{ color: colors.inkSoft, fontSize: typography.bodySm.size, marginTop: 2 }}>
                    Sem controle de estoque
                  </Text>
                )}
              </View>
              <Switch
                value={p.track_stock}
                onValueChange={() => void handleToggleControle(p)}
                trackColor={{ true: colors.accentStrong, false: colors.canvasAlt }}
                thumbColor={colors.white}
              />
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}
