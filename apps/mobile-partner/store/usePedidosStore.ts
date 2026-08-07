import { create } from 'zustand'
import type { OrderStatus } from '@mallevo/types'
import { supabase } from '@/lib/supabase'

// Pedidos em tempo real (docs/partner-app/05-stage-3-pedidos.md).
// Shape espelha o select de apps/web/lib/actions/pedidos.ts (getPedidos) —
// mesma fonte de regras; RLS restringe tudo ao tenant logado.

export interface ItemPedido {
  id: string
  nome: string
  quantidade: number
  preco_unit: number
  subtotal: number
  observacoes?: string | null
  modifiers?: Array<{ modifier_id: string; nome: string; preco_extra: number }> | null
  variant_id?: string | null
  product_variants?: {
    product_variant_options?: Array<{
      product_options?: {
        valor: string | null
        product_option_groups?: { nome: string | null } | null
      } | null
    }> | null
  } | null
}

export interface Pedido {
  id: string
  status: OrderStatus
  payment_status: string
  forma_pagamento: string
  subtotal: number
  taxa_entrega: number
  total: number
  criado_em: string
  endereco_entrega: { rua?: string; numero?: string; bairro?: string; cidade?: string; complemento?: string } | null
  observacoes: string | null
  cancelado_em?: string | null
  motivo_cancelamento?: string | null
  tipo?: 'entrega' | 'agendamento' | null
  agendamento_inicio_at?: string | null
  agendamento_fim_at?: string | null
  // Perfil de carga calculado no checkout (docs/31 §1.3). Orienta a
  // separação física e decide qual veículo pode levar o pedido.
  carga_porte?: 'P' | 'M' | 'G' | 'XG' | null
  carga_peso_g?: number | null
  carga_refrigerada?: boolean | null
  carga_fragil?: boolean | null
  carga_alto_valor?: boolean | null
  volumes?: number | null
  consumers?: { id: string; nome: string; telefone: string } | null
  order_items?: ItemPedido[]
  delivery_assignments?: Array<{
    id: string
    status: string
    valor_entrega: number
    couriers?: { id: string; nome: string; telefone: string; foto_url: string | null } | null
  }>
}

// Mesmo shape de colunas do getPedidos do Dashboard
export const SELECT_PEDIDO = `
  id, status, payment_status, forma_pagamento,
  subtotal, taxa_entrega, total, criado_em,
  endereco_entrega, observacoes,
  cancelado_em, motivo_cancelamento,
  tipo, agendamento_inicio_at, agendamento_fim_at,
  carga_porte, carga_peso_g, carga_refrigerada, carga_fragil,
  carga_alto_valor, volumes,
  consumers (id, nome, telefone),
  order_items (
    id, nome, quantidade, preco_unit, subtotal, observacoes, modifiers,
    variant_id,
    product_variants (
      product_variant_options (
        product_options ( valor, product_option_groups ( nome ) )
      )
    )
  ),
  delivery_assignments (
    id, status, valor_entrega,
    couriers (id, nome, telefone, foto_url)
  )
`

export const STATUS_ATIVOS: OrderStatus[] = [
  'novo',
  'confirmado',
  'em_preparo',
  'aguardando_entregador',
  'saiu_para_entrega',
]

interface PedidosState {
  pedidos: Pedido[]
  carregando: boolean
  erro: string | null
  /** id do último pedido chegado via Realtime (para som/haptics na tela). */
  ultimoNovoId: string | null
  carregarPedidos: () => Promise<void>
  aplicarPedido: (pedido: Pedido) => void
  marcarNovoNotificado: () => void
  limpar: () => void
}

export const usePedidosStore = create<PedidosState>((set, get) => ({
  pedidos: [],
  carregando: false,
  erro: null,
  ultimoNovoId: null,

  // Espelha getPedidos do Dashboard (limit 100, mais novos primeiro).
  carregarPedidos: async () => {
    set({ carregando: get().pedidos.length === 0, erro: null })
    const { data, error } = await supabase
      .from('orders')
      .select(SELECT_PEDIDO)
      .order('criado_em', { ascending: false })
      .limit(100)

    if (error) {
      set({ erro: error.message, carregando: false })
      return
    }
    set({ pedidos: (data ?? []) as unknown as Pedido[], carregando: false })
  },

  /** Insere/atualiza um pedido vindo do Realtime (payload sem joins → refetch da linha). */
  aplicarPedido: (pedido) => {
    const { pedidos } = get()
    const existente = pedidos.findIndex((p) => p.id === pedido.id)
    if (existente >= 0) {
      const proximos = [...pedidos]
      proximos[existente] = { ...proximos[existente], ...pedido }
      set({ pedidos: proximos })
    } else {
      set({ pedidos: [pedido, ...pedidos], ultimoNovoId: pedido.id })
    }
  },

  marcarNovoNotificado: () => set({ ultimoNovoId: null }),
  limpar: () => set({ pedidos: [], carregando: false, erro: null, ultimoNovoId: null }),
}))

/** Contagem de pedidos "novo" — badge da tab (derivado, sem estado extra). */
export function contarNovos(pedidos: Pedido[]): number {
  return pedidos.filter((p) => p.status === 'novo').length
}
