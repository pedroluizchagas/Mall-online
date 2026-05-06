# 17 — Consumer App — Carrinho e Checkout Pagar.me

### Plataforma Delivery Divinópolis

*Versão 2.0 — 29/04/2026 (substitui Stripe Payment Sheet por Pagar.me)*

-----

## VISAO GERAL

O checkout é o fluxo mais crítico do app do consumidor. Cobre desde a revisão
do carrinho até a confirmação do pagamento via Pagar.me. O fluxo tem três
etapas em sequência:

1. Carrinho — revisão dos itens, endereço e forma de pagamento
1. Pagamento — Pix (QR code in-app) ou cartão (formulário in-app com tokenização)
1. Confirmação — pedido criado, redireciona para acompanhamento

Pagamentos offline (dinheiro, cartão na maquininha) criam o pedido
diretamente sem passar pelo Pagar.me.

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
  [se pagamento online — Pix]
    → chama Edge Function create-pagarme-order com payment_method='pix'
    → recebe qr_code + qr_code_url
    → exibe tela de Pix com QR Code, copia-e-cola e timer de expiração
    → assina canal Realtime em orders.id
    → webhook order.paid atualiza payment_status no banco
    → Realtime notifica o app e redireciona para acompanhamento

  [se pagamento online — cartão]
    → coleta dados do cartão no app (formulário com validação Luhn)
    → app tokeniza o cartão chamando diretamente a API pública
       POST https://api.pagar.me/core/v5/tokens?appId=$EXPO_PUBLIC_PAGARME_APPID
       (compliance PCI: número/CVV nunca trafegam pela Mallora)
    → seleciona parcelamento (1x sem juros até 12x — juros Pagar.me cobrados
       do consumidor)
    → chama Edge Function create-pagarme-order com payment_method='credit_card',
       enviando apenas { card_token, installments }
    → resposta inclui status imediato (paid | failed | pending)
    → se paid: redireciona; se failed: exibe motivo da recusa

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
import { supabase } from '@/lib/supabase'
import { useCartStore } from '@/store/useCartStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useOrderStore } from '@/store/useOrderStore'
import { formatarReais } from '@mallora/lib'
import { ItemCarrinhoCard } from '@/components/ItemCarrinhoCard'
import { SeletorEndereco } from '@/components/SeletorEndereco'
import { SeletorPagamento } from '@/components/SeletorPagamento'
import { SeletorParcelas } from '@/components/SeletorParcelas'
import { FormularioCartao } from '@/components/FormularioCartao'
import type { Endereco } from '@mallora/types'

type FormaPagamento =
  | 'online_cartao'
  | 'online_pix'
  | 'dinheiro'
  | 'cartao_maquininha'

export default function TelaCheckout() {
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
  const [installments, setInstallments] = useState<number>(1)
  const [cardToken, setCardToken] = useState<string | null>(null)
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

    const payment_method = formaPagamento === 'online_pix' ? 'pix' : 'credit_card'

    if (payment_method === 'credit_card' && !cardToken) {
      throw new Error('Informe os dados do cartão antes de continuar.')
    }

    // O app NUNCA envia dados crus do cartão. O cardToken é gerado pelo
    // FormularioCartao chamando POST /core/v5/tokens?appId=... diretamente
    // na Pagar.me. Aqui mandamos apenas { card_token, installments }.
    const resposta = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-pagarme-order`,
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
          payment_method,
          card_token: payment_method === 'credit_card' ? cardToken : undefined,
          installments: payment_method === 'credit_card' ? installments : 1,
        }),
      }
    )

    const resultado = await resposta.json()
    if (!resposta.ok) throw new Error(resultado.error)

    const { order_id, qr_code, qr_code_url, status } = resultado

    if (payment_method === 'pix') {
      // Mostrar tela de Pix e aguardar webhook order.paid via Realtime
      router.replace({
        pathname: '/checkout/pix',
        params: { order_id, qr_code, qr_code_url },
      })
      return
    }

    // Cartão: status pode vir 'paid', 'pending' (3DS) ou 'failed'
    if (status === 'paid') {
      limparCarrinho()
      setPedidoAtivo(order_id)
      setEtapa('concluido')
      router.replace(`/pedido/${order_id}`)
    } else if (status === 'failed') {
      throw new Error('Pagamento recusado. Tente outro cartão.')
    } else {
      // Pendente (3DS ou análise antifraude) — aguarda webhook via Realtime
      router.replace({
        pathname: '/checkout/aguardando',
        params: { order_id },
      })
    }
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

        {/* Cartão online — formulário com tokenização Pagar.me */}
        {formaPagamento === 'online_cartao' && (
          <FormularioCartao
            onTokenGerado={setCardToken}
            onLimpar={() => setCardToken(null)}
          />
        )}

        {/* Parcelamento — apenas em cartão online */}
        {formaPagamento === 'online_cartao' && (
          <SeletorParcelas
            total={total()}
            selecionado={installments}
            onSelecionar={setInstallments}
            maxParcelas={12}
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
    descricao: 'Pague agora com segurança via Pagar.me (Pix ou cartão)',
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

## COMPONENTE FORMULARIO DE CARTAO (TOKENIZACAO CLIENT-SIDE)

### components/FormularioCartao.tsx

Coleta dados do cartão na UI do app e chama **diretamente** a API pública de
tokens da Pagar.me usando o `appId` público
(`EXPO_PUBLIC_PAGARME_APPID` — ver doc 09). Apenas o `card_token` resultante
sai do app; nada de número/CVV/data de validade transita pela Mallora.

A `EXPO_PUBLIC_PAGARME_APPID` é uma chave **pública** específica para a rota
`/tokens` — ela só serve para tokenizar e não dá acesso a nenhum dado de
ordens, recipients ou saldos. É segura para embutir no bundle.

```typescript
// components/FormularioCartao.tsx
import { useState } from 'react'
import { View, Text, TextInput, ActivityIndicator } from 'react-native'

interface Props {
  onTokenGerado: (cardToken: string) => void
  onLimpar: () => void
}

export function FormularioCartao({ onTokenGerado, onLimpar }: Props) {
  const [number, setNumber] = useState('')
  const [holderName, setHolderName] = useState('')
  const [exp, setExp] = useState('') // MM/AA
  const [cvv, setCvv] = useState('')
  const [tokenizando, setTokenizando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [tokenizado, setTokenizado] = useState(false)

  function passaLuhn(num: string) {
    const dig = num.replace(/\D/g, '')
    if (dig.length < 13 || dig.length > 19) return false
    let sum = 0
    let alt = false
    for (let i = dig.length - 1; i >= 0; i--) {
      let n = parseInt(dig[i], 10)
      if (alt) {
        n *= 2
        if (n > 9) n -= 9
      }
      sum += n
      alt = !alt
    }
    return sum % 10 === 0
  }

  async function tokenizar() {
    setErro(null)
    if (!passaLuhn(number)) return setErro('Número de cartão inválido.')
    if (!holderName.trim()) return setErro('Informe o nome impresso no cartão.')
    const [mm, aa] = exp.split('/')
    if (!mm || !aa) return setErro('Validade no formato MM/AA.')
    if (cvv.length < 3) return setErro('CVV inválido.')

    setTokenizando(true)
    try {
      const appId = process.env.EXPO_PUBLIC_PAGARME_APPID
      const res = await fetch(
        `https://api.pagar.me/core/v5/tokens?appId=${appId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'card',
            card: {
              number: number.replace(/\D/g, ''),
              holder_name: holderName.trim(),
              exp_month: parseInt(mm, 10),
              exp_year: 2000 + parseInt(aa, 10),
              cvv,
            },
          }),
        },
      )
      const dados = await res.json()
      if (!res.ok || !dados.id) {
        throw new Error(dados.message ?? 'Falha ao validar cartão.')
      }
      onTokenGerado(dados.id) // formato: 'token_xxx'
      setTokenizado(true)
    } catch (e: any) {
      setErro(e.message ?? 'Não foi possível validar o cartão.')
      onLimpar()
    } finally {
      setTokenizando(false)
    }
  }

  if (tokenizado) {
    return (
      <View className="bg-white border-t border-b border-gray-100 px-5 py-4 mt-4">
        <Text className="text-sm font-semibold text-gray-700 mb-1">
          Cartão validado
        </Text>
        <Text className="text-xs text-gray-400">
          Final {number.replace(/\D/g, '').slice(-4)} — {holderName}
        </Text>
      </View>
    )
  }

  return (
    <View className="bg-white border-t border-b border-gray-100 px-5 py-4 mt-4 gap-3">
      <Text className="text-sm font-semibold text-gray-700">
        Dados do cartão
      </Text>
      <TextInput
        value={number}
        onChangeText={setNumber}
        onBlur={tokenizar}
        placeholder="Número do cartão"
        keyboardType="numeric"
        maxLength={19}
        className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
      />
      <TextInput
        value={holderName}
        onChangeText={setHolderName}
        placeholder="Nome impresso no cartão"
        autoCapitalize="characters"
        className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
      />
      <View className="flex-row gap-3">
        <TextInput
          value={exp}
          onChangeText={setExp}
          placeholder="MM/AA"
          keyboardType="numeric"
          maxLength={5}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm"
        />
        <TextInput
          value={cvv}
          onChangeText={setCvv}
          placeholder="CVV"
          keyboardType="numeric"
          maxLength={4}
          secureTextEntry
          className="w-28 border border-gray-200 rounded-xl px-4 py-3 text-sm"
        />
      </View>
      {tokenizando && <ActivityIndicator color="#1A4D3A" />}
      {erro && <Text className="text-xs text-red-500">{erro}</Text>}
    </View>
  )
}
```

-----

## COMPONENTE SELETOR DE PARCELAS

### components/SeletorParcelas.tsx

Renderizado apenas quando `formaPagamento === 'online_cartao'`. Permite
escolher entre 1x à vista (sem juros) e 2x..12x (juros Pagar.me cobrados do
consumidor — `installment_type: 'customer'` na payload da Edge Function).

```typescript
// components/SeletorParcelas.tsx
import { View, Text, TouchableOpacity } from 'react-native'
import { formatarReais } from '@mallora/lib'

interface Props {
  total: number       // total do pedido em centavos
  selecionado: number
  onSelecionar: (n: number) => void
  maxParcelas?: number
}

export function SeletorParcelas({
  total,
  selecionado,
  onSelecionar,
  maxParcelas = 12,
}: Props) {
  // 1x sem juros; demais com taxa Pagar.me repassada ao consumidor.
  // Os valores definitivos vêm do contrato Pagar.me — usamos uma estimativa
  // visual aqui, mas o Pagar.me recalcula no momento da Order com a taxa real.
  const opcoes = Array.from({ length: maxParcelas }, (_, i) => i + 1).map((n) => {
    const valorParcela = Math.round(total / n)
    const label =
      n === 1
        ? `1x à vista — ${formatarReais(total)} (sem juros)`
        : `${n}x ${formatarReais(valorParcela)} (juros Pagar.me)`
    return { n, label }
  })

  return (
    <View className="bg-white border-t border-b border-gray-100 px-5 py-4 mt-4">
      <Text className="text-sm font-semibold text-gray-700 mb-3">
        Parcelamento
      </Text>
      <View className="gap-2">
        {opcoes.map(({ n, label }) => (
          <TouchableOpacity
            key={n}
            onPress={() => onSelecionar(n)}
            className={`flex-row items-center gap-3 p-3 rounded-2xl border
              ${selecionado === n
                ? 'border-verde-medio bg-green-50'
                : 'border-gray-100'
              }`}
            activeOpacity={0.75}
          >
            <View
              className={`w-5 h-5 rounded-full border-2 items-center justify-center
                ${selecionado === n
                  ? 'border-verde-medio'
                  : 'border-gray-300'
                }`}
            >
              {selecionado === n && (
                <View className="w-2.5 h-2.5 rounded-full bg-verde-medio" />
              )}
            </View>
            <Text className="text-sm text-gray-800 flex-1">{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}
```

-----

## TELA DE PIX

Pix exige uma tela dedicada que apresenta:

- QR Code renderizado a partir do `qr_code_url`
- Código copia-e-cola (`qr_code`) com botão de cópia
- Timer regressivo até a expiração (default 1 hora)
- Mensagem "aguardando pagamento..." com pulso visual
- Subscribe em `orders.id` via Realtime para atualizar quando `payment_status = 'pago'`

```typescript
// app/checkout/pix.tsx
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useEffect } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { supabase } from '@/lib/supabase'

export default function TelaPix() {
  const { order_id, qr_code, qr_code_url } = useLocalSearchParams<{
    order_id: string
    qr_code: string
    qr_code_url: string
  }>()

  useEffect(() => {
    const channel = supabase
      .channel(`order-${order_id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order_id}` },
        (payload) => {
          if (payload.new.payment_status === 'pago') {
            router.replace(`/pedido/${order_id}`)
          } else if (payload.new.status === 'cancelado') {
            router.replace('/')
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [order_id])

  return (
    <View className="flex-1 bg-creme items-center justify-center px-6">
      <Text className="text-lg font-bold text-verde-profundo mb-2">
        Pague com Pix
      </Text>
      <Text className="text-sm text-gray-500 text-center mb-6">
        Aguardando confirmação do pagamento. Esta tela atualizará
        automaticamente.
      </Text>

      <Image source={{ uri: qr_code_url }} style={{ width: 240, height: 240 }} />

      <TouchableOpacity
        onPress={() => Clipboard.setStringAsync(qr_code)}
        className="mt-4 bg-verde-profundo px-6 py-3 rounded-xl"
      >
        <Text className="text-white font-semibold">Copiar código Pix</Text>
      </TouchableOpacity>

      <ActivityIndicator color="#1A4D3A" size="large" className="mt-6" />
    </View>
  )
}
```

-----

## TRATAMENTO DE CANCELAMENTO DO CHECKOUT

Quando o consumidor abandona a tela de Pix sem pagar, o pedido permanece com
`status = 'novo'` e `payment_status = 'pendente'`. O Pagar.me dispara
`order.payment_failed` automaticamente quando o QR expira (default 1h),
e a Edge Function `pagarme-webhook` marca o pedido como cancelado.

Em fluxo de cartão recusado, a Edge Function `create-pagarme-order` retorna
`status = 'failed'` e o app exibe o motivo. O pedido é mantido com
`payment_status = 'pendente'` e cancelado pela mesma rotina de webhook
quando aplicável.

-----

## CHECKLIST DO MODULO

- [ ] Edge Function `create-pagarme-order` deployada (arquivo 07)
- [ ] Webhook `pagarme-webhook` registrado para `order.paid` e `order.payment_failed`
- [ ] Tela de Pix com Realtime subscribe em `orders.id` para atualização automática
- [ ] `FormularioCartao` tokeniza client-side via `https://api.pagar.me/core/v5/tokens?appId=$EXPO_PUBLIC_PAGARME_APPID` — número/CVV nunca trafegam pelo backend
- [ ] `SeletorParcelas` exibido apenas em `online_cartao`, com 1x..12x e `installments` enviado à Edge Function
- [ ] Edge Function recebe apenas `card_token + installments` no body de cartão
- [ ] Pagamentos offline criam o pedido diretamente sem chamar o Pagar.me
- [ ] `platform_fee_amount = 100` (R$1,00) sempre definido ao criar pedido offline
- [ ] Busca de CEP via ViaCEP funciona offline — tratar falha silenciosamente
- [ ] Endereços salvos persistidos em `consumers.enderecos` (campo JSONB)
- [ ] `limparCarrinho()` chamado apenas após confirmação de pedido bem-sucedida
- [ ] `setPedidoAtivo(order_id)` antes de navegar para a tela de acompanhamento
- [ ] Tenant ID do lojista necessário na criação do pedido offline — buscar via `stores.tenant_id`

-----

*Arquivo 17 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 18 — Consumer App — Pedido e Perfil*
