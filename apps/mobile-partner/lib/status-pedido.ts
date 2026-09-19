/**
 * Single source of truth dos status de pedido na visão do LOJISTA.
 *
 * Mesmo padrão do consumer (apps/mobile-consumer/lib/status-pedido.ts):
 * cor, rótulos, descrição, ícone, progresso e ordem de cada status moram
 * aqui e em nenhum outro lugar. Os rótulos falam na perspectiva de quem
 * opera a loja ("Confirme o pedido", "Pronto, aguardando coleta").
 *
 * Só 4 cores semânticas (warning / info / success / danger): a cor codifica
 * o TIPO do momento — precisa de ação, em andamento, positivo, negativo —
 * e o ícone diferencia o passo.
 */
import type { OrderStatus } from '@mallevo/types'
import type { PartnerIconName } from '@/components/PartnerIcon'
import { partnerDesign } from './partner-design'

const { colors } = partnerDesign

export interface MetaStatusLojista {
  status: OrderStatus
  cor: string
  /** Badge / chip. */
  rotulo: string
  /** Statement da marquise (por extenso). */
  rotuloLongo: string
  /** O que o lojista deve fazer ou esperar agora. */
  descricao: string
  icone: PartnerIconName
  /** 0-1, barra de progresso do cartão ao vivo. */
  progresso: number
  /** Posição no fluxo positivo. -1 = fora do fluxo (cancelado). */
  ordem: number
  /** Este status pede uma ação do lojista agora. */
  pedeAcao: boolean
}

export const META_STATUS: Record<OrderStatus, MetaStatusLojista> = {
  novo: {
    status: 'novo',
    cor: colors.warning,
    rotulo: 'Novo',
    rotuloLongo: 'Pedido novo',
    descricao: 'Aguardando sua confirmação.',
    icone: 'bell',
    progresso: 0.1,
    ordem: 0,
    pedeAcao: true,
  },
  confirmado: {
    status: 'confirmado',
    cor: colors.info,
    rotulo: 'Confirmado',
    rotuloLongo: 'Confirmado',
    descricao: 'Inicie o preparo quando começar.',
    icone: 'check-circle',
    progresso: 0.28,
    ordem: 1,
    pedeAcao: true,
  },
  em_preparo: {
    status: 'em_preparo',
    cor: colors.warning,
    rotulo: 'Em preparo',
    rotuloLongo: 'Em preparo',
    descricao: 'Marque como pronto ao terminar.',
    icone: 'chef',
    progresso: 0.52,
    ordem: 2,
    pedeAcao: true,
  },
  aguardando_entregador: {
    status: 'aguardando_entregador',
    cor: colors.info,
    rotulo: 'Aguardando coleta',
    rotuloLongo: 'Pronto para coleta',
    descricao: 'Aguardando o entregador retirar.',
    icone: 'package',
    progresso: 0.72,
    ordem: 3,
    pedeAcao: false,
  },
  saiu_para_entrega: {
    status: 'saiu_para_entrega',
    cor: colors.info,
    rotulo: 'Em entrega',
    rotuloLongo: 'Saiu para entrega',
    descricao: 'A caminho do cliente.',
    icone: 'bike',
    progresso: 0.88,
    ordem: 4,
    pedeAcao: false,
  },
  entregue: {
    status: 'entregue',
    cor: colors.success,
    rotulo: 'Entregue',
    rotuloLongo: 'Entregue',
    descricao: 'Entrega concluída.',
    icone: 'check-circle',
    progresso: 1,
    ordem: 5,
    pedeAcao: false,
  },
  cancelado: {
    status: 'cancelado',
    cor: colors.danger,
    rotulo: 'Cancelado',
    rotuloLongo: 'Cancelado',
    descricao: 'Pedido cancelado.',
    icone: 'close-circle',
    progresso: 0,
    ordem: -1,
    pedeAcao: false,
  },
}

/** Nome histórico — telas antigas importam por este alias. */
export const META_STATUS_LOJISTA = META_STATUS

/** Fluxo positivo, na ordem (sem cancelado). */
export const ORDEM_FLUXO: OrderStatus[] = [
  'novo',
  'confirmado',
  'em_preparo',
  'aguardando_entregador',
  'saiu_para_entrega',
  'entregue',
]

/** Meta de um status vindo do banco (string solta cai em `novo`). */
export function metaDoStatus(status: string): MetaStatusLojista {
  return META_STATUS[status as OrderStatus] ?? META_STATUS.novo
}

/** Em curso: ainda não chegou ao desfecho. */
export function ehAtivo(status: string): boolean {
  return status !== 'entregue' && status !== 'cancelado'
}

export function ehFinalizado(status: string): boolean {
  return !ehAtivo(status)
}

/** Pede uma ação do lojista agora (confirmar, preparar, marcar pronto). */
export function pedeAcao(status: string): boolean {
  return metaDoStatus(status).pedeAcao
}

export function progressoDoStatus(status: string): number {
  return metaDoStatus(status).progresso
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
