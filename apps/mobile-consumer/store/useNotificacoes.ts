import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Central de notificações do consumidor.
 *
 * Antes o popup guardava a lista em `useState` e a home lia um contador
 * CONSTANTE (`NOTIFICACOES_NAO_LIDAS`) — marcar tudo como lido não apagava a
 * bolinha do sino. Agora lista e não-lidas moram aqui, e quem escreve de
 * fora é a resposta da loja a um comentário (`store/useComentarios.ts`).
 *
 * As notificações de demonstração entram como semente do estado inicial; o
 * que o AsyncStorage devolver a partir do segundo boot substitui a semente.
 */

export type TipoNotificacao =
  | 'pedido'
  | 'promo'
  | 'novidade'
  | 'sistema'
  | 'comentario'

export interface Notificacao {
  id: string
  tipo: TipoNotificacao
  titulo: string
  corpo: string
  criado_em: string
  lida: boolean
}

const minutosAtras = (min: number) =>
  new Date(Date.now() - min * 60_000).toISOString()

const SEMENTE: Notificacao[] = [
  {
    id: 'seed-1',
    tipo: 'pedido',
    titulo: 'Pedido a caminho!',
    corpo: 'Seu pedido saiu para entrega. Fique de olho!',
    criado_em: minutosAtras(5),
    lida: false,
  },
  {
    id: 'seed-2',
    tipo: 'promo',
    titulo: 'Frete grátis hoje',
    corpo: 'Peça qualquer coisa até meia-noite e ganhe frete grátis.',
    criado_em: minutosAtras(60),
    lida: false,
  },
  {
    id: 'seed-3',
    tipo: 'novidade',
    titulo: 'Nova loja disponível',
    corpo: 'Farmácia Aroeira chegou no Mallevo! Confira já.',
    criado_em: minutosAtras(60 * 3),
    lida: true,
  },
  {
    id: 'seed-4',
    tipo: 'pedido',
    titulo: 'Pedido entregue',
    corpo: 'Seu pedido foi entregue com sucesso. Bom apetite!',
    criado_em: minutosAtras(60 * 26),
    lida: true,
  },
  {
    id: 'seed-5',
    tipo: 'promo',
    titulo: '10% off no próximo pedido',
    corpo: 'Use o cupom VOLTA10 e economize na próxima compra.',
    criado_em: minutosAtras(60 * 24 * 2),
    lida: true,
  },
  {
    id: 'seed-6',
    tipo: 'sistema',
    titulo: 'Bem-vindo ao Mallevo',
    corpo: 'Seu cadastro foi concluído. Explore as melhores lojas!',
    criado_em: minutosAtras(60 * 24 * 8),
    lida: true,
  },
]

interface NotificacoesState {
  lista: Notificacao[]
  /** Insere no topo (mais recente primeiro). */
  adicionar: (n: Notificacao) => void
  marcarLida: (id: string) => void
  marcarTodasLidas: () => void
}

export const useNotificacoes = create<NotificacoesState>()(
  persist(
    (set) => ({
      lista: SEMENTE,

      adicionar: (n) => set((s) => ({ lista: [n, ...s.lista] })),

      marcarLida: (id) =>
        set((s) => ({
          lista: s.lista.map((n) => (n.id === id ? { ...n, lida: true } : n)),
        })),

      marcarTodasLidas: () =>
        set((s) => ({ lista: s.lista.map((n) => ({ ...n, lida: true })) })),
    }),
    {
      name: 'mallevo:notificacoes',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)

/** Contador do sino da home. Primitivo — seletor seguro sem memo. */
export function useNaoLidas() {
  return useNotificacoes((s) => s.lista.reduce((t, n) => t + (n.lida ? 0 : 1), 0))
}
