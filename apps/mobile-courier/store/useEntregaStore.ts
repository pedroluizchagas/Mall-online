import { create } from 'zustand'

export interface EntregaDisponivel {
  id: string
  assignment_id: string
  store_nome: string
  store_endereco: string
  consumer_endereco: string
  valor_entrega: number
}

export interface EntregaAtiva {
  assignment_id: string
  order_id: string
  store_nome: string
  store_telefone?: string | null
  store_endereco?: string
  store_lat?: number
  store_lng?: number
  consumer_nome: string
  consumer_endereco: string
  consumer_lat?: number
  consumer_lng?: number
  valor_entrega: number
  status: 'aceita' | 'coletada'
  codigo_confirmacao?: string | null
}

interface EntregaState {
  disponiveis: EntregaDisponivel[]
  ativa: EntregaAtiva | null
  setDisponiveis: (entregas: EntregaDisponivel[]) => void
  removerDisponivel: (order_id: string) => void
  setAtiva: (entrega: EntregaAtiva | null) => void
  limpar: () => void
}

export const useEntregaStore = create<EntregaState>((set) => ({
  disponiveis: [],
  ativa: null,
  setDisponiveis: (disponiveis) => set({ disponiveis }),
  removerDisponivel: (order_id) =>
    set((s) => ({
      disponiveis: s.disponiveis.filter((e) => e.id !== order_id),
    })),
  setAtiva: (ativa) => set({ ativa }),
  limpar: () => set({ disponiveis: [], ativa: null }),
}))
