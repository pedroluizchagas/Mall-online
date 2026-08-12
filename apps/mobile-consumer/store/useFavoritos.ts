import { useMemo } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Post } from '@/lib/posts'

/**
 * Curtidas = favoritos.
 *
 * O coração do Explorar e do feed Seguindo não é mais um contador efêmero:
 * ele salva o post na tela Favoritos. Uma ação, dois efeitos — é a mesma
 * decisão de produto do "salvar" do Instagram fundida ao "curtir", porque
 * duplicar as duas ações num app de shopping só criaria dúvida sobre qual
 * usar.
 *
 * Guardamos o POST INTEIRO, não só o id. Motivos:
 * - a tela abre instantânea e funciona offline;
 * - post despublicado pelo lojista não abre buraco na coleção do usuário;
 * - `public_explore_feed` não garante que um id continue existindo.
 * O snapshot envelhece (preço, contadores), então a tela Favoritos refresca
 * o que ainda está no ar via `atualizarSnapshots`.
 *
 * Local, como [useSeguidas]: não existe tabela `post_likes` no schema. Quando
 * existir, este store vira cache otimista e a UI não muda.
 */

export interface PostFavorito {
  post: Post
  /** Epoch ms — ordena "favoritados mais recentes primeiro". */
  favoritadoEm: number
}

interface FavoritosState {
  itens: Record<string, PostFavorito>
  /** false até o AsyncStorage responder — evita piscar o estado vazio. */
  hidratado: boolean
  favoritar: (post: Post) => void
  remover: (id: string) => void
  /** Alterna e devolve o estado novo (true = passou a ser favorito). */
  alternar: (post: Post) => boolean
  /** Atualiza o snapshot dos favoritos que ainda estão publicados. */
  atualizarSnapshots: (posts: Post[]) => void
  limpar: () => void
}

export const useFavoritos = create<FavoritosState>()(
  persist(
    (set, get) => ({
      itens: {},
      hidratado: false,

      favoritar: (post) => {
        if (!post.id || get().itens[post.id]) return
        set((s) => ({
          itens: {
            ...s.itens,
            [post.id]: { post, favoritadoEm: Date.now() },
          },
        }))
      },

      remover: (id) => {
        if (!get().itens[id]) return
        set((s) => {
          const { [id]: _removido, ...resto } = s.itens
          return { itens: resto }
        })
      },

      alternar: (post) => {
        const favorito = Boolean(get().itens[post.id])
        if (favorito) get().remover(post.id)
        else get().favoritar(post)
        return !favorito
      },

      atualizarSnapshots: (posts) =>
        set((s) => {
          let mudou = false
          const itens = { ...s.itens }
          for (const post of posts) {
            const atual = itens[post.id]
            if (!atual) continue
            itens[post.id] = { ...atual, post }
            mudou = true
          }
          // `favoritadoEm` é preservado: refrescar conteúdo não reordena a
          // coleção debaixo do dedo de quem está rolando.
          return mudou ? { itens } : s
        }),

      limpar: () => set({ itens: {} }),
    }),
    {
      name: 'mallevo:favoritos',
      storage: createJSONStorage(() => AsyncStorage),
      // Só o mapa é persistido — `hidratado` é estado de runtime.
      partialize: (s) => ({ itens: s.itens }),
      onRehydrateStorage: () => () => {
        useFavoritos.setState({ hidratado: true })
      },
    },
  ),
)

/**
 * Estado + contador de um post, para o coração das duas telas.
 *
 * O contador do backend não sabe da curtida local, então somamos 1 na
 * exibição — mesmo comportamento otimista de antes, agora persistente.
 * Cada tela mantém sua própria animação: só a regra é compartilhada.
 */
export function useCurtida(post: Post) {
  const favorito = useFavoritos((s) => Boolean(s.itens[post.id]))
  const alternar = useFavoritos((s) => s.alternar)
  const favoritar = useFavoritos((s) => s.favoritar)

  return {
    favorito,
    curtidas: post.curtidas + (favorito ? 1 : 0),
    alternar: () => alternar(post),
    /** Toque duplo na mídia: curte, nunca descurte. */
    favoritar: () => favoritar(post),
  }
}

/**
 * Coleção ordenada (mais recentes primeiro).
 *
 * O sort roda em `useMemo` sobre o mapa — devolver array novo direto do
 * seletor quebraria o cache do `useSyncExternalStore` (re-render infinito).
 */
export function usePostsFavoritos(): PostFavorito[] {
  const itens = useFavoritos((s) => s.itens)
  return useMemo(
    () => Object.values(itens).sort((a, b) => b.favoritadoEm - a.favoritadoEm),
    [itens],
  )
}

export function useTotalFavoritos() {
  return useFavoritos((s) => Object.keys(s.itens).length)
}
