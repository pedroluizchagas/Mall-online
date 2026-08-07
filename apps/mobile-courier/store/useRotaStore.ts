import { create } from 'zustand'

// Modelo de rota do motor de despacho (docs/31-logistica-de-entrega.md §3 e §5).
//
// Convive com useEntregaStore: aquele guarda o fluxo legado de 1 entrega
// escolhida manualmente pelo lojista, que segue valendo como fallback
// permanente. Este guarda a rota multi-parada vinda do despacho automático.

export interface ParadaRota {
  id: string
  ordem: number
  tipo: 'coleta' | 'entrega'
  order_id: string
  store_id: string
  lat?: number | null
  lng?: number | null
  endereco?: string | null
  status: 'pendente' | 'no_local' | 'concluida' | 'falhou'
  // Preenchidos ao carregar a rota — o app precisa exibir a quem entregar
  // e conferir o código, mas o backend guarda isso em orders/stores.
  titulo?: string
  telefone?: string | null
  codigo_confirmacao?: string | null
  assignment_id?: string | null
  volumes?: number
}

export interface OfertaRota {
  oferta_id: string
  route_id: string
  expira_em: string
  drops: number
  ganho_total: number
  distancia_total_m?: number | null
  duracao_estimada_s?: number | null
  carga_porte?: 'P' | 'M' | 'G' | 'XG' | null
  carga_refrigerada: boolean
  carga_fragil: boolean
  store_nome: string
  store_endereco?: string | null
  enderecos_entrega: string[]
}

export interface RotaAtiva {
  route_id: string
  status: 'aceita' | 'em_andamento' | 'concluida'
  drops: number
  ganho_total: number
  distancia_total_m?: number | null
  paradas: ParadaRota[]
}

interface RotaState {
  ofertas: OfertaRota[]
  rota: RotaAtiva | null
  setOfertas: (ofertas: OfertaRota[]) => void
  adicionarOferta: (oferta: OfertaRota) => void
  removerOferta: (oferta_id: string) => void
  setRota: (rota: RotaAtiva | null) => void
  concluirParada: (stop_id: string) => void
  limpar: () => void
}

export const useRotaStore = create<RotaState>((set) => ({
  ofertas: [],
  rota: null,
  setOfertas: (ofertas) => set({ ofertas }),
  adicionarOferta: (oferta) =>
    set((s) =>
      // Realtime pode reentregar o mesmo INSERT; dedupe por oferta_id
      s.ofertas.some((o) => o.oferta_id === oferta.oferta_id)
        ? s
        : { ofertas: [...s.ofertas, oferta] },
    ),
  removerOferta: (oferta_id) =>
    set((s) => ({ ofertas: s.ofertas.filter((o) => o.oferta_id !== oferta_id) })),
  setRota: (rota) => set({ rota }),
  concluirParada: (stop_id) =>
    set((s) =>
      s.rota
        ? {
            rota: {
              ...s.rota,
              paradas: s.rota.paradas.map((p) =>
                p.id === stop_id ? { ...p, status: 'concluida' as const } : p,
              ),
            },
          }
        : s,
    ),
  limpar: () => set({ ofertas: [], rota: null }),
}))

/** Próxima parada pendente na ordem de execução. */
export function proximaParada(rota: RotaAtiva | null): ParadaRota | null {
  if (!rota) return null
  return (
    [...rota.paradas]
      .sort((a, b) => a.ordem - b.ordem)
      .find((p) => p.status !== 'concluida') ?? null
  )
}
