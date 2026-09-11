import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Preferências de aparência do consumidor — locais, persistidas no
 * aparelho. Hoje só uma: a luz do dia na folha do Início.
 */

interface PreferenciasState {
  /** A folha clara do Início acompanha o sol (lib/luz-do-dia.ts). */
  luzDoDia: boolean
  setLuzDoDia: (ativa: boolean) => void
}

export const usePreferencias = create<PreferenciasState>()(
  persist(
    (set) => ({
      luzDoDia: true,
      setLuzDoDia: (ativa) => set({ luzDoDia: ativa }),
    }),
    {
      name: 'mallevo-preferencias',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
