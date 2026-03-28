import { create } from 'zustand'

interface Coordenadas {
  latitude: number
  longitude: number
  precisao_m?: number
  atualizado_em?: string
}

interface LocalizacaoState {
  coordenadas: Coordenadas | null
  transmitindo: boolean
  erro: string | null
  setCoordenadas: (coords: Coordenadas) => void
  setTransmitindo: (v: boolean) => void
  setErro: (erro: string | null) => void
  limpar: () => void
}

export const useLocalizacaoStore = create<LocalizacaoState>((set) => ({
  coordenadas: null,
  transmitindo: false,
  erro: null,
  setCoordenadas: (coordenadas) => set({ coordenadas }),
  setTransmitindo: (transmitindo) => set({ transmitindo }),
  setErro: (erro) => set({ erro }),
  limpar: () => set({ coordenadas: null, transmitindo: false, erro: null }),
}))
