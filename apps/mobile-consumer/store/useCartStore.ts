import { create } from 'zustand'
import type { ItemCarrinho, ItemCarrinhoModifier } from '@mallevo/types'

interface PendingTrocaLoja {
  item: ItemEntrada
  store_id: string
  store_nome: string
  taxa: number
}

// Entrada de adicionarItem — ainda sem linha_id (gerado pelo store).
type ItemEntrada = Omit<ItemCarrinho, 'linha_id'>

interface CartState {
  itens: ItemCarrinho[]
  store_id: string | null
  store_nome: string | null
  store_taxa_entrega: number
  pendingTrocaLoja: PendingTrocaLoja | null

  adicionarItem: (
    item: ItemEntrada,
    store_id: string,
    store_nome: string,
    taxa: number
  ) => void
  confirmarTrocaLoja: () => void
  cancelarTrocaLoja: () => void
  removerItem: (linha_id: string) => void
  aumentarQuantidade: (linha_id: string) => void
  diminuirQuantidade: (linha_id: string) => void
  limparCarrinho: () => void

  totalItens: () => number
  subtotal: () => number
  total: () => number
  temAgendamento: () => boolean
}

function gerarLinhaId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function hashLinha(item: {
  variant?: { variant_id: string }
  modifiers?: ItemCarrinhoModifier[]
}): string {
  const v = item.variant?.variant_id ?? ''
  const m = (item.modifiers ?? [])
    .map((x) => x.modifier_id)
    .slice()
    .sort()
    .join(',')
  return `${v}|${m}`
}

function precoExtraTotal(modifiers: ItemCarrinhoModifier[] | undefined): number {
  if (!modifiers || modifiers.length === 0) return 0
  return modifiers.reduce((acc, m) => acc + m.preco_extra, 0)
}

function precoLinha(item: ItemCarrinho): number {
  return (item.preco + precoExtraTotal(item.modifiers)) * item.quantidade
}

export const useCartStore = create<CartState>((set, get) => ({
  itens: [],
  store_id: null,
  store_nome: null,
  store_taxa_entrega: 0,
  pendingTrocaLoja: null,

  adicionarItem: (item, store_id, store_nome, taxa) => {
    const { itens, store_id: storeAtual } = get()

    if (storeAtual && storeAtual !== store_id) {
      set({ pendingTrocaLoja: { item, store_id, store_nome, taxa } })
      return
    }

    // Regra services (1 agendamento por carrinho): se o item novo é um
    // agendamento, ou se o carrinho já contém um agendamento, qualquer
    // adição reseta o carrinho. A UI deve pedir confirmação ANTES de
    // chamar adicionarItem; aqui a substituição é direta.
    const novoEhAgendamento = !!item.agendamento
    const algumExistenteEhAgendamento = itens.some((i) => !!i.agendamento)
    if (novoEhAgendamento || algumExistenteEhAgendamento) {
      set({
        itens: [{ ...item, linha_id: gerarLinhaId() }],
        store_id,
        store_nome,
        store_taxa_entrega: taxa,
      })
      return
    }

    const hashNovo = hashLinha(item)
    const existente = itens.find(
      (i) =>
        i.product_id === item.product_id &&
        hashLinha(i) === hashNovo
    )

    if (existente) {
      set({
        itens: itens.map((i) =>
          i.linha_id === existente.linha_id
            ? { ...i, quantidade: i.quantidade + item.quantidade }
            : i
        ),
      })
    } else {
      const novo: ItemCarrinho = { ...item, linha_id: gerarLinhaId() }
      set({
        itens: [...itens, novo],
        store_id,
        store_nome,
        store_taxa_entrega: taxa,
      })
    }
  },

  confirmarTrocaLoja: () => {
    const { pendingTrocaLoja } = get()
    if (!pendingTrocaLoja) return

    set({
      itens: [{ ...pendingTrocaLoja.item, linha_id: gerarLinhaId() }],
      store_id: pendingTrocaLoja.store_id,
      store_nome: pendingTrocaLoja.store_nome,
      store_taxa_entrega: pendingTrocaLoja.taxa,
      pendingTrocaLoja: null,
    })
  },

  cancelarTrocaLoja: () => set({ pendingTrocaLoja: null }),

  removerItem: (linha_id) =>
    set((state) => ({
      itens: state.itens.filter((i) => i.linha_id !== linha_id),
    })),

  aumentarQuantidade: (linha_id) =>
    set((state) => ({
      itens: state.itens.map((i) =>
        i.linha_id === linha_id
          ? { ...i, quantidade: i.quantidade + 1 }
          : i
      ),
    })),

  diminuirQuantidade: (linha_id) =>
    set((state) => ({
      itens: state.itens
        .map((i) =>
          i.linha_id === linha_id
            ? { ...i, quantidade: i.quantidade - 1 }
            : i
        )
        .filter((i) => i.quantidade > 0),
    })),

  limparCarrinho: () =>
    set({
      itens: [],
      store_id: null,
      store_nome: null,
      store_taxa_entrega: 0,
    }),

  totalItens: () => get().itens.reduce((acc, i) => acc + i.quantidade, 0),

  subtotal: () => get().itens.reduce((acc, i) => acc + precoLinha(i), 0),

  // Em agendamento, não há taxa de entrega — total = subtotal.
  total: () => {
    const s = get()
    if (s.itens.some((i) => !!i.agendamento)) return s.subtotal()
    return s.subtotal() + s.store_taxa_entrega
  },

  temAgendamento: () => get().itens.some((i) => !!i.agendamento),
}))
