import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { router, useLocalSearchParams } from 'expo-router'
import { formatarReais } from '@mallevo/lib'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import {
  atualizarProduto,
  atualizarVariante,
  excluirProduto,
  listarVariantes,
  type VarianteLista,
} from '@/lib/catalogo'
import { FormProduto, paraCampos, valoresIniciais, type ValoresForm } from '@/components/FormProduto'
import { BotaoPrimario, CabecalhoTela, Cartao, Legenda } from '@/components/Basicos'
import { abrirNoDashboard } from '@/lib/links'
import { partnerDesign } from '@/lib/partner-design'

// Editar produto — mesmos campos do web; variações exibem e editam
// disponibilidade (estrutura de variações/modificadores é web-only,
// decisão docs/partner-app/01 §3).

export default function TelaEditarProduto() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { tenant } = useAuthStore()
  const [valores, setValores] = useState<ValoresForm | null>(null)
  const [fotoAtual, setFotoAtual] = useState<string | null>(null)
  const [variantes, setVariantes] = useState<VarianteLista[]>([])
  const [temModificadores, setTemModificadores] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const { colors, spacing, typography } = partnerDesign

  useEffect(() => {
    async function carregar() {
      const { data: p } = await supabase
        .from('products')
        .select(
          'id, nome, descricao, preco, preco_promocional, category_id, disponivel, track_stock, stock_quantity, stock_minimo, foto_url, product_modifier_groups (id)'
        )
        .eq('id', String(id))
        .single()

      if (!p) {
        Alert.alert('Produto não encontrado')
        router.back()
        return
      }

      setFotoAtual(p.foto_url)
      setTemModificadores((p.product_modifier_groups ?? []).length > 0)
      setValores({
        ...valoresIniciais(),
        nome: p.nome,
        descricao: p.descricao ?? '',
        precoReais: (p.preco / 100).toFixed(2).replace('.', ','),
        precoPromoReais: p.preco_promocional ? (p.preco_promocional / 100).toFixed(2).replace('.', ',') : '',
        categoryId: p.category_id,
        disponivel: p.disponivel,
        trackStock: p.track_stock,
        stockQuantity: p.stock_quantity !== null ? String(p.stock_quantity) : '',
        stockMinimo: p.stock_minimo !== null ? String(p.stock_minimo) : '',
      })

      setVariantes(await listarVariantes(String(id)))
    }
    void carregar()
  }, [id])

  async function handleSalvar() {
    if (!tenant || !valores || salvando) return
    const { campos, erro } = paraCampos(valores)
    if (erro || !campos) {
      Alert.alert(erro ?? 'Dados inválidos')
      return
    }

    setSalvando(true)
    const r = await atualizarProduto(String(id), tenant.id, campos, valores.fotoUri)
    setSalvando(false)

    if (r.erro) {
      Alert.alert('Não foi possível salvar', r.erro)
      return
    }
    router.back()
  }

  function handleExcluir() {
    Alert.alert('Excluir produto', 'Essa ação não pode ser desfeita.', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const r = await excluirProduto(String(id))
          if (r.erro) Alert.alert('Não foi possível excluir', r.erro)
          else router.back()
        },
      },
    ])
  }

  async function toggleVariante(v: VarianteLista) {
    const novo = !v.disponivel
    setVariantes((prev) => prev.map((x) => (x.id === v.id ? { ...x, disponivel: novo } : x)))
    const r = await atualizarVariante(v.id, { disponivel: novo })
    if (r.erro) {
      setVariantes((prev) => prev.map((x) => (x.id === v.id ? { ...x, disponivel: v.disponivel } : x)))
      Alert.alert('Não foi possível atualizar', r.erro)
    }
  }

  if (!valores) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: 48 }}>
          <CabecalhoTela titulo="Editar produto" />
          <FormProduto valores={valores} aoMudar={setValores} fotoAtualUrl={fotoAtual} />

          {/* Variações — leitura + disponibilidade; estrutura no Dashboard */}
          {variantes.length > 0 && (
            <>
              <Legenda>Variações</Legenda>
              <Cartao semPadding>
                {variantes.map((v, i) => (
                  <View
                    key={v.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: spacing.lg,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: colors.line,
                      gap: spacing.md,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: typography.body.size }}>
                        {v.rotulo}
                      </Text>
                      <Text style={{ color: colors.inkMuted, fontSize: typography.bodySm.size }}>
                        {formatarReais(v.preco_promocional ?? v.preco)}
                        {v.stock_quantity !== null ? ` · estoque ${v.stock_quantity}` : ''}
                      </Text>
                    </View>
                    <Switch
                      value={v.disponivel}
                      onValueChange={() => void toggleVariante(v)}
                      trackColor={{ true: colors.accentStrong, false: colors.canvasAlt }}
                      thumbColor={colors.white}
                    />
                  </View>
                ))}
              </Cartao>
            </>
          )}

          {(variantes.length > 0 || temModificadores) && (
            <TouchableOpacity
              onPress={() => abrirNoDashboard(`/produtos/${id}`)}
              activeOpacity={0.7}
              style={{ marginBottom: spacing.lg, alignItems: 'center' }}
            >
              <Text style={{ color: colors.inkMuted, fontSize: typography.bodySm.size, textDecorationLine: 'underline' }}>
                Estruturar variações e adicionais no Dashboard
              </Text>
            </TouchableOpacity>
          )}

          <BotaoPrimario rotulo="Salvar alterações" onPress={() => void handleSalvar()} carregando={salvando} />
          <BotaoPrimario rotulo="Excluir produto" onPress={handleExcluir} destrutivo />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
