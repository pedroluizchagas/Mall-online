import { useCallback, useState } from 'react'
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import {
  atualizarEstoqueMinimo,
  historicoMovimentacoes,
  registrarAjusteEstoque,
  registrarEntradaEstoque,
  type Movimentacao,
} from '@/lib/catalogo'
import { BotaoPrimario, CabecalhoTela, CampoTexto, Cartao, Chip, Legenda } from '@/components/Basicos'
import { partnerDesign, formatarMomentoCurto } from '@/lib/partner-design'

// Movimentações de estoque de um produto — entrada (reposição) e ajuste
// (correção/perda, motivo obrigatório), gravando stock_movements idêntico
// ao Dashboard. docs/partner-app/06 §Estoque.

const ROTULO_TIPO: Record<string, string> = {
  entrada: 'Entrada',
  saida_pedido: 'Saída (pedido)',
  ajuste_positivo: 'Ajuste +',
  ajuste_negativo: 'Ajuste −',
}

export default function TelaMovimentacoes() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { tenant } = useAuthStore()
  const [produto, setProduto] = useState<{ nome: string; stock_quantity: number | null; stock_minimo: number | null } | null>(null)
  const [historico, setHistorico] = useState<Movimentacao[]>([])
  const [carregando, setCarregando] = useState(false)

  const [modo, setModo] = useState<'entrada' | 'ajuste_positivo' | 'ajuste_negativo'>('entrada')
  const [quantidade, setQuantidade] = useState('')
  const [motivo, setMotivo] = useState('')
  const [minimo, setMinimo] = useState('')
  const [salvando, setSalvando] = useState(false)

  const { colors, spacing, typography } = partnerDesign

  const carregar = useCallback(async () => {
    setCarregando(true)
    const [{ data: p }, hist] = await Promise.all([
      supabase
        .from('products')
        .select('nome, stock_quantity, stock_minimo')
        .eq('id', String(id))
        .single(),
      historicoMovimentacoes(String(id)),
    ])
    if (p) {
      setProduto(p)
      setMinimo(p.stock_minimo !== null ? String(p.stock_minimo) : '')
    }
    setHistorico(hist)
    setCarregando(false)
  }, [id])

  useFocusEffect(
    useCallback(() => {
      void carregar()
    }, [carregar])
  )

  async function handleRegistrar() {
    if (!tenant || salvando) return
    const qtd = parseInt(quantidade, 10)
    if (!Number.isFinite(qtd) || qtd < 1) {
      Alert.alert('Quantidade deve ser pelo menos 1')
      return
    }

    setSalvando(true)
    const r =
      modo === 'entrada'
        ? await registrarEntradaEstoque(String(id), tenant.id, qtd, motivo.trim() || undefined)
        : await registrarAjusteEstoque(String(id), tenant.id, modo, qtd, motivo)
    setSalvando(false)

    if ('erro' in r && r.erro) {
      Alert.alert('Não foi possível registrar', r.erro)
      return
    }
    setQuantidade('')
    setMotivo('')
    void carregar()
  }

  async function handleSalvarMinimo() {
    const v = parseInt(minimo, 10)
    if (!Number.isFinite(v) || v < 0) {
      Alert.alert('Mínimo inválido')
      return
    }
    const r = await atualizarEstoqueMinimo(String(id), v)
    if (r.erro) Alert.alert('Não foi possível salvar', r.erro)
    else void carregar()
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void carregar()} />}
        contentContainerStyle={{ paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: 64 }}
      >
        <CabecalhoTela titulo={produto?.nome ?? 'Estoque'} />

        {/* Situação atual */}
        <Cartao>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <Text style={{ color: colors.ink, fontSize: 40, fontWeight: '800', lineHeight: 44 }}>
              {produto?.stock_quantity ?? 0}
            </Text>
            <Text style={{ color: colors.inkMuted, fontSize: typography.body.size, marginBottom: 6 }}>
              unidades em estoque
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, marginTop: spacing.md }}>
            <View style={{ flex: 1 }}>
              <CampoTexto rotulo="Alerta de mínimo" valor={minimo} aoMudar={setMinimo} teclado="numeric" placeholder="0" />
            </View>
            <TouchableOpacity
              onPress={() => void handleSalvarMinimo()}
              activeOpacity={0.8}
              style={{
                height: 48,
                paddingHorizontal: 18,
                borderRadius: partnerDesign.radius.sm,
                backgroundColor: colors.surfaceMuted,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.md,
              }}
            >
              <Text style={{ color: colors.ink, fontWeight: '700' }}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </Cartao>

        {/* Registrar movimento */}
        <Legenda>Registrar</Legenda>
        <Cartao>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm }}>
            <Chip rotulo="Entrada" ativo={modo === 'entrada'} onPress={() => setModo('entrada')} />
            <Chip rotulo="Ajuste +" ativo={modo === 'ajuste_positivo'} onPress={() => setModo('ajuste_positivo')} />
            <Chip rotulo="Ajuste −" ativo={modo === 'ajuste_negativo'} onPress={() => setModo('ajuste_negativo')} />
          </View>
          <CampoTexto rotulo="Quantidade" valor={quantidade} aoMudar={setQuantidade} teclado="numeric" placeholder="0" />
          <CampoTexto
            rotulo={modo === 'entrada' ? 'Motivo (opcional)' : 'Motivo (obrigatório)'}
            valor={motivo}
            aoMudar={setMotivo}
            placeholder={modo === 'entrada' ? 'Ex.: compra do fornecedor' : 'Ex.: perda, correção de contagem'}
          />
          <BotaoPrimario rotulo="Registrar" onPress={() => void handleRegistrar()} carregando={salvando} />
        </Cartao>

        {/* Histórico */}
        <Legenda>Histórico</Legenda>
        <Cartao semPadding>
          {historico.length === 0 ? (
            <Text style={{ color: colors.inkSoft, padding: spacing.lg }}>Nenhuma movimentação ainda.</Text>
          ) : (
            historico.map((m, i) => (
              <View
                key={m.id}
                style={{
                  flexDirection: 'row',
                  paddingVertical: 10,
                  paddingHorizontal: spacing.lg,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.line,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.ink, fontWeight: '700', fontSize: typography.body.size }}>
                    {ROTULO_TIPO[m.tipo] ?? m.tipo}
                    {'  '}
                    <Text style={{ color: m.quantidade >= 0 ? colors.success : colors.danger }}>
                      {m.quantidade >= 0 ? `+${m.quantidade}` : m.quantidade}
                    </Text>
                  </Text>
                  {m.motivo ? (
                    <Text style={{ color: colors.inkMuted, fontSize: typography.bodySm.size }}>{m.motivo}</Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.inkMuted, fontSize: typography.bodySm.size }}>
                    {m.quantidade_anterior} → {m.quantidade_posterior}
                  </Text>
                  <Text style={{ color: colors.inkSoft, fontSize: typography.micro.size }}>
                    {formatarMomentoCurto(m.criado_em)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Cartao>
      </ScrollView>
    </View>
  )
}
