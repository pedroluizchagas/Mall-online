import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Alert } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { tokenizarCartao } from '@/lib/pagarme'
import { useCartStore } from '@/store/useCartStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useOrderStore } from '@/store/useOrderStore'
import { formatarReais } from '@mallevo/lib'
import { ItemCarrinhoCard, formatarAgendamento } from '@/components/ItemCarrinhoCard'
import { SeletorEndereco } from '@/components/SeletorEndereco'
import { SeletorPagamento } from '@/components/SeletorPagamento'
import { SeletorParcelas } from '@/components/SeletorParcelas'
import {
  FormularioCartao,
  type DadosCartao,
} from '@/components/FormularioCartao'
import { HeaderTela } from '@/components/HeaderTela'
import { Botao } from '@/components/ui/Botao'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { consumerDesign } from '@/lib/consumer-design'
import type { Endereco } from '@mallevo/types'

const { colors } = consumerDesign

// Gateway-only (política Mallevo): pagamento sempre via Pagar.me.
// Dinheiro/maquininha removidos do mobile + storefront. As flags
// `aceita_dinheiro`/`aceita_cartao_maquininha` permanecem no schema mas
// são ignoradas pelos consumer-facing apps.
type FormaPagamento = 'online_cartao' | 'online_pix'

export default function TelaCheckout() {
  const insets = useSafeAreaInsets()
  const {
    itens,
    store_id,
    store_nome,
    store_taxa_entrega,
    subtotal,
    total,
    limparCarrinho,
  } = useCartStore()

  const ehAgendamento = itens.some((i) => !!i.agendamento)
  const itemAgendamento = itens.find((i) => !!i.agendamento)

  const { consumer } = useAuthStore()
  const { setPedidoAtivo } = useOrderStore()

  const [loja, setLoja] = useState<any>(null)
  const [enderecoSelecionado, setEnderecoSelecionado] =
    useState<Endereco | null>(null)
  const [formaPagamento, setFormaPagamento] =
    useState<FormaPagamento>('online_cartao')
  const [installments, setInstallments] = useState(1)
  const [dadosCartao, setDadosCartao] = useState<DadosCartao | null>(null)
  const [observacoes, setObservacoes] = useState('')
  const [processando, setProcessando] = useState(false)
  const [etapa, setEtapa] = useState<'revisao' | 'processando' | 'concluido'>(
    'revisao'
  )

  useEffect(() => {
    if (!store_id) {
      router.back()
      return
    }

    async function carregarLoja() {
      const { data } = await supabase
        .from('stores')
        .select(
          'id, nome, taxa_entrega, aceita_pix, aceita_cartao_online'
        )
        .eq('id', store_id!)
        .single()

      setLoja(data)

      // Gateway-only: default cartão; se a loja não aceita, cai em Pix;
      // se nem isso, mantém `online_cartao` (SeletorPagamento renderiza
      // "Nenhuma forma disponível" e o CTA é bloqueado por validar()).
      if (data?.aceita_cartao_online) {
        setFormaPagamento('online_cartao')
      } else if (data?.aceita_pix) {
        setFormaPagamento('online_pix')
      } else {
        setFormaPagamento('online_cartao')
      }
    }

    carregarLoja()

    if (consumer && consumer.enderecos && consumer.enderecos.length > 0) {
      setEnderecoSelecionado(consumer.enderecos[0])
    }
  }, [store_id])

  useEffect(() => {
    if (formaPagamento !== 'online_cartao') {
      setInstallments(1)
    }
  }, [formaPagamento])

  function validar(): string | null {
    if (itens.length === 0) return 'Carrinho vazio.'
    if (!ehAgendamento && !enderecoSelecionado) {
      return 'Selecione um endereço de entrega.'
    }
    if (!formaPagamento) return 'Selecione uma forma de pagamento.'
    if (formaPagamento === 'online_cartao' && !dadosCartao) {
      return 'Preencha os dados do cartão.'
    }
    return null
  }

  async function handleFazerPedido() {
    const erro = validar()
    if (erro) {
      Alert.alert('Atenção', erro)
      return
    }

    setProcessando(true)
    setEtapa('processando')

    try {
      if (formaPagamento === 'online_cartao') {
        await fluxoCartao()
      } else {
        await fluxoPix()
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível processar o pedido.')
      setProcessando(false)
      setEtapa('revisao')
    }
  }

  async function obterSessaoOuFalhar() {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) throw new Error('Sessão expirada. Faça login novamente.')
    return session
  }

  function payloadBase() {
    return {
      store_id,
      itens: itens.map((i) => ({
        product_id: i.product_id,
        nome: i.nome,
        preco: i.preco,
        quantidade: i.quantidade,
        observacoes: i.observacoes,
        modifiers:
          i.modifiers && i.modifiers.length > 0
            ? i.modifiers.map((m) => ({ modifier_id: m.modifier_id }))
            : [],
        variant_id: i.variant?.variant_id ?? null,
        agendamento: i.agendamento
          ? {
              inicio_at: i.agendamento.inicio_at,
              fim_at: i.agendamento.fim_at,
              staff_id: i.agendamento.staff_id,
            }
          : null,
      })),
      endereco_entrega: ehAgendamento ? null : enderecoSelecionado,
      observacoes: observacoes.trim() || undefined,
    }
  }

  async function chamarCreatePagarmeOrder(body: Record<string, unknown>) {
    const session = await obterSessaoOuFalhar()
    const resposta = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-pagarme-order`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      }
    )
    const resultado = await resposta.json()
    if (!resposta.ok) throw new Error(resultado.error ?? 'Erro no servidor.')
    return resultado as {
      order_id: string
      status?: string
      qr_code?: string
      qr_code_url?: string
    }
  }

  async function fluxoCartao() {
    if (!dadosCartao) throw new Error('Dados do cartão ausentes.')

    const token = await tokenizarCartao(dadosCartao)
    setDadosCartao(null)

    const resultado = await chamarCreatePagarmeOrder({
      ...payloadBase(),
      forma_pagamento: 'online_cartao',
      card_token: token.id,
      installments,
    })

    limparCarrinho()
    setPedidoAtivo(resultado.order_id)
    setEtapa('concluido')
    router.replace(`/pedido/${resultado.order_id}`)
  }

  async function fluxoPix() {
    const resultado = await chamarCreatePagarmeOrder({
      ...payloadBase(),
      forma_pagamento: 'online_pix',
    })

    limparCarrinho()
    setPedidoAtivo(resultado.order_id)
    setEtapa('concluido')
    router.replace(`/checkout/pix?order_id=${resultado.order_id}`)
  }


  if (etapa === 'processando') {
    return (
      <LoadingState
        modo="tela"
        variante="escuro"
        mensagem="Processando seu pedido..."
      />
    )
  }

  if (itens.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <HeaderTela variante="voltar" titulo="Seu pedido" />
        <EmptyState
          icone="bag"
          titulo="Carrinho vazio"
          descricao="Adicione itens para fazer um pedido."
          acao={{
            label: 'Voltar às lojas',
            aoTocar: () => router.back(),
          }}
        />
      </View>
    )
  }

  const labelBotao = (() => {
    if (ehAgendamento) {
      return `Confirmar agendamento — ${formatarReais(total())}`
    }
    if (formaPagamento === 'online_cartao') {
      return `Pagar ${formatarReais(total())} em ${installments}×`
    }
    return `Gerar Pix de ${formatarReais(total())}`
  })()

  const qtdTotal = itens.reduce((a, i) => a + i.quantidade, 0)

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <HeaderTela variante="voltar" titulo="Seu pedido" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* Loja */}
        <View style={{ paddingHorizontal: 24, paddingTop: 4 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: colors.inkSoft,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Pedido em
          </Text>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '800',
              color: colors.ink,
              letterSpacing: -0.3,
            }}
          >
            {store_nome}
          </Text>
        </View>

        {/* Itens */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: colors.inkMuted,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Seus itens
          </Text>
          <Card preenchimento="sm" sombra="soft">
            {itens.map((item) => (
              <ItemCarrinhoCard key={item.linha_id} item={item} />
            ))}
          </Card>
        </View>

        {ehAgendamento && itemAgendamento?.agendamento && (
          <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: colors.inkMuted,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              Quando
            </Text>
            <Card preenchimento="md" sombra="soft">
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>
                📅 {formatarAgendamento(itemAgendamento.agendamento)}
              </Text>
            </Card>
          </View>
        )}

        {ehAgendamento && (
          <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: colors.inkMuted,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              Local
            </Text>
            <Card preenchimento="md" sombra="soft">
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>
                {store_nome}
              </Text>
              <Text style={{ fontSize: 12, color: colors.inkMuted, marginTop: 4 }}>
                Atendimento no estabelecimento.
              </Text>
            </Card>
          </View>
        )}

        {!ehAgendamento && (
          <SeletorEndereco
            enderecos={consumer?.enderecos ?? []}
            selecionado={enderecoSelecionado}
            onSelecionar={setEnderecoSelecionado}
          />
        )}

        {loja && (
          <SeletorPagamento
            loja={loja}
            selecionado={formaPagamento}
            onSelecionar={setFormaPagamento}
          />
        )}

        {formaPagamento === 'online_cartao' && (
          <>
            <FormularioCartao onChange={setDadosCartao} />
            <SeletorParcelas
              total={total()}
              selecionado={installments}
              onSelecionar={setInstallments}
            />
          </>
        )}


        <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
          <Input
            rotulo="Observações do pedido (opcional)"
            valor={observacoes}
            aoMudar={setObservacoes}
            placeholder="Ex: interfone 201, deixar com porteiro..."
            multilinha
            maxLength={200}
          />
        </View>

        {/* Resumo */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: colors.inkMuted,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Resumo
          </Text>
          <Card preenchimento="md" sombra="soft">
            <View style={{ gap: 8 }}>
              <LinhaResumo
                rotulo={`Subtotal (${qtdTotal} ${qtdTotal === 1 ? 'item' : 'itens'})`}
                valor={formatarReais(subtotal())}
              />
              {!ehAgendamento && (
                <LinhaResumo
                  rotulo="Taxa de entrega"
                  valor={
                    store_taxa_entrega === 0
                      ? 'Grátis'
                      : formatarReais(store_taxa_entrega)
                  }
                  valorAccent={store_taxa_entrega === 0}
                />
              )}
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.line,
                  marginVertical: 4,
                }}
              />
              <LinhaResumo
                rotulo="Total"
                valor={formatarReais(total())}
                destacado
              />
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* CTA fixo */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.line,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
        }}
      >
        <Botao
          label={labelBotao}
          onPress={handleFazerPedido}
          variante="primario"
          tamanho="lg"
          iconeDireita={formaPagamento === 'online_pix' ? 'phone' : 'check'}
          carregando={processando}
        />
      </View>
    </View>
  )
}

function LinhaResumo({
  rotulo,
  valor,
  destacado,
  valorAccent,
}: {
  rotulo: string
  valor: string
  destacado?: boolean
  valorAccent?: boolean
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text
        style={{
          fontSize: destacado ? 16 : 14,
          fontWeight: destacado ? '800' : '500',
          color: destacado ? colors.ink : colors.inkMuted,
        }}
      >
        {rotulo}
      </Text>
      <Text
        style={{
          fontSize: destacado ? 16 : 14,
          fontWeight: destacado ? '800' : '600',
          color: valorAccent ? colors.success : colors.ink,
        }}
      >
        {valor}
      </Text>
    </View>
  )
}
