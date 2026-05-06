import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'

interface Courier {
  id: string
  nome: string
  telefone?: string | null
  foto_url?: string | null
  tipo: 'proprio' | 'autonomo'
  status: 'pendente' | 'aprovado' | 'reprovado' | 'suspenso'
  online: boolean
  pagarme_recipient_id?: string | null
  pagarme_onboarding_status: string
  tenant_id?: string | null
  veiculo_tipo?: string | null
  veiculo_placa?: string | null
}

interface AuthState {
  user: User | null
  courier: Courier | null
  carregando: boolean
  setUser: (user: User | null) => void
  setCourier: (courier: Courier | null) => void
  setCarregando: (v: boolean) => void
  setOnline: (online: boolean) => void
  limpar: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  courier: null,
  carregando: true,
  setUser: (user) => set({ user }),
  setCourier: (courier) => set({ courier }),
  setCarregando: (carregando) => set({ carregando }),
  setOnline: (online) =>
    set((s) => ({ courier: s.courier ? { ...s.courier, online } : null })),
  limpar: () => set({ user: null, courier: null }),
}))
