/**
 * Status de pedido na visão do LOJISTA — porte de
 * apps/mobile-partner/lib/status-pedido.ts. Rótulo, descrição, ícone, cor,
 * progresso e ordem de cada status moram AQUI e em nenhum outro lugar do
 * painel (o app e o painel dizem a mesma coisa sobre o mesmo pedido).
 *
 * Só 4 cores semânticas: a cor codifica o TIPO do momento — precisa de ação
 * (warning), em andamento (info), positivo (success), negativo (danger) — e
 * o ícone diferencia o passo.
 */
import type { PartnerIconName } from '@/components/ui/partner-icon'

export type StatusPedido =
  | 'novo'
  | 'confirmado'
  | 'em_preparo'
  | 'aguardando_entregador'
  | 'saiu_para_entrega'
  | 'entregue'
  | 'cancelado'

export type TomStatus = 'aviso' | 'info' | 'ok' | 'perigo'

export interface MetaStatus {
  status: StatusPedido
  tom: TomStatus
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
  /** Este status pede uma ação do lojista agora (sobe para a marquise). */
  pedeAcao: boolean
}

export const META_STATUS: Record<StatusPedido, MetaStatus> = {
  novo: {
    status: 'novo',
    tom: 'aviso',
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
    tom: 'info',
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
    tom: 'aviso',
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
    tom: 'info',
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
    tom: 'info',
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
    tom: 'ok',
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
    tom: 'perigo',
    rotulo: 'Cancelado',
    rotuloLongo: 'Cancelado',
    descricao: 'Pedido cancelado.',
    icone: 'close-circle',
    progresso: 0,
    ordem: -1,
    pedeAcao: false,
  },
}

/** Cores de cada tom: texto legível na folha, fundo suave, e o tom vivo
 *  (ponto aceso e marquise). Tudo em token — nada de hex aqui. */
export const CORES_TOM: Record<TomStatus, { texto: string; fundo: string; vivo: string }> = {
  aviso: { texto: 'var(--warn)', fundo: 'var(--warn-lt)', vivo: 'var(--warn-vivo)' },
  info: { texto: 'var(--sky)', fundo: 'var(--sky-lt)', vivo: 'var(--sky-vivo)' },
  ok: { texto: 'var(--ok)', fundo: 'var(--ok-lt)', vivo: 'var(--ok-vivo)' },
  perigo: { texto: 'var(--err)', fundo: 'var(--err-lt)', vivo: 'var(--err-vivo)' },
}

/** Meta de um status vindo do banco (string solta cai em `novo`). */
export function metaDoStatus(status: string): MetaStatus {
  return META_STATUS[status as StatusPedido] ?? META_STATUS.novo
}

/** Em curso: ainda não chegou ao desfecho. */
export function ehAtivo(status: string): boolean {
  return status !== 'entregue' && status !== 'cancelado'
}

/** Pede uma ação do lojista agora (novo, confirmado, em preparo). */
export function pedeAcao(status: string): boolean {
  return metaDoStatus(status).pedeAcao
}
