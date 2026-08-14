import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { respostaDaLoja, type Comentario } from '@/lib/comentarios'
import type { Post } from '@/lib/posts'
import { useNotificacoes } from '@/store/useNotificacoes'

/**
 * Comentários ESCRITOS no app: os do usuário e as respostas que a loja
 * mandou para ele. Os que já existiam no post vêm de `lib/comentarios.ts` e
 * não passam por aqui — este store guarda só o que nasceu da interação.
 *
 * A resposta da loja é agendada FORA do React (setTimeout no módulo, não em
 * effect de componente). É o que torna a promessa real: o usuário comenta,
 * fecha o Explorar, e a resposta chega mesmo assim — no stream se ele ainda
 * estiver lá, e sempre no sino da home. Um backend real trocaria o timeout
 * por um canal realtime escrevendo no mesmo lugar.
 */

/** Tempo até a loja responder. Curto o bastante para a demo, longo o
 *  bastante para não parecer eco do próprio comentário. */
const ATRASO_RESPOSTA_MS = 5200

/** Um post não acumula respostas pendentes — evita salva de notificações. */
const pendentes = new Set<string>()

interface ComentariosState {
  porPost: Record<string, Comentario[]>
  comentar: (args: { post: Post; autor: string; texto: string }) => void
  registrar: (c: Comentario) => void
  limpar: () => void
}

const novoId = (prefixo: string) =>
  `${prefixo}-${Date.now().toString(36)}-${Math.round(Math.random() * 1e6).toString(36)}`

export const useComentarios = create<ComentariosState>()(
  persist(
    (set, get) => ({
      porPost: {},

      registrar: (c) =>
        set((s) => ({
          porPost: { ...s.porPost, [c.post_id]: [...(s.porPost[c.post_id] ?? []), c] },
        })),

      comentar: ({ post, autor, texto }) => {
        const limpo = texto.trim()
        if (!limpo) return

        const meu: Comentario = {
          id: novoId('c'),
          post_id: post.id,
          autor,
          autor_tipo: 'consumidor',
          texto: limpo,
          criado_em: new Date().toISOString(),
        }
        get().registrar(meu)

        if (pendentes.has(post.id)) return
        pendentes.add(post.id)

        setTimeout(() => {
          pendentes.delete(post.id)

          const resposta: Comentario = {
            id: novoId('r'),
            post_id: post.id,
            autor: post.loja_nome,
            autor_tipo: 'loja',
            texto: respostaDaLoja(meu.id),
            criado_em: new Date().toISOString(),
            resposta_a: meu.id,
          }
          useComentarios.getState().registrar(resposta)

          useNotificacoes.getState().adicionar({
            id: novoId('n'),
            tipo: 'comentario',
            titulo: `${post.loja_nome} respondeu você`,
            corpo: resposta.texto,
            criado_em: resposta.criado_em,
            lida: false,
          })
        }, ATRASO_RESPOSTA_MS)
      },

      limpar: () => set({ porPost: {} }),
    }),
    {
      name: 'mallevo:comentarios',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)

/**
 * Comentários de um post que nasceram no app, em ordem cronológica.
 *
 * O seletor devolve a REFERÊNCIA do array guardado (estável entre updates
 * de outros posts) — nada de `?? []` aqui, que criaria array novo a cada
 * render e quebraria o cache do `useSyncExternalStore`.
 */
export function useComentariosDoPost(post_id: string): Comentario[] | undefined {
  return useComentarios((s) => s.porPost[post_id])
}
