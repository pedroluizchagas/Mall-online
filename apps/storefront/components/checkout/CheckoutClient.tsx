'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  useCartStore,
  useAuthStore,
  useOrderStore,
} from '@mallevo/lib'

import { formatarReais } from '@/lib/format'
import { tokenizarCartao } from '@/lib/pagarme'
import { createSupabaseClient } from '@/lib/supabase/client'
import {
  ItemCarrinhoCard,
  formatarAgendamento,
} from '@/components/cart/ItemCarrinhoCard'
import { SeletorEndereco } from '@/components/checkout/SeletorEndereco'
import {
  SeletorPagamento,
  type FormaPagamento,
} from '@/components/checkout/SeletorPagamento'
import { SeletorParcelas } from '@/components/checkout/SeletorParcelas'
import {
  FormularioCartao,
  type DadosCartao,
} from '@/components/checkout/FormularioCartao'
import type { Endereco } from '@mallevo/types'

/**
 * CheckoutClient — port RN→DOM de apps/mobile-consumer/app/checkout.tsx
 * (Stage 3d). Decisão TL §3d: estrutural/inerte. Os três fluxos exigem
 * sessão consumer (3e); sem sessão `obterSessaoOuFalhar()` redireciona
 * p/ `/entrar?next=/checkout` (rota que nasce no 3e) — fronteira INERTE.
 *
 * `loja` vem da view `public_catalog_stores` (D2, via Server → props),
 * substituindo o `supabase.from('stores')` da base que o mobile faz.
 * Regra de cobertura/entrega vem de @mallevo/lib (D4) via o store
 * (`total()`/`subtotal()`), não reimplementada. `origem: 'storefront'`
 * em todos os caminhos. Ramo de agendamento estrutural porém inerte
 * (storefront não cria itens de agendamento até pós-3e).
 */

export interface LojaCheckout {
  id: string
  nome: string
  taxa_entrega: number | null
  aceita_dinheiro: boolean
  aceita_pix: boolean
  aceita_cartao_maquininha: boolean
  aceita_cartao_online: boolean
}

function formaPadrao(loja: LojaCheckout): FormaPagamento {
  if (loja.aceita_cartao_online) return 'online_cartao'
  if (loja.aceita_pix) return 'online_pix'
  return 'dinheiro'
}

export function CheckoutClient({ loja }: { loja: LojaCheckout }) {
  const router = useRouter()
  const supabase = createSupabaseClient()

  const itens = useCartStore((s) => s.itens)
  const store_id = useCartStore((s) => s.store_id)
  const store_nome = useCartStore((s) => s.store_nome)
  const store_taxa_entrega = useCartStore((s) => s.store_taxa_entrega)
  const subtotal = useCartStore((s) => s.subtotal())
  const total = useCartStore((s) => s.total())
  const limparCarrinho = useCartStore((s) => s.limparCarrinho)

  const consumer = useAuthStore((s) => s.consumer)
  const setPedidoAtivo = useOrderStore((s) => s.setPedidoAtivo)

  const ehAgendamento = itens.some((i) => !!i.agendamento)
  const itemAgendamento = itens.find((i) => !!i.agendamento)

  const [enderecoSelecionado, setEnderecoSelecionado] =
    useState<Endereco | null>(null)
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>(
    formaPadrao(loja)
  )
  const [installments, setInstallments] = useState(1)
  const [dadosCartao, setDadosCartao] = useState<DadosCartao | null>(null)
  const [trocoPara, setTrocoPara] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [processando, setProcessando] = useState(false)
  const [etapa, setEtapa] = useState<
    'revisao' | 'processando' | 'concluido'
  >('revisao')
  const [mensagemErro, setMensagemErro] = useState<string | null>(null)

  const [montado, setMontado] = useState(false)
  useEffect(() => setMontado(true), [])

  useEffect(() => {
    if (consumer?.enderecos && consumer.enderecos.length > 0) {
      setEnderecoSelecionado(consumer.enderecos[0])
    }
  }, [consumer])

  useEffect(() => {
    if (formaPagamento !== 'online_cartao') setInstallments(1)
  }, [formaPagamento])

  function validar(): string | null {
    if (itens.length === 0) return 'Carrinho vazio.'
    if (!ehAgendamento && !enderecoSelecionado) {
      return 'Selecione um endereço de entrega.'
    }
    if (
      ehAgendamento &&
      formaPagamento !== 'online_cartao' &&
      formaPagamento !== 'online_pix'
    ) {
      return 'Agendamentos só aceitam pagamento online (cartão ou Pix).'
    }
    if (!formaPagamento) return 'Selecione uma forma de pagamento.'
    if (formaPagamento === 'online_cartao' && !dadosCartao) {
      return 'Preencha os dados do cartão.'
    }
    if (
      formaPagamento === 'dinheiro' &&
      trocoPara &&
      parseFloat(trocoPara) < total / 100
    ) {
      return 'Valor do troco deve ser maior que o total do pedido.'
    }
    return null
  }

  async function handleFazerPedido() {
    const erro = validar()
    if (erro) {
      setMensagemErro(erro)
      return
    }
    setMensagemErro(null)
    setProcessando(true)
    setEtapa('processando')

    try {
      if (formaPagamento === 'online_cartao') {
        await fluxoCartao()
      } else if (formaPagamento === 'online_pix') {
        await fluxoPix()
      } else {
        await fluxoPagamentoOffline()
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : 'Não foi possível processar o pedido.'
      setMensagemErro(msg)
      setProcessando(false)
      setEtapa('revisao')
    }
  }

  // Fronteira INERTE (decisão TL §3d): sem sessão consumer (3e) o checkout
  // não conclui — redireciona p/ `/entrar?next=/checkout` (rota do 3e) e
  // aborta o fluxo. Pré-3e este é sempre o caminho tomado.
  async function obterSessaoOuFalhar() {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      router.push('/entrar?next=/checkout')
      throw new Error('Faça login para concluir o pedido.')
    }
    return session
  }

  function payloadBase() {
    return {
      store_id,
      origem: 'storefront' as const,
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
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-pagarme-order`,
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

  async function fluxoPagamentoOffline() {
    if (ehAgendamento) {
      throw new Error('Agendamentos só aceitam pagamento online.')
    }
    const session = await obterSessaoOuFalhar()

    const { data: consumer_data } = await supabase
      .from('consumers')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    if (!consumer_data) {
      throw new Error('Perfil do consumidor não encontrado.')
    }

    // DECISÃO TL ABERTA §3d (pós-3e): o insert direto de `orders` do mobile
    // usa `tenant_id: loja.tenant_id` lido da tabela base `stores`. No
    // storefront isso viola D2 (só views `public_catalog_*`, que não
    // expõem `tenant_id`). O campo é deliberadamente OMITIDO aqui — o
    // caminho é estrutural e inerte (gated por `obterSessaoOuFalhar()` =
    // 3e). Ao ativar o pagamento offline no 3e, resolver a origem do
    // tenant server-side (provável: edge function derivando o tenant a
    // partir de `store_id`, igual a card/pix), não relendo a tabela base.
    const { data: pedido, error: pedidoError } = await supabase
      .from('orders')
      .insert({
        consumer_id: consumer_data.id,
        store_id: store_id!,
        status: 'novo',
        payment_status: 'pendente',
        forma_pagamento: formaPagamento,
        subtotal,
        taxa_entrega: store_taxa_entrega,
        total,
        platform_fee_amount: 100,
        endereco_entrega: enderecoSelecionado,
        observacoes: observacoes.trim() || null,
        troco_para: trocoPara
          ? Math.round(parseFloat(trocoPara) * 100)
          : null,
        origem: 'storefront',
      })
      .select('id')
      .single()

    if (pedidoError) throw new Error(pedidoError.message)

    const orderItems = itens.map((i) => {
      const precoExtra =
        i.modifiers?.reduce((acc, m) => acc + m.preco_extra, 0) ?? 0
      const precoUnit = i.preco + precoExtra
      return {
        order_id: pedido.id,
        product_id: i.product_id,
        variant_id: i.variant?.variant_id ?? null,
        nome: i.nome,
        preco_unit: precoUnit,
        quantidade: i.quantidade,
        subtotal: precoUnit * i.quantidade,
        observacoes: i.observacoes ?? null,
        modifiers:
          i.modifiers && i.modifiers.length > 0
            ? i.modifiers.map((m) => ({
                modifier_id: m.modifier_id,
                nome: m.nome,
                preco_extra: m.preco_extra,
              }))
            : null,
      }
    })

    await supabase.from('order_items').insert(orderItems)

    limparCarrinho()
    setPedidoAtivo(pedido.id)
    setEtapa('concluido')
    router.replace(`/pedido/${pedido.id}`)
  }

  if (!montado) return null

  if (etapa === 'processando') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-line border-t-ink" />
        <p className="mt-4 text-sm font-semibold text-ink-muted">
          Processando seu pedido…
        </p>
      </div>
    )
  }

  if (itens.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
        <p className="text-lg font-extrabold text-ink">Carrinho vazio</p>
        <p className="text-sm font-medium text-ink-muted">
          Adicione itens para fazer um pedido.
        </p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="h-12 rounded-pill bg-accent px-6 text-sm font-extrabold text-ink"
        >
          Voltar às lojas
        </button>
      </div>
    )
  }

  const labelBotao = (() => {
    if (ehAgendamento) {
      return `Confirmar agendamento — ${formatarReais(total)}`
    }
    if (formaPagamento === 'online_cartao') {
      return `Pagar ${formatarReais(total)} em ${installments}×`
    }
    if (formaPagamento === 'online_pix') {
      return `Gerar Pix de ${formatarReais(total)}`
    }
    return `Fazer pedido — ${formatarReais(total)}`
  })()

  const qtdTotal = itens.reduce((a, i) => a + i.quantidade, 0)

  return (
    <div className="min-h-screen bg-canvas pb-32">
      <header className="flex items-center gap-3 px-4 py-4">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surfaceMuted text-ink"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <h1 className="text-base font-extrabold text-ink">Seu pedido</h1>
      </header>

      <div className="px-6 pt-1">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-ink-soft">
          Pedido em
        </p>
        <p className="text-xl font-extrabold tracking-tight text-ink">
          {store_nome ?? loja.nome}
        </p>
      </div>

      <div className="px-6 pt-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">
          Seus itens
        </p>
        <div className="overflow-hidden rounded-lg bg-surface shadow-soft">
          {itens.map((item) => (
            <ItemCarrinhoCard key={item.linha_id} item={item} readonly />
          ))}
        </div>
      </div>

      {ehAgendamento && itemAgendamento?.agendamento && (
        <div className="px-6 pt-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">
            Quando
          </p>
          <div className="rounded-lg bg-surface p-4 shadow-soft">
            <p className="text-sm font-bold text-ink">
              📅 {formatarAgendamento(itemAgendamento.agendamento)}
            </p>
          </div>
        </div>
      )}

      {ehAgendamento && (
        <div className="px-6 pt-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">
            Local
          </p>
          <div className="rounded-lg bg-surface p-4 shadow-soft">
            <p className="text-sm font-semibold text-ink">
              {store_nome ?? loja.nome}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Atendimento no estabelecimento.
            </p>
          </div>
        </div>
      )}

      {!ehAgendamento && (
        <SeletorEndereco
          enderecos={consumer?.enderecos ?? []}
          selecionado={enderecoSelecionado}
          onSelecionar={setEnderecoSelecionado}
        />
      )}

      <SeletorPagamento
        loja={loja}
        selecionado={formaPagamento}
        onSelecionar={setFormaPagamento}
      />

      {formaPagamento === 'online_cartao' && (
        <>
          <FormularioCartao onChange={setDadosCartao} />
          <SeletorParcelas
            total={total}
            selecionado={installments}
            onSelecionar={setInstallments}
          />
        </>
      )}

      {formaPagamento === 'dinheiro' && (
        <div className="px-6 pt-6">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink-muted">
            Troco para quanto? (opcional)
          </label>
          <input
            inputMode="numeric"
            value={trocoPara}
            onChange={(e) => setTrocoPara(e.target.value)}
            placeholder={`Ex: ${formatarReais(total + 500)}`}
            className="h-12 w-full rounded-md border border-line bg-surface px-4 text-sm font-medium text-ink outline-none placeholder:text-ink-soft focus:border-ink"
          />
        </div>
      )}

      <div className="px-6 pt-6">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink-muted">
          Observações do pedido (opcional)
        </label>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Ex: interfone 201, deixar com porteiro…"
          maxLength={200}
          rows={3}
          className="w-full resize-none rounded-md border border-line bg-surface px-4 py-3 text-sm font-medium text-ink outline-none placeholder:text-ink-soft focus:border-ink"
        />
      </div>

      <div className="px-6 pt-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">
          Resumo
        </p>
        <div className="flex flex-col gap-2 rounded-lg bg-surface p-4 shadow-soft">
          <LinhaResumo
            rotulo={`Subtotal (${qtdTotal} ${
              qtdTotal === 1 ? 'item' : 'itens'
            })`}
            valor={formatarReais(subtotal)}
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
          <div className="my-1 h-px bg-line" />
          <LinhaResumo
            rotulo="Total"
            valor={formatarReais(total)}
            destacado
          />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface px-4 pb-6 pt-3">
        {mensagemErro && (
          <p
            role="alert"
            className="mb-2 rounded-md bg-danger/15 px-3 py-2 text-xs font-semibold text-danger"
          >
            {mensagemErro}
          </p>
        )}
        <button
          type="button"
          onClick={handleFazerPedido}
          disabled={processando}
          className="flex h-14 w-full items-center justify-center rounded-pill bg-accent text-[15px] font-extrabold text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {processando ? 'Processando…' : labelBotao}
        </button>
      </div>
    </div>
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
    <div className="flex items-center justify-between">
      <span
        className={
          destacado
            ? 'text-base font-extrabold text-ink'
            : 'text-sm font-medium text-ink-muted'
        }
      >
        {rotulo}
      </span>
      <span
        className={`${
          destacado ? 'text-base font-extrabold' : 'text-sm font-semibold'
        } ${valorAccent ? 'text-success' : 'text-ink'}`}
      >
        {valor}
      </span>
    </div>
  )
}
