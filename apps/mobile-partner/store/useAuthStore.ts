import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { User } from '@supabase/supabase-js'

// Forma definida em docs/partner-app/04-stage-2-auth-gate.md.
// Sessão/estado isolados deste app (AsyncStorage próprio, chave própria).

const CHAVE_LOJA_ATIVA = 'mallevo-partner:lojaAtivaId'

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
  slug: string | null
  logo_url: string | null
}

interface AuthState {
  user: User | null
  tenant: Tenant | null
  lojas: Loja[]
  lojaAtivaId: string | null
  /** billing_status de tenant_subscriptions — gate de operação (packages/lib). */
  billingStatus: string | null
  carregando: boolean
  setUser: (user: User | null) => void
  setTenant: (tenant: Tenant | null) => void
  setLojas: (lojas: Loja[]) => void
  setLojaAtiva: (lojaId: string | null) => void
  setBillingStatus: (status: string | null) => void
  setCarregando: (v: boolean) => void
  limpar: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  lojas: [],
  lojaAtivaId: null,
  billingStatus: null,
  carregando: true,
  setUser: (user) => set({ user }),
  setTenant: (tenant) => set({ tenant }),
  setLojas: (lojas) => set({ lojas }),
  setLojaAtiva: (lojaAtivaId) => {
    set({ lojaAtivaId })
    // Persistência best-effort: falha de storage não pode travar a troca.
    if (lojaAtivaId) {
      AsyncStorage.setItem(CHAVE_LOJA_ATIVA, lojaAtivaId).catch(() => {})
    } else {
      AsyncStorage.removeItem(CHAVE_LOJA_ATIVA).catch(() => {})
    }
  },
  setBillingStatus: (billingStatus) => set({ billingStatus }),
  setCarregando: (carregando) => set({ carregando }),
  limpar: () =>
    set({ user: null, tenant: null, lojas: [], lojaAtivaId: null, billingStatus: null }),
}))

/** Lê a loja ativa persistida (usada por carregarTenant no _layout). */
export function lerLojaAtivaPersistida(): Promise<string | null> {
  return AsyncStorage.getItem(CHAVE_LOJA_ATIVA).catch(() => null)
}
