import { useState } from 'react'
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
import { formatarReais } from '@mallora/lib'
import { Botao } from '@/components/ui/Botao'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'

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

export function ModalProduto({ produto, loja, onFechar }: Props) {
  const [quantidade, setQuantidade] = useState(1)
  const [observacoes, setObservacoes] = useState('')
  const [trocandoLoja, setTrocandoLoja] = useState(false)
  const adicionarItem = useCartStore((s) => s.adicionarItem)
  const storeAtual = useCartStore((s) => s.store_id)

  const preco = produto.preco_promocional ?? produto.preco
  const totalItem = preco * quantidade
  const temPromo = !!produto.preco_promocional

  function handleAdicionar() {
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
        preco,
        quantidade,
        foto_url: produto.foto_url ?? undefined,
        observacoes: observacoes.trim() || undefined,
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
                    {formatarReais(preco)}
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
            <Botao
              label={`Adicionar — ${formatarReais(totalItem)}`}
              onPress={handleAdicionar}
              variante="primario"
              tamanho="lg"
              iconeDireita="bag"
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
