import { create } from 'zustand'
import type { ItemCarrinho } from '@mallora/types'

interface PendingTrocaLoja {
  item: ItemCarrinho
  store_id: string
  store_nome: string
  taxa: number
}

interface CartState {
  itens: ItemCarrinho[]
  store_id: string | null
  store_nome: string | null
  store_taxa_entrega: number
  // Confirmação de troca de loja
  pendingTrocaLoja: PendingTrocaLoja | null

  adicionarItem: (
    item: ItemCarrinho,
    store_id: string,
    store_nome: string,
    taxa: number
  ) => void
  confirmarTrocaLoja: () => void
  cancelarTrocaLoja: () => void
  removerItem: (product_id: string) => void
  aumentarQuantidade: (product_id: string) => void
  diminuirQuantidade: (product_id: string) => void
  limparCarrinho: () => void

  // Calculados
  totalItens: () => number
  subtotal: () => number
  total: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  itens: [],
  store_id: null,
  store_nome: null,
  store_taxa_entrega: 0,
  pendingTrocaLoja: null,

  adicionarItem: (item, store_id, store_nome, taxa) => {
    const { itens, store_id: storeAtual } = get()

    // Loja diferente — aguardar confirmação em vez de limpar silenciosamente
    if (storeAtual && storeAtual !== store_id) {
      set({ pendingTrocaLoja: { item, store_id, store_nome, taxa } })
      return
    }

    // Verificar se produto já está no carrinho
    const existente = itens.find((i) => i.product_id === item.product_id)

    if (existente) {
      set({
        itens: itens.map((i) =>
          i.product_id === item.product_id
            ? { ...i, quantidade: i.quantidade + item.quantidade }
            : i
        ),
      })
    } else {
      set({
        itens: [...itens, item],
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
      itens: [pendingTrocaLoja.item],
      store_id: pendingTrocaLoja.store_id,
      store_nome: pendingTrocaLoja.store_nome,
      store_taxa_entrega: pendingTrocaLoja.taxa,
      pendingTrocaLoja: null,
    })
  },

  cancelarTrocaLoja: () => set({ pendingTrocaLoja: null }),

  removerItem: (product_id) =>
    set((state) => ({
      itens: state.itens.filter((i) => i.product_id !== product_id),
    })),

  aumentarQuantidade: (product_id) =>
    set((state) => ({
      itens: state.itens.map((i) =>
        i.product_id === product_id
          ? { ...i, quantidade: i.quantidade + 1 }
          : i
      ),
    })),

  diminuirQuantidade: (product_id) =>
    set((state) => ({
      itens: state.itens
        .map((i) =>
          i.product_id === product_id
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

  subtotal: () =>
    get().itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0),

  total: () => get().subtotal() + get().store_taxa_entrega,
}))
