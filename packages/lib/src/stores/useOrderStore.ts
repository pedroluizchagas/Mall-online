import { create } from 'zustand'

interface Localizacao {
  latitude: number
  longitude: number
}

interface OrderState {
  pedidoAtivoId: string | null
  statusAtual: string | null
  localizacaoEntregador: Localizacao | null

  setPedidoAtivo: (id: string | null) => void
  setStatusAtual: (status: string) => void
  setLocalizacaoEntregador: (loc: Localizacao | null) => void
  limpar: () => void
}

export const useOrderStore = create<OrderState>((set) => ({
  pedidoAtivoId: null,
  statusAtual: null,
  localizacaoEntregador: null,

  setPedidoAtivo: (id) => set({ pedidoAtivoId: id }),
  setStatusAtual: (status) => set({ statusAtual: status }),
  setLocalizacaoEntregador: (loc) => set({ localizacaoEntregador: loc }),
  limpar: () =>
    set({
      pedidoAtivoId: null,
      statusAtual: null,
      localizacaoEntregador: null,
    }),
}))
