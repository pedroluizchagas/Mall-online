import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { useStripe } from '@stripe/stripe-react-native'
import { supabase } from '@/lib/supabase'
import { useCartStore } from '@/store/useCartStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useOrderStore } from '@/store/useOrderStore'
import { formatarReais } from '@mallora/lib'
import { ItemCarrinhoCard } from '@/components/ItemCarrinhoCard'
import { SeletorEndereco } from '@/components/SeletorEndereco'
import { SeletorPagamento } from '@/components/SeletorPagamento'
import type { Endereco } from '@mallora/types'

type FormaPagamento =
  | 'online_cartao'
  | 'online_pix'
  | 'dinheiro'
  | 'cartao_maquininha'

export default function TelaCheckout() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe()

  const {
    itens,
    store_id,
    store_nome,
    store_taxa_entrega,
    subtotal,
    total,
    limparCarrinho,
  } = useCartStore()

  const { consumer } = useAuthStore()
  const { setPedidoAtivo } = useOrderStore()

  const [loja, setLoja] = useState<any>(null)
  const [enderecoSelecionado, setEnderecoSelecionado] =
    useState<Endereco | null>(null)
  const [formaPagamento, setFormaPagamento] =
    useState<FormaPagamento>('online_cartao')
  const [trocoPara, setTrocoPara] = useState('')
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
          'id, nome, taxa_entrega, aceita_dinheiro, aceita_pix, ' +
          'aceita_cartao_maquininha, aceita_cartao_online'
        )
        .eq('id', store_id!)
        .single()

      setLoja(data)

      if (data?.aceita_cartao_online) {
        setFormaPagamento('online_cartao')
      } else if (data?.aceita_pix) {
        setFormaPagamento('online_pix')
      } else {
        setFormaPagamento('dinheiro')
      }
    }

    carregarLoja()

    if (consumer?.enderecos?.length > 0) {
      setEnderecoSelecionado(consumer.enderecos[0])
    }
  }, [store_id])

  function validar(): string | null {
    if (itens.length === 0) return 'Carrinho vazio.'
    if (!enderecoSelecionado) return 'Selecione um endereço de entrega.'
    if (!formaPagamento) return 'Selecione uma forma de pagamento.'
    if (
      formaPagamento === 'dinheiro' &&
      trocoPara &&
      parseFloat(trocoPara) < total() / 100
    ) {
      return 'Valor do troco deve ser maior que o total do pedido.'
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
      if (
        formaPagamento === 'online_cartao' ||
        formaPagamento === 'online_pix'
      ) {
        await fluxoPagamentoOnline()
      } else {
        await fluxoPagamentoOffline()
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível processar o pedido.')
      setProcessando(false)
      setEtapa('revisao')
    }
  }

  async function fluxoPagamentoOnline() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Sessão expirada. Faça login novamente.')

    const resposta = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-payment-intent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          store_id,
          itens: itens.map((i) => ({
            product_id: i.product_id,
            nome: i.nome,
            preco: i.preco,
            quantidade: i.quantidade,
            observacoes: i.observacoes,
          })),
          endereco_entrega: enderecoSelecionado,
          observacoes: observacoes.trim() || undefined,
        }),
      }
    )

    const resultado = await resposta.json()
    if (!resposta.ok) throw new Error(resultado.error)

    const { client_secret, order_id } = resultado

    const { error: initError } = await initPaymentSheet({
      merchantDisplayName: store_nome ?? 'Mallora',
      paymentIntentClientSecret: client_secret,
      defaultBillingDetails: {
        name: consumer?.nome ?? '',
      },
      allowsDelayedPaymentMethods: false,
      appearance: {
        colors: {
          primary: '#1A4D3A',
          background: '#FFF8ED',
          componentBackground: '#FFFFFF',
          componentBorder: '#E5E7EB',
          primaryText: '#111827',
          secondaryText: '#6B7280',
          placeholderText: '#9CA3AF',
        },
        shapes: {
          borderRadius: 12,
          borderWidth: 1,
        },
      },
    })

    if (initError) throw new Error(initError.message)

    const { error: presentError } = await presentPaymentSheet()

    if (presentError) {
      if (presentError.code === 'Canceled') {
        await supabase
          .from('orders')
          .update({
            status: 'cancelado',
            motivo_cancelamento: 'Pagamento cancelado pelo usuário',
            cancelado_em: new Date().toISOString(),
          })
          .eq('id', order_id)

        setProcessando(false)
        setEtapa('revisao')
        return
      }
      throw new Error(presentError.message)
    }

    limparCarrinho()
    setPedidoAtivo(order_id)
    setEtapa('concluido')
    router.replace(`/pedido/${order_id}`)
  }

  async function fluxoPagamentoOffline() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Sessão expirada.')

    const { data: consumer_data } = await supabase
      .from('consumers')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    if (!consumer_data) throw new Error('Perfil do consumidor não encontrado.')

    const { data: pedido, error: pedidoError } = await supabase
      .from('orders')
      .insert({
        consumer_id: consumer_data.id,
        store_id,
        tenant_id: loja.tenant_id,
        status: 'novo',
        payment_status: 'pendente',
        forma_pagamento: formaPagamento,
        subtotal: subtotal(),
        taxa_entrega: store_taxa_entrega,
        total: total(),
        platform_fee_amount: 100,
        endereco_entrega: enderecoSelecionado,
        observacoes: observacoes.trim() || null,
        troco_para: trocoPara
          ? Math.round(parseFloat(trocoPara) * 100)
          : null,
      })
      .select('id')
      .single()

    if (pedidoError) throw new Error(pedidoError.message)

    const orderItems = itens.map((i) => ({
      order_id: pedido.id,
      product_id: i.product_id,
      nome: i.nome,
      preco_unit: i.preco,
      quantidade: i.quantidade,
      subtotal: i.preco * i.quantidade,
      observacoes: i.observacoes ?? null,
    }))

    await supabase.from('order_items').insert(orderItems)

    limparCarrinho()
    setPedidoAtivo(pedido.id)
    setEtapa('concluido')
    router.replace(`/pedido/${pedido.id}`)
  }

  if (itens.length === 0 && etapa !== 'processando') {
    return (
      <View className="flex-1 bg-creme items-center justify-center px-6">
        <Text className="text-lg font-semibold text-gray-500 mb-2">
          Carrinho vazio
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-verde-medio">Voltar às lojas</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (etapa === 'processando') {
    return (
      <View className="flex-1 bg-creme items-center justify-center">
        <ActivityIndicator size="large" color="#1A4D3A" />
        <Text className="text-gray-500 mt-4">Processando seu pedido...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-creme">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-14 pb-4 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text className="text-verde-medio text-base">Fechar</Text>
        </TouchableOpacity>
        <Text className="text-base font-bold text-verde-profundo">
          Seu pedido
        </Text>
        <View className="w-12" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Nome da loja */}
        <View className="px-5 py-4">
          <Text className="text-sm text-gray-400">Pedido em</Text>
          <Text className="text-base font-bold text-verde-profundo">
            {store_nome}
          </Text>
        </View>

        {/* Itens do carrinho */}
        <View className="bg-white border-t border-b border-gray-100 mb-4">
          {itens.map((item) => (
            <ItemCarrinhoCard key={item.product_id} item={item} />
          ))}
        </View>

        {/* Endereço de entrega */}
        <SeletorEndereco
          enderecos={consumer?.enderecos ?? []}
          selecionado={enderecoSelecionado}
          onSelecionar={setEnderecoSelecionado}
        />

        {/* Forma de pagamento */}
        {loja && (
          <SeletorPagamento
            loja={loja}
            selecionado={formaPagamento}
            onSelecionar={setFormaPagamento}
          />
        )}

        {/* Troco (se dinheiro) */}
        {formaPagamento === 'dinheiro' && (
          <View className="bg-white border-t border-b border-gray-100 px-5 py-4 mt-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Troco para quanto? (opcional)
            </Text>
            <TextInput
              value={trocoPara}
              onChangeText={setTrocoPara}
              placeholder={`Ex: ${formatarReais(total() + 500)}`}
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-700"
            />
          </View>
        )}

        {/* Observações gerais */}
        <View className="bg-white border-t border-b border-gray-100 px-5 py-4 mt-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Observações do pedido (opcional)
          </Text>
          <TextInput
            value={observacoes}
            onChangeText={setObservacoes}
            placeholder="Ex: interfone 201, deixar com porteiro..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={2}
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700"
            style={{ textAlignVertical: 'top' }}
          />
        </View>

        {/* Resumo de valores */}
        <View className="bg-white border-t border-b border-gray-100 px-5 py-4 mt-4">
          <Text className="text-sm font-semibold text-gray-700 mb-3">
            Resumo
          </Text>
          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-500">
                Subtotal ({itens.reduce((a, i) => a + i.quantidade, 0)} itens)
              </Text>
              <Text className="text-sm text-gray-700">
                {formatarReais(subtotal())}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-500">Taxa de entrega</Text>
              <Text className="text-sm text-gray-700">
                {store_taxa_entrega === 0
                  ? 'Grátis'
                  : formatarReais(store_taxa_entrega)}
              </Text>
            </View>
            <View className="flex-row justify-between pt-2 border-t border-gray-100">
              <Text className="text-base font-bold text-gray-800">Total</Text>
              <Text className="text-base font-bold text-verde-profundo">
                {formatarReais(total())}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Botão de ação fixo no rodapé */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 pb-8 pt-4">
        <TouchableOpacity
          onPress={handleFazerPedido}
          disabled={processando}
          className="bg-verde-profundo py-4 rounded-2xl items-center disabled:opacity-50"
          activeOpacity={0.85}
        >
          {processando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">
              {formaPagamento === 'online_cartao' || formaPagamento === 'online_pix'
                ? `Pagar ${formatarReais(total())}`
                : `Fazer pedido — ${formatarReais(total())}`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}
