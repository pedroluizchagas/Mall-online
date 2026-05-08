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
import { formatarReais } from '@mallora/lib'
import { Botao } from '@/components/ui/Botao'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'
import type { ItemCarrinhoModifier } from '@mallora/types'

/**
 * Bottom-sheet de detalhe do produto + adicionar ao carrinho.
 *
 * Spec: docs/system-design/consumer/04-componentes-dominio.md §6
 */

const { colors, radius, shadow } = consumerDesign
const { height } = Dimensions.get('window')

interface Produto {
  id: string
  nome: string
  descricao: string | null
  preco: number
  preco_promocional: number | null
  foto_url: string | null
}

interface Loja {
  id: string
  nome: string
  slug: string
  taxa_entrega: number
}

interface Props {
  produto: Produto
  loja: Loja
  onFechar: () => void
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

export function ModalProduto({ produto, loja, onFechar }: Props) {
  const [quantidade, setQuantidade] = useState(1)
  const [observacoes, setObservacoes] = useState('')
  const [trocandoLoja, setTrocandoLoja] = useState(false)
  const [grupos, setGrupos] = useState<GrupoRow[]>([])
  const [carregandoGrupos, setCarregandoGrupos] = useState(true)
  // grupo_id → conjunto de modifier_ids selecionados
  const [selecoes, setSelecoes] = useState<Record<string, Set<string>>>({})

  const adicionarItem = useCartStore((s) => s.adicionarItem)
  const storeAtual = useCartStore((s) => s.store_id)

  const precoBase = produto.preco_promocional ?? produto.preco
  const temPromo = !!produto.preco_promocional

  useEffect(() => {
    let cancelado = false

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
  }, [produto.id])

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

  const erroValidacao = useMemo(() => {
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
  }, [grupos, selecoes])

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
    if (erroValidacao) return
    if (storeAtual && storeAtual !== loja.id) {
      setTrocandoLoja(true)
      return
    }
    confirmarAdicao()
  }

  function confirmarAdicao() {
    adicionarItem(
      {
        product_id: produto.id,
        nome: produto.nome,
        preco: precoBase,
        quantidade,
        foto_url: produto.foto_url ?? undefined,
        observacoes: observacoes.trim() || undefined,
        modifiers:
          modifiersSelecionados.length > 0 ? modifiersSelecionados : undefined,
      },
      loja.id,
      loja.nome,
      loja.taxa_entrega
    )
    setTrocandoLoja(false)
    onFechar()
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
            {produto.foto_url ? (
              <Image
                source={{ uri: produto.foto_url }}
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

            <View style={{ padding: 20, gap: 16 }}>
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
                    fontSize: 20,
                    fontWeight: '800',
                    color: colors.ink,
                    letterSpacing: -0.3,
                  }}
                >
                  {produto.nome}
                </Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}
                  >
                    {formatarReais(precoBase)}
                  </Text>
                  {temPromo && (
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.inkSoft,
                        textDecorationLine: 'line-through',
                      }}
                    >
                      {formatarReais(produto.preco)}
                    </Text>
                  )}
                </View>
              </View>

              {produto.descricao && (
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.inkMuted,
                    lineHeight: 20,
                    fontWeight: '500',
                  }}
                >
                  {produto.descricao}
                </Text>
              )}

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
                  style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}
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
                      fontWeight: '800',
                      color: colors.ink,
                      width: 28,
                      textAlign: 'center',
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
            {erroValidacao && (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.danger,
                  fontWeight: '600',
                  marginBottom: 8,
                  textAlign: 'center',
                }}
              >
                {erroValidacao}
              </Text>
            )}
            <Botao
              label={`Adicionar — ${formatarReais(totalItem)}`}
              onPress={handleAdicionar}
              variante="primario"
              tamanho="lg"
              iconeDireita="bag"
              desabilitado={!!erroValidacao || carregandoGrupos}
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
                  style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}
                >
                  Trocar de loja?
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.inkMuted,
                    lineHeight: 20,
                    fontWeight: '500',
                  }}
                >
                  Seu carrinho atual será esvaziado para adicionar itens de{' '}
                  <Text style={{ fontWeight: '700', color: colors.ink }}>
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
    </Modal>
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
          style={{ fontSize: 14, fontWeight: '700', color: colors.ink, flex: 1 }}
        >
          {grupo.nome}
          {obrigatorio && (
            <Text style={{ color: colors.danger }}> *</Text>
          )}
        </Text>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: colors.inkSoft,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
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
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>
          {modifier.nome}
          {desabilitado && (
            <Text style={{ color: colors.inkSoft, fontWeight: '500' }}>
              {'  '}· esgotado
            </Text>
          )}
        </Text>
      </View>
      {modifier.preco_extra > 0 && (
        <Text
          style={{ fontSize: 13, fontWeight: '700', color: colors.inkMuted }}
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
        borderColor: selecionado ? colors.ink : colors.line,
        backgroundColor: selecionado ? colors.ink : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {selecionado && (
        <ConsumerIcon name="check" size={12} color={colors.accent} strokeWidth={3} />
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
  const fundo = primario ? colors.ink : colors.surfaceMuted
  const cor = primario ? colors.accent : colors.ink
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
