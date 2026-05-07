/**
 * Single source of truth dos status de pedido.
 *
 * Substitui os mapas locais que existiam em pedidos.tsx e pedido/[id].tsx.
 * Detalhamento em docs/system-design/consumer/06-status-pedido.md.
 *
 * Regra: nenhum outro arquivo pode declarar LABELS_STATUS, CORES_STATUS,
 * PROGRESSO_STATUS, DESCRICAO_STATUS ou ORDEM_STATUS.
 */
import { consumerDesign } from './consumer-design'
import type { ConsumerIconName } from '../components/ConsumerIcon'

const { colors } = consumerDesign

export type StatusPedido =
  | 'novo'
  | 'confirmado'
  | 'em_preparo'
  | 'aguardando_entregador'
  | 'saiu_para_entrega'
  | 'entregue'
  | 'cancelado'

export interface MetaStatus {
  status: StatusPedido
  cor: string
  rotuloCurto: string
  rotuloLongo: string
  descricao: string
  icone: ConsumerIconName
  /** 0-1, usado em barras de progresso. */
  progresso: number
  /** Posição no fluxo positivo. -1 = fora do fluxo (cancelado). */
  ordem: number
}

export const META_STATUS: Record<StatusPedido, MetaStatus> = {
  novo: {
    status: 'novo',
    cor: colors.warning,
    rotuloCurto: 'Novo',
    rotuloLongo: 'Aguardando confirmação',
    descricao: 'A loja está revisando seu pedido.',
    icone: 'clock',
    progresso: 0.10,
    ordem: 0,
  },
  confirmado: {
    status: 'confirmado',
    cor: colors.info,
    rotuloCurto: 'Confirmado',
    rotuloLongo: 'Pedido confirmado',
    descricao: 'A loja confirmou seu pedido.',
    icone: 'check-circle',
    progresso: 0.28,
    ordem: 1,
  },
  em_preparo: {
    status: 'em_preparo',
    cor: colors.warning,
    rotuloCurto: 'Em preparo',
    rotuloLongo: 'Em preparo',
    descricao: 'Seu pedido está sendo preparado.',
    icone: 'chef',
    progresso: 0.52,
    ordem: 2,
  },
  aguardando_entregador: {
    status: 'aguardando_entregador',
    cor: colors.warning,
    rotuloCurto: 'Aguardando',
    rotuloLongo: 'Aguardando entregador',
    descricao: 'Procurando um entregador disponível.',
    icone: 'bike',
    progresso: 0.72,
    ordem: 3,
  },
  saiu_para_entrega: {
    status: 'saiu_para_entrega',
    cor: colors.info,
    rotuloCurto: 'A caminho',
    rotuloLongo: 'Saiu para entrega',
    descricao: 'Seu pedido está a caminho.',
    icone: 'truck',
    progresso: 0.88,
    ordem: 4,
  },
  entregue: {
    status: 'entregue',
    cor: colors.success,
    rotuloCurto: 'Entregue',
    rotuloLongo: 'Entregue',
    descricao: 'Pedido entregue. Bom apetite!',
    icone: 'check-circle',
    progresso: 1.0,
    ordem: 5,
  },
  cancelado: {
    status: 'cancelado',
    cor: colors.danger,
    rotuloCurto: 'Cancelado',
    rotuloLongo: 'Cancelado',
    descricao: 'Seu pedido foi cancelado.',
    icone: 'close-circle',
    progresso: 0,
    ordem: -1,
  },
}

/** Sequência canônica do fluxo positivo (sem cancelado). Usado pra timeline. */
export const ORDEM_FLUXO: StatusPedido[] = [
  'novo',
  'confirmado',
  'em_preparo',
  'aguardando_entregador',
  'saiu_para_entrega',
  'entregue',
]

/** Lookup defensivo. Aceita string e cai num fallback se não bater. */
export function metaDoStatus(status: string): MetaStatus {
  return META_STATUS[status as StatusPedido] ?? META_STATUS.novo
}

export function progressoDoStatus(status: string): number {
  return metaDoStatus(status).progresso
}

/** Pedido está em curso (não foi concluído nem cancelado). */
export function ehAtivo(status: string): boolean {
  return status !== 'entregue' && status !== 'cancelado'
}

/** Pedido finalizou (positivo ou negativo). */
export function ehFinalizado(status: string): boolean {
  return status === 'entregue' || status === 'cancelado'
}

export interface PassoTimeline {
  meta: MetaStatus
  estado: 'concluido' | 'atual' | 'pendente'
}

/** Lista de passos da timeline marcando concluídos / atual / pendente. */
export function timelineDoStatus(statusAtual: string): PassoTimeline[] {
  const atual = metaDoStatus(statusAtual)

  if (statusAtual === 'cancelado') {
    return [{ meta: atual, estado: 'atual' }]
  }

  return ORDEM_FLUXO.map((s) => {
    const meta = META_STATUS[s]
    if (meta.ordem < atual.ordem) return { meta, estado: 'concluido' as const }
    if (meta.ordem === atual.ordem) return { meta, estado: 'atual' as const }
    return { meta, estado: 'pendente' as const }
  })
}
