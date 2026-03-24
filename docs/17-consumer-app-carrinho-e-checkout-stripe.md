# 17 — Consumer App — Carrinho e Checkout Stripe

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

O checkout é o fluxo mais crítico do app do consumidor. Cobre desde
a revisão do carrinho até a confirmação do pagamento via Stripe
Payment Sheet. O fluxo tem três etapas em sequência:

1. Carrinho — revisão dos itens, endereço e forma de pagamento
1. Payment Sheet — para pagamentos online (Stripe)
1. Confirmação — pedido criado, redireciona para acompanhamento

Pagamentos offline (dinheiro, cartão na maquininha) criam o pedido
diretamente sem passar pelo Stripe.

-----

## FLUXO COMPLETO

```
Usuário toca "Ver carrinho"
        ↓
app/checkout.tsx (modal)
  Etapa 1 — Revisão do carrinho
    → itens, quantidades, subtotal
    → seleção de endereço de entrega
    → seleção da forma de pagamento
    → campo de observações
    → botão "Fazer pedido"
        ↓
  [se pagamento online]
    → chama Edge Function create-payment-intent
    → recebe client_secret
    → abre Stripe Payment Sheet
    → consumidor confirma pagamento
    → webhook payment_intent.succeeded atualiza o banco
        ↓
  [se pagamento offline]
    → cria pedido diretamente no banco
        ↓
  Redireciona para app/pedido/[id].tsx
```

-----

## TELA DE CHECKOUT

### app/checkout.tsx

```typescript
import { useEffect, useState, useTransition } from 'react'
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

      // Definir forma padrão com base no que a loja aceita
      if (data?.aceita_cartao_online) {
        setFormaPagamento('online_cartao')
      } else if (data?.aceita_pix) {
        setFormaPagamento('dinheiro')
      } else {
        setFormaPagamento('dinheiro')
      }
    }

    carregarLoja()

    // Pré-selecionar endereço padrão do consumidor
    if (consumer?.enderecos?.length > 0) {
      setEnderecoSelecionado(consumer.enderecos[0])
    }
  }, [store_id])

  // Verificações antes de prosseguir
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

    // Chamar Edge Function para criar PaymentIntent e o pedido
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

    // Inicializar Stripe Payment Sheet
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

    // Apresentar Payment Sheet ao usuário
    const { error: presentError } = await presentPaymentSheet()

    if (presentError) {
      if (presentError.code === 'Canceled') {
        // Usuário fechou sem pagar — cancelar pedido
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

    // Pagamento confirmado — redirecionar
    limparCarrinho()
    setPedidoAtivo(order_id)
    setEtapa('concluido')
    router.replace(`/pedido/${order_id}`)
  }

  async function fluxoPagamentoOffline() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Sessão expirada.')

    // Buscar consumer_id
    const { data: consumer_data } = await supabase
      .from('consumers')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    if (!consumer_data) throw new Error('Perfil do consumidor não encontrado.')

    // Criar pedido diretamente no banco
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

    // Criar itens do pedido
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
              className="border border-gray-200 rounded-xl px-4 py-3
                text-base text-gray-700"
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
            className="border border-gray-200 rounded-xl px-4 py-3
              text-sm text-gray-700"
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
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t
        border-gray-100 px-5 pb-8 pt-4">
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
```

-----

## COMPONENTE ITEM CARRINHO CARD

### components/ItemCarrinhoCard.tsx

```typescript
import { View, Text, TouchableOpacity } from 'react-native'
import { useCartStore } from '@/store/useCartStore'
import { formatarReais } from '@mallora/lib'
import type { ItemCarrinho } from '@mallora/types'

export function ItemCarrinhoCard({ item }: { item: ItemCarrinho }) {
  const { aumentarQuantidade, diminuirQuantidade, removerItem } = useCartStore()

  return (
    <View className="flex-row items-center gap-4 px-5 py-4
      border-b border-gray-50">
      <View className="flex-1 min-w-0">
        <Text
          className="text-sm font-semibold text-gray-800"
          numberOfLines={1}
        >
          {item.nome}
        </Text>
        {item.observacoes && (
          <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
            {item.observacoes}
          </Text>
        )}
        <Text className="text-sm font-bold text-verde-profundo mt-1">
          {formatarReais(item.preco * item.quantidade)}
        </Text>
      </View>

      {/* Controle de quantidade */}
      <View className="flex-row items-center gap-3">
        <TouchableOpacity
          onPress={() =>
            item.quantidade === 1
              ? removerItem(item.product_id)
              : diminuirQuantidade(item.product_id)
          }
          className="w-8 h-8 rounded-full border border-gray-200
            items-center justify-center"
          activeOpacity={0.7}
        >
          <Text className="text-lg text-gray-500 leading-none">
            {item.quantidade === 1 ? '×' : '−'}
          </Text>
        </TouchableOpacity>

        <Text className="text-sm font-bold text-gray-800 w-5 text-center">
          {item.quantidade}
        </Text>

        <TouchableOpacity
          onPress={() => aumentarQuantidade(item.product_id)}
          className="w-8 h-8 rounded-full bg-verde-profundo
            items-center justify-center"
          activeOpacity={0.7}
        >
          <Text className="text-lg text-white leading-none">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

-----

## COMPONENTE SELETOR DE ENDERECO

### components/SeletorEndereco.tsx

```typescript
import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import type { Endereco } from '@mallora/types'

interface Props {
  enderecos: Endereco[]
  selecionado: Endereco | null
  onSelecionar: (endereco: Endereco) => void
}

export function SeletorEndereco({ enderecos, selecionado, onSelecionar }: Props) {
  const [modalAberto, setModalAberto] = useState(false)
  const [adicionando, setAdicionando] = useState(false)
  const [novoEndereco, setNovoEndereco] = useState<Partial<Endereco>>({
    cidade: 'Divinópolis',
    estado: 'MG',
  })
  const [salvando, setSalvando] = useState(false)
  const { consumer, setConsumer } = useAuthStore()

  async function buscarCep(cep: string) {
    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const dados = await res.json()
      if (!dados.erro) {
        setNovoEndereco((prev) => ({
          ...prev,
          rua: dados.logradouro,
          bairro: dados.bairro,
          cidade: dados.localidade,
          estado: dados.uf,
          cep: cepLimpo,
        }))
      }
    } catch {
      // Ignorar erro de CEP
    }
  }

  async function salvarEndereco() {
    if (!novoEndereco.rua || !novoEndereco.numero || !novoEndereco.bairro) {
      return
    }

    setSalvando(true)

    const enderecoCompleto: Endereco = {
      apelido: novoEndereco.apelido || `Endereço ${(enderecos.length ?? 0) + 1}`,
      rua: novoEndereco.rua!,
      numero: novoEndereco.numero!,
      complemento: novoEndereco.complemento,
      bairro: novoEndereco.bairro!,
      cidade: novoEndereco.cidade ?? 'Divinópolis',
      estado: novoEndereco.estado ?? 'MG',
      cep: novoEndereco.cep ?? '',
    }

    const novosEnderecos = [...(enderecos ?? []), enderecoCompleto]

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('consumers')
      .update({ enderecos: novosEnderecos })
      .eq('user_id', user.id)

    if (consumer) {
      setConsumer({ ...consumer, enderecos: novosEnderecos })
    }

    onSelecionar(enderecoCompleto)
    setAdicionando(false)
    setModalAberto(false)
    setSalvando(false)
  }

  return (
    <View className="bg-white border-t border-b border-gray-100 px-5 py-4 mt-4">
      <Text className="text-sm font-semibold text-gray-700 mb-3">
        Endereço de entrega
      </Text>

      {selecionado ? (
        <TouchableOpacity
          onPress={() => setModalAberto(true)}
          className="flex-row items-center justify-between"
          activeOpacity={0.75}
        >
          <View className="flex-1 mr-3">
            <Text className="text-sm font-medium text-gray-800">
              {selecionado.apelido ?? selecionado.rua}
            </Text>
            <Text className="text-xs text-gray-400 mt-0.5">
              {selecionado.rua}, {selecionado.numero}
              {selecionado.complemento ? ` — ${selecionado.complemento}` : ''}
            </Text>
            <Text className="text-xs text-gray-400">
              {selecionado.bairro} — {selecionado.cidade}
            </Text>
          </View>
          <Text className="text-verde-medio text-sm">Alterar</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => setModalAberto(true)}
          className="border-2 border-dashed border-gray-200 rounded-xl
            py-4 items-center"
          activeOpacity={0.75}
        >
          <Text className="text-verde-medio text-sm font-medium">
            Selecionar endereço de entrega
          </Text>
        </TouchableOpacity>
      )}

      {/* Modal de endereços */}
      <Modal
        visible={modalAberto}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setModalAberto(false)
          setAdicionando(false)
        }}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40"
          activeOpacity={1}
          onPress={() => {
            setModalAberto(false)
            setAdicionando(false)
          }}
        />

        <View className="bg-white rounded-t-3xl max-h-3/4">
          <View className="px-5 pt-5 pb-3 border-b border-gray-100">
            <Text className="text-base font-bold text-verde-profundo">
              {adicionando ? 'Novo endereço' : 'Endereços salvos'}
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {!adicionando ? (
              <>
                {enderecos.map((end, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      onSelecionar(end)
                      setModalAberto(false)
                    }}
                    className={`p-4 rounded-2xl border mb-3 ${
                      selecionado === end
                        ? 'border-verde-medio bg-green-50'
                        : 'border-gray-100 bg-white'
                    }`}
                    activeOpacity={0.75}
                  >
                    <Text className="text-sm font-semibold text-gray-800">
                      {end.apelido ?? end.rua}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      {end.rua}, {end.numero}
                      {end.complemento ? ` — ${end.complemento}` : ''}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      {end.bairro} — {end.cidade}
                    </Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  onPress={() => setAdicionando(true)}
                  className="border-2 border-dashed border-gray-200 rounded-2xl
                    py-4 items-center mt-2"
                  activeOpacity={0.75}
                >
                  <Text className="text-verde-medio text-sm font-medium">
                    Adicionar novo endereço
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View className="gap-4">
                <View>
                  <Text className="text-xs font-medium text-gray-600 mb-1">
                    Apelido (opcional)
                  </Text>
                  <TextInput
                    value={novoEndereco.apelido ?? ''}
                    onChangeText={(t) =>
                      setNovoEndereco((p) => ({ ...p, apelido: t }))
                    }
                    placeholder="Ex: Casa, Trabalho"
                    placeholderTextColor="#9CA3AF"
                    className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
                  />
                </View>

                <View>
                  <Text className="text-xs font-medium text-gray-600 mb-1">
                    CEP
                  </Text>
                  <TextInput
                    value={novoEndereco.cep ?? ''}
                    onChangeText={(t) => {
                      setNovoEndereco((p) => ({ ...p, cep: t }))
                      buscarCep(t)
                    }}
                    placeholder="00000-000"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={9}
                    className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
                  />
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-medium text-gray-600 mb-1">
                      Rua
                    </Text>
                    <TextInput
                      value={novoEndereco.rua ?? ''}
                      onChangeText={(t) =>
                        setNovoEndereco((p) => ({ ...p, rua: t }))
                      }
                      placeholder="Nome da rua"
                      placeholderTextColor="#9CA3AF"
                      className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
                    />
                  </View>
                  <View className="w-24">
                    <Text className="text-xs font-medium text-gray-600 mb-1">
                      Número
                    </Text>
                    <TextInput
                      value={novoEndereco.numero ?? ''}
                      onChangeText={(t) =>
                        setNovoEndereco((p) => ({ ...p, numero: t }))
                      }
                      placeholder="123"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-xs font-medium text-gray-600 mb-1">
                    Complemento (opcional)
                  </Text>
                  <TextInput
                    value={novoEndereco.complemento ?? ''}
                    onChangeText={(t) =>
                      setNovoEndereco((p) => ({ ...p, complemento: t }))
                    }
                    placeholder="Apto, bloco, referência..."
                    placeholderTextColor="#9CA3AF"
                    className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
                  />
                </View>

                <View>
                  <Text className="text-xs font-medium text-gray-600 mb-1">
                    Bairro
                  </Text>
                  <TextInput
                    value={novoEndereco.bairro ?? ''}
                    onChangeText={(t) =>
                      setNovoEndereco((p) => ({ ...p, bairro: t }))
                    }
                    placeholder="Nome do bairro"
                    placeholderTextColor="#9CA3AF"
                    className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
                  />
                </View>

                <View className="flex-row gap-2 mt-2">
                  <TouchableOpacity
                    onPress={() => setAdicionando(false)}
                    className="flex-1 border border-gray-200 py-3.5 rounded-2xl
                      items-center"
                    activeOpacity={0.7}
                  >
                    <Text className="text-gray-500 text-sm font-medium">
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={salvarEndereco}
                    disabled={salvando}
                    className="flex-1 bg-verde-profundo py-3.5 rounded-2xl
                      items-center disabled:opacity-50"
                    activeOpacity={0.85}
                  >
                    <Text className="text-white text-sm font-semibold">
                      {salvando ? 'Salvando...' : 'Salvar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}
```

-----

## COMPONENTE SELETOR DE PAGAMENTO

### components/SeletorPagamento.tsx

```typescript
import { View, Text, TouchableOpacity } from 'react-native'

type FormaPagamento =
  | 'online_cartao'
  | 'online_pix'
  | 'dinheiro'
  | 'cartao_maquininha'

interface Loja {
  aceita_dinheiro: boolean
  aceita_pix: boolean
  aceita_cartao_maquininha: boolean
  aceita_cartao_online: boolean
}

interface OpcaoPagamento {
  id: FormaPagamento
  label: string
  descricao: string
  condicao: (loja: Loja) => boolean
}

const OPCOES: OpcaoPagamento[] = [
  {
    id: 'online_cartao',
    label: 'Cartão ou PIX online',
    descricao: 'Pague agora com segurança via Stripe',
    condicao: (l) => l.aceita_cartao_online,
  },
  {
    id: 'dinheiro',
    label: 'Dinheiro na entrega',
    descricao: 'Pague ao receber seu pedido',
    condicao: (l) => l.aceita_dinheiro,
  },
  {
    id: 'cartao_maquininha',
    label: 'Cartão na maquininha',
    descricao: 'Débito ou crédito na entrega',
    condicao: (l) => l.aceita_cartao_maquininha,
  },
]

interface Props {
  loja: Loja
  selecionado: FormaPagamento
  onSelecionar: (forma: FormaPagamento) => void
}

export function SeletorPagamento({ loja, selecionado, onSelecionar }: Props) {
  const opcoesDisponiveis = OPCOES.filter((op) => op.condicao(loja))

  return (
    <View className="bg-white border-t border-b border-gray-100 px-5 py-4 mt-4">
      <Text className="text-sm font-semibold text-gray-700 mb-3">
        Forma de pagamento
      </Text>

      <View className="gap-2">
        {opcoesDisponiveis.map((opcao) => (
          <TouchableOpacity
            key={opcao.id}
            onPress={() => onSelecionar(opcao.id)}
            className={`flex-row items-center gap-3 p-4 rounded-2xl border
              ${selecionado === opcao.id
                ? 'border-verde-medio bg-green-50'
                : 'border-gray-100'
              }`}
            activeOpacity={0.75}
          >
            {/* Radio visual */}
            <View
              className={`w-5 h-5 rounded-full border-2 items-center justify-center
                ${selecionado === opcao.id
                  ? 'border-verde-medio'
                  : 'border-gray-300'
                }`}
            >
              {selecionado === opcao.id && (
                <View className="w-2.5 h-2.5 rounded-full bg-verde-medio" />
              )}
            </View>

            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-800">
                {opcao.label}
              </Text>
              <Text className="text-xs text-gray-400 mt-0.5">
                {opcao.descricao}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {opcoesDisponiveis.length === 0 && (
          <Text className="text-sm text-gray-400 text-center py-3">
            Nenhuma forma de pagamento disponível.
          </Text>
        )}
      </View>
    </View>
  )
}
```

-----

## CONFIGURACAO DO STRIPE PAYMENT SHEET

A aparência do Payment Sheet é customizada via o objeto `appearance`
passado em `initPaymentSheet`. As cores seguem a paleta Verde Minas.

Para suporte a PIX, certificar que o método está ativado no Stripe
Dashboard (conforme arquivo 06). O Stripe Detection automático exibe
PIX quando a moeda é BRL e o dispositivo é brasileiro.

Para habilitar Google Pay e Apple Pay:

- Google Pay: configurado no `app.json` via plugin Stripe (`enableGooglePay: true`)
- Apple Pay: requer certificado no Apple Developer Portal e `merchantIdentifier`

-----

## TRATAMENTO DO CANCELAMENTO DO PAYMENT SHEET

Quando o usuário fecha o Payment Sheet sem pagar (`error.code === 'Canceled'`),
o pedido já foi criado no banco com `status = 'novo'` e `payment_status = 'pendente'`.
Neste caso o fluxo cancela o pedido imediatamente antes de retornar ao carrinho.

Isso evita pedidos fantasmas com status `novo` que o lojista nunca receberá
o pagamento.

-----

## CHECKLIST DO MODULO

- [ ] `@stripe/stripe-react-native` instalado e configurado no `app.json`
- [ ] `StripeProvider` envolvendo o app no `_layout.tsx` raiz (arquivo 15)
- [ ] PIX ativado no Stripe Dashboard antes de testar em produção
- [ ] Edge Function `create-payment-intent` deployada (arquivo 07)
- [ ] Cancelamento do Payment Sheet cancela o pedido no banco imediatamente
- [ ] Pagamentos offline criam o pedido diretamente sem chamar o Stripe
- [ ] `platform_fee_amount = 100` (R$1,00) sempre definido ao criar pedido offline
- [ ] Busca de CEP via ViaCEP funciona offline — tratar falha silenciosamente
- [ ] Endereços salvos persistidos em `consumers.enderecos` (campo JSONB)
- [ ] `limparCarrinho()` chamado apenas após confirmação de pedido bem-sucedida
- [ ] `setPedidoAtivo(order_id)` antes de navegar para a tela de acompanhamento
- [ ] Tenant ID do lojista necessário na criação do pedido offline — buscar via `stores.tenant_id`

-----

*Arquivo 17 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 18 — Consumer App — Pedido e Perfil*
