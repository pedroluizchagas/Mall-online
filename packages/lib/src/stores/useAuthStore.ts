import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import type { Endereco } from '@mallevo/types'

export interface ConsumerProfile {
  id: string
  nome: string
  telefone?: string | null
  foto_url?: string | null
  /** Somente dígitos (11 caracteres) — a máscara é responsabilidade da UI. */
  cpf?: string | null
  /** ISO `YYYY-MM-DD`, como vem do Postgres. */
  data_nascimento?: string | null
  enderecos: Endereco[]
}

interface AuthState {
  user: User | null
  consumer: ConsumerProfile | null
  carregando: boolean
  setUser: (user: User | null) => void
  setConsumer: (consumer: ConsumerProfile | null) => void
  setCarregando: (carregando: boolean) => void
  limpar: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  consumer: null,
  carregando: true,

  setUser: (user) => set({ user }),
  setConsumer: (consumer) => set({ consumer }),
  setCarregando: (carregando) => set({ carregando }),

  limpar: () => set({ user: null, consumer: null }),
}))
