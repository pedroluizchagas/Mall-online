/**
 * status-pedido.ts — single source of truth dos status do storefront
 * (Stage 3f).
 *
 * Cópia local de apps/mobile-consumer/lib/status-pedido.ts (padrão
 * "Copiado, não compartilhado" do `consumer-design`: storefront é
 * superfície isolada — D1/D5 — com seu próprio bundle/tema). Tokens
 * (cores semânticas) idênticos por construção; ícones são nomes locais
 * (DOM SVG), não o `ConsumerIconName` RN.
 *
 * Regra: nenhum outro arquivo do storefront pode declarar LABELS_STATUS,
 * CORES_STATUS, PROGRESSO_STATUS, DESCRICAO_STATUS ou ORDEM_STATUS.
 */

export type StatusPedido =
  | 'novo'
  | 'confirmado'
  | 'em_preparo'
  | 'aguardando_entregador'
  | 'saiu_para_entrega'
  | 'entregue'
  | 'cancelado'

export type CorStatus = 'warning' | 'info' | 'success' | 'danger' | 'accent'

export type IconeStatus =
  | 'clock'
  | 'check-circle'
  | 'chef'
  | 'bike'
  | 'truck'
  | 'close-circle'

export interface MetaStatus {
  status: StatusPedido
  cor: CorStatus
  rotuloCurto: string
  rotuloLongo: string
  descricao: string
  icone: IconeStatus
  progresso: number
  ordem: number
}

export const META_STATUS: Record<StatusPedido, MetaStatus> = {
  novo: {
    status: 'novo',
    cor: 'warning',
    rotuloCurto: 'Novo',
    rotuloLongo: 'Aguardando confirmação',
    descricao: 'A loja está revisando seu pedido.',
    icone: 'clock',
    progresso: 0.1,
    ordem: 0,
  },
  confirmado: {
    status: 'confirmado',
    cor: 'info',
    rotuloCurto: 'Confirmado',
    rotuloLongo: 'Pedido confirmado',
    descricao: 'A loja confirmou seu pedido.',
    icone: 'check-circle',
    progresso: 0.28,
    ordem: 1,
  },
  em_preparo: {
    status: 'em_preparo',
    cor: 'warning',
    rotuloCurto: 'Em preparo',
    rotuloLongo: 'Em preparo',
    descricao: 'Seu pedido está sendo preparado.',
    icone: 'chef',
    progresso: 0.52,
    ordem: 2,
  },
  aguardando_entregador: {
    status: 'aguardando_entregador',
    cor: 'warning',
    rotuloCurto: 'Aguardando',
    rotuloLongo: 'Aguardando entregador',
    descricao: 'Procurando um entregador disponível.',
    icone: 'bike',
    progresso: 0.72,
    ordem: 3,
  },
  saiu_para_entrega: {
    status: 'saiu_para_entrega',
    cor: 'info',
    rotuloCurto: 'A caminho',
    rotuloLongo: 'Saiu para entrega',
    descricao: 'Seu pedido está a caminho.',
    icone: 'truck',
    progresso: 0.88,
    ordem: 4,
  },
  entregue: {
    status: 'entregue',
    cor: 'success',
    rotuloCurto: 'Entregue',
    rotuloLongo: 'Entregue',
    descricao: 'Pedido entregue. Bom apetite!',
    icone: 'check-circle',
    progresso: 1.0,
    ordem: 5,
  },
  cancelado: {
    status: 'cancelado',
    cor: 'danger',
    rotuloCurto: 'Cancelado',
    rotuloLongo: 'Cancelado',
    descricao: 'Seu pedido foi cancelado.',
    icone: 'close-circle',
    progresso: 0,
    ordem: -1,
  },
}

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

/** Pedido está em curso (não foi concluído nem cancelado). */
export function ehAtivo(status: string): boolean {
  return status !== 'entregue' && status !== 'cancelado'
}

export interface PassoTimeline {
  meta: MetaStatus
  estado: 'concluido' | 'atual' | 'pendente'
}

/** Passos da timeline marcando concluídos / atual / pendente. */
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
