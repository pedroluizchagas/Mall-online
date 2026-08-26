import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Termos que o usuário efetivamente buscou no Concierge — submeteu no
 * teclado, tocou em um resultado ou reusou um chip de recente.
 *
 * Local por natureza (histórico de busca é do aparelho, não do backend),
 * mesmo padrão de persistência do useSeguidas. Digitação abandonada
 * ("piz", "pizz"...) nunca entra: só registra em momento de commit.
 */

const MAX_RECENTES = 8
const MIN_TERMO = 2

interface BuscasRecentesState {
  termos: string[]
  /** Registra um termo usado — dedupe case-insensitive, mais recente primeiro. */
  registrar: (termo: string) => void
  limpar: () => void
}

export const useBuscasRecentes = create<BuscasRecentesState>()(
  persist(
    (set) => ({
      termos: [],

      registrar: (termo) => {
        const limpo = termo.trim()
        if (limpo.length < MIN_TERMO) return
        set((s) => ({
          termos: [
            limpo,
            ...s.termos.filter(
              (t) => t.toLowerCase() !== limpo.toLowerCase(),
            ),
          ].slice(0, MAX_RECENTES),
        }))
      },

      limpar: () => set({ termos: [] }),
    }),
    {
      name: 'mallevo:buscas-recentes',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
