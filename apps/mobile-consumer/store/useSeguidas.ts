import { useMemo } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Lojas que o usuário segue.
 *
 * Fonte da verdade do botão "Seguir" (Explorar) e da tela `(tabs)/seguindo`.
 * Hoje é LOCAL: não existe tabela `store_follows` no schema, e no modo
 * demonstração o client mock não persistiria insert em tabela desconhecida.
 * Quando o backend ganhar a tabela, este store vira o cache otimista —
 * `seguir`/`deixarDeSeguir` passam a disparar o upsert/delete e a hidratação
 * troca o AsyncStorage por um select. A UI não muda.
 *
 * Guardamos `nome` junto do slug de propósito: a tela precisa desenhar a
 * lista antes (e independentemente) do fetch de `stores` responder.
 */

export interface LojaSeguida {
  slug: string
  nome: string
  /** Epoch ms — ordena a lista por "seguidas mais recentes primeiro". */
  seguidoEm: number
}

/** O mínimo que qualquer tela tem em mãos na hora de seguir. */
export interface AlvoSeguir {
  slug: string
  nome: string
}

interface SeguidasState {
  seguidas: Record<string, LojaSeguida>
  /** false até o AsyncStorage responder — evita piscar o estado vazio. */
  hidratado: boolean
  seguir: (loja: AlvoSeguir) => void
  deixarDeSeguir: (slug: string) => void
  /** Alterna e devolve o estado novo (true = passou a seguir). */
  alternar: (loja: AlvoSeguir) => boolean
  limpar: () => void
}

export const useSeguidas = create<SeguidasState>()(
  persist(
    (set, get) => ({
      seguidas: {},
      hidratado: false,

      seguir: (loja) => {
        if (!loja.slug || get().seguidas[loja.slug]) return
        set((s) => ({
          seguidas: {
            ...s.seguidas,
            [loja.slug]: {
              slug: loja.slug,
              nome: loja.nome,
              seguidoEm: Date.now(),
            },
          },
        }))
      },

      deixarDeSeguir: (slug) => {
        if (!get().seguidas[slug]) return
        set((s) => {
          const { [slug]: _removida, ...resto } = s.seguidas
          return { seguidas: resto }
        })
      },

      alternar: (loja) => {
        const seguindo = Boolean(get().seguidas[loja.slug])
        if (seguindo) get().deixarDeSeguir(loja.slug)
        else get().seguir(loja)
        return !seguindo
      },

      limpar: () => set({ seguidas: {} }),
    }),
    {
      name: 'mallevo:seguidas',
      storage: createJSONStorage(() => AsyncStorage),
      // Só o mapa é persistido — `hidratado` é estado de runtime.
      partialize: (s) => ({ seguidas: s.seguidas }),
      onRehydrateStorage: () => () => {
        useSeguidas.setState({ hidratado: true })
      },
    },
  ),
)

/**
 * Um slug é seguido? Seletor granular de propósito: o card do reel só
 * re-renderiza quando ESTA loja muda, não a cada follow do feed inteiro.
 */
export function useEstaSeguindo(slug?: string | null) {
  return useSeguidas((s) => (slug ? Boolean(s.seguidas[slug]) : false))
}

/**
 * Lista ordenada (mais recentes primeiro).
 *
 * O sort roda em `useMemo` sobre o mapa — devolver array novo direto do
 * seletor quebraria o cache do `useSyncExternalStore` (re-render infinito).
 */
export function useLojasSeguidas(): LojaSeguida[] {
  const seguidas = useSeguidas((s) => s.seguidas)
  return useMemo(
    () => Object.values(seguidas).sort((a, b) => b.seguidoEm - a.seguidoEm),
    [seguidas],
  )
}

export function useTotalSeguidas() {
  return useSeguidas((s) => Object.keys(s.seguidas).length)
}
