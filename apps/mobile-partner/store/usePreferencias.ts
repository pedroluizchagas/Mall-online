import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Preferências de aparência do lojista — locais, persistidas no aparelho.
 * Hoje só uma: a luz do dia na folha clara (mesma ideia do consumer).
 */

interface PreferenciasState {
  /** A folha clara acompanha o sol de Divinópolis (lib/luz-do-dia.ts). */
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
      name: 'mallevo-partner:preferencias',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
