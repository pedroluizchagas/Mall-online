import { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useCartStore } from '@/store/useCartStore'
import { supabase } from '@/lib/supabase'
import { slotsMock } from '@/lib/mock/agenda'
import { formatarReais, getTemplateBySlug } from '@mallevo/lib'
import { Botao } from '@/components/ui/Botao'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'
import type {
  ItemCarrinhoAgendamento,
  ItemCarrinhoModifier,
  ItemCarrinhoVariant,
} from '@mallevo/types'

/**
 * Bottom-sheet de detalhe do produto + adicionar ao carrinho.
 * Dentro de loja tematizada, cores/raios/densidade/fontes vêm do StoreDesign.
 *
 * Spec: docs/system-design/consumer/04-componentes-dominio.md §6
 */

const { shadow } = consumerDesign
const { height } = Dimensions.get('window')

interface Produto {
  id: string
  nome: string
  descricao: string | null
  preco: number
  preco_promocional: number | null
  foto_url: string | null
  metadata?: Record<string, unknown> | null
}

interface Loja {
  id: string
  nome: string
  slug: string
  taxa_entrega: number
  // Slug global da categoria — usado para detectar template services e
  // disparar o layout de PDP `agendamento`. Pode ser null em lojas
  // legadas sem categoria.
  categoria_slug?: string | null
}

interface SlotApi {
  inicio_at: string
  fim_at: string
  staff_ids_livres: string[]
}

interface SlotsResponse {
  duracao_min: number
  staff: Array<{ id: string; nome: string; cor: string | null }>
  slots: SlotApi[]
}

interface Props {
  produto: Produto
  loja: Loja
  onFechar: () => void
}

/**
 * Duração do serviço em minutos (`metadata.duracao_min`). Aceita number ou
 * string, igual à edge function agenda-disponibilidade; `null` quando o
 * produto não declara duração.
 */
function lerDuracaoMin(produto: Produto): number | null {
  const bruto = produto.metadata?.duracao_min
  if (typeof bruto === 'number') return bruto > 0 ? bruto : null
  if (typeof bruto === 'string') {
    const n = parseInt(bruto, 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  return null
}

interface ModifierRow {
  id: string
  nome: string
  preco_extra: number
  disponivel: boolean
  ordem: number
}

interface GrupoRow {
  id: string
  nome: string
  min_select: number
  max_select: number
  ordem: number
  product_modifiers: ModifierRow[]
}

interface OptionRow {
  id: string
  valor: string
  hex_color: string | null
  ordem: number
}

interface OptionGroupRow {
  id: string
  nome: string
  ordem: number
  product_options: OptionRow[]
}

interface VariantRow {
  id: string
  sku: string | null
  preco: number
  preco_promocional: number | null
  foto_url: string | null
  stock_quantity: number | null
  disponivel: boolean
  product_variant_options: { option_id: string }[]
}

export function ModalProduto({ produto, loja, onFechar }: Props) {
  const design = useStoreDesign()
  const { colors, radius } = design
  const [quantidade, setQuantidade] = useState(1)
  const [observacoes, setObservacoes] = useState('')
  const [trocandoLoja, setTrocandoLoja] = useState(false)
  const [grupos, setGrupos] = useState<GrupoRow[]>([])
  const [carregandoGrupos, setCarregandoGrupos] = useState(true)
  // grupo_id → conjunto de modifier_ids selecionados
  const [selecoes, setSelecoes] = useState<Record<string, Set<string>>>({})

  // Variants (Fase 4b)
  const [optionGroups, setOptionGroups] = useState<OptionGroupRow[]>([])
  const [variants, setVariants] = useState<VariantRow[]>([])
  const [carregandoVariants, setCarregandoVariants] = useState(true)
  // group_id → option_id selecionada (sempre single-select)
  const [selecoesVariant, setSelecoesVariant] = useState<
    Record<string, string>
  >({})

  const adicionarItem = useCartStore((s) => s.adicionarItem)
  const storeAtual = useCartStore((s) => s.store_id)
  const itensCarrinho = useCartStore((s) => s.itens)
  const limparCarrinho = useCartStore((s) => s.limparCarrinho)

  const ehAgendamento =
    getTemplateBySlug(loja.categoria_slug ?? null).consumer.layoutPdp ===
    'agendamento'

  // Estado services
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null)
  const [slotSelecionado, setSlotSelecionado] = useState<SlotApi | null>(null)
  const [staffSelecionado, setStaffSelecionado] = useState<string | null>(null) // null = qualquer
  const [slotsResp, setSlotsResp] = useState<SlotsResponse | null>(null)
  const [carregandoSlots, setCarregandoSlots] = useState(false)
  const [erroSlots, setErroSlots] = useState<string | null>(null)
  const [substituindoCarrinho, setSubstituindoCarrinho] = useState(false)

  useEffect(() => {
    let cancelado = false

    if (ehAgendamento) {
      setCarregandoGrupos(false)
      return
    }

    async function carregar() {
      // Cast: product_modifier_groups e product_modifiers ainda não estão nos
      // types gerados do Supabase (migrations 016/017). Schema validado na fase 1.
      const { data, error } = await (supabase as any)
        .from('product_modifier_groups')
        .select(
          `
          id, nome, min_select, max_select, ordem,
          product_modifiers (id, nome, preco_extra, disponivel, ordem)
        `
        )
        .eq('product_id', produto.id)
        .order('ordem')

      if (cancelado) return

      if (error || !data) {
        setGrupos([])
        setCarregandoGrupos(false)
        return
      }

      const ordenado: GrupoRow[] = (data as unknown as GrupoRow[]).map((g) => ({
        ...g,
        product_modifiers: [...(g.product_modifiers ?? [])].sort(
          (a, b) => a.ordem - b.ordem
        ),
      }))

      setGrupos(ordenado)
      setCarregandoGrupos(false)
    }

    carregar()
    return () => {
      cancelado = true
    }
  }, [produto.id, ehAgendamento])

  useEffect(() => {
    let cancelado = false

    if (ehAgendamento) {
      setCarregandoVariants(false)
      return
    }

    async function carregarVariants() {
      // Cast: product_option_groups, product_options e product_variants ainda
      // não estão nos types gerados do Supabase (migrations 015/017).
      const [gruposRes, variantsRes] = await Promise.all([
        (supabase as any)
          .from('product_option_groups')
          .select(
            `
            id, nome, ordem,
            product_options (id, valor, hex_color, ordem)
          `
          )
          .eq('product_id', produto.id)
          .order('ordem'),
        (supabase as any)
          .from('product_variants')
          .select(
            `
            id, sku, preco, preco_promocional, foto_url,
            stock_quantity, disponivel,
            product_variant_options (option_id)
          `
          )
          .eq('product_id', produto.id)
          .eq('disponivel', true),
      ])

      if (cancelado) return

      const gruposBruto = (gruposRes.data ?? []) as OptionGroupRow[]
      const gruposOrd: OptionGroupRow[] = gruposBruto.map((g) => ({
        ...g,
        product_options: [...(g.product_options ?? [])].sort(
          (a, b) => a.ordem - b.ordem
        ),
      }))

      setOptionGroups(gruposOrd)
      setVariants((variantsRes.data ?? []) as VariantRow[])
      setCarregandoVariants(false)
    }

    carregarVariants()
    return () => {
      cancelado = true
    }
  }, [produto.id, ehAgendamento])

  // Slots do dia selecionado (services).
  useEffect(() => {
    if (!ehAgendamento || !dataSelecionada) return
    let cancelado = false

    async function buscarSlots(data: string) {
      setCarregandoSlots(true)
      setErroSlots(null)
      try {
        // date_to = dia seguinte (intervalo [from, to))
        const proxima = new Date(data + 'T00:00:00')
        proxima.setDate(proxima.getDate() + 1)
        const date_to = proxima.toISOString().slice(0, 10)

        // Modo demonstração (mesma chave de lib/supabase.ts): a sessão do
        // mock não carrega access_token válido, então a edge function
        // agenda-disponibilidade recusaria a chamada e todo PDP de serviço
        // ficaria em "Erro ao buscar horários". Gera a grade em memória, no
        // mesmo contrato. Nada abaixo muda para produção.
        if (process.env.EXPO_PUBLIC_USE_MOCK === 'true') {
          const resp = slotsMock({
            store_id: loja.id,
            product_id: produto.id,
            date_from: data,
            date_to,
            duracao_min: lerDuracaoMin(produto),
          })
          if (cancelado) return
          setSlotsResp(resp)
          return
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Sessão expirada')
        const r = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/agenda-disponibilidade`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              store_id: loja.id,
              product_id: produto.id,
              date_from: data,
              date_to,
            }),
          }
        )
        const json = await r.json()
        if (!r.ok) throw new Error(json.error ?? 'Erro ao buscar horários')
        if (cancelado) return
        setSlotsResp(json as SlotsResponse)
      } catch (e: any) {
        if (cancelado) return
        setErroSlots(e?.message ?? 'Erro ao buscar horários')
        setSlotsResp(null)
      } finally {
        if (!cancelado) setCarregandoSlots(false)
      }
    }

    buscarSlots(dataSelecionada)
    // Limpa seleção de slot/staff quando troca o dia
    setSlotSelecionado(null)
    setStaffSelecionado(null)
    return () => {
      cancelado = true
    }
  }, [ehAgendamento, dataSelecionada, loja.id, produto.id])

  // Quando troca de slot, reseta staff (pode não estar livre no novo slot).
  useEffect(() => {
    setStaffSelecionado(null)
  }, [slotSelecionado?.inicio_at])

  // Variant ativo = único variant cujas options batem exatamente com a seleção.
  // Quando há groups mas a seleção está incompleta, retorna null.
  const variantAtivo = useMemo<VariantRow | null>(() => {
    if (variants.length === 0 || optionGroups.length === 0) return null
    if (Object.keys(selecoesVariant).length < optionGroups.length) return null

    const optionsSelecionadas = new Set(Object.values(selecoesVariant))
    return (
      variants.find((v) => {
        const optsVariant = (v.product_variant_options ?? []).map(
          (o) => o.option_id
        )
        if (optsVariant.length !== optionsSelecionadas.size) return false
        return optsVariant.every((id) => optionsSelecionadas.has(id))
      }) ?? null
    )
  }, [variants, optionGroups, selecoesVariant])

  // Preço base efetivo: variant > produto.
  const precoBase = variantAtivo
    ? variantAtivo.preco_promocional ?? variantAtivo.preco
    : produto.preco_promocional ?? produto.preco
  const precoOriginal = variantAtivo ? variantAtivo.preco : produto.preco
  const temPromo = variantAtivo
    ? variantAtivo.preco_promocional != null &&
      variantAtivo.preco_promocional < variantAtivo.preco
    : !!produto.preco_promocional

  const fotoExibida =
    variantAtivo?.foto_url ?? produto.foto_url ?? null

  const temVariants = variants.length > 0 && optionGroups.length > 0
  const selecaoVariantCompleta =
    !temVariants ||
    Object.keys(selecoesVariant).length === optionGroups.length

  const modifiersSelecionados = useMemo<ItemCarrinhoModifier[]>(() => {
    const out: ItemCarrinhoModifier[] = []
    for (const grupo of grupos) {
      const ids = selecoes[grupo.id]
      if (!ids || ids.size === 0) continue
      for (const m of grupo.product_modifiers) {
        if (ids.has(m.id)) {
          out.push({
            modifier_id: m.id,
            nome: m.nome,
            preco_extra: m.preco_extra,
          })
        }
      }
    }
    return out
  }, [grupos, selecoes])

  const precoExtraTotal = modifiersSelecionados.reduce(
    (acc, m) => acc + m.preco_extra,
    0
  )
  const totalItem = (precoBase + precoExtraTotal) * quantidade

  const erroAgendamento = useMemo<string | null>(() => {
    if (!ehAgendamento) return null
    if (!dataSelecionada) return 'Escolha uma data'
    if (!slotSelecionado) return 'Escolha um horário'
    // Agenda cheia neste horário — a grade devolve o slot para que ele
    // apareça riscado, mas ele nunca pode virar pedido.
    if (slotSelecionado.staff_ids_livres.length === 0) {
      return 'Horário indisponível'
    }
    if (
      staffSelecionado &&
      !slotSelecionado.staff_ids_livres.includes(staffSelecionado)
    ) {
      return 'Profissional não disponível neste horário'
    }
    return null
  }, [ehAgendamento, dataSelecionada, slotSelecionado, staffSelecionado])

  const erroValidacao = useMemo(() => {
    if (ehAgendamento) return null
    if (temVariants) {
      if (!selecaoVariantCompleta) {
        return optionGroups.length === 2
          ? `Selecione ${optionGroups[0].nome.toLowerCase()} e ${optionGroups[1].nome.toLowerCase()}`
          : `Selecione ${optionGroups
              .map((g) => g.nome.toLowerCase())
              .join(', ')}`
      }
      if (!variantAtivo) {
        return 'Esta combinação não está disponível'
      }
    }
    for (const grupo of grupos) {
      const count = selecoes[grupo.id]?.size ?? 0
      if (grupo.min_select > 0 && count < grupo.min_select) {
        return `Selecione ${
          grupo.min_select === 1 ? '1 opção' : `${grupo.min_select} opções`
        } em "${grupo.nome}"`
      }
      if (count > grupo.max_select) {
        return `Limite excedido em "${grupo.nome}"`
      }
    }
    return null
  }, [
    ehAgendamento,
    grupos,
    selecoes,
    temVariants,
    selecaoVariantCompleta,
    variantAtivo,
    optionGroups,
  ])

  const erroValidacaoAtual = ehAgendamento ? erroAgendamento : erroValidacao

  function alternarSelecao(grupo: GrupoRow, modifierId: string) {
    setSelecoes((prev) => {
      const atual = new Set(prev[grupo.id] ?? [])
      if (grupo.max_select === 1) {
        if (atual.has(modifierId)) {
          atual.delete(modifierId)
        } else {
          atual.clear()
          atual.add(modifierId)
        }
      } else {
        if (atual.has(modifierId)) {
          atual.delete(modifierId)
        } else if (atual.size < grupo.max_select) {
          atual.add(modifierId)
        }
      }
      return { ...prev, [grupo.id]: atual }
    })
  }

  function handleAdicionar() {
    if (erroValidacaoAtual) return
    if (storeAtual && storeAtual !== loja.id) {
      setTrocandoLoja(true)
      return
    }
    // Services: regra de 1 item — pede confirmação se há outros itens.
    if (ehAgendamento && itensCarrinho.length > 0) {
      const mesmoProduto =
        itensCarrinho.length === 1 &&
        itensCarrinho[0].product_id === produto.id
      if (!mesmoProduto) {
        setSubstituindoCarrinho(true)
        return
      }
    }
    confirmarAdicao()
  }

  function confirmarAdicao() {
    if (ehAgendamento) {
      if (!slotSelecionado) return
      // Substituição de carrinho (services 1-item) — limpa antes para que a
      // store comece com store_id desta loja.
      if (storeAtual && storeAtual !== loja.id) limparCarrinho()
      const staffEscolhido = staffSelecionado
        ? slotsResp?.staff.find((s) => s.id === staffSelecionado) ?? null
        : null
      const agendamento: ItemCarrinhoAgendamento = {
        inicio_at: slotSelecionado.inicio_at,
        fim_at: slotSelecionado.fim_at,
        staff_id: staffEscolhido?.id ?? null,
        staff_nome: staffEscolhido?.nome ?? 'Qualquer',
      }
      adicionarItem(
        {
          product_id: produto.id,
          nome: produto.nome,
          preco: precoBase,
          quantidade: 1,
          foto_url: fotoExibida ?? undefined,
          agendamento,
        },
        loja.id,
        loja.nome,
        loja.taxa_entrega
      )
      setTrocandoLoja(false)
      setSubstituindoCarrinho(false)
      onFechar()
      return
    }

    // Mesma limpeza do ramo de agendamento: com outra loja ativa a store não
    // adiciona — ela guarda o item em `pendingTrocaLoja`, estado que só o
    // storefront web consome. No app o item se perderia em silêncio (caso
    // clássico: carrinho com um agendamento e o usuário troca para outra loja).
    if (storeAtual && storeAtual !== loja.id) limparCarrinho()

    let variant: ItemCarrinhoVariant | undefined
    if (variantAtivo) {
      const valoresSelecionados = optionGroups
        .map((g) => {
          const optionId = selecoesVariant[g.id]
          return g.product_options.find((o) => o.id === optionId)?.valor
        })
        .filter((v): v is string => !!v)
      variant = {
        variant_id: variantAtivo.id,
        rotulo: valoresSelecionados.join(' × '),
      }
    }

    adicionarItem(
      {
        product_id: produto.id,
        nome: produto.nome,
        preco: precoBase,
        quantidade,
        foto_url: fotoExibida ?? undefined,
        observacoes: observacoes.trim() || undefined,
        modifiers:
          modifiersSelecionados.length > 0 ? modifiersSelecionados : undefined,
        variant,
      },
      loja.id,
      loja.nome,
      loja.taxa_entrega
    )
    setTrocandoLoja(false)
    onFechar()
  }

  // Para cada option, descobre se existe ao menos um variant disponível que
  // respeite a seleção atual nos OUTROS groups (e que inclua esta option no
  // próprio group). Uma option não-alcançável fica riscada.
  function optionAlcancavel(grupoId: string, optionId: string): boolean {
    return variants.some((v) => {
      const opts = (v.product_variant_options ?? []).map((o) => o.option_id)
      if (!opts.includes(optionId)) return false
      for (const [gId, oId] of Object.entries(selecoesVariant)) {
        if (gId === grupoId) continue
        if (!opts.includes(oId)) return false
      }
      return true
    })
  }

  function selecionarOption(grupoId: string, optionId: string) {
    setSelecoesVariant((prev) => {
      if (prev[grupoId] === optionId) {
        const { [grupoId]: _omit, ...rest } = prev
        return rest
      }
      return { ...prev, [grupoId]: optionId }
    })
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onFechar}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Overlay */}
        <TouchableOpacity
          style={{
            ...StyleSheetAbsoluteFill,
            backgroundColor: `rgba(17, 18, 22, ${consumerDesign.opacity.overlay})`,
          }}
          activeOpacity={1}
          onPress={onFechar}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            overflow: 'hidden',
            maxHeight: height * 0.88,
          }}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.line,
              }}
            />
          </View>

          {/* Botão fechar */}
          <TouchableOpacity
            onPress={onFechar}
            activeOpacity={0.7}
            style={[
              {
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 10,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              },
              shadow.soft,
            ]}
          >
            <ConsumerIcon name="close" size={18} color={colors.ink} strokeWidth={2.2} />
          </TouchableOpacity>

          <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
            {/* Foto */}
            {fotoExibida ? (
              <Image
                source={{ uri: fotoExibida }}
                style={{ width: '100%', height: 240, backgroundColor: colors.canvasAlt }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: '100%',
                  height: 240,
                  backgroundColor: colors.canvasAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ConsumerIcon name="bag" size={56} color={colors.inkSoft} />
              </View>
            )}

            <View style={{ padding: design.spacing.sheet, gap: 16 }}>
              {/* Título + preço */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    fontSize: Math.round(20 * design.typeFactor),
                    color: colors.ink,
                    letterSpacing: -0.3,
                    ...fontStyle(design.display, 800),
                  }}
                >
                  {produto.nome}
                </Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={{
                      fontSize: 18,
                      color: colors.ink,
                      ...fontStyle(design.body, 800),
                    }}
                  >
                    {formatarReais(precoBase)}
                  </Text>
                  {temPromo && (
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.inkSoft,
                        textDecorationLine: 'line-through',
                        ...fontStyle(design.body, 400),
                      }}
                    >
                      {formatarReais(precoOriginal)}
                    </Text>
                  )}
                </View>
              </View>

              {produto.metadata?.exige_receita === true && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: 12,
                    borderRadius: radius.md,
                    backgroundColor: `rgba(242, 184, 75, 0.18)`,
                    borderWidth: 1,
                    borderColor: `rgba(242, 184, 75, 0.45)`,
                  }}
                >
                  <ConsumerIcon
                    name="info"
                    size={18}
                    color={colors.warning}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: colors.ink,
                      lineHeight: 18,
                      ...fontStyle(design.body, 500),
                    }}
                  >
                    <Text style={fontStyle(design.body, 800)}>
                      Exige receita médica.
                    </Text>{' '}
                    Anexe a receita ao finalizar o pedido.
                  </Text>
                </View>
              )}

              {produto.descricao && (
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.inkMuted,
                    lineHeight: 20,
                    ...fontStyle(design.body, 500),
                  }}
                >
                  {produto.descricao}
                </Text>
              )}

              {/* Aviso de estoque baixo do variant ativo */}
              {variantAtivo &&
                variantAtivo.stock_quantity != null &&
                variantAtivo.stock_quantity > 0 &&
                variantAtivo.stock_quantity < 10 && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.warning,
                      ...fontStyle(design.body, 700),
                    }}
                  >
                    Apenas {variantAtivo.stock_quantity} em estoque
                  </Text>
                )}

              {ehAgendamento ? (
                <SecaoAgendamento
                  duracaoMin={lerDuracaoMin(produto)}
                  dataSelecionada={dataSelecionada}
                  aoSelecionarData={setDataSelecionada}
                  slotsResp={slotsResp}
                  carregando={carregandoSlots}
                  erro={erroSlots}
                  slotSelecionado={slotSelecionado}
                  aoSelecionarSlot={setSlotSelecionado}
                  staffSelecionado={staffSelecionado}
                  aoSelecionarStaff={setStaffSelecionado}
                />
              ) : (
                <>
                  {/* Grupos de variações (Fase 4b) */}
                  {!carregandoVariants &&
                    temVariants &&
                    optionGroups.map((grupo) => (
                      <GrupoVariants
                        key={grupo.id}
                        grupo={grupo}
                        selecionada={selecoesVariant[grupo.id] ?? null}
                        optionAlcancavel={(optionId) =>
                          optionAlcancavel(grupo.id, optionId)
                        }
                        aoSelecionar={(optionId) =>
                          selecionarOption(grupo.id, optionId)
                        }
                      />
                    ))}

                  {/* Grupos de modificadores */}
                  {!carregandoGrupos &&
                    grupos.map((grupo) => (
                      <GrupoModifiers
                        key={grupo.id}
                        grupo={grupo}
                        selecionados={selecoes[grupo.id] ?? new Set<string>()}
                        aoAlternar={(modifierId) =>
                          alternarSelecao(grupo, modifierId)
                        }
                      />
                    ))}

                  {/* Observações */}
                  <View style={{ marginTop: 4 }}>
                    <Input
                      rotulo="Observações (opcional)"
                      valor={observacoes}
                      aoMudar={setObservacoes}
                      placeholder="Ex.: sem cebola, ponto da carne..."
                      multilinha
                      maxLength={140}
                    />
                  </View>

                  {/* Quantidade + total */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 4,
                    }}
                  >
                    <Text
                      style={{ fontSize: 14, color: colors.ink, ...fontStyle(design.body, 600) }}
                    >
                      Quantidade
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      <BotaoQty
                        icone="minus"
                        desabilitado={quantidade === 1}
                        aoTocar={() => setQuantidade((q) => Math.max(1, q - 1))}
                      />
                      <Text
                        style={{
                          fontSize: 18,
                          color: colors.ink,
                          width: 28,
                          textAlign: 'center',
                          ...fontStyle(design.body, 800),
                        }}
                      >
                        {quantidade}
                      </Text>
                      <BotaoQty
                        icone="plus"
                        aoTocar={() => setQuantidade((q) => q + 1)}
                        primario
                      />
                    </View>
                  </View>
                </>
              )}
            </View>
          </ScrollView>

          {/* CTA fixo */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 24,
              borderTopWidth: 1,
              borderTopColor: colors.line,
            }}
          >
            {erroValidacaoAtual && (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.danger,
                  marginBottom: 8,
                  textAlign: 'center',
                  ...fontStyle(design.body, 600),
                }}
              >
                {erroValidacaoAtual}
              </Text>
            )}
            <Botao
              label={
                ehAgendamento
                  ? // "Confirmar agendamento" é o CTA do checkout; aqui o
                    // serviço só entra no carrinho. Enquanto falta escolha, o
                    // rótulo guia — mesmo padrão dos grupos de variação.
                    !dataSelecionada
                    ? 'Escolha uma data'
                    : !slotSelecionado
                      ? 'Escolha um horário'
                      : `Agendar — ${formatarReais(precoBase)}`
                  : temVariants && !selecaoVariantCompleta
                    ? optionGroups.length > 1
                      ? `Selecione ${optionGroups
                          .map((g) => g.nome.toLowerCase())
                          .join(' e ')}`
                      : `Selecione ${optionGroups[0]?.nome.toLowerCase() ?? 'opção'}`
                    : `Adicionar — ${formatarReais(totalItem)}`
              }
              onPress={handleAdicionar}
              variante="primario"
              tamanho="lg"
              iconeDireita={ehAgendamento ? 'check' : 'bag'}
              desabilitado={
                !!erroValidacaoAtual || carregandoGrupos || carregandoVariants
              }
            />
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Diálogo de troca de loja */}
      {trocandoLoja && (
        <Modal visible transparent animationType="fade">
          <View
            style={{
              flex: 1,
              backgroundColor: `rgba(17, 18, 22, 0.5)`,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <Card raio="lg" preenchimento="lg" semBorda estilo={{ width: '100%', maxWidth: 360 }}>
              <View style={{ alignItems: 'flex-start', gap: 12 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: `rgba(242, 184, 75, 0.18)`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ConsumerIcon name="info" size={22} color={colors.warning} />
                </View>
                <Text
                  style={{ fontSize: 18, color: colors.ink, ...fontStyle(design.display, 800) }}
                >
                  Trocar de loja?
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.inkMuted,
                    lineHeight: 20,
                    ...fontStyle(design.body, 500),
                  }}
                >
                  Seu carrinho atual será esvaziado para adicionar itens de{' '}
                  <Text style={{ color: colors.ink, ...fontStyle(design.body, 700) }}>
                    {loja.nome}
                  </Text>
                  .
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 8,
                    marginTop: 8,
                    alignSelf: 'stretch',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Botao
                      label="Cancelar"
                      onPress={() => setTrocandoLoja(false)}
                      variante="ghost"
                      tamanho="md"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Botao
                      label="Trocar"
                      onPress={confirmarAdicao}
                      variante="primario"
                      tamanho="md"
                    />
                  </View>
                </View>
              </View>
            </Card>
          </View>
        </Modal>
      )}

      {/* Diálogo de substituição de carrinho (services) */}
      {substituindoCarrinho && (
        <Modal visible transparent animationType="fade">
          <View
            style={{
              flex: 1,
              backgroundColor: `rgba(17, 18, 22, 0.5)`,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <Card raio="lg" preenchimento="lg" semBorda estilo={{ width: '100%', maxWidth: 360 }}>
              <View style={{ alignItems: 'flex-start', gap: 12 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: `rgba(242, 184, 75, 0.18)`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ConsumerIcon name="info" size={22} color={colors.warning} />
                </View>
                <Text
                  style={{ fontSize: 18, color: colors.ink, ...fontStyle(design.display, 800) }}
                >
                  Substituir agendamento?
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.inkMuted,
                    lineHeight: 20,
                    ...fontStyle(design.body, 500),
                  }}
                >
                  Você só pode ter um agendamento no carrinho por vez. O item
                  atual será removido.
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 8,
                    marginTop: 8,
                    alignSelf: 'stretch',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Botao
                      label="Cancelar"
                      onPress={() => setSubstituindoCarrinho(false)}
                      variante="ghost"
                      tamanho="md"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Botao
                      label="Substituir"
                      onPress={confirmarAdicao}
                      variante="primario"
                      tamanho="md"
                    />
                  </View>
                </View>
              </View>
            </Card>
          </View>
        </Modal>
      )}
    </Modal>
  )
}

function SecaoAgendamento({
  duracaoMin,
  dataSelecionada,
  aoSelecionarData,
  slotsResp,
  carregando,
  erro,
  slotSelecionado,
  aoSelecionarSlot,
  staffSelecionado,
  aoSelecionarStaff,
}: {
  duracaoMin: number | null
  dataSelecionada: string | null
  aoSelecionarData: (data: string) => void
  slotsResp: SlotsResponse | null
  carregando: boolean
  erro: string | null
  slotSelecionado: SlotApi | null
  aoSelecionarSlot: (s: SlotApi | null) => void
  staffSelecionado: string | null
  aoSelecionarStaff: (id: string | null) => void
}) {
  const design = useStoreDesign()
  const { colors, radius } = design
  const dias = useMemo(() => {
    const out: Array<{ ymd: string; rotuloDia: string; rotuloData: string }> = []
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const semanaCurta = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
    for (let i = 0; i < 14; i++) {
      const d = new Date(hoje)
      d.setDate(d.getDate() + i)
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const rotuloDia = i === 0 ? 'Hoje' : semanaCurta[d.getDay()]
      const rotuloData = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      out.push({ ymd, rotuloDia, rotuloData })
    }
    return out
  }, [])

  function formatarHora(iso: string) {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const staffParaListar = slotSelecionado
    ? (slotsResp?.staff ?? []).filter((s) =>
        slotSelecionado.staff_ids_livres.includes(s.id),
      )
    : []

  return (
    <View style={{ gap: 16 }}>
      {duracaoMin != null && (
        <Text
          style={{ fontSize: 12, color: colors.inkMuted, ...fontStyle(design.body, 600) }}
        >
          Duração: {duracaoMin} min
        </Text>
      )}

      {/* Calendário 14 dias */}
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 14, color: colors.ink, ...fontStyle(design.body, 700) }}>
          Escolha a data
          <Text style={{ color: colors.danger }}> *</Text>
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 4 }}>
            {dias.map((d) => {
              const ativo = dataSelecionada === d.ymd
              return (
                <TouchableOpacity
                  key={d.ymd}
                  onPress={() => aoSelecionarData(d.ymd)}
                  activeOpacity={0.75}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: radius.md,
                    borderWidth: ativo ? 2 : 1,
                    borderColor: ativo ? colors.ink : colors.line,
                    backgroundColor: ativo ? colors.ink : colors.surface,
                    alignItems: 'center',
                    minWidth: 64,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: ativo ? colors.accent : colors.inkMuted,
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      ...fontStyle(design.body, 700),
                    }}
                  >
                    {d.rotuloDia}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: ativo ? colors.accent : colors.ink,
                      marginTop: 2,
                      ...fontStyle(design.body, 800),
                    }}
                  >
                    {d.rotuloData}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </ScrollView>
      </View>

      {/* Slots */}
      {dataSelecionada && (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 14, color: colors.ink, ...fontStyle(design.body, 700) }}>
            Horários disponíveis
            <Text style={{ color: colors.danger }}> *</Text>
          </Text>
          {carregando && (
            <Text style={{ fontSize: 12, color: colors.inkMuted }}>
              Carregando horários...
            </Text>
          )}
          {erro && (
            <Text
              style={{ fontSize: 12, color: colors.danger, ...fontStyle(design.body, 600) }}
            >
              {erro}
            </Text>
          )}
          {!carregando && !erro && slotsResp && slotsResp.staff.length === 0 && (
            <Text style={{ fontSize: 13, color: colors.inkMuted }}>
              Esta loja não tem profissionais ativos. Tente mais tarde.
            </Text>
          )}
          {!carregando && !erro && slotsResp && slotsResp.staff.length > 0 && slotsResp.slots.length === 0 && (
            <Text style={{ fontSize: 13, color: colors.inkMuted }}>
              Sem horários disponíveis nesta data. Tente outro dia.
            </Text>
          )}
          {!carregando && slotsResp && slotsResp.slots.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {slotsResp.slots.map((s) => {
                const ativo = slotSelecionado?.inicio_at === s.inicio_at
                // Sem nenhum profissional livre = agenda cheia nesse horário.
                const indisponivel = s.staff_ids_livres.length === 0
                return (
                  <TouchableOpacity
                    key={s.inicio_at}
                    onPress={() => aoSelecionarSlot(s)}
                    disabled={indisponivel}
                    activeOpacity={0.75}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: radius.pill,
                      borderWidth: ativo ? 2 : 1,
                      borderColor: ativo ? colors.ink : colors.line,
                      backgroundColor: ativo ? colors.ink : colors.surface,
                      opacity: indisponivel
                        ? consumerDesign.opacity.disabled
                        : 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: ativo
                          ? colors.accent
                          : indisponivel
                            ? colors.inkSoft
                            : colors.ink,
                        textDecorationLine: indisponivel
                          ? 'line-through'
                          : 'none',
                        ...fontStyle(design.body, 700),
                      }}
                    >
                      {formatarHora(s.inicio_at)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </View>
      )}

      {/* Staff */}
      {slotSelecionado && staffParaListar.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 14, color: colors.ink, ...fontStyle(design.body, 700) }}>
            Profissional
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: radius.md,
              overflow: 'hidden',
            }}
          >
            <LinhaStaff
              ativo={staffSelecionado === null}
              nome="Qualquer disponível"
              cor={null}
              aoTocar={() => aoSelecionarStaff(null)}
            />
            {staffParaListar.map((s, idx) => (
              <LinhaStaff
                key={s.id}
                ativo={staffSelecionado === s.id}
                nome={s.nome}
                cor={s.cor}
                ultimo={idx === staffParaListar.length - 1}
                aoTocar={() => aoSelecionarStaff(s.id)}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

function LinhaStaff({
  ativo,
  nome,
  cor,
  ultimo,
  aoTocar,
}: {
  ativo: boolean
  nome: string
  cor: string | null
  ultimo?: boolean
  aoTocar: () => void
}) {
  const design = useStoreDesign()
  const { colors } = design
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: ultimo ? 0 : 1,
        borderBottomColor: colors.line,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: ativo ? colors.ink : colors.line,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {ativo && (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: colors.ink,
            }}
          />
        )}
      </View>
      {cor && (
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: cor,
          }}
        />
      )}
      <Text
        style={{ fontSize: 14, color: colors.ink, flex: 1, ...fontStyle(design.body, 600) }}
      >
        {nome}
      </Text>
    </TouchableOpacity>
  )
}

function GrupoVariants({
  grupo,
  selecionada,
  optionAlcancavel,
  aoSelecionar,
}: {
  grupo: OptionGroupRow
  selecionada: string | null
  optionAlcancavel: (optionId: string) => boolean
  aoSelecionar: (optionId: string) => void
}) {
  const design = useStoreDesign()
  const { colors } = design
  const ehCor = grupo.nome.toLowerCase() === 'cor'
  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Text
          style={{ fontSize: 14, color: colors.ink, flex: 1, ...fontStyle(design.body, 700) }}
        >
          {grupo.nome}
          <Text style={{ color: colors.danger }}> *</Text>
        </Text>
        {selecionada && (
          <Text
            style={{
              fontSize: 12,
              color: colors.inkMuted,
              ...fontStyle(design.body, 600),
            }}
          >
            {grupo.product_options.find((o) => o.id === selecionada)?.valor}
          </Text>
        )}
      </View>

      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
      >
        {grupo.product_options.map((opcao) => (
          <ChipOption
            key={opcao.id}
            opcao={opcao}
            ehCor={ehCor}
            selecionada={selecionada === opcao.id}
            alcancavel={optionAlcancavel(opcao.id)}
            aoTocar={() => aoSelecionar(opcao.id)}
          />
        ))}
      </View>
    </View>
  )
}

function ChipOption({
  opcao,
  ehCor,
  selecionada,
  alcancavel,
  aoTocar,
}: {
  opcao: OptionRow
  ehCor: boolean
  selecionada: boolean
  alcancavel: boolean
  aoTocar: () => void
}) {
  const design = useStoreDesign()
  const { colors } = design
  const desabilitado = !alcancavel && !selecionada
  const corBorda = selecionada ? colors.accent : colors.line
  const corFundo = selecionada ? colors.accent : colors.surface
  const corTexto = selecionada
    ? colors.accentInk
    : desabilitado
      ? colors.inkSoft
      : colors.ink
  return (
    <TouchableOpacity
      onPress={aoTocar}
      disabled={desabilitado}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: design.radius.pill,
        borderWidth: selecionada ? 2 : 1,
        borderColor: corBorda,
        backgroundColor: corFundo,
        opacity: desabilitado ? consumerDesign.opacity.disabled : 1,
      }}
    >
      {ehCor && opcao.hex_color && (
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            backgroundColor: opcao.hex_color,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.12)',
          }}
        />
      )}
      <Text
        style={{
          fontSize: 13,
          color: corTexto,
          textDecorationLine: desabilitado ? 'line-through' : 'none',
          ...fontStyle(design.body, 700),
        }}
      >
        {opcao.valor}
      </Text>
    </TouchableOpacity>
  )
}

function GrupoModifiers({
  grupo,
  selecionados,
  aoAlternar,
}: {
  grupo: GrupoRow
  selecionados: Set<string>
  aoAlternar: (modifierId: string) => void
}) {
  const design = useStoreDesign()
  const { colors, radius } = design
  const obrigatorio = grupo.min_select > 0
  const single = grupo.max_select === 1

  let dica: string
  if (single) {
    dica = obrigatorio ? 'Escolha 1' : 'Escolha 1 (opcional)'
  } else if (grupo.min_select === grupo.max_select) {
    dica = `Escolha ${grupo.max_select}`
  } else if (obrigatorio) {
    dica = `Mín ${grupo.min_select}, máx ${grupo.max_select}`
  } else {
    dica = `Até ${grupo.max_select}`
  }

  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Text
          style={{ fontSize: 14, color: colors.ink, flex: 1, ...fontStyle(design.body, 700) }}
        >
          {grupo.nome}
          {obrigatorio && (
            <Text style={{ color: colors.danger }}> *</Text>
          )}
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: colors.inkSoft,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            ...fontStyle(design.body, 700),
          }}
        >
          {dica}
        </Text>
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: radius.md,
          overflow: 'hidden',
        }}
      >
        {grupo.product_modifiers.map((m, idx) => (
          <ModifierLinha
            key={m.id}
            modifier={m}
            selecionado={selecionados.has(m.id)}
            single={single}
            ultimo={idx === grupo.product_modifiers.length - 1}
            aoTocar={() => aoAlternar(m.id)}
          />
        ))}
      </View>
    </View>
  )
}

function ModifierLinha({
  modifier,
  selecionado,
  single,
  ultimo,
  aoTocar,
}: {
  modifier: ModifierRow
  selecionado: boolean
  single: boolean
  ultimo: boolean
  aoTocar: () => void
}) {
  const design = useStoreDesign()
  const { colors } = design
  const desabilitado = !modifier.disponivel
  return (
    <TouchableOpacity
      onPress={aoTocar}
      disabled={desabilitado}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: ultimo ? 0 : 1,
        borderBottomColor: colors.line,
        opacity: desabilitado ? consumerDesign.opacity.disabled : 1,
      }}
    >
      <SeletorIndicador selecionado={selecionado} single={single} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, color: colors.ink, ...fontStyle(design.body, 600) }}>
          {modifier.nome}
          {desabilitado && (
            <Text style={{ color: colors.inkSoft, ...fontStyle(design.body, 500) }}>
              {'  '}· esgotado
            </Text>
          )}
        </Text>
      </View>
      {modifier.preco_extra > 0 && (
        <Text
          style={{ fontSize: 13, color: colors.inkMuted, ...fontStyle(design.body, 700) }}
        >
          + {formatarReais(modifier.preco_extra)}
        </Text>
      )}
    </TouchableOpacity>
  )
}

function SeletorIndicador({
  selecionado,
  single,
}: {
  selecionado: boolean
  single: boolean
}) {
  const colors = useStoreDesign().colors
  if (single) {
    return (
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: selecionado ? colors.ink : colors.line,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selecionado && (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: colors.ink,
            }}
          />
        )}
      </View>
    )
  }
  return (
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: selecionado ? colors.accent : colors.line,
        backgroundColor: selecionado ? colors.accent : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {selecionado && (
        <ConsumerIcon name="check" size={12} color={colors.accentInk} strokeWidth={3} />
      )}
    </View>
  )
}

function BotaoQty({
  icone,
  aoTocar,
  desabilitado,
  primario,
}: {
  icone: 'plus' | 'minus'
  aoTocar: () => void
  desabilitado?: boolean
  primario?: boolean
}) {
  const colors = useStoreDesign().colors
  const fundo = primario ? colors.accent : colors.surfaceMuted
  const cor = primario ? colors.accentInk : colors.ink
  return (
    <TouchableOpacity
      onPress={aoTocar}
      disabled={desabilitado}
      activeOpacity={0.75}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: fundo,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: desabilitado ? consumerDesign.opacity.disabled : 1,
      }}
    >
      <ConsumerIcon name={icone} size={16} color={cor} strokeWidth={2.2} />
    </TouchableOpacity>
  )
}

const StyleSheetAbsoluteFill = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
}
