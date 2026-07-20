/**
 * Single source of truth dos status de pedido na visão do LOJISTA.
 * Mesmo padrão do consumer (apps/mobile-consumer/lib/status-pedido.ts);
 * rótulos na perspectiva de quem opera a loja.
 */
import type { OrderStatus } from '@mallevo/types'
import { partnerDesign } from './partner-design'

const { colors } = partnerDesign

export interface MetaStatusLojista {
  cor: string
  rotulo: string
  descricao: string
}

export const META_STATUS_LOJISTA: Record<OrderStatus, MetaStatusLojista> = {
  novo: { cor: colors.warning, rotulo: 'Novo', descricao: 'Aguardando sua confirmação' },
  confirmado: { cor: colors.info, rotulo: 'Confirmado', descricao: 'Confirmado — inicie o preparo' },
  em_preparo: { cor: colors.warning, rotulo: 'Em preparo', descricao: 'Em preparo na cozinha' },
  aguardando_entregador: { cor: colors.info, rotulo: 'Aguardando entregador', descricao: 'Pronto, aguardando coleta' },
  saiu_para_entrega: { cor: colors.info, rotulo: 'Em entrega', descricao: 'A caminho do cliente' },
  entregue: { cor: colors.success, rotulo: 'Entregue', descricao: 'Entrega concluída' },
  cancelado: { cor: colors.danger, rotulo: 'Cancelado', descricao: 'Pedido cancelado' },
}

export const FORMA_PAGAMENTO_ROTULO: Record<string, string> = {
  online_cartao: 'Cartão online',
  online_pix: 'Pix online',
  dinheiro: 'Dinheiro na entrega',
  cartao_entrega: 'Cartão na entrega',
  pix: 'Pix',
}

export function rotuloFormaPagamento(forma: string | null | undefined): string {
  if (!forma) return '—'
  return FORMA_PAGAMENTO_ROTULO[forma] ?? forma
}
