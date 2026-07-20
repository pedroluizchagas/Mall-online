import type { OrderStatus } from '@mallevo/types'

/**
 * Transições de status de pedido permitidas ao LOJISTA.
 *
 * Fonte única consumida pelo Dashboard (apps/web/lib/actions/pedidos.ts)
 * e pelo Partner App (apps/mobile-partner) — extraída do Server Action
 * para o pacote compartilhado na entrada do app mobile
 * (docs/partner-app/01-arquitetura-e-decisoes.md §4: regra que só existia
 * no Server Action desce para camada compartilhada, nunca é copiada).
 *
 * `saiu_para_entrega`/`entregue` são movidos pelo entregador (courier),
 * não pelo lojista.
 */
export const TRANSICOES_PEDIDO_LOJISTA: Record<OrderStatus, OrderStatus[]> = {
  novo: ['confirmado', 'cancelado'],
  confirmado: ['em_preparo', 'cancelado'],
  em_preparo: ['aguardando_entregador', 'cancelado'],
  aguardando_entregador: ['cancelado'],
  saiu_para_entrega: [],
  entregue: [],
  cancelado: [],
}

/** Rótulos das ações de transição exibidos ao lojista (Dashboard e app). */
export const ROTULO_TRANSICAO: Partial<Record<OrderStatus, string>> = {
  confirmado: 'Confirmar pedido',
  em_preparo: 'Iniciar preparo',
  aguardando_entregador: 'Pronto — chamar entregador',
  cancelado: 'Cancelar pedido',
}
