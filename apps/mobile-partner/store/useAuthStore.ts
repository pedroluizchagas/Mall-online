import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'

// Forma definida em docs/partner-app/04-stage-2-auth-gate.md.
// Stage 1: apenas a estrutura — carregarTenant/gate entram no Stage 2.

export interface Tenant {
  id: string
  nome_responsavel: string
  email: string
  ativo: boolean
  pagarme_onboarding_status: string
}

export interface Loja {
  id: string
  nome: string
  slug: string
  logo_url: string | null
}

interface AuthState {
  user: User | null
  tenant: Tenant | null
  lojas: Loja[]
  lojaAtivaId: string | null // persistido em AsyncStorage (Stage 2)
  carregando: boolean
  setUser: (user: User | null) => void
  setTenant: (tenant: Tenant | null) => void
  setLojas: (lojas: Loja[]) => void
  setLojaAtiva: (lojaId: string | null) => void
  setCarregando: (v: boolean) => void
  limpar: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  lojas: [],
  lojaAtivaId: null,
  carregando: true,
  setUser: (user) => set({ user }),
  setTenant: (tenant) => set({ tenant }),
  setLojas: (lojas) => set({ lojas }),
  setLojaAtiva: (lojaAtivaId) => set({ lojaAtivaId }),
  setCarregando: (carregando) => set({ carregando }),
  limpar: () => set({ user: null, tenant: null, lojas: [], lojaAtivaId: null }),
}))
