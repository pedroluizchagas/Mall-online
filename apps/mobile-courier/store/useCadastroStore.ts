import { create } from 'zustand'

interface DadosCadastro {
  nome?: string
  cpf?: string
  telefone?: string
  veiculo_tipo?: string
  veiculo_placa?: string
}

interface CadastroState {
  dados: DadosCadastro
  setDados: (novos: Partial<DadosCadastro>) => void
  limpar: () => void
}

export const useCadastroStore = create<CadastroState>((set) => ({
  dados: {},
  setDados: (novos) => set((s) => ({ dados: { ...s.dados, ...novos } })),
  limpar: () => set({ dados: {} }),
}))
